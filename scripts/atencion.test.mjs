import test from 'node:test'
import assert from 'node:assert/strict'
import { calcularAtencion } from '../lib/atencion.ts'

const base = { porCobrar: 0, pagoDeclarado: 0, porDespachar: 0, sinStock: 0, stockBajo: 0, egresosSinComprobante: null }

test('sin pendientes devuelve lista vacía', () => {
  assert.deepEqual(calcularAtencion(base), [])
})
test('el pago declarado va primero y no se cuenta dos veces', () => {
  const r = calcularAtencion({ ...base, porCobrar: 3, pagoDeclarado: 2 })
  assert.equal(r[0].clave, 'declarado')
  assert.match(r[0].titulo, /^2 clientes dicen/)
  assert.equal(r[1].clave, 'cobrar')
  assert.match(r[1].titulo, /^1 pedido por cobrar/)
})
test('singular y plural', () => {
  assert.match(calcularAtencion({ ...base, sinStock: 1 })[0].titulo, /^1 producto sin stock/)
  assert.match(calcularAtencion({ ...base, sinStock: 5 })[0].titulo, /^5 productos sin stock/)
})
test('quien no ve finanzas no recibe el aviso de comprobantes', () => {
  assert.equal(calcularAtencion({ ...base, egresosSinComprobante: null }).length, 0)
  assert.equal(calcularAtencion({ ...base, egresosSinComprobante: 0 }).length, 0)
  assert.equal(calcularAtencion({ ...base, egresosSinComprobante: 4 })[0].href, '/panel/finanzas?periodo=30d&sin=1')
})
test('orden de urgencia: declarado, cobrar, despachar, sin stock, bajo, comprobantes', () => {
  const r = calcularAtencion({ porCobrar: 2, pagoDeclarado: 1, porDespachar: 1, sinStock: 1, stockBajo: 1, egresosSinComprobante: 1 })
  assert.deepEqual(r.map((i) => i.clave), ['declarado', 'cobrar', 'despachar', 'sin-stock', 'bajo', 'comprobantes'])
})
