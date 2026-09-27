import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { rutasDeGaleria } from '@/lib/imagenes'
import type { Categoria, Variante } from '@/lib/catalogo'
import { Catalogo, type ProductoCatalogo } from './catalogo'
import type { Tramo } from './editor'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Productos' }

type TramoConDueno = { producto_id: string } & Tramo

export default async function Productos() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  // Todo en paralelo: son lecturas independientes y encadenarlas solo suma
  // latencia a la primera pintura.
  const [
    { data: productos },
    { data: categorias },
    { data: tramos },
    { data: stock },
    { data: variantes },
    { data: stockVariantes },
  ] = await Promise.all([
    supabase
      .from('productos')
      .select(
        'id,sku,nombre,descripcion,precio_base,costo_unitario,activo,estado,imagen_url,galeria,' +
          'categoria_id,marca,condicion,etiqueta,precio_antes,peso_gramos,largo_cm,ancho_cm,alto_cm,gtin'
      )
      .order('orden'),
    supabase.from('categorias').select('id,nombre,slug,descripcion,orden,activo,imagen_url').order('orden'),
    supabase
      .from('precio_tramos')
      .select('id,producto_id,min_unidades,max_unidades,precio_unitario,etiqueta')
      .order('min_unidades'),
    supabase.from('v_stock_actual').select('producto_id,stock'),
    supabase
      .from('producto_variantes')
      .select('id,producto_id,nombre,sku,color_hex,muestra_url,precio,imagen_url,orden,activo')
      .order('orden'),
    supabase.from('v_stock_variante').select('variante_id,stock'),
  ])

  const stockPorProducto = new Map<string, number>(
    (stock ?? []).map((s) => [s.producto_id as string, Number(s.stock ?? 0)])
  )
  const stockPorVariante = new Map<string, number>(
    (stockVariantes ?? []).map((s) => [s.variante_id as string, Number(s.stock ?? 0)])
  )

  const variantesPorProducto = new Map<string, Variante[]>()
  for (const v of variantes ?? []) {
    const lista = variantesPorProducto.get(v.producto_id) ?? []
    lista.push({
      ...v,
      precio: v.precio === null ? null : Number(v.precio),
      stock: stockPorVariante.get(v.id) ?? 0,
    })
    variantesPorProducto.set(v.producto_id, lista)
  }

  // El select se escribe como texto concatenado, así que el cliente no puede
  // inferir sus columnas: se declara la forma que efectivamente se pidió.
  type Fila = Omit<ProductoCatalogo, 'galeria' | 'stock' | 'variantes'> & { galeria: unknown }
  const filas = (productos ?? []) as unknown as Fila[]

  const catalogo: ProductoCatalogo[] = filas.map((p) => ({
    ...p,
    galeria: rutasDeGaleria(p.galeria),
    stock: stockPorProducto.get(p.id) ?? 0,
    variantes: variantesPorProducto.get(p.id) ?? [],
  }))

  const conteoPorCategoria: Record<string, number> = {}
  for (const p of catalogo)
    if (p.categoria_id) conteoPorCategoria[p.categoria_id] = (conteoPorCategoria[p.categoria_id] ?? 0) + 1

  const publicados = catalogo.filter((p) => p.estado === 'publicado').length
  const borradores = catalogo.filter((p) => p.estado === 'borrador').length
  const enBodega = catalogo.reduce((a, p) => a + Math.max(0, p.stock), 0)
  const sinStock = catalogo.filter((p) => p.estado === 'publicado' && p.stock <= 0).length

  // Cuatro cifras que responden lo que el equipo pregunta al entrar: qué se
  // ve, qué falta publicar, cuánto hay y qué se está vendiendo sin stock.
  const cifras = [
    { rotulo: 'Publicados', valor: publicados, tono: 'text-tinta' },
    { rotulo: 'Borradores', valor: borradores, tono: borradores ? 'text-ambar' : 'text-tinta' },
    { rotulo: 'En bodega', valor: enBodega, tono: 'text-tinta', sufijo: enBodega === 1 ? 'unidad' : 'unidades' },
    { rotulo: 'Sin stock', valor: sinStock, tono: sinStock ? 'text-rojo' : 'text-tinta' },
  ]

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[48px]">Productos.</h1>
        <p className="mt-2 text-[15px] text-tinta-suave sm:text-[17px]">
          {catalogo.length === 0 ? 'Lo que publiques acá es lo que se ve en la tienda.' : 'Lo que publiques acá es lo que ve el cliente en la tienda.'}
        </p>
        {catalogo.length > 0 && (
          <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cifras.map((c) => (
              <div key={c.rotulo} className="rounded-[18px] bg-papel px-5 py-4 shadow-[0_2px_12px_rgb(0_0_0/5%)] ring-1 ring-borde/60">
                <dt className="text-[12px] font-semibold tracking-[0.04em] text-gris uppercase">{c.rotulo}</dt>
                <dd className={`cifra mt-1 text-[28px] leading-tight font-semibold tracking-[-0.02em] ${c.tono}`}>
                  {c.valor.toLocaleString('es-CL')}
                  {c.sufijo && <span className="ml-1.5 text-[13px] font-medium tracking-normal text-gris">{c.sufijo}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      <Catalogo
        productos={catalogo}
        categorias={(categorias ?? []) as Categoria[]}
        conteoPorCategoria={conteoPorCategoria}
        tramos={(tramos ?? []) as TramoConDueno[]}
      />
    </>
  )
}
