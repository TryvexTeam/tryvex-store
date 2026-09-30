'use server'

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

/** Crea una reseña para cualquier producto del catálogo. */
export async function crearResena(datos: FormData): Promise<Resultado<{ id: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const productoId = String(datos.get('producto_id') ?? '')
  const cliente = String(datos.get('cliente_nombre') ?? '').trim()
  const texto = String(datos.get('texto') ?? '').trim()
  const calificacion = leerCalificacion(datos)

  if (!UUID.test(productoId)) return fallo('Elige un producto válido.')
  if (!cliente || cliente.length > 120) return fallo('Indica el nombre del cliente (máximo 120 caracteres).')
  if (!texto || texto.length > 1200) return fallo('La reseña debe tener entre 1 y 1.200 caracteres.')
  if (typeof calificacion !== 'number') return calificacion

  const { data: producto, error: errorProducto } = await sesion.supabase
    .from('productos')
    .select('id')
    .eq('id', productoId)
    .maybeSingle()
  if (errorProducto) return fallo(errorProducto.message)
  if (!producto) return fallo('Ese producto no existe.')

  const { data, error } = await sesion.supabase
    .from('resenas_tienda')
    .insert({
      producto_id: productoId,
      cliente_nombre: cliente,
      texto,
      calificacion,
      visible: datos.get('visible') === 'on',
      created_by: sesion.integranteId,
    })
    .select('id')
    .single()

  if (error) return fallo(error.message)
  revalidar()
  return { ok: true, id: data.id }
}

/** Edita el texto, la calificación y el nombre de una reseña ya creada. */
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

  const { data: filas, error } = await sesion.supabase
    .from('resenas_tienda')
    .update({ cliente_nombre: cliente, texto, calificacion, updated_at: new Date().toISOString() })
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
  if (!(TIPOS_FOTO_RESENA as readonly string[]).includes(archivo.type))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO_FOTO_RESENA)
    return fallo(`La foto pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  const { data: resena, error: errorLectura } = await sesion.supabase
    .from('resenas_tienda')
    .select('id,foto_path')
    .eq('id', id)
    .maybeSingle()
  if (errorLectura) return fallo(errorLectura.message)
  if (!resena) return fallo('La reseña ya no existe.')

  const ruta = nombreFotoResena(id, archivo.name)
  const { error: errorSubida } = await sesion.supabase.storage
    .from(BUCKET_RESENAS)
    .upload(ruta, archivo, { cacheControl: '31536000', upsert: true })
  if (errorSubida) return fallo(`No se pudo subir la foto: ${errorSubida.message}`)

  const { error: errorUpdate } = await sesion.supabase
    .from('resenas_tienda')
    .update({ foto_path: ruta, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (errorUpdate) return fallo(errorUpdate.message)

  if (resena.foto_path && resena.foto_path !== ruta)
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
