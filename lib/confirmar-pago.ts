import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { correoPagoConfirmado } from '@/lib/correo'
import { urlDeSeguimiento } from '@/lib/seguimiento'

/**
 * Da un pedido por pagado cuando la pasarela confirmó el cobro.
 *
 * El trabajo ocurre dentro de `confirmar_pago_pedido`, una función de la base
 * que corre en una sola transacción con la fila del pedido bloqueada. No es un
 * detalle de estilo: antes esto vivía aquí, leyendo el pedido, anotando el
 * ingreso en finanzas, moviendo el stock y recién al final cambiando el estado
 * con un filtro `estado = 'pendiente'`.
 *
 * Ese filtro impedía dejar el pedido pagado dos veces, pero no impedía que dos
 * avisos simultáneos llegaran hasta ahí habiendo insertado ya su ingreso y su
 * descuento de stock. El resultado habría sido un pedido pagado, dos ingresos
 * en finanzas y doble descuento de inventario. Mercado Pago manda varias
 * notificaciones por pago y reintenta hasta recibir un 200, así que no era una
 * hipótesis.
 *
 * Con el bloqueo, el segundo aviso espera, entra, ve que el pedido ya no está
 * pendiente y se va sin tocar nada.
 */
export type ResultadoConfirmacion =
  | { ok: true; aplicado: boolean; numero: number }
  | { ok: false; error: string }

export async function confirmarPagoDePedido(params: {
  referenciaExterna: string
  proveedor: string
  referenciaPago: string
  totalPagado: number | null
}): Promise<ResultadoConfirmacion> {
  const { referenciaExterna, proveedor, referenciaPago, totalPagado } = params

  const numero = Number(referenciaExterna)
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    return { ok: false, error: `Referencia externa ilegible: ${referenciaExterna}` }
  }

  const { data, error } = await crearClienteAdministrador().rpc('confirmar_pago_pedido', {
    p_numero: numero,
    p_proveedor: proveedor,
    p_referencia: referenciaPago,
    p_total: totalPagado,
  })

  if (error) {
    // El índice único sobre (proveedor, referencia) rebota un pago que ya
    // quedó anotado en otro pedido. Es una defensa, no una falla que haya que
    // reintentar: el cobro ya está registrado donde corresponde.
    if (error.code === '23505') {
      return { ok: true, aplicado: false, numero }
    }
    console.error('[confirmar-pago] la transacción falló', { numero, error: error.message })
    return { ok: false, error: error.message }
  }

  const r = data as { ok: boolean; aplicado?: boolean; numero?: number; error?: string } | null
  if (!r?.ok) return { ok: false, error: r?.error ?? 'No se pudo confirmar el pago' }

  // El aviso al comprador va solo cuando el pago se aplicó de verdad. Un
  // segundo webhook del mismo pago no vuelve a escribirle.
  if (r.aplicado) await avisarPagoConfirmado(numero)

  return { ok: true, aplicado: Boolean(r.aplicado), numero: r.numero ?? numero }
}

/**
 * Le escribe al comprador que su pago entró.
 *
 * Nada de lo que pase aquí puede voltear una venta ya cobrada: si el correo
 * falla, se anota y se sigue. Por eso no propaga errores ni se espera su
 * resultado para responderle a Mercado Pago.
 */
async function avisarPagoConfirmado(numero: number): Promise<void> {
  try {
    const db = crearClienteAdministrador()
    const { data } = await db
      .from('pedidos')
      .select('numero,cliente_nombre,cliente_email,total_clp,token_seguimiento,pedido_items(cantidad,subtotal_clp,productos(nombre))')
      .eq('numero', numero)
      .maybeSingle()

    const p = data as unknown as {
      numero: number
      cliente_nombre: string | null
      cliente_email: string | null
      total_clp: number | string
      token_seguimiento: string
      pedido_items: { cantidad: number; subtotal_clp: number | string; productos: { nombre: string } | { nombre: string }[] | null }[] | null
    } | null

    // Sin correo no hay a quién escribirle: el correo es opcional al comprar.
    if (!p?.cliente_email) return

    await correoPagoConfirmado({
      para: p.cliente_email,
      nombre: p.cliente_nombre,
      numero: p.numero,
      total: Number(p.total_clp),
      items: (p.pedido_items ?? []).map((i) => {
        const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
        return { nombre: producto?.nombre ?? 'Producto', cantidad: Number(i.cantidad), subtotal: Number(i.subtotal_clp) }
      }),
      urlSeguimiento: urlDeSeguimiento(p.token_seguimiento),
    })
  } catch (e) {
    console.error('[confirmar-pago] el pago quedó bien, el aviso al comprador no salió', { numero, e })
  }
}
