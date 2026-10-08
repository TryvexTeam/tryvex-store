import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_LINEAS_VENTA as TOPE_CLIENTE } from '../lib/venta.ts'
import { esquemaMovimiento, esquemaPedido, esquemaLineasVenta, esquemaEncabezadoVenta, esquemaConteo, esquemaEfectivo, esquemaConteoEfectivo, esquemaSaldoCuenta, MAX_LINEAS_VENTA, primerError } from '../lib/validacion-panel.ts'

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

const ef = { integrante_id: 'v', tipo: 'recibe', monto_clp: '50.000', fecha: '2026-10-01', nota: '' }
test('efectivo: acepta pesos con puntos o con $ y convierte a número', () => {
  assert.equal(esquemaEfectivo.safeParse(ef).data.monto_clp, 50000)
  assert.equal(esquemaEfectivo.safeParse({ ...ef, monto_clp: '$ 1.250.000' }).data.monto_clp, 1250000)
})
test('efectivo: cero, vacío, negativo o texto se rechazan con motivo', () => {
  for (const monto_clp of ['0', '', '-5', 'abc', 1.5]) assert.equal(esquemaEfectivo.safeParse({ ...ef, monto_clp }).success, false, `monto ${monto_clp}`)
  assert.match(primerError(esquemaEfectivo.safeParse({ ...ef, monto_clp: '0' }).error), /mayor que cero/)
  assert.equal(esquemaEfectivo.safeParse({ ...ef, tipo: 'regala' }).success, false)
  assert.equal(esquemaEfectivo.safeParse({ ...ef, integrante_id: '' }).success, false)
})
test('«tiene ahora»: cero es válido pero un campo vacío no', () => {
  const base = { integrante_id: 'v', fecha: '2026-10-01' }
  assert.equal(esquemaConteoEfectivo.safeParse({ ...base, real: '0' }).success, true)
  assert.equal(esquemaConteoEfectivo.safeParse({ ...base, real: '' }).success, false)
  assert.match(primerError(esquemaConteoEfectivo.safeParse({ ...base, real: '' }).error), /Escribe/)
})
test('saldo de cuenta: 63.162 vale y un campo vacío no deja el saldo en cero', () => {
  assert.equal(esquemaSaldoCuenta.safeParse({ monto_clp: '63.162', fecha: '2026-10-01' }).data.monto_clp, 63162)
  assert.equal(esquemaSaldoCuenta.safeParse({ monto_clp: '', fecha: '2026-10-01' }).success, false)
  assert.equal(esquemaSaldoCuenta.safeParse({ monto_clp: '0', fecha: '2026-10-01' }).success, true)
  assert.equal(esquemaSaldoCuenta.safeParse({ monto_clp: '5', fecha: 'ayer' }).success, false)
})
