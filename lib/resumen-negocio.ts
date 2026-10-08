/**
 * Las tres preguntas del negocio: ¿cuánto invertimos?, ¿cuánto hemos generado?, ¿cuánta plata hay
 * en stock sin vender?
 *
 * GENERADO es la ganancia total medida por lo que tenemos hoy, no por la suma de las ventas:
 *
 *   tenemos  = plata que hay + stock de la sociedad a costo + lo que nos deben + lo que los socios ya retiraron
 *   generado = tenemos − invertido
 *
 * Así cuenta TODO: las ventas, los gastos, las mermas y también cualquier plata de más o de menos
 * que todavía no se sepa explicar (el sobrante suma a la ganancia; un faltante la descuenta). Lo
 * que los socios retiraron se suma porque salió del negocio hacia ellos: sigue siendo ganancia
 * generada, solo que ya no está en caja.
 *
 * El stock que un integrante ya tenía antes de invertir no entra en «tenemos»: no se compró con
 * plata de todos, así que no puede contarse como ganancia. Sí se muestra en el stock total.
 */
export interface EntradaResumenNegocio {
  /** Lo que los socios pusieron de su bolsillo. */
  aportado: number
  /** Saldo de la cuenta + efectivo en mano. */
  hay: number
  /** Stock de la sociedad a costo (sin el stock previo de un integrante). */
  stockPropioACosto: number
  /** Lo que nos deben los clientes. */
  porCobrar: number
  /** Lo que los socios retiraron para gastos personales. */
  retirado: number
  /** Del cuadre de caja: positivo = hay más de lo esperado. Negativo = falta plata por explicar. */
  sobrante: number
  /** Todo el stock a costo y a precio de lista, incluido el previo de un integrante. */
  stockTotalACosto: number
  stockAPrecio: number
}

export interface ResumenNegocio {
  invertido: number
  tenemos: number
  generado: number
  /** Plata de más (positiva) o de menos (negativa) que todavía no se explica y ya está dentro de `generado`. */
  sinExplicar: number
  stock: {
    aCosto: number
    aPrecio: number
    /** Lo que se ganaría si se vendiera todo a precio de lista. */
    gananciaPotencial: number
    /** Parte del stock que un integrante ya tenía antes de invertir. */
    previo: number
  }
}

export function calcularResumenNegocio(e: EntradaResumenNegocio): ResumenNegocio {
  const tenemos = e.hay + e.stockPropioACosto + e.porCobrar + e.retirado
  return {
    invertido: e.aportado,
    tenemos,
    generado: tenemos - e.aportado,
    sinExplicar: e.sobrante,
    stock: {
      aCosto: e.stockTotalACosto,
      aPrecio: e.stockAPrecio,
      gananciaPotencial: e.stockAPrecio - e.stockTotalACosto,
      previo: Math.max(0, e.stockTotalACosto - e.stockPropioACosto),
    },
  }
}
