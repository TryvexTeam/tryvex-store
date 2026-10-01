/**
 * Qué requiere atención en el panel, en orden de urgencia.
 *
 * Revolut Business pone arriba lo pendiente (aprobaciones, comprobantes que
 * faltan) antes que los números. Acá lo mismo: pagos que el cliente dice haber
 * hecho, transferencias por confirmar, pedidos por despachar, stock agotado y
 * egresos sin comprobante. Una lista vacía significa que no hay nada que hacer.
 */
export interface EntradaAtencion {
  /** Pedidos pendientes de pago (sin cobrar). */
  porCobrar: number
  /** De esos, los que el cliente ya declaró pagados: hay que verificarlos primero. */
  pagoDeclarado: number
  /** Pagados que aún no salen (pagado o preparando). */
  porDespachar: number
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
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export function calcularAtencion(e: EntradaAtencion): ItemAtencion[] {
  const items: ItemAtencion[] = []
  if (e.pagoDeclarado > 0)
    items.push({ clave: 'declarado', titulo: `${plural(e.pagoDeclarado, 'cliente dice', 'clientes dicen')} haber pagado`, detalle: 'Verifica la transferencia y confirma el pago.', href: '/panel/cobranza', tono: 'rojo' })
  const sinDeclarar = e.porCobrar - e.pagoDeclarado
  if (sinDeclarar > 0)
    items.push({ clave: 'cobrar', titulo: `${plural(sinDeclarar, 'pedido por cobrar', 'pedidos por cobrar')}`, detalle: 'Pendientes de pago.', href: '/panel/cobranza', tono: 'ambar' })
  if (e.porDespachar > 0)
    items.push({ clave: 'despachar', titulo: `${plural(e.porDespachar, 'pedido por despachar', 'pedidos por despachar')}`, detalle: 'Ya están pagados.', href: '/panel/pedidos', tono: 'ambar' })
  if (e.sinStock > 0)
    items.push({ clave: 'sin-stock', titulo: `${plural(e.sinStock, 'producto sin stock', 'productos sin stock')}`, detalle: 'No se pueden vender hasta reponer.', href: '/panel/stock', tono: 'rojo' })
  if (e.stockBajo > 0)
    items.push({ clave: 'bajo', titulo: `${plural(e.stockBajo, 'producto bajo su mínimo', 'productos bajo su mínimo')}`, detalle: 'Conviene reponer pronto.', href: '/panel/stock', tono: 'ambar' })
  if (e.egresosSinComprobante)
    items.push({ clave: 'comprobantes', titulo: `${plural(e.egresosSinComprobante, 'egreso sin comprobante', 'egresos sin comprobante')}`, detalle: 'De los últimos 30 días.', href: '/panel/finanzas?periodo=30d&sin=1', tono: 'neutro' })
  return items
}
