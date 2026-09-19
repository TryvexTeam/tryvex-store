import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import FormularioStock from './formulario'
import { productosConVariantes } from '@/lib/variantes-cliente'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Stock' }

const ROTULO: Record<string, string> = {
  ingreso: 'Ingreso', venta: 'Venta', devolucion: 'Devolución',
  merma: 'Merma', regalo: 'Regalo', uso_interno: 'Uso interno',
  ajuste: 'Ajuste', reserva: 'Reserva', liberacion: 'Liberación',
}

/** Umbral bajo el cual conviene reponer. */
const ALERTA = 5

export default async function Stock() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data: stock }, { data: productos }, { data: movs }] = await Promise.all([
    supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
    productosConVariantes(supabase).then((data) => ({ data })),
    supabase
      .from('stock_movimientos')
      .select('id,tipo,cantidad,motivo,total_clp,precio_unitario,created_at,producto_id,producto_variantes(nombre),dim_integrantes(nombre)')
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  const filas = stock ?? []
  const nombrePorId = new Map(filas.map((f) => [f.producto_id, f.nombre]))
  const bajos = filas.filter((f) => (f.stock ?? 0) <= ALERTA)
  const variantesDe = new Map((productos ?? []).map((p) => [p.id, p.variantes]))

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Stock</h1>
        <p className="mt-1 text-[15px] text-gris">
          El stock no se edita: es la suma de los movimientos. Así queda el historial de por qué es el que es.
        </p>
      </header>

      {bajos.length > 0 && (
        <p role="status" className="mb-6 rounded-[10px] bg-spark-suave px-4 py-3 text-[14px] text-rojo">
          {bajos.map((b) => `${b.nombre}: quedan ${b.stock}`).join(' · ')}. Conviene reponer.
        </p>
      )}

      <section aria-label="Inventario" className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filas.map((f) => (
          <div
            key={f.producto_id}
            className={`rounded-[var(--radius-tarjeta)] p-6 ${
              (f.stock ?? 0) <= ALERTA ? 'bg-papel ring-1 ring-rojo/30' : 'bg-tinta text-papel'
            }`}
          >
            <p className={`text-[12px] font-semibold uppercase tracking-[0.05em] ${
              (f.stock ?? 0) <= ALERTA ? 'text-gris' : 'text-white/60'
            }`}>
              {f.sku}
            </p>
            <p className="cifra mt-3 text-[2.4rem] leading-none font-semibold">{f.stock}</p>
            <p className={`mt-2 text-[13px] ${(f.stock ?? 0) <= ALERTA ? 'text-gris' : 'text-white/55'}`}>
              unidades · {f.nombre}
            </p>
            {(variantesDe.get(f.producto_id) ?? []).length > 0 && (
              <ul className={`mt-4 flex flex-wrap gap-1.5 text-[12px] ${(f.stock ?? 0) <= ALERTA ? 'text-tinta-suave' : 'text-white/75'}`}>
                {(variantesDe.get(f.producto_id) ?? []).map((v) => (
                  <li key={v.id} className={`rounded-full px-2.5 py-1 ${(f.stock ?? 0) <= ALERTA ? 'bg-papel-alt' : 'bg-white/10'}`}>
                    {v.nombre} <span className="cifra font-semibold">{v.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </section>

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
