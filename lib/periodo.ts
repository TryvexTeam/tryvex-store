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

/** Mismo día de un mes/año anterior; si no existe (31 → mes de 30, 29-feb), el último día de ese mes. */
function mismoDiaAntes(iso: string, meses: number): string {
  const total = +iso.slice(0, 4) * 12 + (+iso.slice(5, 7) - 1) - meses
  const y = Math.floor(total / 12)
  const m = total % 12
  const ultimo = new Date(Date.UTC(y, m + 1, 0)).getUTCDate()
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(Math.min(+iso.slice(8, 10), ultimo)).padStart(2, '0')}`
}

/**
 * Instante (ISO en UTC) en que empieza el día `iso` en Santiago. Usa el desfase real de esa fecha
 * (-03:00 en verano, -04:00 en invierno), no uno fijo: con uno fijo, las ventas cercanas a la
 * medianoche caían en el día vecino.
 */
export function inicioDiaChile(iso: string): string {
  const [y, m, d] = [+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)]
  const formato = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hourCycle: 'h23' })
  for (const horasUtc of [3, 4]) {
    const t = Date.UTC(y, m, d, horasUtc)
    const partes = Object.fromEntries(formato.formatToParts(new Date(t)).map((p) => [p.type, p.value]))
    if (`${partes.year}-${partes.month}-${partes.day}` === iso && partes.hour === '00') return new Date(t).toISOString()
  }
  return new Date(Date.UTC(y, m, d, 4)).toISOString()
}

/** Límites para consultar columnas `timestamptz` del periodo: `created_at >= desde` y `created_at < hastaExclusivo`. */
export function limitesTimestamp(p: { desde: string | null; hasta: string | null }): { desde: string | null; hastaExclusivo: string | null } {
  return { desde: p.desde ? inicioDiaChile(p.desde) : null, hastaExclusivo: p.hasta ? inicioDiaChile(sumarDias(p.hasta, 1)) : null }
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
      // Contra los mismos días del mes anterior (1 al N), no contra «los N días de antes».
      return { clave: 'mes', etiqueta: 'Este mes', desde, hasta: hoy, anterior: { desde: mismoDiaAntes(desde, 1), hasta: mismoDiaAntes(hoy, 1) } }
    }
    case 'ano': {
      const desde = `${hoy.slice(0, 4)}-01-01`
      return { clave: 'ano', etiqueta: 'Este año', desde, hasta: hoy, anterior: { desde: mismoDiaAntes(desde, 12), hasta: mismoDiaAntes(hoy, 12) } }
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
