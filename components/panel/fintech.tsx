import Link from 'next/link'
import type { ComponentType, ReactNode } from 'react'
import { clp } from '@/lib/formato'
import { CifraAnimada } from './cifra-animada'

/**
 * Piezas del panel con el lenguaje de una app de dinero (Revolut): una cifra
 * enorme que manda, acciones redondas, cambios en píldora y movimientos
 * agrupados por día, con avatar, monto a la derecha y el signo escrito.
 *
 * Son componentes de presentación: reciben datos ya calculados. El signo va
 * SIEMPRE escrito además del color (en dinero, distinguir por tono solo deja
 * fuera a quien no lo percibe).
 */

/** «$» chico y cifra grande: el ojo lee el número, no la moneda. */
export function MontoGrande({
  valor,
  animar = true,
  signo,
  className = '',
  tamano = 'text-[46px] t:text-[56px]',
}: {
  valor: number
  animar?: boolean
  /** «+» o «−» escrito delante. */
  signo?: '+' | '−'
  className?: string
  tamano?: string
}) {
  const abs = Math.abs(valor)
  return (
    <p className={`cifra leading-none font-semibold tracking-[-0.03em] ${tamano} ${className}`}>
      {signo && <span aria-hidden className="mr-1 opacity-70">{signo}</span>}
      {signo && <span className="sr-only">{signo === '−' ? 'menos ' : 'más '}</span>}
      <span aria-hidden className="mr-1 align-[0.42em] text-[0.42em] font-medium opacity-60">$</span>
      {animar ? <CifraAnimada valor={abs} /> : <>{new Intl.NumberFormat('es-CL').format(abs)}</>}
      {valor < 0 && !signo && <span className="sr-only"> negativo</span>}
    </p>
  )
}

/** Cambio frente al periodo anterior, en píldora: «↑ 12 %». `null` si no hay con qué comparar. */
export function CambioPildora({ actual, anterior, oscuro = false }: { actual: number; anterior: number; oscuro?: boolean }) {
  if (anterior <= 0) return null
  const pct = Math.round(((actual - anterior) / anterior) * 100)
  const sube = pct >= 0
  const tono = oscuro
    ? sube ? 'bg-verde/20 text-[#7be39e]' : 'bg-white/10 text-white/75'
    : sube ? 'bg-verde/10 text-verde' : 'bg-papel-alt text-tinta-suave'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold ${tono}`}>
      <svg aria-hidden width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={sube ? '' : 'rotate-180'}>
        <path d="M6 10V2M2.5 5.5 6 2l3.5 3.5" />
      </svg>
      <span className="cifra">{Math.abs(pct)} %</span>
      <span className="sr-only">{sube ? ' más' : ' menos'} que el periodo anterior</span>
    </span>
  )
}

/** Botón redondo con la etiqueta debajo, como las acciones de una app bancaria. */
export function AccionRedonda({
  href,
  etiqueta,
  Icono,
  retraso = 0,
}: {
  href: string
  etiqueta: string
  Icono: ComponentType<{ size?: number; className?: string }>
  retraso?: number
}) {
  return (
    <Link href={href} style={{ animationDelay: `${retraso}ms` }} className="entra presionable group flex flex-col items-center gap-2 text-center">
      <span className="grid size-[58px] place-items-center rounded-full bg-papel text-tinta shadow-[var(--shadow-sutil)] ring-1 ring-borde/60 transition-colors duration-200 group-hover:bg-tinta group-hover:text-papel">
        <Icono size={22} />
      </span>
      <span className="text-[12px] leading-tight font-medium text-tinta-suave">{etiqueta}</span>
    </Link>
  )
}

/** Avatar redondo con iniciales (o con el ícono que se le pase). */
export function Avatar({ texto, children, tono = 'neutro' }: { texto?: string; children?: ReactNode; tono?: 'neutro' | 'verde' | 'ambar' }) {
  const iniciales = (texto ?? '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  const fondo = tono === 'verde' ? 'bg-verde/12 text-verde' : tono === 'ambar' ? 'bg-ambar/12 text-ambar' : 'bg-papel-alt text-tinta-suave'
  return (
    <span aria-hidden className={`grid size-11 shrink-0 place-items-center rounded-full text-[14px] font-semibold ${fondo}`}>
      {children ?? (iniciales || '·')}
    </span>
  )
}

/** Encabezado de un día dentro de una lista de movimientos, con el neto del día a la derecha. */
export function EncabezadoDia({ etiqueta, neto }: { etiqueta: string; neto?: number }) {
  return (
    <div className="flex items-baseline justify-between px-1 pt-5 pb-2 first:pt-0">
      <h3 className="text-[13px] font-semibold text-tinta-suave">{etiqueta}</h3>
      {neto !== undefined && (
        <p className="cifra text-[13px] text-gris">
          <span className="sr-only">Neto del día: </span>
          {neto >= 0 ? '+' : '−'}
          {clp(Math.abs(neto))}
        </p>
      )}
    </div>
  )
}

const ZONA = 'America/Santiago'

/** Una fecha sin hora («2026-09-28») no se interpreta en UTC: en Santiago caería un día antes. */
const soloFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
const aDate = (s: string) => new Date(soloFecha(s) ? `${s}T15:00:00Z` : s)
const claveDia = (iso: string) => (soloFecha(iso) ? iso : new Date(iso).toLocaleDateString('en-CA', { timeZone: ZONA }))

/** «Hoy», «Ayer» o «mar 29 sep», siempre en hora de Santiago. */
export function etiquetaDia(iso: string): string {
  const hoy = claveDia(new Date().toISOString())
  const ayer = claveDia(new Date(Date.now() - 86_400_000).toISOString())
  const dia = claveDia(iso)
  if (dia === hoy) return 'Hoy'
  if (dia === ayer) return 'Ayer'
  return aDate(iso).toLocaleDateString('es-CL', { timeZone: ZONA, weekday: 'short', day: 'numeric', month: 'short' }).replace('.', '')
}

/** Agrupa por día (Santiago) conservando el orden de llegada. */
export function agruparPorDia<T>(items: T[], fecha: (x: T) => string): { clave: string; etiqueta: string; items: T[] }[] {
  const grupos = new Map<string, { clave: string; etiqueta: string; items: T[] }>()
  for (const x of items) {
    const iso = fecha(x)
    const clave = claveDia(iso)
    const g = grupos.get(clave) ?? { clave, etiqueta: etiquetaDia(iso), items: [] }
    g.items.push(x)
    grupos.set(clave, g)
  }
  return [...grupos.values()]
}

/** Hora corta de Santiago: «14:32». */
export function horaCorta(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CL', { timeZone: ZONA, hour: '2-digit', minute: '2-digit', hour12: false })
}
