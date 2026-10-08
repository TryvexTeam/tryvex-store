'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { BUCKET, PESO_MAXIMO, PESO_MAXIMO_VIDEO, TIPOS_ACEPTADOS, TIPOS_VIDEO, esVideo, urlPublica } from '@/lib/imagenes'
import { TIPOS_DESTINO, type TipoDestino } from '@/lib/destinos-pieza'
import { validarBorrador } from '@/lib/escena-borrador'

/**
 * Guardado de las piezas editables de la portada.
 *
 * Cada pieza es una fila de `secciones_landing` identificada por su `clave`.
 * Aquí solo se escribe el `contenido`: la clave nunca se crea desde el panel,
 * porque una clave inventada sería una ranura que ningún componente dibuja —
 * el equipo creería haber publicado algo que no aparece en ninguna parte.
 */

/**
 * Hace visible un cambio en la portada. La portada guarda sus datos 5 minutos
 * en un caché propio (`portada`); sin invalidarlo, guardar aquí y mirar la
 * tienda seguía mostrando lo anterior, y parecía que el guardado no servía.
 */
function publicar() {
  revalidatePath('/')
  revalidatePath('/panel/portada')
  updateTag('portada')
}

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
    if (valor.startsWith('/') && !valor.startsWith('//')) return null
    if (!/^https?:\/\//i.test(valor)) return 'La dirección debe empezar con / para el propio sitio, o con https://'
  }
  return null
}

/** Lee y valida el destino `<prefijo>_tipo` / `<prefijo>_valor` del formulario. */
function destinoDelFormulario(datos: FormData, prefijo: string): { destino: { tipo: TipoDestino; valor?: string } } | { error: string } {
  const crudo = String(datos.get(`${prefijo}_tipo`) ?? 'ninguno')
  const tipo = (TIPOS_DESTINO as readonly string[]).includes(crudo) ? (crudo as TipoDestino) : 'ninguno'
  const valor = texto(datos, `${prefijo}_valor`)
  const error = validarDestino(tipo, valor)
  if (error) return { error }
  return { destino: tipo === 'ninguno' ? { tipo } : { tipo, valor } }
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

  publicar()
  return { ok: true, url }
}

export async function guardarPieza(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const clave = String(datos.get('clave') ?? '').trim()
  if (!clave) return fallo('Falta la pieza que se quiere guardar.')

  const leido = destinoDelFormulario(datos, 'destino')
  if ('error' in leido) return fallo(leido.error)
  // Las escenas del banner se guardan con `guardarEscena`: aquí solo las franjas.
  if (clave.startsWith('heroe-')) return fallo('Las escenas del banner se guardan desde su propio editor.')

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
    destino: leido.destino,
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

  publicar()
  return { ok: true }
}

/* ── Escenas del banner ───────────────────────────────────────────────
   El editor trabaja sobre un borrador en pantalla y nada toca la tienda hasta
   «Publicar». Subir una imagen o un video solo los deja en el bucket; el
   servidor los aplica al guardar y, recién entonces, borra los archivos que
   dejaron de usarse. Así cancelar no rompe la portada, y quitar un video no
   deja una tienda apuntando a un archivo ya borrado. */

type Supabase = Extract<Awaited<ReturnType<typeof exigirIntegrante>>, { ok: true }>['supabase']

const escenaValida = (clave: string): boolean => /^heroe-[a-z0-9-]+$/.test(clave)

/** Ruta del bucket a partir de la URL pública guardada, si es un archivo de esa escena. */
function rutaDeArchivo(url: unknown, clave: string): string | null {
  if (typeof url !== 'string') return null
  const marca = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marca)
  const ruta = i > -1 ? url.slice(i + marca.length) : ''
  return ruta.startsWith(`campana/${clave}/`) && !ruta.includes('..') ? ruta : null
}

