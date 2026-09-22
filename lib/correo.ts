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

/** El texto de un correo viaja por HTML: hay que escapar lo que venga de la base. */
const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/* ── Paleta ────────────────────────────────────────────────────────────────
   Los mismos tonos de la tienda, escritos en hexadecimal: un correo no tiene
   variables CSS ni clases, cada color va donde se usa. */
const TINTA = '#111113'
const TINTA_SUAVE = '#5c5c63'
const GRIS = '#8e8e96'
const BORDE = '#e8e8ec'
const PAPEL = '#ffffff'
const FONDO = '#f4f4f6'
const SPARK = '#e0322c'

const FUENTE = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`

/**
 * De dónde salen las imágenes del correo.
 *
 * Tienen que ser URLs absolutas y públicas: el correo se abre lejos de la
 * tienda, sin sesión y a veces meses después.
 */
const SITIO = (process.env.NEXT_PUBLIC_URL_TIENDA ?? 'https://store.tryvex.tech').replace(/\/$/, '')

/**
 * El logotipo, servido desde el mismo almacén que las fotos del catálogo.
 *
 * No se sirve desde `/public` del sitio a propósito: un correo se abre meses
 * después, y si el archivo cambia de ruta en un despliegue el logo desaparece
 * de todos los correos ya enviados, sin aviso. El almacén es estable y público.
 *
 * Tampoco va incrustado en base64: Gmail no muestra esas imágenes, y Gmail es
 * donde se leen casi todos estos correos.
 */
const LOGO = process.env.CORREO_LOGO_URL ?? `${SITIO}/correo/tryvex.png`

/**
 * La marca, con el logotipo en PNG.
 *
 * El isotipo va como imagen porque los correos no renderizan SVG, y el nombre
 * va como texto al lado: muchos clientes bloquean las imágenes por defecto, y
 * así la cabecera se lee igual aunque el logo no cargue.
 */
function marca(): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr>
      <td style="padding-right:9px;vertical-align:middle;">
        <img src="${LOGO}" width="26" height="26" alt="" style="display:block;width:26px;height:26px;border:0;">
      </td>
      <td style="vertical-align:middle;font-family:${FUENTE};font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${TINTA};">Tryvex</td>
    </tr>
  </table>`
}

/**
 * Botón que sobrevive a Outlook.
 *
 * Outlook de escritorio usa el motor de Word y descarta `padding` y
 * `border-radius` en un enlace. El bloque VML de arriba le dibuja el botón
 * solo a él; los demás clientes lo ignoran y usan el enlace normal.
 */
