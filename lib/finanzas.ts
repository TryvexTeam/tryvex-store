/** Vocabulario único del módulo financiero.
 *
 * Los códigos se guardan en la base; las etiquetas pueden cambiar sin romper
 * reportes, importaciones ni movimientos históricos.
 */
export const CATEGORIAS_FINANCIERAS = [
  { codigo: 'ventas', tipo: 'ingreso', etiqueta: 'Ventas' },
  { codigo: 'otros_ingresos', tipo: 'ingreso', etiqueta: 'Otros ingresos' },
  { codigo: 'devolucion_proveedor', tipo: 'ingreso', etiqueta: 'Devolución de proveedor' },
  { codigo: 'servicios_basicos', tipo: 'egreso', etiqueta: 'Servicios básicos' },
  { codigo: 'inventario_insumos', tipo: 'egreso', etiqueta: 'Inventario e insumos' },
  { codigo: 'arriendo', tipo: 'egreso', etiqueta: 'Arriendo' },
  { codigo: 'remuneraciones', tipo: 'egreso', etiqueta: 'Remuneraciones' },
  { codigo: 'administracion', tipo: 'egreso', etiqueta: 'Gastos administrativos' },
  { codigo: 'marketing', tipo: 'egreso', etiqueta: 'Marketing y publicidad' },
  { codigo: 'transporte_logistica', tipo: 'egreso', etiqueta: 'Transporte y logística' },
  { codigo: 'mantencion_reparaciones', tipo: 'egreso', etiqueta: 'Mantención y reparaciones' },
  { codigo: 'equipamiento', tipo: 'egreso', etiqueta: 'Muebles, equipos y maquinaria' },
  { codigo: 'comisiones_medios_pago', tipo: 'egreso', etiqueta: 'Comisiones y medios de pago' },
  { codigo: 'impuestos', tipo: 'egreso', etiqueta: 'Impuestos' },
  { codigo: 'otros_gastos', tipo: 'egreso', etiqueta: 'Otros gastos' },
] as const

export type TipoMovimiento = 'ingreso' | 'egreso'
export type CategoriaFinanciera = (typeof CATEGORIAS_FINANCIERAS)[number]['codigo']

export const METODOS_PAGO = [
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'tarjeta', etiqueta: 'Tarjeta' },
  { valor: 'mercadopago', etiqueta: 'Mercado Pago' },
  { valor: 'otro', etiqueta: 'Otro' },
] as const

export function categoriasPara(tipo: TipoMovimiento) {
  return CATEGORIAS_FINANCIERAS.filter((categoria) => categoria.tipo === tipo)
}

export function categoriaFinancieraValida(codigo: string, tipo: string): codigo is CategoriaFinanciera {
  return CATEGORIAS_FINANCIERAS.some((categoria) => categoria.codigo === codigo && categoria.tipo === tipo)
}

export function etiquetaCategoria(codigo: string, alternativa?: string): string {
  return CATEGORIAS_FINANCIERAS.find((categoria) => categoria.codigo === codigo)?.etiqueta ?? alternativa ?? codigo
}

/** Normaliza nombres históricos antes de que todos los movimientos tengan código. */
export function categoriaHistorica(categoria: string, tipo: string): CategoriaFinanciera {
  const normalizada = categoria.trim().toLocaleLowerCase('es-CL')
  if (tipo === 'ingreso') {
    if (normalizada.includes('venta')) return 'ventas'
    if (normalizada.includes('devolución') && normalizada.includes('proveedor')) return 'devolucion_proveedor'
    return 'otros_ingresos'
  }
  if (normalizada.includes('stock') || normalizada.includes('importación')) return 'inventario_insumos'
  if (normalizada.includes('envío') || normalizada.includes('logística')) return 'transporte_logistica'
  if (normalizada.includes('publicidad')) return 'marketing'
  if (normalizada.includes('comisi')) return 'comisiones_medios_pago'
  return 'otros_gastos'
}

export function inicioDelPeriodo(periodo: string, hoy = new Date()): string | null {
  const fecha = new Date(hoy)
  fecha.setHours(0, 0, 0, 0)
  if (periodo === 'dia') return fecha.toISOString().slice(0, 10)
  if (periodo === 'semana') {
    const dia = fecha.getDay() || 7
    fecha.setDate(fecha.getDate() - dia + 1)
    return fecha.toISOString().slice(0, 10)
  }
  if (periodo === 'mes') return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-01`
  if (periodo === 'ano') return `${fecha.getFullYear()}-01-01`
  return null
}
