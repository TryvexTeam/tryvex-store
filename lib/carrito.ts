/**
 * Bolsa de compra: tipos y guardado local, sin nada de servidor.
 *
 * La bolsa vive en el navegador (localStorage) y guarda lo mínimo para
 * mostrarla: qué producto, qué opción, cuántas unidades y una foto/nombre de
 * referencia. Nunca se confía en ella para cobrar: el checkout vuelve a
 * cotizar cada línea en el servidor (precio, tramo, stock y envío).
 */

export const MAX_LINEAS = 20
export const MAX_UNIDADES_LINEA = 10
const CLAVE_GUARDADO = 'tryvex.bolsa.v1'
const FORMATO_SKU = /^[A-Z0-9][A-Z0-9-]{1,39}$/i
const FORMATO_UUID = /^[0-9a-f-]{36}$/i

export interface LineaBolsa {
  sku: string
  varianteId: string | null
  cantidad: number
  /** Solo para mostrar la bolsa: el checkout los vuelve a leer de la base. */
  slug: string
  nombre: string
  variante: string | null
  imagen: string | null
  precio: number
}

export const claveLinea = (l: { sku: string; varianteId: string | null }) => `${l.sku}::${l.varianteId ?? ''}`

const acotar = (n: number) => Math.max(1, Math.min(MAX_UNIDADES_LINEA, Math.floor(n)))

/** Lo guardado es entrada no confiable (se puede editar a mano): se valida línea por línea. */
function esLinea(x: unknown): x is LineaBolsa {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    typeof o.sku === 'string' &&
    FORMATO_SKU.test(o.sku) &&
    (o.varianteId === null || (typeof o.varianteId === 'string' && FORMATO_UUID.test(o.varianteId))) &&
    Number.isInteger(o.cantidad) &&
    (o.cantidad as number) >= 1 &&
    typeof o.slug === 'string' &&
    typeof o.nombre === 'string' &&
    typeof o.precio === 'number'
  )
}

export function leerBolsa(): LineaBolsa[] {
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE_GUARDADO) ?? '[]')
    if (!Array.isArray(crudo)) return []
    return crudo
      .filter(esLinea)
      .slice(0, MAX_LINEAS)
      .map((l) => ({ ...l, cantidad: acotar(l.cantidad), variante: l.variante ?? null, imagen: l.imagen ?? null }))
  } catch {
    // Guardado corrupto o almacenamiento bloqueado (modo privado): bolsa vacía.
    return []
  }
}

export function guardarBolsa(lineas: LineaBolsa[]): void {
  try {
    localStorage.setItem(CLAVE_GUARDADO, JSON.stringify(lineas))
  } catch {
    // Sin almacenamiento la bolsa dura lo que la pestaña; no es un error del cliente.
  }
}

/** Suma una línea a la bolsa: si ya existe la misma opción, se juntan las unidades. */
export function sumarLinea(lineas: LineaBolsa[], nueva: LineaBolsa): LineaBolsa[] {
  const clave = claveLinea(nueva)
  const existe = lineas.find((l) => claveLinea(l) === clave)
  if (existe) return lineas.map((l) => (claveLinea(l) === clave ? { ...l, cantidad: acotar(l.cantidad + nueva.cantidad) } : l))
  return [...lineas, { ...nueva, cantidad: acotar(nueva.cantidad) }].slice(-MAX_LINEAS)
}

export const escuchaGuardado = CLAVE_GUARDADO
export { acotar as acotarUnidades }
