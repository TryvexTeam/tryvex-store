import 'server-only'

/**
 * Aviso de venta por Telegram, además del push.
 *
 * Existe por el sonido: una app web no puede elegir con qué suena su
 * notificación, pero Telegram sí deja ponerle a un chat un sonido propio. El
 * bot escribe cada venta en el grupo del equipo, y ese grupo suena con la caja
 * registradora (`public/sonidos/venta.mp3`) en iPhone y en Android, con el
 * teléfono bloqueado.
 *
 * Configuración: `TELEGRAM_BOT_TOKEN` (lo entrega @BotFather) y
 * `TELEGRAM_CHAT_ID` (el grupo del equipo). Sin ellas, esto no hace nada.
 * Como todo aviso, nunca lanza: la venta ya quedó registrada.
 */

export interface AvisoTelegram {
  titulo: string
  cuerpo: string
  /** Enlace absoluto del botón «Ver pedido». */
  url: string
  imagen?: string | null
}

const API = 'https://api.telegram.org'

function configuracion(): { token: string; chat: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chat = process.env.TELEGRAM_CHAT_ID
  if (!token || !chat) return null
  return { token, chat }
}

export function telegramDisponible(): boolean {
  return configuracion() !== null
}

/** Telegram interpreta HTML: el nombre de un cliente no puede inyectar marcado. */
function escapar(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

async function llamar(token: string, metodo: string, cuerpo: Record<string, unknown>): Promise<boolean> {
  const respuesta = await fetch(`${API}/bot${token}/${metodo}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(8000),
  })
  if (respuesta.ok) return true
  const detalle = (await respuesta.json().catch(() => null)) as { description?: string } | null
  // El token viaja en la URL: se registra solo la descripción del error.
  console.error('[telegram] el aviso no salió', { metodo, estado: respuesta.status, detalle: detalle?.description })
  return false
}

export async function avisarPorTelegram(aviso: AvisoTelegram): Promise<boolean> {
  const config = configuracion()
  if (!config) return false
  try {
    const texto = `<b>${escapar(aviso.titulo)}</b>\n${escapar(aviso.cuerpo)}`
    const boton = { inline_keyboard: [[{ text: 'Ver pedido', url: aviso.url }]] }

    // Con foto, el mensaje se reconoce de un vistazo. Si Telegram no puede
    // bajar la imagen, se reintenta como texto: el aviso importa más que la foto.
    if (aviso.imagen?.startsWith('https://')) {
      const conFoto = await llamar(config.token, 'sendPhoto', {
        chat_id: config.chat,
        photo: aviso.imagen,
        caption: texto,
        parse_mode: 'HTML',
        reply_markup: boton,
      })
      if (conFoto) return true
    }
    return await llamar(config.token, 'sendMessage', {
      chat_id: config.chat,
      text: texto,
      parse_mode: 'HTML',
      reply_markup: boton,
      link_preview_options: { is_disabled: true },
    })
  } catch (e) {
    console.error('[telegram] falló el aviso', { e: e instanceof Error ? e.message : 'desconocido' })
    return false
  }
}
