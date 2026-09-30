'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { revalidatePath, updateTag } from 'next/cache'
import { exigirIntegrante, fallo, type Fallo, type Resultado } from '@/lib/autorizacion'
import { UUID } from '@/lib/catalogo'
import {
  BUCKET_RESENAS,
  nombreFotoResena,
  PESO_MAXIMO_FOTO_RESENA,
  TIPOS_FOTO_RESENA,
} from '@/lib/resenas'

function revalidar(): void {
  updateTag('resenas')
  revalidatePath('/')
  revalidatePath('/panel/resenas')
}

function leerCalificacion(datos: FormData): number | Fallo {
  const crudo = String(datos.get('calificacion') ?? '5')
  const calificacion = Number(crudo)
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) return fallo('Elige entre 1 y 5 estrellas.')
  return calificacion
}

/**
 * Producto de la reseña. Vacío = reseña de la portada, sin producto (null).
 * Si viene, tiene que ser un producto que exista: el formulario lo ofrece de
 * una lista, pero una Server Action se puede invocar sin pasar por el formulario.
 */
async function leerProducto(supabase: SupabaseClient, datos: FormData): Promise<Resultado<{ productoId: string | null }>> {
  const crudo = String(datos.get('producto_id') ?? '').trim()
  if (!crudo) return { ok: true, productoId: null }
  if (!UUID.test(crudo)) return fallo('Elige un producto válido.')

  const { data, error } = await supabase.from('productos').select('id').eq('id', crudo).maybeSingle()
  if (error) return fallo(error.message)
  if (!data) return fallo('Ese producto no existe.')
  return { ok: true, productoId: crudo }
}

