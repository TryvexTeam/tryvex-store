import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_LINEAS_VENTA as TOPE_CLIENTE } from '../lib/venta.ts'
import { esquemaMovimiento, esquemaPedido, esquemaLineasVenta, esquemaEncabezadoVenta, esquemaConteo, MAX_LINEAS_VENTA, primerError } from '../lib/validacion-panel.ts'

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

const linea = { producto_id: 'p1', variante_id: '', cantidad: 2, precio_unitario: '25000' }
test('venta: varias líneas válidas, variante vacía pasa a null', () => {
  const r = esquemaLineasVenta.safeParse([linea, { ...linea, producto_id: 'p2', variante_id: 'v9' }])
  assert.equal(r.success, true)
  assert.equal(r.data[0].variante_id, null)
  assert.equal(r.data[1].variante_id, 'v9')
  assert.equal(r.data[0].precio_unitario, 25000)
})
test('venta: sin líneas se rechaza con motivo', () => {
  const r = esquemaLineasVenta.safeParse([])
  assert.equal(r.success, false)
  assert.match(primerError(r.error), /al menos un producto/)
})
test('venta: tope de líneas', () => {
  const muchas = Array.from({ length: MAX_LINEAS_VENTA + 1 }, () => linea)
  assert.equal(esquemaLineasVenta.safeParse(muchas).success, false)
  assert.equal(esquemaLineasVenta.safeParse(muchas.slice(0, MAX_LINEAS_VENTA)).success, true)
})
test('venta: cantidad y precio inválidos', () => {
  for (const c of [0, -1, 1.5, 'x']) assert.equal(esquemaLineasVenta.safeParse([{ ...linea, cantidad: c }]).success, false, `cantidad ${c}`)
  assert.equal(esquemaLineasVenta.safeParse([{ ...linea, precio_unitario: -1 }]).success, false)
  assert.equal(esquemaLineasVenta.safeParse([{ ...linea, precio_unitario: 'abc' }]).success, false)
  assert.equal(esquemaLineasVenta.safeParse('no es lista').success, false)
})
test('venta: encabezado con todo opcional salvo el nombre por defecto', () => {
  assert.equal(esquemaEncabezadoVenta.safeParse({ cliente_nombre: 'Venta en mostrador', canal: 'presencial', metodo_pago: 'efectivo' }).success, true)
  assert.equal(esquemaEncabezadoVenta.safeParse({ cliente_nombre: 'Ana', cliente_fono: 'hola' }).success, false)
})

test('el tope de líneas del cliente y el del servidor coinciden', () => {
  assert.equal(TOPE_CLIENTE, MAX_LINEAS_VENTA)
})

test('conteo: número real válido, vacío o con variantes', () => {
  const r = esquemaConteo.safeParse({ producto_id: 'p1', lineas: [{ variante_id: '', real: '10' }, { variante_id: 'v1', real: 0 }] })
  assert.equal(r.success, true)
  assert.deepEqual(r.data.lineas.map((l) => [l.variante_id, l.real]), [[null, 10], ['v1', 0]])
})
test('conteo: negativo, decimal, texto o sin líneas se rechazan con motivo', () => {
  for (const real of [-1, 1.5, 'x', '']) assert.equal(esquemaConteo.safeParse({ producto_id: 'p1', lineas: [{ real }] }).success, false, `real ${real}`)
  assert.match(primerError(esquemaConteo.safeParse({ producto_id: 'p1', lineas: [] }).error), /nada que guardar/)
  assert.match(primerError(esquemaConteo.safeParse({ producto_id: 'p1', lineas: [{ real: -3 }] }).error), /negativo/)
})
