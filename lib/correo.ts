import 'server-only'

import { Resend } from 'resend'

/**
 * Correos de la tienda.
 *
 * Un correo que no sale nunca debe tumbar una venta: si Resend falla o la
 * clave no está puesta, se anota en el log y el pedido sigue su curso. El
 * cliente prefiere una compra que funciona sin aviso, a un aviso perfecto y
 * una compra caída.
 *
 * El dominio `tryvex.tech` ya está verificado en Resend —su DKIM y su SPF
 * están en el DNS—, así que los correos salen firmados y no caen en spam.
 */

const DESDE = process.env.RESEND_FROM ?? 'Tryvex Store <hola@tryvex.tech>'

/**
 * A dónde llegan las respuestas.
 *
 * El remitente tiene que ser del dominio verificado en Resend, y ahí no hay
 * nadie leyendo. El pie del correo invita a responder, así que la respuesta
 * tiene que caer en un buzón real: el correo de contacto de la tienda.
 */
const RESPONDER_A = process.env.RESEND_REPLY_TO ?? null

function cliente(): Resend | null {
  const clave = process.env.RESEND_API_KEY
  if (!clave) return null
  return new Resend(clave)
}

interface Envio {
  para: string
  asunto: string
  html: string
  texto: string
}

async function enviar({ para, asunto, html, texto }: Envio): Promise<boolean> {
  const resend = cliente()
  if (!resend) {
    console.warn('[correo] falta RESEND_API_KEY: no se envió', { asunto })
    return false
  }
  try {
    const { error } = await resend.emails.send({
      from: DESDE,
      to: para,
      subject: asunto,
      html,
      text: texto,
      ...(RESPONDER_A ? { replyTo: RESPONDER_A } : {}),
    })
    if (error) {
      console.error('[correo] Resend rechazó el envío', { asunto, error: error.message })
      return false
    }
    return true
  } catch (e) {
    console.error('[correo] no se pudo enviar', { asunto, e })
    return false
  }
}

const clp = (n: number) => '$' + Math.round(n).toLocaleString('es-CL')

/**
 * Plantilla base.
 *
 * HTML de correo, que no es HTML web: tablas en vez de grid, estilos en línea
 * en vez de hojas, y ancho fijo. Gmail y Outlook descartan casi todo lo demás.
 */
function plantilla(params: { titulo: string; saludo: string; cuerpo: string; boton?: { texto: string; url: string } }): string {
  const { titulo, saludo, cuerpo, boton } = params
  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:32px 32px 0;">
          <p style="margin:0;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#e0322c;">Tryvex</p>
          <h1 style="margin:12px 0 0;font-size:26px;line-height:1.2;font-weight:700;color:#1d1d1f;">${saludo}</h1>
        </td></tr>
        <tr><td style="padding:20px 32px 0;font-size:15px;line-height:1.6;color:#4b4b50;">${cuerpo}</td></tr>
        ${
          boton
            ? `<tr><td style="padding:28px 32px 0;">
                 <a href="${boton.url}" style="display:inline-block;background:#1d1d1f;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 24px;border-radius:999px;">${boton.texto}</a>
               </td></tr>`
            : ''
        }
        <tr><td style="padding:32px;">
          <hr style="border:none;border-top:1px solid #e6e6e9;margin:0 0 16px;">
          <p style="margin:0;font-size:12px;line-height:1.6;color:#8a8a8f;">
            Tryvex Store · Garantía legal de 6 meses (Ley 21.398).<br>
            ¿Dudas? Responde este correo y te ayudamos.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

function listaProductos(items: { nombre: string; cantidad: number; subtotal: number }[]): string {
  return items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;font-size:14px;color:#1d1d1f;">${i.cantidad} × ${i.nombre}</td>
         <td style="padding:6px 0;font-size:14px;color:#1d1d1f;text-align:right;white-space:nowrap;">${clp(i.subtotal)}</td></tr>`
    )
    .join('')
}

export interface DatosCorreoPedido {
  para: string
  nombre: string | null
  numero: number
  total: number
  items: { nombre: string; cantidad: number; subtotal: number }[]
  urlSeguimiento: string
}

/** Se pagó: la venta está cerrada y el pedido entra en preparación. */
export async function correoPagoConfirmado(d: DatosCorreoPedido): Promise<boolean> {
  const nombre = d.nombre?.split(' ')[0] ?? ''
  const cuerpo = `
    <p style="margin:0 0 16px;">Recibimos tu pago del pedido <strong>#${d.numero}</strong>. Ya estamos preparando tu envío.</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;border-top:1px solid #e6e6e9;border-bottom:1px solid #e6e6e9;padding:8px 0;">
      ${listaProductos(d.items)}
      <tr><td style="padding:12px 0 6px;font-size:15px;font-weight:700;color:#1d1d1f;">Total</td>
          <td style="padding:12px 0 6px;font-size:15px;font-weight:700;color:#1d1d1f;text-align:right;">${clp(d.total)}</td></tr>
    </table>
    <p style="margin:0;">Te avisamos apenas salga en camino.</p>`
  return enviar({
    para: d.para,
    asunto: `Pago confirmado · Pedido #${d.numero}`,
    html: plantilla({
      titulo: `Pago confirmado · Pedido #${d.numero}`,
      saludo: nombre ? `Gracias, ${nombre}.` : 'Gracias por tu compra.',
      cuerpo,
      boton: { texto: 'Seguir mi pedido', url: d.urlSeguimiento },
    }),
    texto:
      `Recibimos tu pago del pedido #${d.numero}. Total ${clp(d.total)}.\n` +
      `Ya estamos preparando tu envío.\nSíguelo acá: ${d.urlSeguimiento}`,
  })
}

export interface DatosCorreoDespacho extends DatosCorreoPedido {
  courier: string | null
  codigo: string | null
}

/** Salió: el paquete va en camino y el cliente puede seguirlo. */
export async function correoPedidoEnCamino(d: DatosCorreoDespacho): Promise<boolean> {
  const nombre = d.nombre?.split(' ')[0] ?? ''
  const conCodigo =
    d.codigo && d.courier
      ? `<p style="margin:0 0 16px;">Lo lleva <strong>${d.courier}</strong>, con el código <strong style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${d.codigo}</strong>.</p>`
      : ''
  const cuerpo = `
    <p style="margin:0 0 16px;">Tu pedido <strong>#${d.numero}</strong> ya va en camino.</p>
    ${conCodigo}
    <p style="margin:0;">Puedes seguir su recorrido cuando quieras, sin iniciar sesión.</p>`
  return enviar({
    para: d.para,
    asunto: `Tu pedido #${d.numero} va en camino`,
    html: plantilla({
      titulo: `Pedido #${d.numero} en camino`,
      saludo: nombre ? `Ya salió, ${nombre}.` : 'Tu pedido ya salió.',
      cuerpo,
      boton: { texto: 'Ver dónde está', url: d.urlSeguimiento },
    }),
    texto:
      `Tu pedido #${d.numero} va en camino.` +
      (d.codigo ? ` Lo lleva ${d.courier} con el código ${d.codigo}.` : '') +
      `\nSíguelo acá: ${d.urlSeguimiento}`,
  })
}
