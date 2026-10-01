import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual, NEGOCIO_TIENDA } from '@/lib/sesion'
import { calcularAtencion } from '@/lib/atencion'
import { hoyChile, sumarDias } from '@/lib/periodo'
import { ventasPorPeriodo } from '@/lib/ventas-periodo'
import { saldosDeEfectivo } from '@/lib/efectivo'
import { AvisosTelefono } from '@/components/panel/avisos-telefono'
import { ResumenPanel, DIAS_TENDENCIA } from '@/components/panel/resumen-panel'

export const dynamic = 'force-dynamic'

export default async function Resumen() {
  const yo = await integranteActual()
  const supabase = await crearClienteServidor()

  // Se piden DOS periodos: el actual y el anterior del mismo largo, para decir si se vende más o menos.
  // Con un día de margen: los límites de cada día se resuelven en hora de Santiago, no de UTC.
  const desde = new Date(Date.now() - (2 * DIAS_TENDENCIA + 1) * 86_400_000).toISOString()

  const verFinanzas = Boolean(yo.ver_finanzas)
  const [{ data: stock }, { data: productos }, { data: recientes }, { data: ventasMovs }, { data: actividad }, { data: abiertos }, { data: minimos }, sinComprobante, { data: efectivoRows }, { data: integrantes }] =
    await Promise.all([
      supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
      supabase.from('productos').select('id,nombre,precio_base,costo_unitario,activo'),
      supabase
        .from('pedidos')
        .select('id,numero,cliente_nombre,estado,total_clp,created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      // Todas las ventas dejan un movimiento `venta` (pedidos pagados, ventas a mano y las anteriores al panel).
      supabase
        .from('stock_movimientos')
        .select('tipo,total_clp,created_at')
        .in('tipo', ['venta', 'devolucion'])
        .gte('created_at', desde),
      supabase
        .from('actividad_tienda')
        .select('id,accion,entidad,detalle,created_at,dim_integrantes(nombre)')
        .order('created_at', { ascending: false })
        .limit(8),
      // Lo que sigue abierto, sin límite de fecha: un pedido pendiente de hace un mes sigue pendiente.
      supabase.from('pedidos').select('numero,cliente_nombre,estado,pago_declarado_at,total_clp').in('estado', ['pendiente', 'pagado', 'preparando']).order('numero', { ascending: true }).limit(1000),
      supabase.from('productos').select('id,stock_minimo,estado').neq('estado', 'archivado'),
      verFinanzas
        ? supabase
            .from('movimientos_financieros')
            .select('id', { count: 'exact', head: true })
            .eq('negocio', NEGOCIO_TIENDA)
            .eq('tipo', 'egreso')
            .is('voucher_path', null)
            .gte('fecha', sumarDias(hoyChile(), -29))
        : Promise.resolve({ count: null }),
      verFinanzas ? supabase.from('efectivo_por_depositar').select('integrante_id,tipo,monto_clp').limit(5000) : Promise.resolve({ data: null }),
      verFinanzas ? supabase.from('dim_integrantes').select('id,nombre').eq('activo', true) : Promise.resolve({ data: null }),
    ])

  const unidades = (stock ?? []).reduce((a, s) => a + (s.stock ?? 0), 0)
  const precioPorProducto = new Map(
    (productos ?? []).map((p) => [p.id, Number(p.precio_base ?? 0)])
  )
  const costoPorProducto = new Map(
    (productos ?? []).map((p) => [p.id, Number(p.costo_unitario ?? 0)])
  )

  const valorInventario = (stock ?? []).reduce(
    (a, s) => a + (s.stock ?? 0) * (precioPorProducto.get(s.producto_id) ?? 0),
    0
  )
  const costoInventario = (stock ?? []).reduce(
    (a, s) => a + (s.stock ?? 0) * (costoPorProducto.get(s.producto_id) ?? 0),
    0
  )

  const { vendido, vendidoAnterior, serie } = ventasPorPeriodo(ventasMovs ?? [], DIAS_TENDENCIA)
  // Lo que nos deben: todo pedido pendiente, sin importar de qué fecha sea.
  const pendientesAbiertos = (abiertos ?? []).filter((p) => p.estado === 'pendiente')
  const porCobrar = pendientesAbiertos.reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const pendientes = pendientesAbiertos.length

  const minimoPor = new Map((minimos ?? []).map((m) => [m.id, Number(m.stock_minimo ?? 5)]))
  const publicado = new Set((minimos ?? []).filter((m) => m.estado === 'publicado').map((m) => m.id))
  const filasStock = stock ?? []
  const atencion = calcularAtencion({
    pedidos: (abiertos ?? []).map((p) => ({
      numero: p.numero,
      cliente: p.cliente_nombre,
      estado: p.estado,
      pagoDeclarado: Boolean(p.pago_declarado_at),
      total: Number(p.total_clp ?? 0),
    })),
    // «Sin stock» solo importa si el producto está a la venta: lo oculto a propósito no es una urgencia.
    sinStock: filasStock.filter((f) => Number(f.stock ?? 0) <= 0 && publicado.has(f.producto_id)).length,
    stockBajo: filasStock.filter((f) => Number(f.stock ?? 0) > 0 && Number(f.stock ?? 0) <= (minimoPor.get(f.producto_id) ?? 5)).length,
    egresosSinComprobante: verFinanzas ? (sinComprobante.count ?? 0) : null,
    efectivo: verFinanzas
      ? (() => {
          const nombres = new Map((integrantes ?? []).map((i) => [i.id as string, String(i.nombre).trim().split(/\s+/)[0]]))
          const personas = saldosDeEfectivo(efectivoRows ?? []).filter((x) => x.saldo > 0).map((x) => ({ nombre: nombres.get(x.integranteId) ?? 'Alguien', monto: x.saldo }))
          return { total: personas.reduce((a, x) => a + x.monto, 0), personas }
        })()
      : null,
  })

  return (
    <ResumenPanel
      nombre={yo.nombre}
      verFinanzas={Boolean(yo.ver_finanzas)}
      recientes={recientes}
      actividad={actividad}
      serie={serie}
      vendido={vendido}
      vendidoAnterior={vendidoAnterior}
      porCobrar={porCobrar}
      pendientes={pendientes}
      unidades={unidades}
      valorInventario={valorInventario}
      costoInventario={costoInventario}
      avisos={<AvisosTelefono />}
      atencion={atencion}
    />
  )
}
