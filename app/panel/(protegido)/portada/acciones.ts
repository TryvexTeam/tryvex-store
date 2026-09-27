'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { BUCKET, PESO_MAXIMO, PESO_MAXIMO_VIDEO, TIPOS_ACEPTADOS, TIPOS_VIDEO, esVideo, urlPublica } from '@/lib/imagenes'

/**
 * Guardado de las piezas editables de la portada.
 *
 * Cada pieza es una fila de `secciones_landing` identificada por su `clave`.
 * Aquí solo se escribe el `contenido`: la clave nunca se crea desde el panel,
 * porque una clave inventada sería una ranura que ningún componente dibuja —
 * el equipo creería haber publicado algo que no aparece en ninguna parte.
 */

const TIPOS_DESTINO = ['ninguno', 'url', 'seccion', 'producto', 'categoria'] as const
type TipoDestino = (typeof TIPOS_DESTINO)[number]

const LARGO_MAX = 240

function texto(datos: FormData, campo: string): string {
  return String(datos.get(campo) ?? '').trim().slice(0, LARGO_MAX)
}

/**
 * Valida el destino antes de guardarlo.
 * Una dirección que no sea interna ni http(s) se rechaza en el panel y no
 * solo al dibujarla: así el equipo ve el error mientras edita, en vez de
 * publicar un enlace muerto y enterarse por un cliente.
 */
