import test from 'node:test'
import assert from 'node:assert/strict'
import { agruparPorMetodo } from '../lib/cuentas.ts'

const m = (tipo, monto, metodo) => ({ tipo, monto_clp: monto, metodo_pago: metodo })

test('suma entradas y salidas por método y calcula el neto', () => {
  const r = agruparPorMetodo([m('ingreso', 100000, 'efectivo'), m('egreso', '30000', 'efectivo'), m('ingreso', 50000, 'transferencia')])
  const ef = r.find((c) => c.clave === 'efectivo')
  assert.equal(ef.entro, 100000)
  assert.equal(ef.salio, 30000)
  assert.equal(ef.neto, 70000)
  assert.equal(ef.movimientos, 2)
  assert.equal(r.find((c) => c.clave === 'transferencia').neto, 50000)
})
test('el neto puede ser negativo', () => {
  assert.equal(agruparPorMetodo([m('egreso', 45000, 'tarjeta')])[0].neto, -45000)
})
test('vacío, null o espacios caen en «Sin método», siempre al final', () => {
  const r = agruparPorMetodo([m('ingreso', 1, null), m('ingreso', 1, ''), m('ingreso', 1, '  '), m('ingreso', 5, 'efectivo')])
  assert.equal(r.at(-1).clave, 'sin_metodo')
  assert.equal(r.at(-1).movimientos, 3)
  assert.equal(r.at(-1).etiqueta, 'Sin método')
})
test('más movimientos primero y método desconocido conserva su nombre', () => {
  const r = agruparPorMetodo([m('ingreso', 1, 'cripto'), m('ingreso', 1, 'efectivo'), m('ingreso', 1, 'efectivo')])
  assert.deepEqual(r.map((c) => c.clave), ['efectivo', 'cripto'])
  assert.equal(r[1].etiqueta, 'cripto')
})
test('sin movimientos no hay cuentas', () => {
  assert.deepEqual(agruparPorMetodo([]), [])
})
