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
    supabase.from('categorias').select('id,nombre,slug,descripcion,orden,activo').order('orden'),
    supabase
      .from('precio_tramos')
      .select('id,producto_id,min_unidades,max_unidades,precio_unitario,etiqueta')
      .order('min_unidades'),
    supabase.from('v_stock_actual').select('producto_id,stock'),
    supabase
      .from('producto_variantes')
      .select('id,producto_id,nombre,sku,color_hex,precio,imagen_url,orden,activo')
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

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.022em] sm:text-[2.2rem]">
          Productos
        </h1>
        <p className="mt-1 text-[14px] text-gris sm:text-[15px]">
          {catalogo.length === 0
            ? 'Lo que publiques acá es lo que se ve en la tienda.'
            : `${catalogo.length} ${catalogo.length === 1 ? 'producto' : 'productos'} · ${publicados} ${
                publicados === 1 ? 'publicado' : 'publicados'
              }`}
        </p>
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
