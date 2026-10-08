/**
 * Cuadre de caja: lo que DEBERÍA haber contra lo que HAY.
 *
 * Debería haber = lo que el sistema calcula con aportes, ventas y compras
 * (todos los ingresos menos todos los egresos). Hay = lo que el equipo declara:
 * el saldo de la cuenta más el efectivo que tiene cada persona en la mano.
 *
 * La diferencia es plata «por explicar»: gastos, retiros o ventas sin anotar que
 * todavía no están en el sistema. A medida que se registran, la diferencia baja.
 * No se inventa una explicación: se muestra el hueco.
 */
export interface EntradaCuadre {
  esperado: number
  enCuenta: number
  enEfectivo: number
}

export interface Cuadre {
  esperado: number
  enCuenta: number
  enEfectivo: number
  hay: number
  /** Positivo = falta plata por explicar; negativo = hay más de lo esperado. */
  diferencia: number
  estado: 'falta' | 'sobra' | 'cuadra'
}

export function calcularCuadre(e: EntradaCuadre): Cuadre {
  const hay = e.enCuenta + e.enEfectivo
  const diferencia = e.esperado - hay
  return { ...e, hay, diferencia, estado: diferencia > 0 ? 'falta' : diferencia < 0 ? 'sobra' : 'cuadra' }
}

export interface EntradaRecuperacion {
  /** Lo que pusieron los socios de su bolsillo. */
  aportado: number
  /** Cuenta + efectivo en mano. */
  hay: number
  /** Stock de la sociedad a costo, sin lo que Joseph ya tenía antes. */
  stockPropioACosto: number
  /** Lo que nos deben los clientes. */
  porCobrar: number
}

export interface Recuperacion extends EntradaRecuperacion {
  valorActual: number
  /** Lo que falta para volver a tener lo aportado; 0 si ya se recuperó. */
  falta: number
  recuperado: boolean
}

/** ¿Con lo que tenemos hoy (plata + stock + cobros) ya recuperamos lo aportado? */
export function calcularRecuperacion(e: EntradaRecuperacion): Recuperacion {
  const valorActual = e.hay + e.stockPropioACosto + e.porCobrar
  const falta = Math.max(0, e.aportado - valorActual)
  return { ...e, valorActual, falta, recuperado: falta === 0 }
}

export interface FilaStockCosto {
  producto_id: string
  stock: number
  costo: number
}

/**
 * Valor a costo del stock de la sociedad: se descuentan las unidades que un
 * integrante ya tenía antes de invertir (no se compraron con plata de todos).
 */
export function stockPropioACosto(filas: FilaStockCosto[], previasPorProducto: Map<string, number>): number {
  return filas.reduce((suma, f) => {
    const propias = Math.max(0, f.stock - (previasPorProducto.get(f.producto_id) ?? 0))
    return suma + propias * f.costo
  }, 0)
}
