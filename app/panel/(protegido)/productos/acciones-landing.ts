'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID } from '@/lib/catalogo'
import { BUCKET, nombreArchivo, PESO_MAXIMO, TIPOS_ACEPTADOS, urlPublica } from '@/lib/imagenes'
import { normalizarLanding, type Bloque } from '@/lib/landing-producto'

/**
 * Lee la landing de un producto para el editor del panel (con los bloques
 * ocultos). `disponible: false` significa que la columna aún no existe en la
 * base: el editor lo avisa en vez de fallar con un error técnico.
 */
export async function leerLandingPanel(productoId: string): Promise<Resultado<{ bloques: Bloque[]; slug: string; disponible: boolean }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(productoId)) return fallo('Producto no válido.')

  const { data, error } = await sesion.supabase.from('productos').select('slug,landing').eq('id', productoId).maybeSingle()
  if (error) {
    // Columna inexistente: la migración de la landing no se ha aplicado.
    if (/landing/i.test(error.message)) return { ok: true, bloques: [], slug: '', disponible: false }
    return fallo(error.message)
  }
  if (!data) return fallo('Ese producto ya no existe.')
  return { ok: true, bloques: normalizarLanding(data.landing, productoId), slug: data.slug as string, disponible: true }
}

/** Guarda la landing entera. Lo que llega se valida y se recorta: es entrada no confiable. */
export async function guardarLanding(productoId: string, bloques: unknown): Promise<Resultado<{ bloques: Bloque[] }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(productoId)) return fallo('Producto no válido.')

  const limpios = normalizarLanding(bloques, productoId)
  const { data, error } = await sesion.supabase
    .from('productos')
    .update({ landing: limpios, updated_at: new Date().toISOString() })
    .eq('id', productoId)
    .select('slug')
  if (error) return fallo(error.message)
  if (!data || data.length === 0) return fallo('Ese producto ya no existe.')

  revalidatePath(`/producto/${data[0].slug}`)
  return { ok: true, bloques: limpios }
}

/**
 * Sube una imagen de la landing a `productos/<id>/landing/…`. Cae bajo la
 * carpeta del producto, que es lo que exige la policy del bucket, así que no
 * hace falta ninguna regla nueva en la base.
 */
export async function subirImagenLanding(datos: FormData): Promise<Resultado<{ url: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const productoId = String(datos.get('producto_id') ?? '')
  const archivo = datos.get('archivo')
  if (!UUID.test(productoId)) return fallo('Producto no válido.')
  if (!(archivo instanceof File) || archivo.size === 0) return fallo('Elige una imagen para subir.')
  if (!TIPOS_ACEPTADOS.includes(archivo.type as (typeof TIPOS_ACEPTADOS)[number]))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO)
    return fallo(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  const { data: producto, error: errorLectura } = await sesion.supabase.from('productos').select('id').eq('id', productoId).maybeSingle()
  if (errorLectura) return fallo(errorLectura.message)
  if (!producto) return fallo('Ese producto ya no existe.')

  // nombreArchivo da `<id>/<nombre>-<sufijo>.<ext>`; se mete bajo `landing/` para no mezclar con la galería.
  const ruta = nombreArchivo(productoId, archivo.name).replace(`${productoId}/`, `${productoId}/landing/`)
  const { error } = await sesion.supabase.storage.from(BUCKET).upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (error) return fallo(`No se pudo subir: ${error.message}`)

  return { ok: true, url: urlPublica(ruta) }
}
