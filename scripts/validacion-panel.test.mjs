import test from 'node:test'
import assert from 'node:assert/strict'
import { esquemaMovimiento, esquemaPedido, primerError } from '../lib/validacion-panel.ts'

const mov = { tipo: 'egreso', categoria: 'marketing', descripcion: 'Anuncios', monto_clp: '45000', fecha: '2026-09-30', metodo_pago: 'tarjeta', contraparte: '' }
const ped = { cliente_nombre: 'María', producto_id: 'abc', cantidad: '2' }

test('movimiento válido pasa y convierte el monto', () => {
  const r = esquemaMovimiento.safeParse(mov)
  assert.equal(r.success, true)
  assert.equal(r.data.monto_clp, 45000)
})
test('monto cero, negativo o no numérico se rechaza con motivo', () => {
  for (const m of ['0', '-5', 'abc', '']) {
    const r = esquemaMovimiento.safeParse({ ...mov, monto_clp: m })
    assert.equal(r.success, false, `monto ${m}`)
  }
  assert.match(primerError(esquemaMovimiento.safeParse({ ...mov, monto_clp: '0' }).error), /mayor que cero/)
})
test('fecha y método de pago inválidos', () => {
  assert.equal(esquemaMovimiento.safeParse({ ...mov, fecha: '30/09/2026' }).success, false)
  assert.equal(esquemaMovimiento.safeParse({ ...mov, metodo_pago: 'bitcoin' }).success, false)
  assert.equal(esquemaMovimiento.safeParse({ ...mov, metodo_pago: '' }).success, true)
})
test('pedido: teléfono y correo son opcionales', () => {
  assert.equal(esquemaPedido.safeParse(ped).success, true)
  assert.equal(esquemaPedido.safeParse({ ...ped, cliente_fono: '', cliente_email: '' }).success, true)
})
test('pedido: teléfono y correo con contenido deben ser válidos', () => {
  assert.equal(esquemaPedido.safeParse({ ...ped, cliente_fono: '+56 9 7359 3282' }).success, true)
  assert.equal(esquemaPedido.safeParse({ ...ped, cliente_fono: 'hola' }).success, false)
  assert.equal(esquemaPedido.safeParse({ ...ped, cliente_email: 'no-es-correo' }).success, false)
  assert.match(primerError(esquemaPedido.safeParse({ ...ped, cliente_fono: 'hola' }).error), /teléfono/)
})
test('pedido: cantidad entera de 1 en adelante', () => {
  for (const c of ['0', '-1', '1.5', 'x']) assert.equal(esquemaPedido.safeParse({ ...ped, cantidad: c }).success, false, `cantidad ${c}`)
  assert.equal(esquemaPedido.safeParse({ ...ped, nombre: '', cantidad: '3' }).success, true)
})
test('pedido sin nombre se rechaza', () => {
  const r = esquemaPedido.safeParse({ ...ped, cliente_nombre: '   ' })
  assert.equal(r.success, false)
  assert.match(primerError(r.error), /nombre/)
})