/** La foto es opcional: sin archivo no hay nada que validar. */
function validarFoto(archivo: FormDataEntryValue | null): Fallo | null {
  if (!(archivo instanceof File) || archivo.size === 0) return null
  if (!(TIPOS_FOTO_RESENA as readonly string[]).includes(archivo.type))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO_FOTO_RESENA)
    return fallo(`La foto pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)
  return null
}

/** Sube la foto y la deja asociada a la reseña; borra la anterior si tenía otra ruta. */
async function guardarFoto(supabase: SupabaseClient, id: string, archivo: File, rutaAnterior: string | null): Promise<Resultado> {
  const ruta = nombreFotoResena(id, archivo.name)
  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_RESENAS)
    .upload(ruta, archivo, { cacheControl: '31536000', upsert: true })
  if (errorSubida) return fallo(`No se pudo subir la foto: ${errorSubida.message}`)

  const { error: errorUpdate } = await supabase
    .from('resenas_tienda')
    .update({ foto_path: ruta, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (errorUpdate) return fallo(errorUpdate.message)

  if (rutaAnterior && rutaAnterior !== ruta) await supabase.storage.from(BUCKET_RESENAS).remove([rutaAnterior])
  return { ok: true }
}

/**
 * Crea una reseña para un producto del catálogo o para la portada (sin producto).
 * La foto es opcional y viaja en el mismo envío.
 */
export async function crearResena(datos: FormData): Promise<Resultado<{ id: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const cliente = String(datos.get('cliente_nombre') ?? '').trim()
  const texto = String(datos.get('texto') ?? '').trim()
  const calificacion = leerCalificacion(datos)
  const archivo = datos.get('archivo')

  if (!cliente || cliente.length > 120) return fallo('Indica el nombre del cliente (máximo 120 caracteres).')
  if (!texto || texto.length > 1200) return fallo('La reseña debe tener entre 1 y 1.200 caracteres.')
  if (typeof calificacion !== 'number') return calificacion

  // La foto se valida antes de insertar: así un archivo malo no deja una reseña a medias.
  const falloFoto = validarFoto(archivo)
  if (falloFoto) return falloFoto

  const producto = await leerProducto(sesion.supabase, datos)
  if (!producto.ok) return producto

  const { data, error } = await sesion.supabase
    .from('resenas_tienda')
    .insert({
      producto_id: producto.productoId,
      cliente_nombre: cliente,
      texto,
      calificacion,
      visible: datos.get('visible') === 'on',
      created_by: sesion.integranteId,
    })
    .select('id')
    .single()

  if (error) return fallo(error.message)

  if (archivo instanceof File && archivo.size > 0) {
    const r = await guardarFoto(sesion.supabase, data.id, archivo, null)
    if (!r.ok) {
      // Sin foto la reseña sigue siendo válida, pero quien la crea espera verla
      // completa: se deshace para que reintente desde cero en vez de duplicarla.
      await sesion.supabase.from('resenas_tienda').delete().eq('id', data.id)
      return r
    }
  }

  revalidar()
  return { ok: true, id: data.id }
}

/** Edita el texto, la calificación, el nombre y el producto (o la portada) de una reseña. */
export async function editarResena(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const id = String(datos.get('resena_id') ?? '')
  const cliente = String(datos.get('cliente_nombre') ?? '').trim()
  const texto = String(datos.get('texto') ?? '').trim()
  const calificacion = leerCalificacion(datos)

  if (!UUID.test(id)) return fallo('Reseña no válida.')
  if (!cliente || cliente.length > 120) return fallo('Indica el nombre del cliente (máximo 120 caracteres).')
  if (!texto || texto.length > 1200) return fallo('La reseña debe tener entre 1 y 1.200 caracteres.')
  if (typeof calificacion !== 'number') return calificacion

  const producto = await leerProducto(sesion.supabase, datos)
  if (!producto.ok) return producto

  const { data: filas, error } = await sesion.supabase
    .from('resenas_tienda')
    .update({ producto_id: producto.productoId, cliente_nombre: cliente, texto, calificacion, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) return fallo(error.message)
  if (!filas || filas.length === 0) return fallo('La reseña ya no existe.')

  revalidar()
  return { ok: true }
}

/** Añade o reemplaza la foto de una reseña existente. */
export async function subirFotoResena(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const id = String(datos.get('resena_id') ?? '')
  const archivo = datos.get('archivo')
  if (!UUID.test(id)) return fallo('Reseña no válida.')
  if (!(archivo instanceof File) || archivo.size === 0) return fallo('Elige una foto para subir.')
  const falloFoto = validarFoto(archivo)
  if (falloFoto) return falloFoto

  const { data: resena, error: errorLectura } = await sesion.supabase
    .from('resenas_tienda')
    .select('id,foto_path')
    .eq('id', id)
    .maybeSingle()
  if (errorLectura) return fallo(errorLectura.message)
  if (!resena) return fallo('La reseña ya no existe.')

  const r = await guardarFoto(sesion.supabase, id, archivo, resena.foto_path)
  if (!r.ok) return r

  revalidar()
  return { ok: true }
}

/** Quita la foto de una reseña: la reseña queda sin imagen, que es válido. */
export async function quitarFotoResena(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Reseña no válida.')

  const { data: resena, error: errorLectura } = await sesion.supabase
    .from('resenas_tienda')
    .select('foto_path')
    .eq('id', id)
    .maybeSingle()
  if (errorLectura) return fallo(errorLectura.message)
  if (!resena) return fallo('La reseña ya no existe.')
  if (!resena.foto_path) return { ok: true }

  const { error } = await sesion.supabase
    .from('resenas_tienda')
    .update({ foto_path: null, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo(error.message)
  await sesion.supabase.storage.from(BUCKET_RESENAS).remove([resena.foto_path])

  revalidar()
  return { ok: true }
}

export async function alternarVisibilidadResena(id: string, visible: boolean): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Reseña no válida.')

  const { error } = await sesion.supabase
    .from('resenas_tienda')
    .update({ visible, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

export async function borrarResena(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Reseña no válida.')

  const { data: resena, error: errorLectura } = await sesion.supabase
    .from('resenas_tienda')
    .select('foto_path')
    .eq('id', id)
    .maybeSingle()
  if (errorLectura) return fallo(errorLectura.message)
  if (!resena) return fallo('La reseña ya no existe.')

  const { error } = await sesion.supabase.from('resenas_tienda').delete().eq('id', id)
  if (error) return fallo(error.message)
  if (resena.foto_path) await sesion.supabase.storage.from(BUCKET_RESENAS).remove([resena.foto_path])

  revalidar()
  return { ok: true }
}
