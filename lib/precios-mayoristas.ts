/**
 * Calculadora de precios mayoristas de Tryvex.
 *
 * Regla del negocio (definida por el señor Ignacio, 2026-09-28):
 *   · 1 y 2 unidades pagan el precio de venta.
 *   · Desde 3 unidades hay descuento, en 6 tramos que bajan en escalones
 *     parejos: 3–4, 5–9, 10–19, 20–49, 50–99 y 100 o más.
 *   · En 100 o más se llega al piso y ahí se queda.
 *   · El piso es el precio de compra al proveedor + $5.000: ninguna unidad se
 *     vende con menos de $5.000 de margen, en ningún tramo.
 *
 * Ejemplo: se vende a $45.000 y cuesta $25.000 → piso $30.000 →
 *   $42.500 · $40.000 · $37.500 · $35.000 · $32.500 · $30.000.
 *
 * Es código puro: la usan la acción del servidor (que es la que manda) y la
 * vista previa del panel, para que lo que se ve sea lo que se guarda.
 */

/** Margen mínimo por unidad sobre el precio de compra al proveedor. */
export const MARGEN_MINIMO_CLP = 5000

/** Los escalones de cantidad. El último no tiene tope. */
export const ESCALONES = [
  { min: 3, max: 4 },
  { min: 5, max: 9 },
  { min: 10, max: 19 },
  { min: 20, max: 49 },
  { min: 50, max: 99 },
  { min: 100, max: null },
] as const

export interface TramoCalculado {
  min: number
  max: number | null
  precio: number
  etiqueta: string
}

export type ResultadoCalculo = { ok: true; piso: number; tramos: TramoCalculado[] } | { ok: false; error: string }

/** Redondeo a centenas: precios que se leen limpios ($37.500, no $37.483). */
const REDONDEO = 100

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

export function pisoDePrecio(costo: number): number {
  return costo + MARGEN_MINIMO_CLP
}

/** ¿Este precio deja al menos el margen mínimo sobre el costo? Sin costo cargado no se puede saber. */
export function respetaMargen(precio: number, costo: number): boolean {
  return !(costo > 0) || precio >= pisoDePrecio(costo)
}

export function mensajeMargen(precio: number, costo: number): string {
  return `A ${clp(precio)} quedan menos de ${clp(MARGEN_MINIMO_CLP)} sobre el costo de ${clp(costo)}. El mínimo es ${clp(pisoDePrecio(costo))}.`
}

export function calcularTramosMayoristas(precioVenta: number, costo: number): ResultadoCalculo {
  if (!Number.isFinite(precioVenta) || precioVenta <= 0) return { ok: false, error: 'El producto necesita un precio de venta.' }
  if (!Number.isFinite(costo) || costo <= 0)
    return { ok: false, error: 'Carga el precio de compra al proveedor (costo) para calcular los tramos.' }

  const piso = pisoDePrecio(costo)
  if (precioVenta <= piso)
    return {
      ok: false,
      error: `El precio de venta (${clp(precioVenta)}) no deja espacio para descuentos: tiene que ser mayor que el piso de ${clp(piso)} (costo + ${clp(MARGEN_MINIMO_CLP)}).`,
    }

  const paso = (precioVenta - piso) / ESCALONES.length
  let anterior = precioVenta
  const tramos = ESCALONES.map((e, i) => {
    const ultimo = i === ESCALONES.length - 1
    const exacto = precioVenta - paso * (i + 1)
    // El último es el piso exacto. Los demás, redondeados, sin pasar del piso
    // ni subir respecto del tramo anterior.
    const redondeado = ultimo ? piso : Math.round(exacto / REDONDEO) * REDONDEO
    const precio = Math.min(anterior, Math.max(piso, redondeado))
    anterior = precio
    return {
      min: e.min,
      max: e.max,
      precio,
      etiqueta: e.max === null ? `${e.min} o más` : `${e.min} a ${e.max} unidades`,
    }
  })
  return { ok: true, piso, tramos }
}
