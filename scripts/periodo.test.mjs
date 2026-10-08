import test from 'node:test'
import assert from 'node:assert/strict'
import { resolverPeriodo, sumarDias, hoyChile, inicioDiaChile, limitesTimestamp } from '../lib/periodo.ts'

test('30 días por defecto y anterior del mismo largo', () => {
  const p = resolverPeriodo({}, '2026-09-30')
  assert.equal(p.clave, '30d')
  assert.equal(p.desde, '2026-09-01')
  assert.deepEqual(p.anterior, { desde: '2026-08-02', hasta: '2026-08-31' })
})
test('mes en curso compara con los mismos días del mes anterior', () => {
  const p = resolverPeriodo({ periodo: 'mes' }, '2026-09-10')
  assert.equal(p.desde, '2026-09-01')
  assert.deepEqual(p.anterior, { desde: '2026-08-01', hasta: '2026-08-10' })
})
test('1 de octubre: «Este mes» es solo el 1-oct y no incluye septiembre', () => {
  const p = resolverPeriodo({ periodo: 'mes' }, '2026-10-01')
  assert.deepEqual([p.desde, p.hasta], ['2026-10-01', '2026-10-01'])
  assert.deepEqual(p.anterior, { desde: '2026-09-01', hasta: '2026-09-01' })
})
test('mes en curso: un día 31 contra un mes de 30 días usa el último día', () => {
  assert.deepEqual(resolverPeriodo({ periodo: 'mes' }, '2026-10-31').anterior, { desde: '2026-09-01', hasta: '2026-09-30' })
})
test('año en curso compara con el mismo tramo del año anterior', () => {
  const p = resolverPeriodo({ periodo: 'ano' }, '2026-10-01')
  assert.deepEqual([p.desde, p.hasta], ['2026-01-01', '2026-10-01'])
  assert.deepEqual(p.anterior, { desde: '2025-01-01', hasta: '2025-10-01' })
})
test('7 días termina hoy y cruza el cambio de mes', () => {
  const p = resolverPeriodo({ periodo: '7d' }, '2026-10-01')
  assert.deepEqual([p.desde, p.hasta], ['2026-09-25', '2026-10-01'])
  assert.deepEqual(p.anterior, { desde: '2026-09-18', hasta: '2026-09-24' })
})
test('el inicio del día usa el desfase real de Santiago (verano -03, invierno -04)', () => {
  assert.equal(inicioDiaChile('2026-09-30'), '2026-09-30T03:00:00.000Z') // verano
  assert.equal(inicioDiaChile('2026-07-15'), '2026-07-15T04:00:00.000Z') // invierno
  assert.equal(inicioDiaChile('2026-10-01'), '2026-10-01T03:00:00.000Z')
})
test('una venta a las 00:30 de Santiago del 1-oct cae en octubre, no en septiembre', () => {
  const { desde, hastaExclusivo } = limitesTimestamp({ desde: '2026-10-01', hasta: '2026-10-01' })
  const venta = '2026-10-01T03:30:00Z' // 00:30 en Santiago
  assert.ok(venta >= desde && venta < hastaExclusivo)
  const sep = limitesTimestamp({ desde: '2026-09-01', hasta: '2026-09-30' })
  assert.ok(!(venta >= sep.desde && venta < sep.hastaExclusivo))
})
test('todo no tiene límites', () => {
  assert.deepEqual(limitesTimestamp({ desde: null, hasta: null }), { desde: null, hastaExclusivo: null })
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