export async function subirImagenEscena(datos: FormData): Promise<Resultado<{ url: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const clave = String(datos.get('clave') ?? '').trim()
  const campo = CAMPOS_IMAGEN.find((c) => c === String(datos.get('campo') ?? ''))
  if (!escenaValida(clave) || !campo) return fallo('Falta indicar qué imagen se está cambiando.')

  const archivo = datos.get('archivo')
  if (!(archivo instanceof File) || archivo.size === 0) return fallo('Elige una imagen para subir.')
  if (!(TIPOS_ACEPTADOS as readonly string[]).includes(archivo.type)) return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO) return fallo(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  const punto = archivo.name.lastIndexOf('.')
  const ext = (punto > -1 ? archivo.name.slice(punto + 1) : 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const ruta = `campana/${clave}/${campo}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await sesion.supabase.storage.from(BUCKET).upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (error) return fallo(`No se pudo subir: ${error.message}`)
  return { ok: true, url: urlPublica(ruta) }
}

export async function pedirSubidaVideoEscena(clave: string, tipo: string, peso: number): Promise<Resultado<{ ruta: string; token: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!escenaValida(clave)) return fallo('Solo las escenas del banner llevan video aquí.')
  if (!TIPOS_VIDEO.includes(tipo as (typeof TIPOS_VIDEO)[number])) return fallo('Formato de video no admitido. Usa MP4 o WebM.')
  if (!Number.isFinite(peso) || peso <= 0) return fallo('El video llegó vacío.')
  if (peso > PESO_MAXIMO_VIDEO) return fallo(`El video pesa ${(peso / 1024 / 1024).toFixed(1)} MB y el máximo son 30 MB.`)

  const extension = tipo === 'video/webm' ? 'webm' : 'mp4'
  const ruta = `campana/${clave}/video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`
  const { data, error } = await sesion.supabase.storage.from(BUCKET).createSignedUploadUrl(ruta)
  if (error || !data) return fallo(`No se pudo preparar la subida: ${error?.message ?? 'sin respuesta'}`)
  return { ok: true, ruta, token: data.token }
}

/** Confirma que el video terminó de subirse y devuelve su URL; aún no lo aplica. */
export async function confirmarVideoEscena(clave: string, ruta: string): Promise<Resultado<{ url: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const carpeta = `campana/${clave}`
  if (!escenaValida(clave) || !ruta.startsWith(`${carpeta}/`) || ruta.includes('..') || !esVideo(ruta)) return fallo('Ese video no es de la escena.')
  const archivo = ruta.slice(carpeta.length + 1)
  const { data, error } = await sesion.supabase.storage.from(BUCKET).list(carpeta, { search: archivo })
  if (error) return fallo(error.message)
  if (!data?.some((o) => o.name === archivo)) return fallo('El video no terminó de subirse. Inténtalo de nuevo.')
  return { ok: true, url: urlPublica(ruta) }
}

async function borrarHuerfanos(supabase: Supabase, clave: string, antes: Record<string, unknown>, despues: Record<string, unknown>) {
  const rutas = (['foto_movil', 'foto_escritorio', 'video', 'video_movil'] as const)
    .filter((k) => antes[k] !== despues[k])
    .flatMap((k) => rutaDeArchivo(antes[k], clave) ?? [])
  if (rutas.length) await supabase.storage.from(BUCKET).remove(rutas)
}

/**
 * Guarda una escena completa. Lo que llega se valida de nuevo aquí: el
 * navegador no es de fiar. Devuelve el borrador ya normalizado para que el
 * editor muestre exactamente lo que quedó guardado.
 */
export async function guardarEscena(clave: string, visible: boolean, borrador: unknown): Promise<Resultado<{ guardado: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  if (!escenaValida(clave)) return fallo('Esa escena no existe.')

  const leido = validarBorrador(borrador)
  if (!leido.ok) return fallo(leido.error)

  const { data: actual, error: errLectura } = await supabase.from('secciones_landing').select('contenido').eq('clave', clave).maybeSingle()
  if (errLectura) return fallo('No pudimos leer la escena. Intenta de nuevo.')
  if (!actual) return fallo('Esa escena ya no existe.')

  const previo = (actual.contenido ?? {}) as Record<string, unknown>
  // `tono`, `estilo` y demás campos de fábrica se conservan; solo se pisa lo que el editor maneja.
  const contenido = { ...previo, ...leido.borrador }
  const { error } = await supabase
    .from('secciones_landing')
    .update({ contenido, visible, updated_at: new Date().toISOString(), updated_by: sesion.integranteId })
    .eq('clave', clave)
  if (error) return fallo('No pudimos guardar los cambios.')

  await borrarHuerfanos(supabase, clave, previo, contenido)
  publicar()
  return { ok: true, guardado: JSON.stringify(leido.borrador) }
}

/** Muestra u oculta una escena sin abrir su editor. */
export async function cambiarVisibilidadEscena(clave: string, visible: boolean): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!escenaValida(clave)) return fallo('Esa escena no existe.')
  const { error } = await sesion.supabase
    .from('secciones_landing')
    .update({ visible, updated_at: new Date().toISOString(), updated_by: sesion.integranteId })
    .eq('clave', clave)
  if (error) return fallo('No pudimos cambiar la visibilidad.')
  publicar()
  return { ok: true }
}
