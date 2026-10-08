import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularAtencion, MAX_PEDIDOS_VISIBLES } from '../lib/atencion.ts'

const base = { pedidos: [], sinStock: 0, stockBajo: 0, egresosSinComprobante: null }
const ped = (numero, estado, extra = {}) => ({ numero, cliente: `Cliente ${numero}`, estado, pagoDeclarado: false, total: 25000, ...extra })

test('sin pendientes devuelve lista vacía', () => {
  assert.deepEqual(calcularAtencion(base), [])
})
test('cada pedido es su propia fila y enlaza directo a ese pedido', () => {
  const r = calcularAtencion({ ...base, pedidos: [ped(43, 'pagado')] })
  assert.equal(r.length, 1)
  assert.equal(r[0].href, '/panel/pedidos#pedido-43')
  assert.equal(r[0].titulo, '#43 · Cliente 43')
  assert.match(r[0].detalle, /falta despacharlo/)
  assert.equal(r[0].monto, 25000)
})
test('orden: pago declarado, pendiente, por despachar; el más antiguo primero', () => {
  const r = calcularAtencion({
    ...base,
    pedidos: [ped(50, 'pagado'), ped(48, 'pendiente'), ped(52, 'pendiente', { pagoDeclarado: true }), ped(45, 'pagado')],
  })
  assert.deepEqual(r.map((i) => i.clave), ['pedido-52', 'pedido-48', 'pedido-45', 'pedido-50'])
  assert.equal(r[0].tono, 'rojo')
  assert.match(r[0].detalle, /Dice haber pagado/)
})
test('más pedidos que el tope se resumen en una fila hacia la lista', () => {
  const muchos = Array.from({ length: MAX_PEDIDOS_VISIBLES + 3 }, (_, i) => ped(i + 1, 'pagado'))
  const r = calcularAtencion({ ...base, pedidos: muchos })
  assert.equal(r.length, MAX_PEDIDOS_VISIBLES + 1)
  const ultima = r.at(-1)
  assert.equal(ultima.clave, 'pedidos-mas')
  assert.match(ultima.titulo, /^3 pedidos más/)
  assert.equal(ultima.href, '/panel/pedidos')
})
test('pedido sin nombre no rompe el título', () => {
  assert.equal(calcularAtencion({ ...base, pedidos: [ped(7, 'pagado', { cliente: null })] })[0].titulo, '#7 · Sin nombre')
})
test('el stock se abre ya filtrado', () => {
  const r = calcularAtencion({ ...base, sinStock: 44, stockBajo: 5 })
  assert.equal(r[0].href, '/panel/stock?filtro=sin')
  assert.match(r[0].titulo, /^44 productos sin stock/)
  assert.equal(r[1].href, '/panel/stock?filtro=bajo')
})
test('singular y plural', () => {
  assert.match(calcularAtencion({ ...base, sinStock: 1 })[0].titulo, /^1 producto sin stock/)
})
test('quien no ve finanzas no recibe el aviso de comprobantes', () => {
  assert.equal(calcularAtencion({ ...base, egresosSinComprobante: null }).length, 0)
  assert.equal(calcularAtencion({ ...base, egresosSinComprobante: 0 }).length, 0)
  assert.equal(calcularAtencion({ ...base, egresosSinComprobante: 4 })[0].href, '/panel/finanzas?periodo=30d&sin=1')
})

test('el efectivo por depositar aparece con quién lo tiene y enlaza al cuadre', () => {
  const r = calcularAtencion({ ...base, efectivo: { total: 150000, personas: [{ nombre: 'Vicente', monto: 100000 }, { nombre: 'Joseph', monto: 50000 }] } })
  assert.equal(r[0].clave, 'efectivo')
  assert.match(r[0].titulo, /^Efectivo por depositar · \$150\.000/)
  assert.equal(r[0].detalle, 'Vicente $100.000 · Joseph $50.000')
  assert.equal(r[0].href, '/panel/finanzas#efectivo')
})
test('sin efectivo (o para quien no ve finanzas) no hay aviso', () => {
  assert.equal(calcularAtencion({ ...base, efectivo: { total: 0, personas: [] } }).length, 0)
  assert.equal(calcularAtencion({ ...base, efectivo: null }).length, 0)
})
