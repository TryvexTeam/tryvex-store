import { crearClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * Da un pedido por pagado cuando la pasarela confirmó el cobro.
 *
 * Hace lo mismo que el botón «Marcar pagado» del panel —anota el ingreso en
 * finanzas, convierte la reserva de stock en venta y mueve el estado— pero sin
 * una persona detrás: aquí quien confirma es Mercado Pago, así que los
 * movimientos quedan con `creado_por` en null y el motivo dice de dónde vino.
 *
 * Es idempotente a propósito. Mercado Pago reintenta las notificaciones hasta
 * recibir un 200, y además manda varias por pago (`created`, `processed`…).
 * Si el pedido ya no está pendiente, no se toca nada: cobrar dos veces el
 * mismo stock o duplicar el ingreso en finanzas sería peor que perder un aviso.
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

  const db = crearClienteAdministrador()

  const { data: pedido } = await db
    .from('pedidos')
    .select('id,numero,estado,cliente_nombre,total_clp,metodo_pago')
    .eq('numero', numero)
    .maybeSingle()

  if (!pedido) return { ok: false, error: `No existe el pedido #${numero}` }

  // Ya procesado por un aviso anterior: se responde bien sin repetir nada.
  if (pedido.estado !== 'pendiente') return { ok: true, aplicado: false, numero }

  // El monto cobrado tiene que ser el del pedido. Si no calza, no se despacha
  // nada: se deja constancia y que lo mire una persona.
  if (totalPagado !== null && Math.round(totalPagado) !== Math.round(Number(pedido.total_clp))) {
    await db
      .from('pedidos')
      .update({
        pago_proveedor: proveedor,
        pago_referencia: referenciaPago,
        notas: `REVISAR: se cobraron $${Math.round(totalPagado).toLocaleString('es-CL')} y el pedido dice $${Number(
          pedido.total_clp
        ).toLocaleString('es-CL')}`,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pedido.id)
    return { ok: false, error: `Monto distinto en el pedido #${numero}` }
  }

  const { data: items } = await db
    .from('pedido_items')
    .select('producto_id,variante_id,cantidad,precio_unitario')
    .eq('pedido_id', pedido.id)

  // El ingreso en finanzas, para que la venta aparezca donde el equipo la busca.
  const { data: movimiento } = await db
    .from('movimientos_financieros')
    .insert({
      tipo: 'ingreso',
      categoria: 'Venta',
      descripcion: `Pedido #${pedido.numero} · ${pedido.cliente_nombre}`,
      monto_clp: Number(pedido.total_clp),
      fecha: new Date().toISOString().slice(0, 10),
      metodo_pago: pedido.metodo_pago ?? proveedor,
      contraparte: pedido.cliente_nombre,
    })
    .select('id')
    .maybeSingle()

  // La reserva se libera y se registra la venta: dos filas, para que el
  // historial de stock cuente lo que pasó de verdad.
  for (const it of items ?? []) {
    await db.from('stock_movimientos').insert([
      {
        producto_id: it.producto_id,
        variante_id: it.variante_id,
        tipo: 'liberacion',
        cantidad: it.cantidad,
        motivo: `Pedido #${pedido.numero} pagado con ${proveedor}`,
        pedido_id: pedido.id,
      },
      {
        producto_id: it.producto_id,
        variante_id: it.variante_id,
        tipo: 'venta',
        cantidad: -it.cantidad,
        precio_unitario: it.precio_unitario,
        total_clp: it.cantidad * Number(it.precio_unitario),
        motivo: `Pedido #${pedido.numero} · ${pedido.cliente_nombre}`,
        pedido_id: pedido.id,
        movimiento_id: movimiento?.id ?? null,
      },
    ])
  }

  const { error } = await db
    .from('pedidos')
    .update({
      estado: 'pagado',
      pagado_at: new Date().toISOString(),
      pago_proveedor: proveedor,
      pago_referencia: referenciaPago,
      updated_at: new Date().toISOString(),
    })
    .eq('id', pedido.id)
    // Cinturón contra dos avisos simultáneos: si otro ya lo movió, esta
    // actualización no encuentra fila y no pisa nada.
    .eq('estado', 'pendiente')

  if (error) return { ok: false, error: error.message }

  return { ok: true, aplicado: true, numero }
}
