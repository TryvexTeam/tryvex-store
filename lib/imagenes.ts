/**
 * Imágenes de catálogo.
 *
 * Viven en el bucket público `productos` de Supabase Storage. Público a
 * propósito: la tienda las muestra sin sesión, así que se sirven por CDN con
 * URL directa. Lo que se protege es la escritura, con las mismas policies
 * `is_integrante()` que gobiernan el resto de la tienda.
 *
 * En la tabla se guardan DOS cosas distintas y conviene no confundirlas:
 *   · `imagen_url` — la portada, una sola, la que sale en la grilla y en la
 *     tienda. Es siempre una de las de `galeria`.
 *   · `galeria`    — jsonb con el orden completo de las imágenes.
 */

export const BUCKET = 'productos'

/** Tipos que acepta el bucket. Debe calzar con `allowed_mime_types`. */
export const TIPOS_ACEPTADOS = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
] as const

/** 5 MB, el mismo `file_size_limit` del bucket. */
export const PESO_MAXIMO = 5 * 1024 * 1024

export const MAX_POR_PRODUCTO = 8

/**
 * URL pública de un objeto del bucket.
 *
 * Se construye a mano en vez de llamar a `getPublicUrl()` porque esto corre
 * también en Server Components, donde crear un cliente solo para resolver una
 * cadena es gasto puro: el formato de la URL pública es estable.
 */
export function urlPublica(ruta: string): string {
  if (!ruta) return ''
  // Ya es una URL absoluta (imágenes cargadas antes de existir el bucket).
  if (/^https?:\/\//i.test(ruta)) return ruta
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/${BUCKET}/${ruta.replace(/^\/+/, '')}`
}

/**
 * Normaliza el jsonb `galeria` a una lista de rutas.
 *
 * Tolera las tres formas que pueden convivir en la columna: lista de strings,
 * lista de objetos `{ ruta }` o `{ url }`, y nulo. Un catálogo que se llena a
 * mano termina con datos de formas distintas; romperse por eso sería frágil.
 */
export function rutasDeGaleria(galeria: unknown): string[] {
  if (!Array.isArray(galeria)) return []
  return galeria
    .map((x) => {
      if (typeof x === 'string') return x
      if (x && typeof x === 'object') {
        const o = x as Record<string, unknown>
        const v = o.ruta ?? o.url ?? o.path
        return typeof v === 'string' ? v : ''
      }
      return ''
    })
    .filter(Boolean)
}

/** Nombre de archivo estable, sin acentos ni espacios, con sufijo aleatorio. */
export function nombreArchivo(productoId: string, original: string): string {
  const punto = original.lastIndexOf('.')
  const ext = (punto > -1 ? original.slice(punto + 1) : 'jpg')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
  const base = (punto > -1 ? original.slice(0, punto) : original)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'imagen'
  const sufijo = Math.random().toString(36).slice(2, 8)
  return `${productoId}/${base}-${sufijo}.${ext || 'jpg'}`
}

/** Slug de producto a partir del nombre. */
export function slugificar(nombre: string): string {
  return (
    nombre
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60) || 'producto'
  )
}

/**
 * ¿Esta ruta vive bajo la carpeta de este producto?
 *
 * La convención es `<producto_id>/<archivo>`, y la hacen cumplir tres capas:
 * esta función en la aplicación, la comprobación de pertenencia a la galería
 * en la Server Action, y la policy del bucket en Postgres. Una ruta llega
 * siempre desde el navegador: es entrada no confiable.
 */
export function esRutaDelProducto(ruta: string, productoId: string): boolean {
  if (!ruta || !productoId) return false
  // Sin rutas absolutas, sin escapes hacia arriba y sin barras al inicio.
  if (ruta.startsWith('/') || ruta.includes('..') || /^https?:/i.test(ruta)) return false
  return ruta.startsWith(`${productoId}/`) && ruta.slice(productoId.length + 1).length > 0
}
