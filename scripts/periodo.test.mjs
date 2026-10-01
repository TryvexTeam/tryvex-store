import test from 'node:test'
import assert from 'node:assert/strict'
import { resolverPeriodo, sumarDias, hoyChile } from '../lib/periodo.ts'

test('30 días por defecto y anterior del mismo largo', () => {
  const p = resolverPeriodo({}, '2026-09-30')
  assert.equal(p.clave, '30d')
  assert.equal(p.desde, '2026-09-01')
  assert.deepEqual(p.anterior, { desde: '2026-08-02', hasta: '2026-08-31' })
})
test('mes en curso compara con los mismos días anteriores', () => {
  const p = resolverPeriodo({ periodo: 'mes' }, '2026-09-10')
  assert.equal(p.desde, '2026-09-01')
  assert.deepEqual(p.anterior, { desde: '2026-08-22', hasta: '2026-08-31' })
})
test('rango propio válido manda sobre el atajo', () => {
  const p = resolverPeriodo({ periodo: '7d', desde: '2026-01-01', hasta: '2026-01-31' }, '2026-09-30')
  assert.equal(p.clave, 'rango')
  assert.deepEqual(p.anterior, { desde: '2025-12-01', hasta: '2025-12-31' })
})
test('rango invertido o mal formado se ignora', () => {
  assert.equal(resolverPeriodo({ desde: '2026-02-01', hasta: '2026-01-01' }, '2026-09-30').clave, '30d')
  assert.equal(resolverPeriodo({ desde: 'x', hasta: 'y' }, '2026-09-30').clave, '30d')
})
test('todo no tiene periodo anterior', () => {
  assert.equal(resolverPeriodo({ periodo: 'todo' }).anterior, null)
})
test('sumarDias cruza meses y años', () => {
  assert.equal(sumarDias('2026-01-01', -1), '2025-12-31')
  assert.equal(sumarDias('2026-02-28', 1), '2026-03-01')
})
test('hoyChile devuelve YYYY-MM-DD', () => {
  assert.match(hoyChile(), /^\d{4}-\d{2}-\d{2}$/)
})
