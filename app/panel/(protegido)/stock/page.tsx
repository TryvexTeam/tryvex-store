import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { urlPublica } from '@/lib/imagenes'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import { productosConVariantes } from '@/lib/variantes-cliente'
import { InventarioStock, type FilaInventario } from '@/components/panel/inventario-stock'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Stock' }

const ROTULO: Record<string, string> = {
  ingreso: 'Ingreso', venta: 'Venta', devolucion: 'Devolución',
  merma: 'Merma', regalo: 'Regalo', uso_interno: 'Uso interno',
  ajuste: 'Ajuste', reserva: 'Reserva', liberacion: 'Liberación',
}

export default async function Stock({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const { filtro } = await searchParams
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data: stock }, { data: productos }, { data: minimos }, { data: categorias }, { data: apartados }, { data: movs }] = await Promise.all([
    supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
    productosConVariantes(supabase).then((data) => ({ data })),
    supabase.from('productos').select('id,stock_minimo,imagen_url,categoria_id,costo_unitario,precio_base,estado').neq('estado', 'archivado'),
    supabase.from('categorias').select('id,nombre'),
    supabase.from('stock_movimientos').select('producto_id,cantidad').in('tipo', ['reserva', 'liberacion']),
    supabase
      .from('stock_movimientos')
      .select('id,tipo,cantidad,motivo,total_clp,precio_unitario,created_at,producto_id,producto_variantes(nombre),dim_integrantes(nombre)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const productoPorId = new Map((minimos ?? []).map((p) => [p.id as string, p]))
  const categoriaPorId = new Map((categorias ?? []).map((c) => [c.id as string, c.nombre as string]))
  // Unidades apartadas por pedidos sin pagar: se reservan (−) y al pagar o cancelar se liberan (+).
  const reservadasPor = new Map<string, number>()
  for (const m of apartados ?? []) reservadasPor.set(m.producto_id, (reservadasPor.get(m.producto_id) ?? 0) - Number(m.cantidad))
  const filas = (stock ?? []).filter((f) => productoPorId.has(f.producto_id))
  const nombrePorId = new Map(filas.map((f) => [f.producto_id, f.nombre]))
  const variantesDe = new Map((productos ?? []).map((p) => [p.id, p.variantes]))
  const inventario: FilaInventario[] = filas.map((f) => {
    const p = productoPorId.get(f.producto_id)!
    return {
      producto_id: f.producto_id,
      sku: f.sku,
      nombre: f.nombre,
      stock: Number(f.stock ?? 0),
      minimo: Number(p.stock_minimo ?? 5),
      reservadas: Math.max(0, reservadasPor.get(f.producto_id) ?? 0),
      imagen: p.imagen_url ? urlPublica(String(p.imagen_url)) : null,
      categoria: (p.categoria_id && categoriaPorId.get(p.categoria_id)) || 'Sin categoría',
      costo: Number(p.costo_unitario ?? 0),
      precio: Number(p.precio_base ?? 0),
      publicado: p.estado === 'publicado',
      variantes: variantesDe.get(f.producto_id) ?? [],
    }
  })

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Stock</h1>
        <p className="mt-1 text-[15px] text-gris">
          El stock no se edita: es la suma de los movimientos. Así queda el historial de por qué es el que es.
        </p>
      </header>

      <InventarioStock filas={inventario} productos={productos ?? []} filtroInicial={filtro === 'sin' || filtro === 'bajo' || filtro === 'fuera' || filtro === 'todos' || filtro === 'bodega' ? filtro : undefined} />

      <section aria-label="Historial" className="min-w-0">
        <h2 className="mb-1 text-[1.35rem] font-semibold tracking-[-0.015em]">Historial</h2>
        <p className="mb-4 text-[13.5px] text-gris">Los últimos 50 movimientos. El stock de cada producto es la suma de todos ellos.</p>

        {!movs?.length ? (
          <div className="rounded-[var(--radius-widget)] bg-papel px-6 py-14 text-center ring-1 ring-borde/60">
            <p className="text-[15px] text-gris">Sin movimientos todavía.</p>
          </div>
        ) : (
          <ul className="divide-y divide-borde/50 overflow-hidden rounded-[var(--radius-widget)] bg-papel ring-1 ring-borde/60">
            {movs.map((m) => {
              const suma = (m.cantidad ?? 0) > 0
              const autor = (m.dim_integrantes as { nombre?: string } | null)?.nombre
              const variante = (m.producto_variantes as { nombre?: string } | null)?.nombre
              return (
                <li key={m.id} className="flex items-center gap-3.5 px-4 py-3.5 sm:px-5">
                  <span aria-hidden className={`h-9 w-1 shrink-0 rounded-full ${suma ? 'bg-verde' : 'bg-borde'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-tinta">
                      {nombrePorId.get(m.producto_id) ?? 'Producto'}
                      {variante ? ` · ${variante}` : ''}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[12.5px] leading-snug text-gris">
                      {[ROTULO[m.tipo] ?? m.tipo, m.motivo, autor, fmtFecha(m.created_at)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className={`cifra block text-[16px] font-semibold ${suma ? 'text-verde' : 'text-tinta'}`}>
                      {suma ? '+' : '−'}{Math.abs(m.cantidad ?? 0)}
                    </span>
                    {m.total_clp != null && Number(m.total_clp) > 0 && (
                      <span className="cifra mt-0.5 block text-[12px] text-gris">{clp(m.total_clp)}</span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
