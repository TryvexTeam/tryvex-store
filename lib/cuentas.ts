/**
 * «Cuentas» por método de pago: lo que Revolut hace con una tarjeta por moneda,
 * acá con una por forma de cobrar o pagar (efectivo, transferencia, tarjeta…).
 * Responde «¿cuánto hay en efectivo y cuánto en el banco?» sin abrir la lista.
 */
export interface MovimientoCuenta {
  tipo: string
  monto_clp: string | number
  metodo_pago: string | null
}

export interface Cuenta {
  clave: string
  etiqueta: string
  entro: number
  salio: number
  neto: number
  movimientos: number
}

const ETIQUETAS: Record<string, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  mercadopago: 'Mercado Pago',
  flow: 'Flow',
  otro: 'Otro',
  sin_metodo: 'Sin método',
}

const n = (v: string | number) => Number(v) || 0

/** Una cuenta por método usado; las de más movimiento primero, «Sin método» al final. */
export function agruparPorMetodo(lista: MovimientoCuenta[]): Cuenta[] {
  const mapa = new Map<string, Cuenta>()
  for (const m of lista) {
    const clave = m.metodo_pago && m.metodo_pago.trim() ? m.metodo_pago : 'sin_metodo'
    const cuenta = mapa.get(clave) ?? { clave, etiqueta: ETIQUETAS[clave] ?? clave, entro: 0, salio: 0, neto: 0, movimientos: 0 }
    if (m.tipo === 'ingreso') cuenta.entro += n(m.monto_clp)
    else if (m.tipo === 'egreso') cuenta.salio += n(m.monto_clp)
    cuenta.neto = cuenta.entro - cuenta.salio
    cuenta.movimientos += 1
    mapa.set(clave, cuenta)
  }
  return [...mapa.values()].sort((a, b) => Number(a.clave === 'sin_metodo') - Number(b.clave === 'sin_metodo') || b.movimientos - a.movimientos)
}
