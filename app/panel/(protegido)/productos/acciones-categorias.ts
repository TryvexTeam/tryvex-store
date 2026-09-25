'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID, numeroOpcional, textoOpcional } from '@/lib/catalogo'
import { BUCKET, PESO_MAXIMO, TIPOS_ACEPTADOS, nombreArchivo, slugificar } from '@/lib/imagenes'

function revalidar(): void {
  revalidatePath('/panel/productos')
  revalidatePath('/')
  revalidatePath('/tienda')
  revalidatePath('/api/feed/productos')
}

/** Crea o actualiza una categoría. El slug se genera del nombre si no viene. */
export async function guardarCategoria(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const nombre = String(datos.get('nombre') ?? '').trim()
  const descripcion = textoOpcional(datos.get('descripcion'), 400)
  const orden = numeroOpcional(datos.get('orden'))
  const slugCrudo = String(datos.get('slug') ?? '').trim()
  const slug = slugificar(slugCrudo || nombre)

  if (id && !UUID.test(id)) return fallo('Categoría no válida.')
  if (!nombre) return fallo('La categoría necesita un nombre.')
  if (nombre.length > 60) return fallo('El nombre es demasiado largo.')
  if (!orden.ok || (orden.valor !== null && !Number.isInteger(orden.valor)))
    return fallo('El orden debe ser un número entero.')

  const fila = { nombre, slug, descripcion, orden: orden.valor ?? 0 }
  const { error } = id
    ? await supabase.from('categorias').update(fila).eq('id', id)
    : await supabase.from('categorias').insert(fila)

  if (error) {
    if (error.code === '23505') return fallo(`Ya existe una categoría con la dirección «${slug}».`)
    return fallo(error.message)
  }
  revalidar()
  return { ok: true }
}

/**
 * Borra una categoría solo si está vacía.
 *
 * Con productos adentro, borrarla los dejaría sin lugar en la tienda sin que
 * nadie lo note. Se pide moverlos primero, y se dice cuántos son.
 */
export async function borrarCategoria(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  if (!UUID.test(id)) return fallo('Categoría no válida.')

  const { count } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', id)

  if ((count ?? 0) > 0)
    return fallo(
      `Tiene ${count} ${count === 1 ? 'producto' : 'productos'}. Muévelos a otra categoría antes de borrarla.`
    )

  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

export async function alternarCategoria(id: string, activo: boolean): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Categoría no válida.')
  const { error } = await sesion.supabase.from('categorias').update({ activo }).eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

/**
 * Sube la foto de una categoría para la fila de familias de la tienda.
 *
 * Va al bucket `productos`, bajo `categorias/<id>/`, igual que las fotos de
 * productos (mismas policies de escritura del equipo y mismo dominio ya
 * permitido para servir imágenes). La anterior se borra después de guardar
 * la nueva: si algo falla antes, la categoría sigue con una foto que existe.
 */
export async function subirFotoCategoria(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const archivo = datos.get('archivo')
  if (!UUID.test(id)) return fallo('Categoría no válida.')
  if (!(archivo instanceof File) || archivo.size === 0) return fallo('No llegó ninguna imagen.')
  if (!TIPOS_ACEPTADOS.includes(archivo.type as (typeof TIPOS_ACEPTADOS)[number]))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO)
    return fallo(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  const { data: actual, error: errLectura } = await supabase.from('categorias').select('imagen_url').eq('id', id).maybeSingle()
  if (errLectura) return fallo(errLectura.message)
  if (!actual) return fallo('La categoría ya no existe.')

  // El nombre lo decide el servidor: del archivo solo se usa la extensión.
  const ruta = nombreArchivo(`categorias/${id}`, archivo.name)
  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (errSubida) return fallo(`No se pudo subir: ${errSubida.message}`)

  const { error } = await supabase.from('categorias').update({ imagen_url: ruta }).eq('id', id)
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo(error.message)
  }
  const anterior = actual.imagen_url as string | null
  if (anterior && anterior.startsWith(`categorias/${id}/`)) await supabase.storage.from(BUCKET).remove([anterior])

  revalidar()
  revalidatePath('/tienda')
  return { ok: true }
}

/** Quita la foto propia: la tienda vuelve a usar la del primer producto. */
export async function quitarFotoCategoria(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  if (!UUID.test(id)) return fallo('Categoría no válida.')

  const { data: actual } = await supabase.from('categorias').select('imagen_url').eq('id', id).maybeSingle()
  const { error } = await supabase.from('categorias').update({ imagen_url: null }).eq('id', id)
  if (error) return fallo(error.message)
  const anterior = (actual?.imagen_url as string | null) ?? null
  if (anterior && anterior.startsWith(`categorias/${id}/`)) await supabase.storage.from(BUCKET).remove([anterior])

  revalidar()
  revalidatePath('/tienda')
  return { ok: true }
}
