/**
 * Dirección pública de la tienda (https://store.tryvex.tech en producción).
 *
 * Sale de NEXT_PUBLIC_URL_TIENDA, la misma variable que usan los correos y el
 * feed de Google. Si falta o no es una URL válida se usa la de producción:
 * un sitemap o una imagen de vista previa con la dirección equivocada es peor
 * que una con la de siempre.
 */
const PRODUCCION = 'https://store.tryvex.tech'

export function urlSitio(): string {
  const cruda = process.env.NEXT_PUBLIC_URL_TIENDA?.trim()
  if (!cruda) return PRODUCCION
  try {
    const url = new URL(cruda)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : PRODUCCION
  } catch {
    return PRODUCCION
  }
}
