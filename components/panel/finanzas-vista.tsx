import type { ReactNode } from 'react'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import { categoriaHistorica, etiquetaCategoria } from '@/lib/finanzas'
import { Avatar, CambioPildora, EncabezadoDia, MontoGrande, agruparPorDia } from '@/components/panel/fintech'

/**
 * Finanzas con el lenguaje de una app de dinero. Solo presentación: recibe los
 * datos ya calculados (la página real y una vista de prueba comparten código).
 *
 * El signo va escrito además del color, en todas las cifras: en dinero,
 * distinguir ingreso de egreso solo por el tono deja fuera a quien no lo percibe.
 */

export interface Movimiento {
  id: string
  tipo: string
  categoria: string
  descripcion: string
  monto_clp: string | number
  fecha: string
  metodo_pago: string | null
  contraparte: string | null
  voucher_path: string | null
  voucher_nombre: string | null
}

const n = (v: string | number) => Number(v) || 0

/**
 * Lo primero que se ve en Finanzas: lo VENDIDO, nada más.
 *
 * Aportes de los socios, compras de stock, gastos y retiros son movimientos de dinero, no
 * ventas: juntarlos acá hacía que «Entró» pareciera casi un millón cuando se había vendido
 * menos de la mitad. Ellos viven más abajo (cuadre de caja, capital y desgloses).
 */
export function ResumenFinanzas({
  ventas,
  ventasAnterior,
  ganancia,
  margenPct,
  unidades,
  etiquetaPeriodo,
}: {
  ventas: number
  /** Ventas del periodo anterior del mismo largo, para decir si sube o baja. */
  ventasAnterior?: number
  ganancia: number
  margenPct: number | null
  unidades: number
  etiquetaPeriodo?: string
}) {
  return (
    <section aria-label="Ventas" className="entra mb-8 overflow-hidden rounded-[var(--radius-popup)] bg-tinta p-6 text-papel shadow-[var(--shadow-alzado)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-medium text-white/60">Vendido{etiquetaPeriodo ? ` · ${etiquetaPeriodo}` : ''}</p>
        {ventasAnterior !== undefined && <CambioPildora actual={ventas} anterior={ventasAnterior} oscuro />}
      </div>
      <MontoGrande valor={ventas} className="mt-4" />
      <p className="mt-3 text-[13px] text-white/55">
        {unidades} {unidades === 1 ? 'unidad vendida' : 'unidades vendidas'}
      </p>

      <dl className="mt-6 grid grid-cols-2 gap-2.5">
        <div className="rounded-[var(--radius-widget)] bg-white/[0.08] p-3.5">
          <dt className="text-[12.5px] font-medium text-white/60">Ganancia</dt>
          <dd className="cifra mt-2 text-[clamp(1.05rem,4.6vw,1.4rem)] leading-none font-semibold text-[#7be39e]">
            {ganancia < 0 ? <span aria-hidden>−</span> : <span aria-hidden>+</span>}
            <span className="sr-only">{ganancia < 0 ? 'menos ' : 'más '}</span>
            {clp(Math.abs(ganancia))}
          </dd>
          <dd className="mt-2 text-[11.5px] leading-snug text-white/60">lo vendido menos lo que costó</dd>
        </div>
        <div className="rounded-[var(--radius-widget)] bg-white/[0.08] p-3.5">
          <dt className="text-[12.5px] font-medium text-white/60">Margen</dt>
          <dd className="cifra mt-2 text-[clamp(1.05rem,4.6vw,1.4rem)] leading-none font-semibold text-white">
            {margenPct === null ? '—' : `${String(margenPct).replace('.', ',')} %`}
          </dd>
          <dd className="mt-2 text-[11.5px] leading-snug text-white/60">de cada peso vendido</dd>
        </div>
      </dl>
    </section>
  )
}

/** Movimientos agrupados por día, con el neto del día a la derecha del encabezado. */
export function ListaMovimientos({ lista, comprobante }: { lista: Movimiento[]; comprobante?: (m: Movimiento) => ReactNode }) {
  return (
    <>
      {agruparPorDia(lista, (m) => m.fecha).map((g) => {
        const neto = g.items.reduce((a, m) => a + (m.tipo === 'ingreso' ? n(m.monto_clp) : -n(m.monto_clp)), 0)
        return (
          <div key={g.clave}>
            <EncabezadoDia etiqueta={g.etiqueta} neto={neto} />
            <ul className="divide-y divide-borde/50 overflow-hidden rounded-[var(--radius-widget)] bg-papel ring-1 ring-borde/60">
              {g.items.map((m, i) => {
                const ingreso = m.tipo === 'ingreso'
                return (
                  <li key={m.id} style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }} className="entra flex items-center gap-3.5 px-4 py-3.5">
                    <Avatar tono={ingreso ? 'verde' : 'neutro'}>
                      <span className="text-[17px] leading-none">{ingreso ? '↓' : '↑'}</span>
                    </Avatar>
                    <span className="sr-only">{ingreso ? 'Ingreso:' : 'Egreso:'}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-tinta">{m.descripcion}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-gris">
                        {[etiquetaCategoria(categoriaHistorica(m.categoria, m.tipo), m.categoria), m.contraparte, fmtFecha(m.fecha)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {comprobante?.(m)}
                    <span className={`cifra shrink-0 text-[15px] font-semibold ${ingreso ? 'text-verde' : 'text-tinta'}`}>
                      {ingreso ? '+' : '−'}
                      {clp(m.monto_clp)}
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </>
  )
}
