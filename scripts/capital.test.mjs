import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularCapital } from '../lib/capital.ts'

// Los hechos del equipo: Ignacio 300.000, Cristian 150.000, Joseph 30.000; se compró stock por 600.000.
const aportes = [
  { contraparte: 'Ignacio', monto_clp: 300000 },
  { contraparte: 'Cristian', monto_clp: '150000' },
  { contraparte: 'Joseph', monto_clp: 30000 },
]

test('porcentajes sobre lo que pusieron los socios (sin contar lo reinvertido)', () => {
  const c = calcularCapital(aportes, 600000)
  assert.equal(c.totalAportado, 480000)
  assert.deepEqual(c.socios.map((s) => [s.nombre, s.aportado, s.porcentaje]), [['Ignacio', 300000, 62.5], ['Cristian', 150000, 31.3], ['Joseph', 30000, 6.3]])
})
test('lo comprado de más es reinvertido de ventas, y no es de nadie', () => {
  const c = calcularCapital(aportes, 600000)
  assert.equal(c.invertidoEnStock, 600000)
  assert.equal(c.reinvertidoDeVentas, 120000)
  assert.equal(c.aportadoSinGastar, 0)
})
test('si se compró menos de lo aportado, sobra plata aportada y no hay reinversión', () => {
  const c = calcularCapital(aportes, 300000)
  assert.equal(c.reinvertidoDeVentas, 0)
  assert.equal(c.aportadoSinGastar, 180000)
})
test('varios aportes de la misma persona se suman', () => {
  const c = calcularCapital([{ contraparte: 'Ana', monto_clp: 100 }, { contraparte: ' Ana ', monto_clp: 50 }, { contraparte: 'Beto', monto_clp: 50 }], 0)
  assert.deepEqual(c.socios.map((s) => [s.nombre, s.aportado, s.porcentaje]), [['Ana', 150, 75], ['Beto', 50, 25]])
})
test('sin aportes: sin socios, sin porcentajes y sin dividir por cero', () => {
  const c = calcularCapital([], 0)
  assert.deepEqual(c.socios, [])
  assert.equal(c.totalAportado, 0)
})
test('contraparte vacía queda como «Sin nombre»', () => {
  assert.equal(calcularCapital([{ contraparte: null, monto_clp: 10 }], 0).socios[0].nombre, 'Sin nombre')
})

test('los retiros se suman a quien aportó con ese nombre, aunque venga abreviado, y no cambian el porcentaje', () => {
  const socios = [{ contraparte: 'Ignacio Andres Navarrete Silva', monto_clp: 300000 }, { contraparte: 'Joseph Maillens', monto_clp: 30000 }]
  const c = calcularCapital(socios, 0, [{ contraparte: 'Ignacio', monto_clp: 30000 }, { contraparte: 'Joseph Maillens', monto_clp: 45000 }])
  assert.deepEqual(c.socios.map((s) => [s.nombre, s.aportado, s.retirado, s.porcentaje]), [['Ignacio Andres Navarrete Silva', 300000, 30000, 90.9], ['Joseph Maillens', 30000, 45000, 9.1]])
  assert.equal(c.totalRetirado, 75000)
})
test('«Ana» no es «Anabel»; quien retira sin haber aportado queda aparte con aporte 0', () => {
  const c = calcularCapital([{ contraparte: 'Anabel', monto_clp: 100 }], 0, [{ contraparte: 'Ana', monto_clp: 10 }])
  assert.deepEqual(c.socios.map((s) => [s.nombre, s.aportado, s.retirado]), [['Anabel', 100, 0], ['Ana', 0, 10]])
})
