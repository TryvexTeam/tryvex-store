// Pruebas del cálculo de fechas de entrega. Se corren con:
//   node --test scripts/plazo-envio.test.mjs
// Node 22+ importa el .ts directo; el módulo no depende de nada de Next.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  PLAZO_TRYVEX,
  hoyEnSantiago,
  esHabil,
  sumarHabiles,
  hitosDeEnvio,
  rotuloDeFechas,
  titularDeLlegada,
  fraseDeLlegada,
} from '../lib/plazo-envio.ts'

test('hoyEnSantiago usa la fecha de Santiago, no la de UTC', () => {
  // 23:00 del 30-sep en Santiago (UTC-3) ya es 1-oct en UTC.
  assert.equal(hoyEnSantiago(new Date('2026-10-01T02:00:00Z')), '2026-09-30')
  // Pasada la medianoche de Santiago cambia el día.
  assert.equal(hoyEnSantiago(new Date('2026-10-01T03:30:00Z')), '2026-10-01')
})

test('esHabil: fin de semana y feriados no cuentan', () => {
  assert.equal(esHabil('2026-09-30'), true) // miércoles
  assert.equal(esHabil('2026-10-03'), false) // sábado
  assert.equal(esHabil('2026-10-04'), false) // domingo
  assert.equal(esHabil('2026-10-12'), false) // lunes feriado
  assert.equal(esHabil('2026-09-18'), false) // viernes feriado
})

test('sumarHabiles salta fines de semana', () => {
  assert.equal(sumarHabiles('2026-09-30', 1), '2026-10-01')
  assert.equal(sumarHabiles('2026-09-30', 3), '2026-10-05') // jue, vie, lun
  assert.equal(sumarHabiles('2026-09-30', 5), '2026-10-07')
})

test('sumarHabiles salta feriados pegados a un fin de semana', () => {
  // 18 y 19 de septiembre 2026: viernes y sábado feriados.
  assert.equal(sumarHabiles('2026-09-17', 1), '2026-09-21')
  // Viernes 9-oct: sábado, domingo y lunes 12 (feriado) quedan fuera.
  assert.equal(sumarHabiles('2026-10-09', 1), '2026-10-13')
})

test('sumarHabiles desde un día inhábil cuenta desde el siguiente hábil', () => {
  // Sábado 3-oct: +1 es el lunes 5, no el domingo.
  assert.equal(sumarHabiles('2026-10-03', 1), '2026-10-05')
  assert.equal(sumarHabiles('2026-10-03', 0), '2026-10-03')
})

test('año fuera de la tabla de feriados: solo se excluye el fin de semana', () => {
  assert.equal(esHabil('2031-12-25'), true) // sin datos, no se inventa un feriado
  assert.equal(esHabil('2031-12-27'), false) // sábado
})

test('hitosDeEnvio con el plazo de Tryvex (despacho 1–2, llega 3–5)', () => {
  assert.deepEqual(PLAZO_TRYVEX, { despacho: [1, 2], llegada: [3, 5] })
  const h = hitosDeEnvio(new Date('2026-09-30T15:00:00Z')) // mié 30-sep, 12:00 Santiago
  assert.deepEqual(h, [
    { clave: 'pedido', desde: '2026-09-30', hasta: '2026-09-30' },
    { clave: 'despacho', desde: '2026-10-01', hasta: '2026-10-02' },
    { clave: 'llegada', desde: '2026-10-05', hasta: '2026-10-07' },
  ])
})

test('hitosDeEnvio: una compra de madrugada cuenta con la fecha de Santiago', () => {
  const h = hitosDeEnvio(new Date('2026-10-01T02:00:00Z')) // 23:00 del 30-sep
  assert.equal(h[0].desde, '2026-09-30')
})

test('rotuloDeFechas', () => {
  assert.equal(rotuloDeFechas('2026-09-30', '2026-09-30'), '30 sep')
  assert.equal(rotuloDeFechas('2026-10-01', '2026-10-02'), '1 – 2 oct')
  assert.equal(rotuloDeFechas('2026-09-30', '2026-10-02'), '30 sep – 2 oct')
})

test('titularDeLlegada', () => {
  assert.equal(titularDeLlegada('2026-10-05', '2026-10-07'), 'Llega entre el 5 y el 7 de octubre')
  assert.equal(titularDeLlegada('2026-09-30', '2026-10-02'), 'Llega entre el 30 de septiembre y el 2 de octubre')
  assert.equal(titularDeLlegada('2026-10-05', '2026-10-05'), 'Llega el 5 de octubre')
})

test('fraseDeLlegada: la fecha de llegada lista para insertar en una oración', () => {
  const h = hitosDeEnvio(new Date('2026-09-30T15:00:00Z'))
  assert.equal(fraseDeLlegada(h), 'entre el 5 y el 7 de octubre')
  assert.equal(fraseDeLlegada([]), null)
  assert.equal(fraseDeLlegada([{ clave: 'pedido', desde: '2026-09-30', hasta: '2026-09-30' }]), null)
})
