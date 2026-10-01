import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularCuadre, calcularRecuperacion, stockPropioACosto } from '../lib/cuadre.ts'

test('con los datos reales: deberían haber 331.000 y en la cuenta hay 63.162', () => {
  const c = calcularCuadre({ esperado: 331000, enCuenta: 63162, enEfectivo: 0 })
  assert.equal(c.hay, 63162)
  assert.equal(c.diferencia, 267838)
  assert.equal(c.estado, 'falta')
})
test('al sumar el efectivo en mano, la diferencia baja', () => {
  const c = calcularCuadre({ esperado: 331000, enCuenta: 63162, enEfectivo: 100000 })
  assert.equal(c.diferencia, 167838)
})
test('cuadra exacto y sobra', () => {
  assert.equal(calcularCuadre({ esperado: 1000, enCuenta: 600, enEfectivo: 400 }).estado, 'cuadra')
  const s = calcularCuadre({ esperado: 1000, enCuenta: 900, enEfectivo: 400 })
  assert.deepEqual([s.estado, s.diferencia], ['sobra', -300])
})
test('recuperación: plata + stock propio + cobros contra lo aportado', () => {
  const r = calcularRecuperacion({ aportado: 480000, hay: 63162, stockPropioACosto: 177000, porCobrar: 90000 })
  assert.equal(r.valorActual, 330162)
  assert.equal(r.falta, 149838)
  assert.equal(r.recuperado, false)
})
test('si ya se recuperó, falta 0 y no es negativo', () => {
  const r = calcularRecuperacion({ aportado: 1000, hay: 2000, stockPropioACosto: 0, porCobrar: 0 })
  assert.deepEqual([r.falta, r.recuperado], [0, true])
})
test('el stock propio descuenta lo que Joseph ya tenía antes', () => {
  const filas = [{ producto_id: 'cable', stock: 7, costo: 1500 }, { producto_id: 'pro2', stock: 10, costo: 10000 }]
  assert.equal(stockPropioACosto(filas, new Map([['cable', 7]])), 100000)
  assert.equal(stockPropioACosto(filas, new Map()), 110500)
})
test('las unidades previas no pueden dar stock propio negativo', () => {
  assert.equal(stockPropioACosto([{ producto_id: 'a', stock: 2, costo: 100 }], new Map([['a', 5]])), 0)
})
