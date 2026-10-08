/**
 * Ventas por periodo, calculadas desde los movimientos de stock.
 *
 * Todas las ventas dejan un movimiento `venta` con su monto: las que pasan por
 * un pedido pagado, las que se anotan a mano en Stock y las que ya existían
 * antes de usar el panel. Sumar solo pedidos dejaba fuera todo lo que no fue un
 * pedido; esto las junta bajo un mismo criterio. Una `devolucion` resta.
 *
 * Los días son de calendario en hora de Santiago, no de UTC: una venta de las
 * 22:00 de un martes no debe contarse en el miércoles.
 */
export interface MovimientoVenta {
  tipo: string
  total_clp: string | number | null
  created_at: string
}

export interface VentasPorPeriodo {
  vendido: number
  vendidoAnterior: number
  /** Un valor por día del periodo actual, con ceros en los días sin ventas. */
  serie: { dia: string; valor: number }[]
}

const DIA_MS = 86_400_000

const diaChile = (instante: Date | string | number): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago' }).format(new Date(instante))

const sumarDias = (iso: string, dias: number): string => new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) + dias * DIA_MS).toISOString().slice(0, 10)

export function ventasPorPeriodo(movimientos: MovimientoVenta[], dias: number, ahora: Date | number = Date.now()): VentasPorPeriodo {
  const hoy = diaChile(ahora)
  const inicioActual = sumarDias(hoy, -(dias - 1))
  const inicioAnterior = sumarDias(inicioActual, -dias)

  const porDia = new Map<string, number>()
  let vendidoAnterior = 0
  for (const m of movimientos) {
    const signo = m.tipo === 'venta' ? 1 : m.tipo === 'devolucion' ? -1 : 0
    if (!signo) continue
    const monto = signo * (Number(m.total_clp) || 0)
    const dia = diaChile(m.created_at)
    if (dia >= inicioActual && dia <= hoy) porDia.set(dia, (porDia.get(dia) ?? 0) + monto)
    else if (dia >= inicioAnterior && dia < inicioActual) vendidoAnterior += monto
  }

  const serie = Array.from({ length: dias }, (_, i) => {
    const dia = sumarDias(inicioActual, i)
    return { dia, valor: porDia.get(dia) ?? 0 }
  })
  return { vendido: serie.reduce((a, s) => a + s.valor, 0), vendidoAnterior, serie }
}
