import test from 'node:test'
import assert from 'node:assert/strict'
import { ventasPorPeriodo } from '../lib/ventas-periodo.ts'
import { calcularResultado } from '../lib/resultado.ts'

const AHORA = new Date('2026-10-01T15:00:00Z') // 12:00 en Santiago
const v = (tipo, total, iso) => ({ tipo, total_clp: total, created_at: iso })

test('suma las ventas de hoy y las de otros días del periodo', () => {
  const r = ventasPorPeriodo([v('venta', 150000, '2026-10-01T15:00:00Z'), v('venta', 40000, '2026-09-25T15:00:00Z')], 14, AHORA)
  assert.equal(r.vendido, 190000)
  assert.equal(r.serie.length, 14)
  assert.equal(r.serie.at(-1).dia, '2026-10-01')
  assert.equal(r.serie.at(-1).valor, 150000)
  assert.equal(r.serie[0].dia, '2026-09-18')
})
test('la devolución resta y los pedidos sin movimiento de venta no cuentan', () => {
  const r = ventasPorPeriodo([v('venta', 100000, '2026-10-01T15:00:00Z'), v('devolucion', 25000, '2026-10-01T16:00:00Z'), v('reserva', 99999, '2026-10-01T16:00:00Z')], 14, AHORA)
  assert.equal(r.vendido, 75000)
})
test('el periodo anterior del mismo largo se separa', () => {
  const r = ventasPorPeriodo([v('venta', 30000, '2026-09-10T15:00:00Z'), v('venta', 5000, '2026-08-01T15:00:00Z')], 14, AHORA)
  assert.equal(r.vendido, 0)
  assert.equal(r.vendidoAnterior, 30000)
})
test('una venta de las 22:00 en Santiago cuenta ese día aunque en UTC ya sea el siguiente', () => {
  const r = ventasPorPeriodo([v('venta', 1000, '2026-09-30T01:30:00Z')], 14, AHORA) // 29-sep 22:30 en Santiago (UTC-3)
  assert.equal(r.serie.find((s) => s.dia === '2026-09-29').valor, 1000)
})
test('sin ventas: todo en cero y sin romper', () => {
  const r = ventasPorPeriodo([], 7, AHORA)
  assert.equal(r.vendido, 0)
  assert.equal(r.serie.length, 7)
})

// Los hechos reales cargados el 2026-10-01.
const costos = new Map([['pro2', 10000], ['pro3', 14000], ['pb', 8000], ['par', 21000], ['car', 1800]])
const m = (producto_id, tipo, cantidad, total = null) => ({ producto_id, tipo, cantidad, total_clp: total })
const reales = [
  m('pro2', 'venta', -10, 150000), m('pro2', 'venta', -7, 140000), m('pro3', 'venta', -2, 50000), m('pro3', 'venta', -1, 27000),
  m('pb', 'venta', -1, 15000), m('par', 'venta', -2, 60000), m('car', 'venta', -5, 9000),
  m('pro3', 'merma', -3), m('pro2', 'uso_interno', -1), m('pb', 'ajuste', -1),
  m('pro2', 'ingreso', 30), m('pro2', 'reserva', -2),
]
test('resultado con los datos reales: ventas 451.000, costo 271.000, ganancia 180.000', () => {
  const r = calcularResultado(reales, costos)
  assert.equal(r.ventas, 451000)
  assert.equal(r.costoVendido, 271000)
  assert.equal(r.ganancia, 180000)
  assert.equal(r.margenPct, 39.9)
  assert.equal(r.unidadesVendidas, 28)
})
test('las pérdidas (rotos, muestra, diferencia) van aparte: 42.000 + 10.000 + 8.000', () => {
  const r = calcularResultado(reales, costos)
  assert.equal(r.perdidas, 60000)
  assert.equal(r.unidadesPerdidas, 5)
})
test('ingresos y reservas no son ventas ni pérdidas', () => {
  const r = calcularResultado([m('pro2', 'ingreso', 30), m('pro2', 'reserva', -2)], costos)
  assert.deepEqual([r.ventas, r.perdidas, r.margenPct], [0, 0, null])
})
test('una devolución resta venta y costo', () => {
  const r = calcularResultado([m('pro2', 'venta', -2, 40000), m('pro2', 'devolucion', 1, 20000)], costos)
  assert.equal(r.ventas, 20000)
  assert.equal(r.costoVendido, 10000)
  assert.equal(r.ganancia, 10000)
})