function validarDestino(tipo: TipoDestino, valor: string): string | null {
  if (tipo === 'ninguno') return null
  if (!valor) return 'Elegiste un destino pero no indicaste a dónde lleva.'
  if (tipo === 'url') {
    if (valor.startsWith('/')) return null
    if (!/^https?:\/\//i.test(valor)) return 'La dirección debe empezar con / para el propio sitio, o con https://'
  }
  return null
}

/** Los dos huecos de imagen que tiene cada pieza. */
const CAMPOS_IMAGEN = ['foto_movil', 'foto_escritorio'] as const

/**
 * Sube una imagen y la deja aplicada en la pieza, en un solo paso.
 *
 * Va al bucket `productos`, bajo `campana/`, en vez de a un bucket propio:
 * ese bucket ya es público para lectura y tiene las policies de escritura del
 * equipo, y el dominio ya está permitido para servir imágenes. Un bucket nuevo
 * significaría repetir esas tres cosas y arriesgarse a que una quede floja.
 *
 * El nombre lo decide el servidor: del archivo que llega solo se aprovecha la
 * extensión, ya saneada. Así un nombre con rutas o caracteres raros no puede
 * escribir donde no debe.
 */
export async function subirImagenPieza(datos: FormData): Promise<Resultado<{ url: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const clave = String(datos.get('clave') ?? '').trim()
  const campoCrudo = String(datos.get('campo') ?? '')
  const campo = CAMPOS_IMAGEN.find((c) => c === campoCrudo)
  if (!clave || !campo) return fallo('Falta indicar qué imagen se está cambiando.')

  const archivo = datos.get('archivo')
  if (!(archivo instanceof File) || archivo.size === 0) return fallo('Elige una imagen para subir.')

  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')

  if (archivo.size > PESO_MAXIMO)
    return fallo(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  const punto = archivo.name.lastIndexOf('.')
  const ext = (punto > -1 ? archivo.name.slice(punto + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const sufijo = Math.random().toString(36).slice(2, 8)
  const ruta = `campana/${clave}/${campo}-${sufijo}.${ext}`

  const { error: errSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (errSubida) return fallo(`No se pudo subir: ${errSubida.message}`)

  const { data: actual } = await supabase
    .from('secciones_landing')
    .select('contenido')
    .eq('clave', clave)
    .maybeSingle()

  if (!actual) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo('Esa pieza ya no existe.')
  }

  const url = urlPublica(ruta)
  const contenido = { ...((actual.contenido ?? {}) as Record<string, unknown>), [campo]: url }

  const { error } = await supabase
    .from('secciones_landing')
    .update({ contenido, updated_at: new Date().toISOString(), updated_by: sesion.integranteId })
    .eq('clave', clave)

  // Sin esta limpieza el archivo quedaría ocupando espacio sin que nada lo
  // referencie: basura invisible que nadie vuelve a encontrar.
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo('Subimos la imagen pero no pudimos aplicarla. Intenta de nuevo.')
  }

  revalidatePath('/')
  revalidatePath('/panel/portada')
  return { ok: true, url }
}

export async function guardarPieza(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const clave = String(datos.get('clave') ?? '').trim()
  if (!clave) return fallo('Falta la pieza que se quiere guardar.')

  const tipoCrudo = String(datos.get('destino_tipo') ?? 'ninguno')
  const tipo = (TIPOS_DESTINO as readonly string[]).includes(tipoCrudo) ? (tipoCrudo as TipoDestino) : 'ninguno'
  const valor = texto(datos, 'destino_valor')
  const errorDestino = validarDestino(tipo, valor)
  if (errorDestino) return fallo(errorDestino)

  // Se lee el contenido actual y se fusiona: así los campos que esta pantalla
  // no edita (formato, tono, estilo de la escena) no se pierden al guardar.
  const { data: actual, error: errorLectura } = await supabase
    .from('secciones_landing')
    .select('contenido')
    .eq('clave', clave)
    .maybeSingle()

  if (errorLectura) return fallo('No pudimos leer la pieza. Intenta de nuevo.')
  if (!actual) return fallo('Esa pieza ya no existe.')

  const previo = (actual.contenido ?? {}) as Record<string, unknown>
  const contenido: Record<string, unknown> = {
    ...previo,
    titulo: texto(datos, 'titulo'),
    bajada: texto(datos, 'bajada'),
    alt: texto(datos, 'alt'),
    foto_movil: texto(datos, 'foto_movil'),
    foto_escritorio: texto(datos, 'foto_escritorio'),
    destino: tipo === 'ninguno' ? { tipo: 'ninguno' } : { tipo, valor },
  }

  const { error } = await supabase
    .from('secciones_landing')
    .update({
      contenido,
      visible: datos.get('visible') === 'on',
      updated_at: new Date().toISOString(),
      updated_by: sesion.integranteId,
    })
    .eq('clave', clave)

  if (error) return fallo('No pudimos guardar los cambios.')

  revalidatePath('/')
  revalidatePath('/panel/portada')
  return { ok: true }
}

/* ── Video de una escena del banner ───────────────────────────────────
   Mismo camino que el video de la escena en foco: el servidor firma la
   subida, el navegador la hace directo al bucket (Vercel corta los envíos de
   más de 4,5 MB) y el servidor la confirma y la deja aplicada. Vive bajo
   `campana/<clave>/`, que ya cubren las reglas de escritura de la portada. */

async function contenidoDeEscena(
  supabase: Awaited<ReturnType<typeof exigirIntegrante>> extends infer R ? (R extends { supabase: infer S } ? S : never) : never,
  clave: string,
): Promise<Resultado<{ contenido: Record<string, unknown> }>> {
  if (!clave.startsWith('heroe-')) return fallo('Solo las escenas del banner llevan video aquí.')
  const { data, error } = await supabase.from('secciones_landing').select('contenido').eq('clave', clave).maybeSingle()
  if (error) return fallo('No pudimos leer la escena. Intenta de nuevo.')
  if (!data) return fallo('Esa escena ya no existe.')
  return { ok: true, contenido: (data.contenido ?? {}) as Record<string, unknown> }
}

/** Ruta del bucket a partir de la URL pública guardada, si es de esa escena. */
function rutaDeVideo(url: unknown, clave: string): string | null {
  if (typeof url !== 'string') return null
  const marca = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marca)
  const ruta = i > -1 ? url.slice(i + marca.length) : ''
  return ruta.startsWith(`campana/${clave}/`) ? ruta : null
}

export async function pedirSubidaVideoEscena(clave: string, tipo: string, peso: number): Promise<Resultado<{ ruta: string; token: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!TIPOS_VIDEO.includes(tipo as (typeof TIPOS_VIDEO)[number])) return fallo('Formato de video no admitido. Usa MP4 o WebM.')
  if (!Number.isFinite(peso) || peso <= 0) return fallo('El video llegó vacío.')
  if (peso > PESO_MAXIMO_VIDEO) return fallo(`El video pesa ${(peso / 1024 / 1024).toFixed(1)} MB y el máximo son 30 MB.`)

  const leido = await contenidoDeEscena(sesion.supabase, clave)
  if (!leido.ok) return leido

  const extension = tipo === 'video/webm' ? 'webm' : 'mp4'
  const ruta = `campana/${clave}/video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { data, error } = await sesion.supabase.storage.from(BUCKET).createSignedUploadUrl(ruta)
  if (error || !data) return fallo(`No se pudo preparar la subida: ${error?.message ?? 'sin respuesta'}`)
  return { ok: true, ruta, token: data.token }
}

export async function confirmarVideoEscena(clave: string, ruta: string): Promise<Resultado<{ url: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const carpeta = `campana/${clave}`
  if (!ruta.startsWith(`${carpeta}/`) || ruta.includes('..') || !esVideo(ruta)) return fallo('Ese video no es de la escena.')
  const archivo = ruta.slice(carpeta.length + 1)
  const { data: encontrados, error: errLista } = await supabase.storage.from(BUCKET).list(carpeta, { search: archivo })
  if (errLista) return fallo(errLista.message)
  if (!encontrados?.some((o) => o.name === archivo)) return fallo('El video no terminó de subirse. Inténtalo de nuevo.')

  const leido = await contenidoDeEscena(supabase, clave)
  if (!leido.ok) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return leido
  }
  const anterior = rutaDeVideo(leido.contenido.video, clave)
  const url = urlPublica(ruta)
  const { error } = await supabase
    .from('secciones_landing')
    .update({ contenido: { ...leido.contenido, video: url }, updated_at: new Date().toISOString(), updated_by: sesion.integranteId })
    .eq('clave', clave)
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo('No pudimos guardar el video.')
  }
  if (anterior && anterior !== ruta) await supabase.storage.from(BUCKET).remove([anterior])

  revalidatePath('/')
  revalidatePath('/panel/portada')
  return { ok: true, url }
}

export async function quitarVideoEscena(clave: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  const leido = await contenidoDeEscena(supabase, clave)
  if (!leido.ok) return leido
  const anterior = rutaDeVideo(leido.contenido.video, clave)
  const { error } = await supabase
    .from('secciones_landing')
    .update({ contenido: { ...leido.contenido, video: null }, updated_at: new Date().toISOString(), updated_by: sesion.integranteId })
    .eq('clave', clave)
  if (error) return fallo('No pudimos quitar el video.')
  if (anterior) await supabase.storage.from(BUCKET).remove([anterior])
  revalidatePath('/')
  revalidatePath('/panel/portada')
  return { ok: true }
}
