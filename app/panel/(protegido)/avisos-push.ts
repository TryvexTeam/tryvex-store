'use server'

import { crearClienteServidor } from '@/lib/supabase/servidor'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { avisarAlEquipo, pushDisponible } from '@/lib/push'

/**
 * Suscripciones de avisos push del equipo.
 *
 * La tabla no tiene permisos para las sesiones del navegador: estas acciones
 * comprueban que quien llama es integrante activo y recién ahí escriben con la
 * clave de servicio, siempre a nombre de ese integrante.
 */

type Resultado = { ok: true; mensaje?: string } | { ok: false; error: string }

export interface SuscripcionNavegador {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

async function integranteId(): Promise<string | null> {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('dim_integrantes')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  return data?.id ?? null
}

/**
 * Los servicios de push de los navegadores son un puñado de hosts conocidos.
 * Aceptar cualquier URL convertiría al servidor en un cliente que hace POST
 * a donde le digan.
 */
const SERVICIOS_PUSH = [
  /\.push\.apple\.com$/,
  /^fcm\.googleapis\.com$/,
  /^android\.googleapis\.com$/,
  /\.notify\.windows\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /\.push\.services\.mozilla\.com$/,
]

function suscripcionValida(s: SuscripcionNavegador | null | undefined): s is SuscripcionNavegador {
  if (!s || typeof s.endpoint !== 'string' || !s.keys) return false
  let url: URL
  try {
    url = new URL(s.endpoint)
  } catch {
    return false
  }
  if (url.protocol !== 'https:' || s.endpoint.length > 1000) return false
  if (!SERVICIOS_PUSH.some((r) => r.test(url.hostname))) return false
  const base64url = /^[A-Za-z0-9_-]+=*$/
  return (
    typeof s.keys.p256dh === 'string' && base64url.test(s.keys.p256dh) && s.keys.p256dh.length >= 20 && s.keys.p256dh.length <= 200 &&
    typeof s.keys.auth === 'string' && base64url.test(s.keys.auth) && s.keys.auth.length >= 8 && s.keys.auth.length <= 100
  )
}

export async function activarAvisos(sub: SuscripcionNavegador, dispositivo: string): Promise<Resultado> {
  if (!pushDisponible()) return { ok: false, error: 'Los avisos todavía no están configurados en el servidor.' }
  const id = await integranteId()
  if (!id) return { ok: false, error: 'Tu sesión expiró. Vuelve a entrar.' }
  if (!suscripcionValida(sub)) return { ok: false, error: 'El navegador entregó una suscripción que no reconocemos.' }

  // El endpoint identifica al dispositivo: reactivar en el mismo teléfono
  // actualiza su fila en vez de duplicarla.
  const { error } = await crearClienteAdministrador()
    .from('push_suscripciones')
    .upsert(
      {
        integrante_id: id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        dispositivo: dispositivo.slice(0, 200) || null,
      },
      { onConflict: 'endpoint' }
    )
  if (error) return { ok: false, error: 'No pudimos guardar este dispositivo. Intenta de nuevo.' }
  return { ok: true }
}

export async function desactivarAvisos(endpoint: string): Promise<Resultado> {
  const id = await integranteId()
  if (!id) return { ok: false, error: 'Tu sesión expiró. Vuelve a entrar.' }
  const { error } = await crearClienteAdministrador()
    .from('push_suscripciones')
    .delete()
    .eq('endpoint', endpoint)
    .eq('integrante_id', id)
  if (error) return { ok: false, error: 'No pudimos desactivar los avisos. Intenta de nuevo.' }
  return { ok: true }
}

/** Aviso de prueba solo a los dispositivos de quien lo pide. */
export async function probarAvisos(): Promise<Resultado> {
  const id = await integranteId()
  if (!id) return { ok: false, error: 'Tu sesión expiró. Vuelve a entrar.' }
  const r = await avisarAlEquipo(
    {
      titulo: 'Nuevo pedido pagado · $45.000',
      cuerpo: 'Así se ve cada venta. Este es un aviso de prueba.',
      url: '/panel/pedidos',
      etiqueta: 'prueba',
    },
    id
  )
  if (!r.enviados) return { ok: false, error: 'No salió ningún aviso. Desactiva y vuelve a activar en este teléfono.' }
  return { ok: true, mensaje: r.enviados === 1 ? 'Aviso enviado.' : `Aviso enviado a tus ${r.enviados} dispositivos.` }
}
