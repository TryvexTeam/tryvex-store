'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { BUCKET, PESO_MAXIMO, TIPOS_ACEPTADOS, urlPublica } from '@/lib/imagenes'

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
