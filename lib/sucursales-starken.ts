import 'server-only'

import datos from './sucursales-starken.json'

/**
 * Puntos donde se puede retirar un envío Starken (sucursales propias, puntos
 * en comercios y lockers), con región y comuna escritas como en el checkout.
 *
 * La lista es una copia del directorio público de starken.cl, generada con
 * `node --use-system-ca scripts/sucursales-starken.mjs`. Vive solo en el
 * servidor: son ~700 puntos y el navegador pide los de su comuna.
 */

export interface PuntoStarken {
  id: number
  nombre: string
  tipo: string
  direccion: string
  region: string
  comuna: string
  horario: string | null
  lat?: number
  lng?: number
}

const PUNTOS = (datos as { actualizado: string; puntos: PuntoStarken[] }).puntos
export const SUCURSALES_ACTUALIZADAS = (datos as { actualizado: string }).actualizado

const POR_ID = new Map(PUNTOS.map((p) => [p.id, p]))

/** Máximo que se muestra de la región cuando la comuna no tiene puntos. */
const MAX_CERCANOS = 40

export function puntoStarken(id: number): PuntoStarken | null {
  return POR_ID.get(id) ?? null
}

/**
 * Los puntos de la comuna. Si la comuna no tiene ninguno, los de su región,
 * para que el comprador elija el más cercano en vez de quedar sin opción.
 */
export function puntosPara(region: string, comuna: string): { enComuna: PuntoStarken[]; enRegion: PuntoStarken[] } {
  const enComuna = PUNTOS.filter((p) => p.region === region && p.comuna === comuna)
  if (enComuna.length) return { enComuna, enRegion: [] }
  return { enComuna, enRegion: PUNTOS.filter((p) => p.region === region).slice(0, MAX_CERCANOS) }
}

/** Cómo queda anotado en el pedido: legible para el equipo al despachar. */
export function textoDelPunto(p: PuntoStarken): string {
  return `Starken · ${p.nombre} (${p.tipo}) · ${p.direccion}, ${p.comuna}`
}
