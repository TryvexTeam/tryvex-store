'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { BUCKET, PESO_MAXIMO_VIDEO, TIPOS_VIDEO, esVideo, urlPublica } from '@/lib/imagenes'
import { CLAVE_FOCO, LARGO_FRASE, MODOS_FOCO, type ModoFoco } from '@/lib/foco'

/**
 * Escena en foco: producto, frases, modo y video.
 *
 * El video no pasa por el servidor: Vercel corta los envíos de más de
 * 4,5 MB. El servidor firma la subida (`pedirSubidaVideoFoco`), el navegador
 * la hace directo al bucket y `confirmarVideoFoco` la aplica a la escena.
 */

const CARPETA = `campana/${CLAVE_FOCO}`

async function leerContenido(supabase: SupabaseClient): Promise<Resultado<{ contenido: Record<string, unknown> }>> {
  const { data, error } = await supabase.from('secciones_landing').select('contenido').eq('clave', CLAVE_FOCO).maybeSingle()
  if (error) return fallo('No pudimos leer la escena. Intenta de nuevo.')
  if (!data) return fallo('La escena en foco todavía no está creada en la base.')
  return { ok: true, contenido: (data.contenido ?? {}) as Record<string, unknown> }
}

async function escribir(
  supabase: SupabaseClient,
  integranteId: string,
  contenido: Record<string, unknown>,
  visible?: boolean,
): Promise<Resultado> {
  const { error } = await supabase
    .from('secciones_landing')
    .update({
      contenido,
      ...(visible === undefined ? {} : { visible }),
      updated_at: new Date().toISOString(),
      updated_by: integranteId,
    })
    .eq('clave', CLAVE_FOCO)
  if (error) return fallo('No pudimos guardar la escena.')
  revalidatePath('/')
  revalidatePath('/panel/portada')
  return { ok: true }
}

/** Ruta del bucket a partir de la URL pública guardada, si es nuestra. */
function rutaDeUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null
  const marca = `/storage/v1/object/public/${BUCKET}/`
  const i = url.indexOf(marca)
  const ruta = i > -1 ? url.slice(i + marca.length) : ''
  return ruta.startsWith(`${CARPETA}/`) ? ruta : null
}

/** Guarda producto, modo, frases y visibilidad. El video se gestiona aparte. */
export async function guardarFoco(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const producto = String(datos.get('producto') ?? '').trim()
  if (producto) {
    const { data } = await supabase.from('productos').select('slug').eq('slug', producto).maybeSingle()
    if (!data) return fallo('Ese producto no existe. Elige uno de la lista.')
  }

  const modoCrudo = String(datos.get('modo') ?? 'bucle')
  const modo: ModoFoco = (MODOS_FOCO as readonly string[]).includes(modoCrudo) ? (modoCrudo as ModoFoco) : 'bucle'

  const frases = [0, 1, 2].map((i) => ({
    antes: String(datos.get(`frase_${i}_antes`) ?? '').trim().slice(0, LARGO_FRASE),
    resaltado: String(datos.get(`frase_${i}_resaltado`) ?? '').trim().slice(0, LARGO_FRASE),
  }))

  const leido = await leerContenido(supabase)
  if (!leido.ok) return leido

  return escribir(
    supabase,
    sesion.integranteId,
    { ...leido.contenido, tipo: 'foco', producto: producto || null, modo, frases },
    datos.get('visible') === 'on',
  )
}

/** Paso 1 del video: validar y firmar una subida de un solo uso. */
export async function pedirSubidaVideoFoco(
  nombre: string,
  tipo: string,
  peso: number,
): Promise<Resultado<{ ruta: string; token: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  if (!TIPOS_VIDEO.includes(tipo as (typeof TIPOS_VIDEO)[number])) return fallo('Formato de video no admitido. Usa MP4 o WebM.')
  if (!Number.isFinite(peso) || peso <= 0) return fallo('El video llegó vacío.')
  if (peso > PESO_MAXIMO_VIDEO) return fallo(`El video pesa ${(peso / 1024 / 1024).toFixed(1)} MB y el máximo son 30 MB.`)

  // El nombre lo decide el servidor; del original no se usa nada.
  void nombre
  const extension = tipo === 'video/webm' ? 'webm' : 'mp4'
  const ruta = `${CARPETA}/video-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${extension}`

  const { data, error } = await sesion.supabase.storage.from(BUCKET).createSignedUploadUrl(ruta)
  if (error || !data) return fallo(`No se pudo preparar la subida: ${error?.message ?? 'sin respuesta'}`)
  return { ok: true, ruta, token: data.token }
}

/** Paso 2 del video: comprobar que llegó y dejarlo aplicado en la escena. */
export async function confirmarVideoFoco(ruta: string): Promise<Resultado<{ url: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  // La ruta vuelve del navegador: carpeta, extensión y existencia real.
  if (!ruta.startsWith(`${CARPETA}/`) || ruta.includes('..') || !esVideo(ruta)) return fallo('Ese video no es de la escena.')
  const archivo = ruta.slice(CARPETA.length + 1)
  const { data: encontrados, error: errLista } = await supabase.storage.from(BUCKET).list(CARPETA, { search: archivo })
  if (errLista) return fallo(errLista.message)
  if (!encontrados?.some((o) => o.name === archivo)) return fallo('El video no terminó de subirse. Inténtalo de nuevo.')

  const leido = await leerContenido(supabase)
  if (!leido.ok) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return leido
  }

  const anterior = rutaDeUrl(leido.contenido.video)
  const url = urlPublica(ruta)
  const r = await escribir(supabase, sesion.integranteId, { ...leido.contenido, tipo: 'foco', video: url })
  if (!r.ok) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return r
  }
  // El reemplazado se borra después de guardar: si algo falla antes, la
  // escena sigue con un video que existe.
  if (anterior && anterior !== ruta) await supabase.storage.from(BUCKET).remove([anterior])
  return { ok: true, url }
}

/** Quita el video: la escena vuelve a la foto del producto. */
export async function quitarVideoFoco(): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const leido = await leerContenido(supabase)
  if (!leido.ok) return leido
  const anterior = rutaDeUrl(leido.contenido.video)
  const r = await escribir(supabase, sesion.integranteId, { ...leido.contenido, video: null })
  if (r.ok && anterior) await supabase.storage.from(BUCKET).remove([anterior])
  return r
}
