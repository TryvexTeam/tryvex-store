import test from 'node:test'
import assert from 'node:assert/strict'
import { planificarConteo } from '../lib/conteo.ts'

test('subir el stock: de 0 a 10 suma 10', () => {
  assert.deepEqual(planificarConteo(0, 10), { delta: 10, motivo: 'Conteo real: 10 (el sistema decía 0)' })
})
test('bajar el stock: de 12 a 10 resta 2', () => {
  assert.equal(planificarConteo(12, 10).delta, -2)
})
test('si ya coincide no hay nada que registrar', () => {
  assert.equal(planificarConteo(7, 7), null)
})
test('llevarlo a cero es válido', () => {
  assert.equal(planificarConteo(3, 0).delta, -3)
})