function boton(texto: string, url: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
    <tr><td align="center">
      <!--[if mso]>
      <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word"
        href="${url}" style="height:48px;v-text-anchor:middle;width:260px;" arcsize="50%" stroke="f" fillcolor="${TINTA}">
        <w:anchorlock/>
        <center style="color:#ffffff;font-family:${FUENTE};font-size:15px;font-weight:600;">${texto}</center>
      </v:roundrect>
      <![endif]-->
      <!--[if !mso]><!-- -->
      <a href="${url}" style="display:inline-block;background:${TINTA};color:#ffffff;text-decoration:none;font-family:${FUENTE};font-size:15px;font-weight:600;line-height:48px;padding:0 32px;border-radius:999px;">${texto}</a>
      <!--<![endif]-->
    </td></tr>
  </table>`
}

export interface ItemCorreo {
  nombre: string
  cantidad: number
  subtotal: number
  imagen?: string | null
}

/** Cada producto con su foto: reconocer lo comprado de un vistazo. */
function filasProductos(items: ItemCorreo[]): string {
  return items
    .map((i) => {
      const foto = i.imagen
        ? `<img src="${escapar(i.imagen)}" width="52" height="52" alt="" style="display:block;width:52px;height:52px;border-radius:12px;background:${FONDO};object-fit:contain;border:0;">`
        : `<div style="width:52px;height:52px;border-radius:12px;background:${FONDO};"></div>`
      return `
      <tr>
        <td width="52" style="padding:10px 0;vertical-align:middle;">${foto}</td>
        <td style="padding:10px 14px;vertical-align:middle;font-family:${FUENTE};font-size:15px;color:${TINTA};">
          ${escapar(i.nombre)}
          <div style="margin-top:2px;font-size:13px;color:${GRIS};">Cantidad: ${i.cantidad}</div>
        </td>
        <td align="right" style="padding:10px 0;vertical-align:middle;font-family:${FUENTE};font-size:15px;font-weight:600;color:${TINTA};white-space:nowrap;">${clp(i.subtotal)}</td>
      </tr>`
    })
    .join('')
}

interface Plantilla {
  /** Se ve en la bandeja junto al asunto, antes de abrir. */
  vistaPrevia: string
  etiqueta: string
  titulo: string
  bajada: string
  /** Franja destacada: el dato que la persona vino a buscar. */
  destacado?: { rotulo: string; valor: string }
  cuerpo?: string
  boton?: { texto: string; url: string }
}

/**
 * Plantilla base.
 *
 * HTML de correo, que no es HTML web: tablas en vez de grid, estilos en línea
 * en vez de hojas, ancho fijo y nada de flex. Gmail y Outlook descartan casi
 * todo lo demás, así que lo que acá parece anticuado es lo único que llega
 * igual a todos lados.
 */
function plantilla(p: Plantilla): string {
  return `<!doctype html>
<html lang="es" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapar(p.titulo)}</title>
<!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml><![endif]-->
</head>
<body style="margin:0;padding:0;background:${FONDO};">
  <!-- Vista previa: lo que se lee en la bandeja sin abrir el correo. -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapar(p.vistaPrevia)}</div>
  <div style="display:none;max-height:0;overflow:hidden;">&#847;&zwnj;&nbsp;&#8199;&shy;${'&#847;&zwnj;&nbsp;&#8199;&shy;'.repeat(40)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};">
    <tr><td align="center" style="padding:32px 16px;">

      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;">

        <!-- Marca -->
        <tr><td align="center" style="padding:0 0 24px;">${marca()}</td></tr>

        <!-- Tarjeta -->
        <tr><td style="background:${PAPEL};border-radius:22px;overflow:hidden;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">

            <tr><td style="padding:36px 36px 0;">
              <p style="margin:0;font-family:${FUENTE};font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:${SPARK};">${escapar(p.etiqueta)}</p>
              <h1 style="margin:12px 0 0;font-family:${FUENTE};font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-0.02em;color:${TINTA};">${escapar(p.titulo)}</h1>
              <p style="margin:12px 0 0;font-family:${FUENTE};font-size:16px;line-height:1.6;color:${TINTA_SUAVE};">${p.bajada}</p>
            </td></tr>

            ${
              p.destacado
                ? `<tr><td style="padding:26px 36px 0;">
                     <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${FONDO};border-radius:16px;">
                       <tr>
                         <td style="padding:16px 20px;font-family:${FUENTE};font-size:13px;color:${GRIS};">${escapar(p.destacado.rotulo)}</td>
                         <td align="right" style="padding:16px 20px;font-family:${FUENTE};font-size:17px;font-weight:700;color:${TINTA};">${escapar(p.destacado.valor)}</td>
                       </tr>
                     </table>
                   </td></tr>`
                : ''
            }

            ${p.cuerpo ? `<tr><td style="padding:26px 36px 0;">${p.cuerpo}</td></tr>` : ''}

            ${p.boton ? `<tr><td style="padding:30px 36px 0;">${boton(p.boton.texto, p.boton.url)}</td></tr>` : ''}

            <tr><td style="padding:34px 36px 36px;">
              <div style="height:1px;background:${BORDE};margin:0 0 18px;"></div>
              <p style="margin:0;font-family:${FUENTE};font-size:13px;line-height:1.7;color:${GRIS};">
                <strong style="color:${TINTA_SUAVE};">Garantía legal de 6 meses</strong> desde que recibes tu producto (Ley&nbsp;21.398).<br>
                ¿Dudas con tu pedido? Responde este correo y te respondemos.
              </p>
            </td></tr>

          </table>
        </td></tr>

        <tr><td align="center" style="padding:22px 12px 0;">
          <p style="margin:0;font-family:${FUENTE};font-size:12px;line-height:1.7;color:${GRIS};">
            Tryvex Store · Santiago, Chile<br>
            Recibes este correo porque hiciste una compra con nosotros.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body></html>`
}

export interface DatosCorreoPedido {
  para: string
  nombre: string | null
  numero: number
  total: number
  items: ItemCorreo[]
  urlSeguimiento: string
}

/** Se pagó: la venta está cerrada y el pedido entra en preparación. */
export async function correoPagoConfirmado(d: DatosCorreoPedido): Promise<boolean> {
  const nombre = d.nombre?.trim().split(/\s+/)[0] ?? ''
  const cuerpo = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filasProductos(d.items)}
      <tr><td colspan="3" style="padding:6px 0 0;"><div style="height:1px;background:${BORDE};"></div></td></tr>
      <tr>
        <td colspan="2" style="padding:16px 0 0;font-family:${FUENTE};font-size:16px;font-weight:700;color:${TINTA};">Total pagado</td>
        <td align="right" style="padding:16px 0 0;font-family:${FUENTE};font-size:20px;font-weight:700;color:${TINTA};white-space:nowrap;">${clp(d.total)}</td>
      </tr>
    </table>`

  return enviar({
    para: d.para,
    asunto: `Pago confirmado · Pedido #${d.numero}`,
    html: plantilla({
      vistaPrevia: `Tu pago de ${clp(d.total)} entró. Ya preparamos tu pedido #${d.numero}.`,
      etiqueta: 'Pago confirmado',
      titulo: nombre ? `Gracias, ${nombre}.` : 'Gracias por tu compra.',
      bajada: `Recibimos tu pago y ya estamos preparando tu envío. Te avisamos apenas salga.`,
      destacado: { rotulo: 'Número de pedido', valor: `#${d.numero}` },
      cuerpo,
      boton: { texto: 'Seguir mi pedido', url: d.urlSeguimiento },
    }),
    texto:
      `Gracias${nombre ? ', ' + nombre : ''}.\n\n` +
      `Recibimos tu pago del pedido #${d.numero} por ${clp(d.total)}.\n` +
      `Ya estamos preparando tu envío y te avisamos apenas salga.\n\n` +
      `Sigue tu pedido: ${d.urlSeguimiento}`,
  })
}

