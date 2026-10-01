/**
 * Resultado del negocio: cuánto se vendió, cuánto costó lo vendido y cuánto se
 * perdió por mermas. Sale de los movimientos de stock y del costo de cada
 * producto, así que incluye las ventas que no fueron pedidos.
 *
 *   ganancia sobre lo vendido = ventas − costo de lo vendido
 *
 * Las pérdidas (rotos, unidades de muestra, regalos, diferencias) se muestran
 * aparte y NO se restan de esa ganancia: son otra pregunta («¿cuánto se nos
 * fue?»), y mezclarlas escondería los dos números.
 *
 * El costo usado es el actual del producto (`costo_unitario`): si cambia, el
 * cálculo histórico cambia con él. Es una limitación conocida.
 */
export interface MovimientoValor {
  producto_id: string
  tipo: string
  cantidad: number
  total_clp: string | number | null
}

export interface Resultado {
  ventas: number
  costoVendido: number
  ganancia: number
  /** Ganancia sobre ventas, en porcentaje con un decimal; `null` si no hubo ventas. */
  margenPct: number | null
  unidadesVendidas: number
  perdidas: number
  unidadesPerdidas: number
}

const PIERDEN = ['merma', 'uso_interno', 'regalo']

export function calcularResultado(movs: MovimientoValor[], costoPor: Map<string, number>): Resultado {
  let ventas = 0
  let costoVendido = 0
  let unidadesVendidas = 0
  let perdidas = 0
  let unidadesPerdidas = 0
  for (const m of movs) {
    const unidades = Math.abs(Number(m.cantidad) || 0)
    const costo = costoPor.get(m.producto_id) ?? 0
    if (m.tipo === 'venta') {
      ventas += Number(m.total_clp) || 0
      costoVendido += unidades * costo
      unidadesVendidas += unidades
    } else if (m.tipo === 'devolucion') {
      ventas -= Number(m.total_clp) || 0
      costoVendido -= unidades * costo
      unidadesVendidas -= unidades
    } else if (PIERDEN.includes(m.tipo) || (m.tipo === 'ajuste' && Number(m.cantidad) < 0)) {
      perdidas += unidades * costo
      unidadesPerdidas += unidades
    }
  }
  const ganancia = ventas - costoVendido
  return { ventas, costoVendido, ganancia, margenPct: ventas > 0 ? Math.round((ganancia / ventas) * 1000) / 10 : null, unidadesVendidas, perdidas, unidadesPerdidas }
}
