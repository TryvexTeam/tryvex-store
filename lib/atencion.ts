/**
 * Qué requiere atención en el panel, en orden de urgencia.
 *
 * Revolut Business pone arriba lo pendiente (aprobaciones, comprobantes que
 * faltan) antes que los números. Acá lo mismo, y cada fila lleva DIRECTO a lo
 * que hay que resolver: un pedido por despachar abre ese pedido (la lista de
 * Pedidos lo deja resaltado por su ancla `#pedido-N`), no una lista genérica.
 * Una lista vacía significa que no hay nada que hacer.
 */
export interface PedidoAbierto {
  numero: number | string
  cliente: string | null
  estado: string
  /** El cliente ya dijo haber pagado: hay que verificarlo primero. */
  pagoDeclarado: boolean
  total: number
}

export interface EntradaAtencion {
  /** Pedidos pendientes, pagados o en preparación. */
  pedidos: PedidoAbierto[]
  sinStock: number
  stockBajo: number
  /** `null` si la persona no ve finanzas. */
  egresosSinComprobante: number | null
}

export interface ItemAtencion {
  clave: string
  titulo: string
  detalle: string
  href: string
  tono: 'rojo' | 'ambar' | 'neutro'
  /** Monto a la derecha, para las filas de un pedido. */
  monto?: number
}

/** Más de esto y la lista deja de ser un aviso: el resto se resume en una fila. */
export const MAX_PEDIDOS_VISIBLES = 4

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`
const enlacePedido = (numero: number | string) => `/panel/pedidos#pedido-${numero}`

function filaPedido(p: PedidoAbierto): ItemAtencion {
  const nombre = p.cliente?.trim() || 'Sin nombre'
  const base = { clave: `pedido-${p.numero}`, href: enlacePedido(p.numero), monto: p.total, titulo: `#${p.numero} · ${nombre}` }
  if (p.estado === 'pendiente' && p.pagoDeclarado) return { ...base, detalle: 'Dice haber pagado: verifica la transferencia.', tono: 'rojo' }
  if (p.estado === 'pendiente') return { ...base, detalle: 'Pendiente de pago.', tono: 'ambar' }
  return { ...base, detalle: p.estado === 'preparando' ? 'Pagado y en preparación: falta despacharlo.' : 'Pagado: falta despacharlo.', tono: 'ambar' }
}

export function calcularAtencion(e: EntradaAtencion): ItemAtencion[] {
  const items: ItemAtencion[] = []

  // Primero lo que el cliente dice haber pagado, después lo pendiente, después lo que falta despachar;
  // dentro de cada grupo, el número más bajo (el más antiguo) primero.
  const rango = (p: PedidoAbierto) => (p.estado === 'pendiente' ? (p.pagoDeclarado ? 0 : 1) : 2)
  const ordenados = [...e.pedidos].sort((a, b) => rango(a) - rango(b) || Number(a.numero) - Number(b.numero))
  const visibles = ordenados.slice(0, MAX_PEDIDOS_VISIBLES)
  for (const p of visibles) items.push(filaPedido(p))
  const resto = ordenados.length - visibles.length
  if (resto > 0)
    items.push({ clave: 'pedidos-mas', titulo: `${plural(resto, 'pedido más', 'pedidos más')} abiertos`, detalle: 'Míralos todos en Pedidos.', href: '/panel/pedidos', tono: 'neutro' })

  if (e.sinStock > 0)
    items.push({ clave: 'sin-stock', titulo: plural(e.sinStock, 'producto sin stock', 'productos sin stock'), detalle: 'No se pueden vender hasta reponer.', href: '/panel/stock?filtro=sin', tono: 'rojo' })
  if (e.stockBajo > 0)
    items.push({ clave: 'bajo', titulo: plural(e.stockBajo, 'producto bajo su mínimo', 'productos bajo su mínimo'), detalle: 'Conviene reponer pronto.', href: '/panel/stock?filtro=bajo', tono: 'ambar' })
  if (e.egresosSinComprobante)
    items.push({ clave: 'comprobantes', titulo: plural(e.egresosSinComprobante, 'egreso sin comprobante', 'egresos sin comprobante'), detalle: 'De los últimos 30 días.', href: '/panel/finanzas?periodo=30d&sin=1', tono: 'neutro' })
  return items
}
