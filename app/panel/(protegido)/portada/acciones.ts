'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { BUCKET, PESO_MAXIMO, PESO_MAXIMO_VIDEO, TIPOS_ACEPTADOS, TIPOS_VIDEO, esVideo, urlPublica } from '@/lib/imagenes'
import { DIVISIONES, MAX_CAPSULAS, TIPOS_DESTINO, esDivision, leerPosicion, type TipoDestino } from '@/lib/destinos-pieza'
import { ACENTOS, TEMAS_TEXTO, esHex } from '@/lib/temas-escena'

/**
 * Guardado de las piezas editables de la portada.
 *
 * Cada pieza es una fila de `secciones_landing` identificada por su `clave`.
 * Aquí solo se escribe el `contenido`: la clave nunca se crea desde el panel,
 * porque una clave inventada sería una ranura que ningún componente dibuja —
 * el equipo creería haber publicado algo que no aparece en ninguna parte.
 */

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

/**
 * Campos propios de una escena del banner: textos, afiche sin texto y zonas.
 * Cada zona se valida como un destino más, con su número en el mensaje, para
 * que quien edita sepa cuál corregir.
 */
function camposDeEscena(datos: FormData): Record<string, unknown> | { error: string } {
  const divisionCruda = String(datos.get('division') ?? 'completa')
  const division = esDivision(divisionCruda) ? divisionCruda : 'completa'
  const zonas: { destino: unknown; etiqueta: string }[] = []
  if (division !== 'completa') {
    for (let i = 0; i < DIVISIONES[division].length; i++) {
      const leido = destinoDelFormulario(datos, `zona_${i}`)
      if ('error' in leido) return { error: `Zona ${i + 1}: ${leido.error}` }
      zonas.push({ destino: leido.destino, etiqueta: texto(datos, `zona_${i}_etiqueta`).slice(0, 80) })
    }
  }
  const capsulas: Record<string, unknown>[] = []
  const cuantas = Math.min(MAX_CAPSULAS, Math.max(0, Number(datos.get('capsulas_n')) || 0))
  for (let i = 0; i < cuantas; i++) {
    const p = `capsula_${i}`
    const leido = destinoDelFormulario(datos, p)
    if ('error' in leido) return { error: `Cápsula ${i + 1}: ${leido.error}` }
    const t = texto(datos, `${p}_texto`).slice(0, 60)
    if (!t && leido.destino.tipo !== 'producto') return { error: `Cápsula ${i + 1}: escribe un texto, o haz que lleve a un producto para mostrar su precio.` }
    // «x,y» de la rejilla; cualquier otro valor cae a la posición por defecto.
    const posicion = (campo: string, porDefecto: { x: 0 | 50 | 100; y: 0 | 50 | 100 }) => {
      const [x, y] = String(datos.get(campo) ?? '').split(',')
      return leerPosicion({ x, y }, porDefecto)
    }
    capsulas.push({
      texto: t,
      boton: texto(datos, `${p}_boton`).slice(0, 30),
      destino: leido.destino,
      movil: posicion(`${p}_movil`, { x: 50, y: 100 }),
      escritorio: posicion(`${p}_escritorio`, { x: 100, y: 100 }),
    })
  }
  return {
    capsulas,
    antetitulo: texto(datos, 'antetitulo'),
    etiqueta: texto(datos, 'etiqueta').slice(0, 40),
    titulo_1: texto(datos, 'titulo_1').slice(0, 80),
    titulo_2: texto(datos, 'titulo_2').slice(0, 80),
    boton: texto(datos, 'boton').slice(0, 40),
    sin_texto: datos.get('sin_texto') === 'on',
    // Solo valores de la lista o un hex: el color termina en un `style` de la portada.
    tema_texto: TEMAS_TEXTO.find((t) => t.valor === datos.get('tema_texto'))?.valor ?? 'auto',
    acento: ACENTOS.find((a) => a.valor === datos.get('acento'))?.valor ?? 'auto',
    acento_libre: esHex(datos.get('acento_libre')) ? String(datos.get('acento_libre')).toLowerCase() : null,
    division,
    zonas,
  }
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

  const leido = destinoDelFormulario(datos, 'destino')
  if ('error' in leido) return fallo(leido.error)
  const escena = clave.startsWith('heroe-') ? camposDeEscena(datos) : null
  if (escena && 'error' in escena) return fallo(String(escena.error))

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
    // Las escenas no tienen «título» suelto: su titular son dos líneas.
    ...(escena ? escena : { titulo: texto(datos, 'titulo') }),
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
