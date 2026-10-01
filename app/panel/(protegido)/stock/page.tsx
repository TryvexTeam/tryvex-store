import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { urlPublica } from '@/lib/imagenes'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import FormularioStock from './formulario'
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

  const [{ data: stock }, { data: productos }, { data: minimos }, { data: movs }] = await Promise.all([
    supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
    productosConVariantes(supabase).then((data) => ({ data })),
    supabase.from('productos').select('id,stock_minimo,imagen_url').neq('estado', 'archivado'),
    supabase
      .from('stock_movimientos')
      .select('id,tipo,cantidad,motivo,total_clp,precio_unitario,created_at,producto_id,producto_variantes(nombre),dim_integrantes(nombre)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const minimoPorId = new Map((minimos ?? []).map((p) => [p.id, Number(p.stock_minimo ?? 5)]))
  const imagenPorId = new Map((minimos ?? []).map((p) => [p.id, p.imagen_url ? urlPublica(String(p.imagen_url)) : null]))
  const filas = stock ?? []
  const minimoDe = (productoId: string) => minimoPorId.get(productoId) ?? 5
  const nombrePorId = new Map(filas.map((f) => [f.producto_id, f.nombre]))
  const variantesDe = new Map((productos ?? []).map((p) => [p.id, p.variantes]))
  const inventario: FilaInventario[] = filas.map((f) => ({
    producto_id: f.producto_id,
    sku: f.sku,
    nombre: f.nombre,
    stock: Number(f.stock ?? 0),
    minimo: minimoDe(f.producto_id),
    imagen: imagenPorId.get(f.producto_id) ?? null,
    variantes: variantesDe.get(f.producto_id) ?? [],
  }))

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Stock</h1>
        <p className="mt-1 text-[15px] text-gris">
          El stock no se edita: es la suma de los movimientos. Así queda el historial de por qué es el que es.
        </p>
      </header>

      <InventarioStock filas={inventario} filtroInicial={filtro === 'sin' || filtro === 'bajo' || filtro === 'aldia' || filtro === 'todos' ? filtro : undefined} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-label="Historial" className="min-w-0">
          <h2 className="mb-4 text-[1.35rem] font-semibold tracking-[-0.015em]">Historial</h2>

          {!movs?.length ? (
            <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-14 text-center ring-1 ring-borde/70">
              <p className="text-[15px] text-gris">Sin movimientos todavía.</p>
            </div>
          ) : (
            <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">
              {movs.map((m) => {
                const suma = (m.cantidad ?? 0) > 0
                const autor = (m.dim_integrantes as { nombre?: string } | null)?.nombre
                return (
                  <li key={m.id} className="flex items-center gap-4 px-5 py-3.5">
                    <span aria-hidden className={`h-8 w-1 shrink-0 rounded-full ${suma ? 'bg-verde' : 'bg-borde'}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14px] font-medium text-tinta">
                        {ROTULO[m.tipo] ?? m.tipo}
                        {(m.producto_variantes as { nombre?: string } | null)?.nombre
                          ? ` · ${(m.producto_variantes as { nombre?: string }).nombre}`
                          : ''}
                        {m.motivo ? ` · ${m.motivo}` : ''}
                      </p>
                      <p className="mt-0.5 truncate text-[12px] text-gris">
                        {[nombrePorId.get(m.producto_id), autor, fmtFecha(m.created_at)]
                          .filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className={`cifra block text-[15px] font-medium ${suma ? 'text-verde' : 'text-tinta'}`}>
                        {suma ? '+' : '−'}{Math.abs(m.cantidad ?? 0)}
                      </span>
                      {m.total_clp != null && Number(m.total_clp) > 0 && (
                        <span className="cifra mt-0.5 block text-[12px] text-gris">
                          {clp(m.total_clp)}
                        </span>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <aside className="min-w-0">
          {productos?.length ? (
            <FormularioStock productos={productos} />
          ) : (
            <div className="rounded-[var(--radius-tarjeta)] bg-papel p-6 text-[14px] text-gris ring-1 ring-borde/70">
              No hay productos a los que registrar movimientos.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