export interface DatosCorreoDespacho extends DatosCorreoPedido {
  courier: string | null
  codigo: string | null
}

/** Salió: el paquete va en camino y el cliente puede seguirlo. */
export async function correoPedidoEnCamino(d: DatosCorreoDespacho): Promise<boolean> {
  const nombre = d.nombre?.trim().split(/\s+/)[0] ?? ''
  const cuerpo = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filasProductos(d.items)}
    </table>`

  return enviar({
    para: d.para,
    asunto: `Tu pedido #${d.numero} va en camino`,
    html: plantilla({
      vistaPrevia: d.codigo
        ? `Lo lleva ${d.courier ?? 'el courier'} con el código ${d.codigo}.`
        : `Tu pedido #${d.numero} ya salió.`,
      etiqueta: 'En camino',
      titulo: nombre ? `Ya salió, ${nombre}.` : 'Tu pedido ya salió.',
      bajada: `Tu pedido <strong style="color:${TINTA};">#${d.numero}</strong> va en camino. Puedes seguir su recorrido cuando quieras, sin iniciar sesión.`,
      destacado:
        d.codigo && d.courier
          ? { rotulo: escapar(d.courier), valor: escapar(d.codigo) }
          : { rotulo: 'Número de pedido', valor: `#${d.numero}` },
      cuerpo,
      boton: { texto: 'Ver dónde está', url: d.urlSeguimiento },
    }),
    texto:
      `Ya salió${nombre ? ', ' + nombre : ''}.\n\n` +
      `Tu pedido #${d.numero} va en camino.` +
      (d.codigo ? ` Lo lleva ${d.courier} con el código ${d.codigo}.` : '') +
      `\n\nSigue su recorrido: ${d.urlSeguimiento}`,
  })
}

/**
 * Llegó: el pedido se cerró bien.
 *
 * Es el único correo que no resuelve una ansiedad, y por eso es el que puede
 * pedir algo: que vuelvan. Se manda cuando el equipo marca el pedido como
 * entregado, con la garantía a la vista —el momento en que uno se pregunta
 * qué pasa si sale malo— y sin insistir.
 */
export async function correoPedidoEntregado(d: DatosCorreoPedido & { urlTienda?: string }): Promise<boolean> {
  const nombre = d.nombre?.trim().split(/\s+/)[0] ?? ''
  const tienda = (d.urlTienda ?? process.env.NEXT_PUBLIC_URL_TIENDA ?? 'https://store.tryvex.tech').replace(/\/$/, '')
  const cuerpo = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${filasProductos(d.items)}
    </table>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;background:${FONDO};border-radius:16px;">
      <tr><td style="padding:18px 20px;font-family:${FUENTE};font-size:14px;line-height:1.65;color:${TINTA_SUAVE};">
        <strong style="color:${TINTA};">¿Algo no salió como esperabas?</strong><br>
        Tienes 6 meses de garantía legal y 10 días para arrepentirte de tu compra.
        Responde este correo y lo resolvemos.
      </td></tr>
    </table>`

  return enviar({
    para: d.para,
    asunto: `Tu pedido #${d.numero} fue entregado`,
    html: plantilla({
      vistaPrevia: `Tu pedido #${d.numero} llegó. Gracias por comprar en Tryvex.`,
      etiqueta: 'Entregado',
      titulo: nombre ? `Llegó, ${nombre}.` : 'Tu pedido llegó.',
      bajada: `Tu pedido <strong style="color:${TINTA};">#${d.numero}</strong> fue entregado. Esperamos que lo disfrutes.`,
      cuerpo,
      boton: { texto: 'Ver la tienda', url: `${tienda}/tienda` },
    }),
    texto:
      `Llegó${nombre ? ', ' + nombre : ''}.\n\n` +
      `Tu pedido #${d.numero} fue entregado. Esperamos que lo disfrutes.\n\n` +
      `Tienes 6 meses de garantía legal y 10 días para arrepentirte. ` +
      `Si algo no salió como esperabas, responde este correo.\n\n` +
      `${tienda}/tienda`,
  })
}
