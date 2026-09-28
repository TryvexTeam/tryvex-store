import 'server-only'

import webpush, { WebPushError } from 'web-push'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * Avisos push al equipo, como los de Shopify: «Nuevo pedido pagado».
 *
 * Llegan al teléfono aunque el panel esté cerrado, siempre que la persona lo
 * haya instalado como app (en iPhone es obligatorio: iOS solo entrega push a
 * apps web agregadas a la pantalla de inicio) y haya aceptado el permiso.
 *
 * Un aviso que no sale nunca puede voltear nada: se llama después de que la
 * venta quedó registrada, y todo error se anota y se traga aquí.
 */

export interface AvisoEquipo {
  titulo: string
  cuerpo: string
  /** Ruta del panel que se abre al tocar el aviso. */
  url: string
  /** Avisos con la misma etiqueta se reemplazan en vez de apilarse. */
  etiqueta: string
  /**
   * Foto grande dentro del aviso (la del producto vendido). Android la muestra
   * al expandir la notificación; iPhone la ignora.
   */
  imagen?: string | null
}

interface Suscripcion {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

/** Un día: si el teléfono está apagado, la venta de ayer ya no es noticia. */
const VIGENCIA_SEGUNDOS = 60 * 60 * 24

let configurado: boolean | null = null

function configurar(): boolean {
  if (configurado !== null) return configurado
  const publica = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const privada = process.env.VAPID_PRIVATE_KEY
  const sujeto = process.env.VAPID_SUBJECT ?? 'mailto:tryvexentreprise@gmail.com'
  if (!publica || !privada) {
    console.warn('[push] faltan las claves VAPID: los avisos al equipo están apagados')
    configurado = false
    return false
  }
  webpush.setVapidDetails(sujeto, publica, privada)
  configurado = true
  return true
}

export function pushDisponible(): boolean {
  return configurar()
}

/**
 * Manda el aviso a todos los dispositivos suscritos. Las suscripciones que el
 * servicio de push da por muertas (404/410: la app se desinstaló o se revocó
 * el permiso) se borran para no insistir con ellas.
 */
export async function avisarAlEquipo(aviso: AvisoEquipo, soloIntegrante?: string): Promise<{ enviados: number; fallidos: number }> {
  if (!configurar()) return { enviados: 0, fallidos: 0 }

  try {
    const db = crearClienteAdministrador()
    let consulta = db.from('push_suscripciones').select('id,endpoint,p256dh,auth')
    if (soloIntegrante) consulta = consulta.eq('integrante_id', soloIntegrante)
    const { data, error } = await consulta
    if (error) {
      console.error('[push] no se pudieron leer las suscripciones', { error: error.message })
      return { enviados: 0, fallidos: 0 }
    }

    const suscripciones = (data ?? []) as Suscripcion[]
    const carga = JSON.stringify(aviso)
    const muertas: string[] = []
    const vivas: string[] = []

    const resultados = await Promise.allSettled(
      suscripciones.map((s) =>
        webpush
          .sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, carga, {
            TTL: VIGENCIA_SEGUNDOS,
            urgency: 'high',
            topic: aviso.etiqueta.slice(0, 32).replace(/[^A-Za-z0-9_-]/g, '-'),
          })
          .then(() => vivas.push(s.id))
          .catch((e: unknown) => {
            if (e instanceof WebPushError && (e.statusCode === 404 || e.statusCode === 410)) muertas.push(s.id)
            else console.error('[push] el aviso no salió', { estado: e instanceof WebPushError ? e.statusCode : null })
            throw e
          })
      )
    )

    if (muertas.length) await db.from('push_suscripciones').delete().in('id', muertas)
    if (vivas.length) await db.from('push_suscripciones').update({ ultimo_envio_at: new Date().toISOString() }).in('id', vivas)

    const enviados = resultados.filter((r) => r.status === 'fulfilled').length
    return { enviados, fallidos: resultados.length - enviados }
  } catch (e) {
    console.error('[push] falló el envío de avisos', { e })
    return { enviados: 0, fallidos: 0 }
  }
}
