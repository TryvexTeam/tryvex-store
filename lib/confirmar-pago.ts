import { crearClienteAdministrador } from '@/lib/supabase/administrador'

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

  return { ok: true, aplicado: Boolean(r.aplicado), numero: r.numero ?? numero }
}
