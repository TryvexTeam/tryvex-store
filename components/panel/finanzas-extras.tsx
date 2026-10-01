import Link from 'next/link'
import { clp } from '@/lib/formato'
import { categoriaHistorica, etiquetaCategoria } from '@/lib/finanzas'
import { ATAJOS, queryDePeriodo, type Periodo } from '@/lib/periodo'
import type { Movimiento } from '@/components/panel/finanzas-vista'
import type { Cuenta } from '@/lib/cuentas'
import type { Capital } from '@/lib/capital'

/**
 * Piezas de Finanzas que Revolut Business resuelve en su analítica: periodo
 * con atajos y rango propio, desglose por categoría y aviso de comprobantes.
 * Solo presentación.
 */

const n = (v: string | number) => Number(v) || 0

/** Atajos de periodo y rango propio. Son enlaces: el periodo queda en la URL y se puede compartir. */
export function SelectorPeriodo({ periodo, conservarSin = false }: { periodo: Periodo; conservarSin?: boolean }) {
  const sufijo = conservarSin ? '&sin=1' : ''
  const campo = 'min-h-10 rounded-[var(--radius-anidado)] bg-papel px-3 text-[14px] text-tinta ring-1 ring-borde'
  return (
    <div className="no-imprimir mb-6 space-y-3">
      <nav aria-label="Periodo" className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        {ATAJOS.map((a) => {
          const activo = periodo.clave === a.clave
          return (
            <Link
              key={a.clave}
              href={`/panel/finanzas?periodo=${a.clave}${sufijo}`}
              aria-current={activo ? 'page' : undefined}
              className={`inline-flex min-h-10 shrink-0 items-center rounded-full px-4 text-[13px] font-medium transition-colors ${
                activo ? 'bg-tinta text-white' : 'bg-papel text-tinta-suave ring-1 ring-borde/80 hover:ring-gris'
              }`}
            >
              {a.etiqueta}
            </Link>
          )
        })}
      </nav>
      <form action="/panel/finanzas" className="flex flex-wrap items-end gap-2 text-[13px] text-gris">
        {conservarSin && <input type="hidden" name="sin" value="1" />}
        <label className="flex flex-col gap-1">
          Desde
          <input type="date" name="desde" defaultValue={periodo.desde ?? ''} required className={campo} />
        </label>
        <label className="flex flex-col gap-1">
          Hasta
          <input type="date" name="hasta" defaultValue={periodo.hasta ?? ''} required className={campo} />
        </label>
        <button
          type="submit"
          className={`min-h-10 rounded-full px-4 text-[13px] font-medium transition-colors ${
            periodo.clave === 'rango' ? 'bg-tinta text-white' : 'bg-papel text-tinta ring-1 ring-borde hover:ring-gris'
          }`}
        >
          Aplicar rango
        </button>
      </form>
    </div>
  )
}

export interface FilaDesglose {
  codigo: string
  etiqueta: string
  total: number
  /** Parte del total del tipo, 0 a 100. */
  pct: number
}

/** Suma por categoría y ordena de mayor a menor. */
export function desglosarPorCategoria(lista: Movimiento[], tipo: 'ingreso' | 'egreso'): FilaDesglose[] {
  const porCodigo = new Map<string, number>()
  for (const m of lista) {
    if (m.tipo !== tipo) continue
    const codigo = categoriaHistorica(m.categoria, m.tipo)
    porCodigo.set(codigo, (porCodigo.get(codigo) ?? 0) + n(m.monto_clp))
  }
  const total = [...porCodigo.values()].reduce((a, v) => a + v, 0)
  return [...porCodigo.entries()]
    .map(([codigo, monto]) => ({ codigo, etiqueta: etiquetaCategoria(codigo), total: monto, pct: total > 0 ? Math.round((monto / total) * 100) : 0 }))
    .sort((a, b) => b.total - a.total)
}

