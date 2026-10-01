/**
 * Capital por integrante.
 *
 * Responde «¿cuánto puso cada uno y qué parte del negocio es?». Es un cálculo
 * sobre los movimientos que ya existen, sin tablas nuevas:
 *   · un aporte de socio es un ingreso con categoría «Aporte de socio» y el
 *     integrante en `contraparte`;
 *   · la inversión en stock son los egresos de «Inventario e insumos».
 *
 * Lo que se compró con ventas y no con plata de un socio queda aparte como
 * «reinvertido de ventas» (es de Tryvex, no de nadie) y NO suma al porcentaje
 * de propiedad de ningún integrante.
 */
export const CATEGORIA_APORTE = 'Aporte de socio'

export interface AporteSocio {
  contraparte: string | null
  monto_clp: string | number
}

export interface Socio {
  nombre: string
  aportado: number
  /** Parte del capital puesto por socios, 0 a 100 (un decimal). */
  porcentaje: number
}

export interface Capital {
  socios: Socio[]
  totalAportado: number
  /** Egresos en stock (compras de inventario). */
  invertidoEnStock: number
  /** Lo comprado que no salió de aportes: vino de ventas reinvertidas. Nunca negativo. */
  reinvertidoDeVentas: number
  /** Lo aportado que todavía no se gastó en stock. Nunca negativo. */
  aportadoSinGastar: number
}

const n = (v: string | number) => Number(v) || 0

export function calcularCapital(aportes: AporteSocio[], invertidoEnStock: number): Capital {
  const porNombre = new Map<string, number>()
  for (const a of aportes) {
    const nombre = a.contraparte?.trim() || 'Sin nombre'
    porNombre.set(nombre, (porNombre.get(nombre) ?? 0) + n(a.monto_clp))
  }
  const totalAportado = [...porNombre.values()].reduce((suma, v) => suma + v, 0)
  const socios = [...porNombre.entries()]
    .map(([nombre, aportado]) => ({ nombre, aportado, porcentaje: totalAportado > 0 ? Math.round((aportado / totalAportado) * 1000) / 10 : 0 }))
    .sort((a, b) => b.aportado - a.aportado || a.nombre.localeCompare(b.nombre, 'es'))
  return {
    socios,
    totalAportado,
    invertidoEnStock,
    reinvertidoDeVentas: Math.max(0, invertidoEnStock - totalAportado),
    aportadoSinGastar: Math.max(0, totalAportado - invertidoEnStock),
  }
}
