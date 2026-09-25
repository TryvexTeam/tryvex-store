import 'server-only'

import { crearClienteAdministrador } from '@/lib/supabase/administrador'

export interface EncabezadoPedidoParaCrear {
  clienteAuthId?: string | null
  clienteNombre: string
  clienteEmail?: string | null
  clienteFono?: string | null
  canal: string
  metodoPago?: string | null
  subtotalClp: number
  envioClp: number
  totalClp: number
  region?: string | null
  comuna?: string | null
  direccion?: Record<string, unknown> | null
  notas?: string | null
  atendidoPor?: string | null
}

export interface ItemPedidoParaCrear {
  productoId: string
  varianteId: string | null
  cantidad: number
  precioUnitario: number
  tramoAplicado?: string | null
  subtotalClp: number
}

export type ResultadoReservaPedido =
  | { ok: true; id: string; numero: number }
  | { ok: false; error: string; disponible?: number }

/** Adaptador de persistencia: la transacción pertenece exclusivamente a PostgreSQL. */
export async function reservarPedidoEnSupabase(
  pedido: EncabezadoPedidoParaCrear,
  items: ItemPedidoParaCrear[]
): Promise<ResultadoReservaPedido> {
  const { data, error } = await crearClienteAdministrador().rpc('crear_pedido_con_reserva_stock', {
    p_pedido: {
      cliente_auth_id: pedido.clienteAuthId ?? null,
      cliente_nombre: pedido.clienteNombre,
      cliente_email: pedido.clienteEmail ?? null,
      cliente_fono: pedido.clienteFono ?? null,
      canal: pedido.canal,
      metodo_pago: pedido.metodoPago ?? null,
      subtotal_clp: pedido.subtotalClp,
      envio_clp: pedido.envioClp,
      total_clp: pedido.totalClp,
      region: pedido.region ?? null,
      comuna: pedido.comuna ?? null,
      direccion: pedido.direccion ?? null,
      notas: pedido.notas ?? null,
      atendido_por: pedido.atendidoPor ?? null,
    },
    p_items: items.map((item) => ({
      producto_id: item.productoId,
      variante_id: item.varianteId,
      cantidad: item.cantidad,
      precio_unitario: item.precioUnitario,
      tramo_aplicado: item.tramoAplicado ?? null,
      subtotal_clp: item.subtotalClp,
    })),
  })

  if (error) {
    console.error('[pedidos] no se pudo crear ni reservar el pedido', { error: error.message })
    return { ok: false, error: 'No pudimos registrar tu pedido. Intenta de nuevo en un momento.' }
  }

  const resultado = data as { ok?: boolean; id?: string; numero?: number; error?: string; disponible?: number } | null
  if (!resultado?.ok || !resultado.id || !Number.isSafeInteger(Number(resultado.numero))) {
    return { ok: false, error: resultado?.error ?? 'No pudimos registrar tu pedido.', disponible: resultado?.disponible }
  }

  return { ok: true, id: resultado.id, numero: Number(resultado.numero) }
}
