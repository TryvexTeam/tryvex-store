import test from 'node:test'
import assert from 'node:assert/strict'
import { saldosDeEfectivo, totalPorDepositar, puedeDepositar, borrarDejaNegativo } from '../lib/efectivo.ts'

const m = (id, integrante_id, tipo, monto) => ({ id, integrante_id, tipo, monto_clp: monto })

test('el saldo es lo recibido menos lo depositado, por persona', () => {
  const s = saldosDeEfectivo([m(1, 'vicente', 'recibe', 50000), m(2, 'vicente', 'deposita', 20000), m(3, 'joseph', 'recibe', '30000')])
  assert.deepEqual(s.map((x) => [x.integranteId, x.recibido, x.depositado, x.saldo]), [['vicente', 50000, 20000, 30000], ['joseph', 30000, 0, 30000]])
})
test('ordena de mayor a menor saldo', () => {
  const s = saldosDeEfectivo([m(1, 'a', 'recibe', 1000), m(2, 'b', 'recibe', 9000), m(3, 'c', 'recibe', 5000)])
  assert.deepEqual(s.map((x) => x.integranteId), ['b', 'c', 'a'])
})
test('el total solo cuenta a quien tiene efectivo en la mano', () => {
  const s = saldosDeEfectivo([m(1, 'a', 'recibe', 10000), m(2, 'b', 'deposita', 4000)]) // b quedó en −4.000
  assert.equal(totalPorDepositar(s), 10000)
})
test('no se puede depositar más de lo que se tiene', () => {
  const s = saldosDeEfectivo([m(1, 'a', 'recibe', 10000)])
  assert.deepEqual(puedeDepositar(s, 'a', 10000), { ok: true })
  assert.deepEqual(puedeDepositar(s, 'a', 10001), { ok: false, tiene: 10000 })
  assert.deepEqual(puedeDepositar(s, 'nadie', 1), { ok: false, tiene: 0 })
})
test('borrar un «recibió» que ya fue depositado dejaría saldo negativo', () => {
  const movs = [m('r', 'a', 'recibe', 10000), m('d', 'a', 'deposita', 10000)]
  assert.equal(borrarDejaNegativo(movs, 'r'), true)
  assert.equal(borrarDejaNegativo(movs, 'd'), false)
  assert.equal(borrarDejaNegativo(movs, 'no-existe'), false)
})
test('sin movimientos: nada por depositar', () => {
  assert.deepEqual(saldosDeEfectivo([]), [])
  assert.equal(totalPorDepositar([]), 0)
})
