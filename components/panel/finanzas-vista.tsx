import type { ReactNode } from 'react'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import { categoriaHistorica, etiquetaCategoria } from '@/lib/finanzas'
import { Avatar, EncabezadoDia, MontoGrande, agruparPorDia } from '@/components/panel/fintech'

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

/** Balance enorme y, debajo, lo que entró y lo que salió, en dos píldoras. */
export function ResumenFinanzas({ balance, ingresos, egresos }: { balance: number; ingresos: number; egresos: number }) {
  return (
    <section aria-label="Resumen" className="entra mb-8 overflow-hidden rounded-[26px] bg-tinta p-6 text-papel shadow-[var(--shadow-alzado)]">
      <p className="text-[14px] font-medium text-white/60">Balance</p>
      <MontoGrande valor={balance} signo={balance < 0 ? '−' : undefined} className="mt-4" />
      <p className="mt-3 text-[13px] text-white/55">{balance >= 0 ? 'a favor' : 'en rojo'}</p>

      <dl className="mt-6 grid grid-cols-2 gap-2.5">
        <div className="rounded-[18px] bg-white/[0.08] p-3.5">
          <dt className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/60">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-verde/25 text-[11px] text-[#7be39e]">↓</span>
            Entró
          </dt>
          <dd className="cifra mt-2 text-[clamp(1.05rem,4.6vw,1.4rem)] leading-none font-semibold text-[#7be39e]">
            <span aria-hidden>+</span>
            <span className="sr-only">más </span>
            {clp(ingresos)}
          </dd>
        </div>
        <div className="rounded-[18px] bg-white/[0.08] p-3.5">
          <dt className="flex items-center gap-1.5 text-[12.5px] font-medium text-white/60">
            <span aria-hidden className="grid size-5 place-items-center rounded-full bg-white/15 text-[11px] text-white/80">↑</span>
            Salió
          </dt>
          <dd className="cifra mt-2 text-[clamp(1.05rem,4.6vw,1.4rem)] leading-none font-semibold text-white">
            <span aria-hidden>−</span>
            <span className="sr-only">menos </span>
            {clp(egresos)}
          </dd>
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
            <ul className="divide-y divide-borde/50 overflow-hidden rounded-[22px] bg-papel ring-1 ring-borde/60">
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
