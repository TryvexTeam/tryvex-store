import test from 'node:test'
import assert from 'node:assert/strict'
import { fecha, clp } from '../lib/formato.ts'

test('una fecha de calendario no se corre un día', () => {
  assert.match(fecha('2026-10-01'), /^01 oct/)
  assert.match(fecha('2026-01-01'), /^01 ene/)
  assert.match(fecha('2026-12-31'), /^31 dic/)
})
test('un instante con hora sí se pasa a hora de Santiago', () => {
  assert.match(fecha('2026-10-01T01:30:00Z'), /^30 sept/) // 30-sep 22:30 en Santiago
  assert.match(fecha('2026-10-01T15:00:00Z'), /^01 oct/)
})
test('vacío y formato de pesos', () => {
  assert.equal(fecha(null), '—')
  assert.equal(clp(63162), '$63.162')
  assert.equal(clp(undefined), '—')
})
