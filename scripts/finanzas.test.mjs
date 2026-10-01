import test from 'node:test'
import assert from 'node:assert/strict'
import { categoriaHistorica, etiquetaCategoria } from '../lib/finanzas.ts'

test('una etiqueta vigente se reconoce tal cual, no cae en «Otros»', () => {
  assert.equal(categoriaHistorica('Aporte de socio', 'ingreso'), 'aporte_socio')
  assert.equal(categoriaHistorica('Retiro de socio', 'egreso'), 'retiro_socio')
  assert.equal(categoriaHistorica('Gastos administrativos', 'egreso'), 'administracion')
  assert.equal(categoriaHistorica('Transporte y logística', 'egreso'), 'transporte_logistica')
  assert.equal(categoriaHistorica('Inventario e insumos', 'egreso'), 'inventario_insumos')
})
test('los nombres históricos siguen funcionando', () => {
  assert.equal(categoriaHistorica('Venta', 'ingreso'), 'ventas')
  assert.equal(categoriaHistorica('Importación', 'egreso'), 'inventario_insumos')
  assert.equal(categoriaHistorica('algo raro', 'egreso'), 'otros_gastos')
})
test('la etiqueta se respeta aunque cambien mayúsculas o espacios', () => {
  assert.equal(categoriaHistorica('  retiro DE socio ', 'egreso'), 'retiro_socio')
})
test('el tipo importa: un ingreso no puede ser un retiro', () => {
  assert.equal(categoriaHistorica('Retiro de socio', 'ingreso'), 'otros_ingresos')
})
test('etiquetaCategoria devuelve el nombre legible', () => {
  assert.equal(etiquetaCategoria('retiro_socio'), 'Retiro de socio')
})
