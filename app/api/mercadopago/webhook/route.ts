import { consultarOrden, firmaValida } from '@/lib/mercadopago'
import { confirmarPagoDePedido } from '@/lib/confirmar-pago'
import { revalidatePath } from 'next/cache'

/**
 * Avisos de pago de Mercado Pago.
 *
 * Tres reglas gobiernan este endpoint:
 *
 * 1. Se valida la firma antes de mirar el contenido. Es una URL pública: sin
 *    firma, cualquiera podría anunciar pagos que no existen.
 * 2. No se le cree al mensaje. La firma dice que el aviso es auténtico, no que
 *    el pago esté acreditado. El estado se consulta contra la API.
 * 3. Se responde 200 salvo que queramos un reintento. Mercado Pago reintenta
 *    mientras no reciba 2xx, y un aviso que nunca vamos a poder procesar
 *    reintentado para siempre es ruido, no resiliencia.
 */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(peticion: Request) {
  const secreto = process.env.MP_WEBHOOK_SECRET
  if (!secreto) {
    console.error('[mercadopago] falta MP_WEBHOOK_SECRET: no se puede validar el aviso')
    // 503: es un problema nuestro de configuración, que reintenten.
    return new Response(null, { status: 503 })
  }

  const url = new URL(peticion.url)
  const dataIdUrl = url.searchParams.get('data.id')

  const cuerpo = (await peticion.json().catch(() => null)) as
    | { type?: string; action?: string; data?: { id?: string } }
    | null

  // El manifiesto se arma con el `data.id` de los query params, que es lo que
  // Mercado Pago firmó. El del cuerpo solo sirve de respaldo.
  const dataId = dataIdUrl ?? cuerpo?.data?.id ?? null

  if (
    !firmaValida({
      xSignature: peticion.headers.get('x-signature'),
      xRequestId: peticion.headers.get('x-request-id'),
      dataId,
      secreto,
    })
  ) {
    console.warn('[mercadopago] aviso con firma inválida, descartado')
    return new Response(null, { status: 401 })
  }

  // Firmado pero de otro tipo (contracargos, etc.): recibido y nada que hacer.
  if (cuerpo?.type && cuerpo.type !== 'order') {
    return Response.json({ recibido: true, ignorado: cuerpo.type })
  }
  if (!dataId) return Response.json({ recibido: true, ignorado: 'sin data.id' })

  const orden = await consultarOrden(dataId)
  if (!orden) {
    // No pudimos preguntar: puede ser un corte momentáneo de la API. Que
    // reintenten, porque la información sigue estando allá.
    return new Response(null, { status: 503 })
  }

  if (!orden.pagada) {
    // `created`, `processing`, un rechazo… Todavía no hay plata acreditada, y
    // el aviso bueno llegará después. Nada que hacer, pero recibido.
    return Response.json({ recibido: true, estado: orden.estado, detalle: orden.detalle })
  }

  if (!orden.referenciaExterna) {
    console.error('[mercadopago] order pagada sin referencia externa', { id: orden.id })
    return Response.json({ recibido: true, error: 'sin referencia' })
  }

  const resultado = await confirmarPagoDePedido({
    referenciaExterna: orden.referenciaExterna,
    proveedor: 'mercadopago',
    referenciaPago: orden.id,
    totalPagado: orden.total,
  })

  if (!resultado.ok) {
    // Cobrado de verdad, pero no pudimos reflejarlo. Queda en el log para que
    // una persona lo revise; reintentar no lo va a arreglar solo.
    console.error('[mercadopago] pago acreditado que no se pudo confirmar', {
      order: orden.id,
      referencia: orden.referenciaExterna,
      error: resultado.error,
    })
    return Response.json({ recibido: true, error: resultado.error })
  }

  if (resultado.aplicado) {
    revalidatePath('/panel/pedidos')
    revalidatePath('/cuenta')
  }

  return Response.json({ recibido: true, pedido: resultado.numero, aplicado: resultado.aplicado })
}
