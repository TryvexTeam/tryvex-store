/**
 * De qué anuncio llegó la visita (UTMs y fbclid), guardado para la sesión.
 *
 * Se guarda la primera llegada con UTMs y no se pisa al navegar: si la persona
 * entra desde un anuncio de Meta y después abre /tienda, la compra sigue
 * contando para ese anuncio. Solo parámetros de campaña, nunca datos de la
 * persona. `sessionStorage` puede fallar (modo privado, almacenamiento
 * bloqueado): en ese caso simplemente no hay atribución.
 */

const CLAVE = 'tryvex.atribucion.v1'
const PARAMETROS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'] as const

export type Atribucion = Partial<Record<(typeof PARAMETROS)[number], string>>

export function guardarAtribucion(): void {
  if (typeof window === 'undefined') return
  try {
    if (sessionStorage.getItem(CLAVE)) return
    const url = new URLSearchParams(location.search)
    const datos: Atribucion = {}
    for (const p of PARAMETROS) {
      const valor = url.get(p)?.trim()
      if (valor) datos[p] = valor.slice(0, 150)
    }
    if (Object.keys(datos).length > 0) sessionStorage.setItem(CLAVE, JSON.stringify(datos))
  } catch {
    // Sin almacenamiento no hay atribución; la página sigue igual.
  }
}

export function leerAtribucion(): Atribucion {
  if (typeof window === 'undefined') return {}
  try {
    const crudo = sessionStorage.getItem(CLAVE)
    return crudo ? (JSON.parse(crudo) as Atribucion) : {}
  } catch {
    return {}
  }
}
