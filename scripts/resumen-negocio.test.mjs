import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularResumenNegocio } from '../lib/resumen-negocio.ts'

// Los datos reales al 2026-10-01.
const real = { aportado: 480000, hay: 205162, stockPropioACosto: 187000, porCobrar: 90000, retirado: 75000, sobrante: 65162, stockTotalACosto: 215480, stockAPrecio: 652730 }

test('invertido es lo que pusieron los socios', () => {
  assert.equal(calcularResumenNegocio(real).invertido, 480000)
})
test('generado = (plata + stock propio + nos deben + retirado) − invertido', () => {
  const r = calcularResumenNegocio(real)
  assert.equal(r.tenemos, 557162)
  assert.equal(r.generado, 77162)
})
test('el sobrante ya está dentro de lo generado: quitarlo deja la ganancia explicada', () => {
  const r = calcularResumenNegocio(real)
  assert.equal(r.sinExplicar, 65162)
  assert.equal(r.generado - r.sinExplicar, 12000) // la ganancia que sí se explica con ventas, gastos y mermas
})
test('el stock se muestra completo, con su ganancia potencial y la parte previa de Joseph', () => {
  const s = calcularResumenNegocio(real).stock
  assert.deepEqual([s.aCosto, s.aPrecio, s.gananciaPotencial, s.previo], [215480, 652730, 437250, 28480])
})
test('si falta plata por explicar, la ganancia baja (no se esconde)', () => {
  const r = calcularResumenNegocio({ ...real, hay: 205162 - 100000, sobrante: -34838 })
  assert.equal(r.generado, 77162 - 100000)
  assert.equal(r.sinExplicar, -34838)
})
test('un negocio recién empezado: nada invertido ni generado', () => {
  const r = calcularResumenNegocio({ aportado: 0, hay: 0, stockPropioACosto: 0, porCobrar: 0, retirado: 0, sobrante: 0, stockTotalACosto: 0, stockAPrecio: 0 })
  assert.deepEqual([r.invertido, r.generado, r.stock.previo], [0, 0, 0])
})
test('el stock previo nunca es negativo', () => {
  assert.equal(calcularResumenNegocio({ ...real, stockPropioACosto: 300000 }).stock.previo, 0)
})
