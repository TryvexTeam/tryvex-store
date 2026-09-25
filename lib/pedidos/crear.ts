import 'server-only'

import {
  reservarPedidoEnSupabase,
  type EncabezadoPedidoParaCrear,
  type ItemPedidoParaCrear,
  type ResultadoReservaPedido,
} from './repositorio'

export type CrearPedido = {
  encabezado: EncabezadoPedidoParaCrear
  items: ItemPedidoParaCrear[]
}

/**
 * Caso de uso compartido por checkout y panel.
 *
 * La acción decide quién puede crear el pedido y cómo se interpreta su
 * formulario; esta capa define el contrato de creación y delega la invariancia
 * transaccional de inventario a PostgreSQL.
 */
export async function crearPedidoConReserva({ encabezado, items }: CrearPedido): Promise<ResultadoReservaPedido> {
  if (items.length === 0) return { ok: false, error: 'El pedido debe tener al menos un producto.' }
  return reservarPedidoEnSupabase(encabezado, items)
}
