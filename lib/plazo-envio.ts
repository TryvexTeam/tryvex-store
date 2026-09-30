/**
 * Fechas estimadas de entrega para la ficha del producto.
 *
 * Una promesa de plazo solo vale si las fechas caen en días en que el courier
 * trabaja. Por eso todo se cuenta en días hábiles de Chile (lunes a viernes,
 * sin feriados) y desde la fecha de Santiago: el servidor de Vercel corre en
 * UTC, y una compra a las 23:00 en Santiago ya es «mañana» para él.
 *
 * Sin dependencias de Next ni de React: se prueba con
 *   node --test scripts/plazo-envio.test.mjs
 *
 * Las fechas son cadenas 'YYYY-MM-DD'. Se operan con Date.UTC para que ni la
 * zona horaria ni el horario de verano puedan correr un día.
 */

export type Dia = string

/** Días hábiles que se prometen, contados desde el día del pedido. */
export interface PlazoEnvio {
  /** Cuándo sale el paquete hacia la sucursal del courier. */
  despacho: [number, number]
  /** Cuándo llega a manos del comprador. */
  llegada: [number, number]
}

/**
 * Definido por el señor Ignacio el 2026-09-30: sin hora de corte, sale en 1 a
 * 2 días hábiles y llega en 3 a 5 (Correos de Chile, todo el país).
 */
export const PLAZO_TRYVEX: PlazoEnvio = { despacho: [1, 2], llegada: [3, 5] }

/**
 * Feriados de Chile. Verificado el 2026-09-30 contra api.boostr.cl.
 * Un año que no esté acá solo excluye los fines de semana: es mejor una fecha
 * optimista por un feriado que falta que inventar uno. Agregar el año siguiente
 * en diciembre, cuando se publique el calendario.
 */
const FERIADOS: ReadonlySet<Dia> = new Set([
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-04', '2026-05-01', '2026-05-21', '2026-06-21',
  '2026-06-29', '2026-07-16', '2026-08-15', '2026-09-18', '2026-09-19', '2026-10-12',
  '2026-10-31', '2026-11-01', '2026-12-08', '2026-12-25',
  // 2027
  '2027-01-01', '2027-03-26', '2027-03-27', '2027-05-01', '2027-05-21', '2027-06-21',
  '2027-06-28', '2027-07-16', '2027-08-15', '2027-09-17', '2027-09-18', '2027-09-19',
  '2027-10-11', '2027-10-31', '2027-11-01', '2027-12-08', '2027-12-25',
])

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_LARGOS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const aUtc = (dia: Dia) => {
  const [a, m, d] = dia.split('-').map(Number)
  return Date.UTC(a, m - 1, d)
}
const deUtc = (ms: number): Dia => new Date(ms).toISOString().slice(0, 10)
const DIA_MS = 86_400_000

const formatoSantiago = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** La fecha de hoy en Santiago, sea cual sea la zona del servidor. */
export function hoyEnSantiago(ahora: Date): Dia {
  return formatoSantiago.format(ahora)
}

export function esHabil(dia: Dia): boolean {
  const semana = new Date(aUtc(dia)).getUTCDay()
  return semana !== 0 && semana !== 6 && !FERIADOS.has(dia)
}

/**
 * Suma `n` días hábiles. Desde un día inhábil cuenta desde el siguiente hábil:
 * un pedido del sábado sale el lunes, no el domingo.
 */
export function sumarHabiles(dia: Dia, n: number): Dia {
  let ms = aUtc(dia)
  let faltan = n
  while (faltan > 0) {
    ms += DIA_MS
    if (esHabil(deUtc(ms))) faltan -= 1
  }
  return deUtc(ms)
}

export interface Hito {
  clave: 'pedido' | 'despacho' | 'llegada'
  desde: Dia
  hasta: Dia
}

/** Los tres hitos de la línea de tiempo, en orden: pedido, despacho, llegada. */
export function hitosDeEnvio(ahora: Date, plazo: PlazoEnvio = PLAZO_TRYVEX): Hito[] {
  const hoy = hoyEnSantiago(ahora)
  return [
    { clave: 'pedido', desde: hoy, hasta: hoy },
    { clave: 'despacho', desde: sumarHabiles(hoy, plazo.despacho[0]), hasta: sumarHabiles(hoy, plazo.despacho[1]) },
    { clave: 'llegada', desde: sumarHabiles(hoy, plazo.llegada[0]), hasta: sumarHabiles(hoy, plazo.llegada[1]) },
  ]
}

const partes = (dia: Dia) => {
  const [, m, d] = dia.split('-').map(Number)
  return { d, m: m - 1 }
}

/** «1 – 2 oct», «30 sep – 2 oct» o «30 sep» si es un solo día. */
export function rotuloDeFechas(desde: Dia, hasta: Dia): string {
  const a = partes(desde)
  const b = partes(hasta)
  if (desde === hasta) return `${a.d} ${MESES_CORTOS[a.m]}`
  if (a.m === b.m) return `${a.d} – ${b.d} ${MESES_CORTOS[b.m]}`
  return `${a.d} ${MESES_CORTOS[a.m]} – ${b.d} ${MESES_CORTOS[b.m]}`
}

/**
 * La fecha de llegada sin el verbo, lista para insertar en una oración:
 * «entre el 5 y el 7 de octubre» o «el 5 de octubre».
 */
function tramoDeLlegada(desde: Dia, hasta: Dia): string {
  const a = partes(desde)
  const b = partes(hasta)
  if (desde === hasta) return `el ${a.d} de ${MESES_LARGOS[a.m]}`
  if (a.m === b.m) return `entre el ${a.d} y el ${b.d} de ${MESES_LARGOS[b.m]}`
  return `entre el ${a.d} de ${MESES_LARGOS[a.m]} y el ${b.d} de ${MESES_LARGOS[b.m]}`
}

/** La frase que encabeza la línea: «Llega entre el 5 y el 7 de octubre». */
export function titularDeLlegada(desde: Dia, hasta: Dia): string {
  return `Llega ${tramoDeLlegada(desde, hasta)}`
}

/** Para frases propias («Pídelo hoy y llega …»). `null` si los hitos no traen la llegada. */
export function fraseDeLlegada(hitos: readonly Hito[]): string | null {
  const llegada = hitos.find((h) => h.clave === 'llegada')
  return llegada ? tramoDeLlegada(llegada.desde, llegada.hasta) : null
}