/** Barras horizontales con monto y porcentaje ESCRITOS: la barra acompaña, no es el dato. */
export function DesgloseCategorias({ titulo, filas, tono }: { titulo: string; filas: FilaDesglose[]; tono: 'verde' | 'spark' }) {
  return (
    <section aria-label={titulo} className="rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
      <h2 className="text-[15px] font-semibold">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="mt-3 text-[13px] text-gris">Sin movimientos en este periodo.</p>
      ) : (
        <ul className="mt-4 space-y-3.5">
          {filas.map((f) => (
            <li key={f.codigo}>
              <div className="flex items-baseline justify-between gap-3 text-[13.5px]">
                <span className="min-w-0 truncate">{f.etiqueta}</span>
                <span className="cifra shrink-0 font-semibold">
                  {clp(f.total)} <span className="font-normal text-gris">· {f.pct} %</span>
                </span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-papel-alt" role="presentation">
                <div className={`h-full rounded-full ${tono === 'verde' ? 'bg-verde' : 'bg-spark'}`} style={{ width: `${Math.max(2, f.pct)}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** Egresos sin comprobante: lo que Revolut hace cumplir con auto-congelado, acá solo se señala. */
export function AvisoSinComprobante({ cantidad, activo, periodo }: { cantidad: number; activo: boolean; periodo: Periodo }) {
  if (cantidad === 0 && !activo) return null
  const base = `/panel/finanzas?${queryDePeriodo(periodo)}`
  return (
    <div className="no-imprimir mb-6 flex flex-wrap items-center gap-3 rounded-[var(--radius-widget)] bg-ambar/10 px-4 py-3 text-[14px] text-ambar">
      <span className="min-w-0 flex-1">
        {activo
          ? 'Mostrando solo egresos sin comprobante.'
          : `${cantidad} ${cantidad === 1 ? 'egreso no tiene' : 'egresos no tienen'} comprobante en este periodo.`}
      </span>
      <Link href={activo ? base : `${base}&sin=1`} className="font-semibold underline underline-offset-2">
        {activo ? 'Ver todos' : 'Revisarlos'}
      </Link>
    </div>
  )
}

/**
 * Una tarjeta por método de pago, como las cuentas por moneda de Revolut. El neto
 * manda; lo que entró y salió queda debajo, con el signo escrito además del color.
 */
export function CuentasPorMetodo({ cuentas }: { cuentas: Cuenta[] }) {
  if (cuentas.length === 0) return null
  return (
    <section aria-label="Cuentas por método de pago" className="mb-8">
      <h2 className="mb-3 text-[15px] font-semibold">Dónde está la plata</h2>
      <ul className="grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
        {cuentas.map((c) => (
          <li key={c.clave} className="rounded-[var(--radius-widget)] bg-papel p-4 ring-1 ring-borde/60">
            <p className="truncate text-[13px] font-medium text-gris">{c.etiqueta}</p>
            <p className={`cifra mt-2 text-[clamp(1.15rem,4.8vw,1.55rem)] leading-none font-semibold tracking-[-0.02em] ${c.neto < 0 ? 'text-rojo' : ''}`}>
              {c.neto < 0 && <span aria-hidden>−</span>}
              {c.neto < 0 && <span className="sr-only">menos </span>}
              {clp(Math.abs(c.neto))}
            </p>
            <p className="cifra mt-2.5 flex flex-wrap gap-x-2 text-[12px] leading-snug text-gris">
              {c.entro > 0 && <span className="text-verde">+{clp(c.entro)}</span>}
              {c.salio > 0 && <span>−{clp(c.salio)}</span>}
            </p>
          </li>
        ))}
      </ul>
    </section>
  )
}

export type FiltroTipo = 'todos' | 'ingreso' | 'egreso'

/** Pestañas subrayadas (Todos / Entradas / Salidas), como «Accounts / Transactions» de Revolut. */
export function PestanasMovimientos({ periodo, activa, cuentas }: { periodo: Periodo; activa: FiltroTipo; cuentas: { todos: number; ingreso: number; egreso: number } }) {
  const base = `/panel/finanzas?${queryDePeriodo(periodo)}`
  const pestanas: { id: FiltroTipo; etiqueta: string; n: number }[] = [
    { id: 'todos', etiqueta: 'Todos', n: cuentas.todos },
    { id: 'ingreso', etiqueta: 'Entradas', n: cuentas.ingreso },
    { id: 'egreso', etiqueta: 'Salidas', n: cuentas.egreso },
  ]
  return (
    <nav aria-label="Tipo de movimiento" className="no-imprimir mb-4 flex gap-6 border-b border-borde/60">
      {pestanas.map((t) => {
        const activo = activa === t.id
        return (
          <Link
            key={t.id}
            href={t.id === 'todos' ? base : `${base}&tipo=${t.id}`}
            aria-current={activo ? 'page' : undefined}
            className={`-mb-px inline-flex min-h-11 items-center gap-1.5 border-b-2 text-[14px] font-medium transition-colors ${
              activo ? 'border-tinta text-tinta' : 'border-transparent text-gris hover:text-tinta'
            }`}
          >
            {t.etiqueta}
            <span className="cifra text-[12px] text-gris">{t.n}</span>
          </Link>
        )
      })}
    </nav>
  )
}

/**
 * Capital por integrante: cuánto puso cada uno y qué parte del capital de socios
 * es. Lo reinvertido de ventas se muestra aparte: es de Tryvex, no de nadie.
 */
export function CapitalSocios({ capital }: { capital: Capital }) {
  if (capital.socios.length === 0) return null
  return (
    <section aria-label="Capital por integrante" className="mb-8 rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold">Quién puso la plata</h2>
        <p className="cifra text-[13px] text-gris">{clp(capital.totalAportado)} aportados por socios</p>
      </div>

      <ul className="mt-4 space-y-4">
        {capital.socios.map((s) => (
          <li key={s.nombre}>
            <div className="flex items-baseline justify-between gap-3 text-[14.5px]">
              <span className="min-w-0 truncate font-medium">{s.nombre}</span>
              <span className="cifra shrink-0 font-semibold">
                {clp(s.aportado)} <span className="font-normal text-gris">· {String(s.porcentaje).replace('.', ',')} %</span>
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-papel-alt" role="presentation">
              <div className="h-full rounded-full bg-tinta" style={{ width: `${Math.max(2, s.porcentaje)}%` }} />
            </div>
          </li>
        ))}
      </ul>

      <dl className="mt-5 grid gap-3 border-t border-borde/60 pt-4 text-[13.5px] sm:grid-cols-3">
        <div>
          <dt className="text-gris">Invertido en stock</dt>
          <dd className="cifra mt-0.5 text-[16px] font-semibold">{clp(capital.invertidoEnStock)}</dd>
        </div>
        <div>
          <dt className="text-gris">Reinvertido de ventas</dt>
          <dd className="cifra mt-0.5 text-[16px] font-semibold">{clp(capital.reinvertidoDeVentas)}</dd>
          <dd className="mt-0.5 text-[12px] text-gris">Es de Tryvex, no suma al capital de nadie.</dd>
        </div>
        {capital.aportadoSinGastar > 0 && (
          <div>
            <dt className="text-gris">Aportado sin gastar</dt>
            <dd className="cifra mt-0.5 text-[16px] font-semibold">{clp(capital.aportadoSinGastar)}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
