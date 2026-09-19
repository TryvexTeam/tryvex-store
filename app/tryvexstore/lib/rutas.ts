/** Caracteres de control (U+0000–U+001F y U+007F): no pertenecen a una ruta legítima. */
const CONTROL = /[\u0000-\u001f\u007f]/

/**
 * Ruta de retorno segura: solo rutas de este mismo sitio.
 *
 * `//dominio` y `/\dominio` los navegadores los tratan como URL externas, así
 * que un `volver`/`next` con esa forma sería un redirect abierto hacia otro
 * sitio. Todo lo que no sea una ruta interna limpia cae en `porDefecto`.
 */
export function rutaInterna(valor: string | null | undefined, porDefecto: string): string {
  if (typeof valor !== 'string' || !valor.startsWith('/')) return porDefecto
  if (/^\/[\\/]/.test(valor) || CONTROL.test(valor)) return porDefecto
  return valor
}
