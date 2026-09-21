import crypto from 'node:crypto'

/**
 * Mercado Pago — Checkout Pro sobre la Orders API.
 *
 * Se habla con la API por `fetch` en vez del SDK: son tres llamadas, y así el
 * header `X-Idempotency-Key` queda bajo nuestro control. El SDK, si no se le
 * pasa una clave, genera una nueva en cada intento — que es justo lo contrario
 * de lo que sirve para no cobrar dos veces.
 *
 * Todo lo de aquí es de servidor. El Access Token nunca sale de este proceso.
 */

const API = 'https://api.mercadopago.com'

/** Orders API: los montos viajan como string. CLP no tiene decimales. */
export const montoCLP = (pesos: number) => String(Math.round(pesos))

export interface ItemOrden {
  titulo: string
  cantidad: number
  precioUnitario: number
}

export interface OrdenCreada {
  id: string
  checkoutUrl: string
}

function accessToken(): string {
  const t = process.env.MP_ACCESS_TOKEN
  if (!t) throw new Error('Falta MP_ACCESS_TOKEN')
  return t
}

/**
 * Crea la order y devuelve a dónde mandar al comprador.
 *
 * `total` debe ser exactamente la suma de los ítems: la API rechaza cualquier
 * descuadre con `order_items_total_amount_mismatch`. Por eso el envío entra
 * como un ítem más y no como un campo aparte — así el cuadre es por
 * construcción y no depende de una interpretación nuestra.
 *
 * `claveIdempotencia` debe ser estable por pedido. Si el comprador recarga o
 * hace doble clic, Mercado Pago reconoce el reintento en vez de abrir una
 * segunda order por el mismo carro.
 */
export async function crearOrden(params: {
  total: number
  items: ItemOrden[]
  emailComprador: string
  referenciaExterna: string
  claveIdempotencia: string
  urlBase: string
}): Promise<OrdenCreada> {
  const { total, items, emailComprador, referenciaExterna, claveIdempotencia, urlBase } = params

  const suma = items.reduce((a, i) => a + i.precioUnitario * i.cantidad, 0)
  if (Math.round(suma) !== Math.round(total)) {
    throw new Error(`Los ítems suman ${suma} y el total dice ${total}`)
  }

  const respuesta = await fetch(`${API}/v1/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken()}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': claveIdempotencia,
    },
    body: JSON.stringify({
      type: 'online',
      processing_mode: 'manual',
      total_amount: montoCLP(total),
      external_reference: referenciaExterna.slice(0, 64),
      expiration_time: 'P1D',
      payer: { email: emailComprador },
      items: items.map((i) => ({
        title: i.titulo.slice(0, 256),
        quantity: i.cantidad,
        unit_price: montoCLP(i.precioUnitario),
        unit_measure: 'unit',
      })),
      config: {
        online: {
          success_url: `${urlBase}/comprar/resultado?estado=exito`,
          failure_url: `${urlBase}/comprar/resultado?estado=error`,
          pending_url: `${urlBase}/comprar/resultado?estado=pendiente`,
          auto_return: 'approved',
        },
      },
    }),
  })

  const cuerpo = (await respuesta.json().catch(() => null)) as
    | { id?: string; checkout_url?: string; message?: string; error?: string }
    | null

  if (!respuesta.ok || !cuerpo?.id || !cuerpo?.checkout_url) {
    // El detalle va al log del servidor, no al comprador: puede incluir datos
    // de la cuenta del vendedor.
    console.error('[mercadopago] no se pudo crear la order', {
      status: respuesta.status,
      error: cuerpo?.error,
      message: cuerpo?.message,
    })
    throw new Error('No se pudo iniciar el pago')
  }

  // En Orders el campo es `checkout_url`. En la API vieja de Preferences se
  // llamaba `init_point`; no existe aquí.
  return { id: cuerpo.id, checkoutUrl: cuerpo.checkout_url }
}

export interface EstadoOrden {
  id: string
  estado: string
  detalle: string | null
  referenciaExterna: string | null
  total: number | null
  /** Única combinación que significa dinero acreditado de verdad. */
  pagada: boolean
}

/**
 * Consulta el estado real de una order.
 *
 * Es la fuente de verdad del pago. Ni el cuerpo del webhook ni el parámetro
 * que trae la URL de retorno sirven para dar un pedido por pagado: el primero
 * podría venir de cualquiera, y el segundo lo escribe el navegador del
 * comprador.
 */
export async function consultarOrden(id: string): Promise<EstadoOrden | null> {
  const respuesta = await fetch(`${API}/v1/orders/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${accessToken()}` },
    cache: 'no-store',
  })
  if (!respuesta.ok) {
    console.error('[mercadopago] no se pudo consultar la order', { id, status: respuesta.status })
    return null
  }

  const o = (await respuesta.json().catch(() => null)) as {
    id?: string
    status?: string
    status_detail?: string
    external_reference?: string
    total_amount?: string
  } | null
  if (!o?.id) return null

  return {
    id: o.id,
    estado: o.status ?? '',
    detalle: o.status_detail ?? null,
    referenciaExterna: o.external_reference ?? null,
    total: o.total_amount ? Number(o.total_amount) : null,
    pagada: o.status === 'processed' && o.status_detail === 'accredited',
  }
}

/**
 * Valida que una notificación venga de verdad de Mercado Pago.
 *
 * El manifiesto es `id:<data.id>;request-id:<x-request-id>;ts:<ts>;` firmado con
 * HMAC-SHA256 usando la clave secreta del panel.
 *
 * Detalle que hace fallar integraciones enteras: los ids de order llegan en
 * MAYÚSCULAS (`ORD01J...`) y hay que pasarlos a minúsculas antes de firmar. Con
 * la API vieja los ids eran numéricos y daba igual; aquí, si se omite, la firma
 * jamás calza y el síntoma es "el pago se aprueba pero el pedido nunca avanza".
 *
 * Si falta algún dato del manifiesto, ese segmento se omite en vez de firmarse
 * vacío.
 */
export function firmaValida(params: {
  xSignature: string | null
  xRequestId: string | null
  dataId: string | null
  secreto: string
  toleranciaSegundos?: number
}): boolean {
  const { xSignature, xRequestId, dataId, secreto, toleranciaSegundos = 600 } = params
  if (!xSignature || !secreto) return false

  let ts: string | null = null
  let recibido: string | null = null
  for (const parte of xSignature.split(',')) {
    const i = parte.indexOf('=')
    if (i === -1) continue
    const clave = parte.slice(0, i).trim()
    const valor = parte.slice(i + 1).trim()
    if (clave === 'ts') ts = valor
    else if (clave === 'v1') recibido = valor
  }
  if (!ts || !recibido) return false

  const segmentos: string[] = []
  if (dataId) segmentos.push(`id:${dataId.toLowerCase()}`)
  if (xRequestId) segmentos.push(`request-id:${xRequestId}`)
  segmentos.push(`ts:${ts}`)
  const manifiesto = segmentos.join(';') + ';'

  const calculado = crypto.createHmac('sha256', secreto).update(manifiesto).digest('hex')

  const a = Buffer.from(calculado, 'utf8')
  const b = Buffer.from(recibido, 'utf8')
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false

  // Una firma válida capturada hoy no debería servir la semana que viene.
  const enviado = Number(ts)
  if (Number.isFinite(enviado)) {
    const ahora = Date.now()
    const enMs = enviado > 1e12 ? enviado : enviado * 1000
    if (Math.abs(ahora - enMs) > toleranciaSegundos * 1000) return false
  }
  return true
}
