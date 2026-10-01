/**
 * Periodos de Finanzas: atajos (7 días, 30 días, mes, año, todo) o un rango
 * propio, siempre con el periodo anterior del mismo largo para comparar.
 *
 * Las fechas son de calendario (`YYYY-MM-DD`), en hora de Santiago: un
 * movimiento anotado a las 23:30 de un martes no debe caer en el miércoles
 * porque el servidor corre en UTC.
 */
export type ClavePeriodo = '7d' | '30d' | 'mes' | 'ano' | 'todo' | 'rango'

export interface Periodo {
  clave: ClavePeriodo
  etiqueta: string
  desde: string | null
  hasta: string | null
  /** Mismo largo, inmediatamente anterior. `null` si no hay con qué comparar. */
  anterior: { desde: string; hasta: string } | null
}

export const ATAJOS: { clave: Exclude<ClavePeriodo, 'rango'>; etiqueta: string }[] = [
  { clave: '7d', etiqueta: '7 días' },
  { clave: '30d', etiqueta: '30 días' },
  { clave: 'mes', etiqueta: 'Este mes' },
  { clave: 'ano', etiqueta: 'Este año' },
  { clave: 'todo', etiqueta: 'Todo' },
]

const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** `YYYY-MM-DD` de hoy en Santiago. */
export function hoyChile(ahora = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(ahora)
}

const aMs = (iso: string) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10))
const aIso = (ms: number) => new Date(ms).toISOString().slice(0, 10)
const DIA = 86_400_000

export function sumarDias(iso: string, dias: number): string {
  return aIso(aMs(iso) + dias * DIA)
}

function conAnterior(desde: string, hasta: string): { desde: string; hasta: string } {
  const largo = Math.round((aMs(hasta) - aMs(desde)) / DIA) + 1
  return { desde: sumarDias(desde, -largo), hasta: sumarDias(desde, -1) }
}

export function resolverPeriodo(params: { periodo?: string; desde?: string; hasta?: string }, hoy = hoyChile()): Periodo {
  if (params.desde && params.hasta && FECHA.test(params.desde) && FECHA.test(params.hasta) && params.desde <= params.hasta) {
    return { clave: 'rango', etiqueta: `${params.desde} a ${params.hasta}`, desde: params.desde, hasta: params.hasta, anterior: conAnterior(params.desde, params.hasta) }
  }
  switch (params.periodo) {
    case '7d': {
      const desde = sumarDias(hoy, -6)
      return { clave: '7d', etiqueta: 'Últimos 7 días', desde, hasta: hoy, anterior: conAnterior(desde, hoy) }
    }
    case 'mes': {
      const desde = `${hoy.slice(0, 7)}-01`
      return { clave: 'mes', etiqueta: 'Este mes', desde, hasta: hoy, anterior: conAnterior(desde, hoy) }
    }
    case 'ano': {
      const desde = `${hoy.slice(0, 4)}-01-01`
      return { clave: 'ano', etiqueta: 'Este año', desde, hasta: hoy, anterior: conAnterior(desde, hoy) }
    }
    case 'todo':
      return { clave: 'todo', etiqueta: 'Todo el historial', desde: null, hasta: null, anterior: null }
    default: {
      const desde = sumarDias(hoy, -29)
      return { clave: '30d', etiqueta: 'Últimos 30 días', desde, hasta: hoy, anterior: conAnterior(desde, hoy) }
    }
  }
}

/** Querystring que conserva el periodo al cambiar otro filtro. */
export function queryDePeriodo(p: Periodo): string {
  if (p.clave === 'rango' && p.desde && p.hasta) return `desde=${p.desde}&hasta=${p.hasta}`
  return `periodo=${p.clave}`
}
