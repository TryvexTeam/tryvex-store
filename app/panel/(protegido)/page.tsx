import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { AvisosTelefono } from '@/components/panel/avisos-telefono'
import { ResumenPanel, DIAS_TENDENCIA, VENDIDOS } from '@/components/panel/resumen-panel'

export const dynamic = 'force-dynamic'

export default async function Resumen() {
  const yo = await integranteActual()
  const supabase = await crearClienteServidor()

  // Se piden DOS periodos: el actual y el anterior del mismo largo, para decir si se vende más o menos.
  const desde = new Date(Date.now() - 2 * DIAS_TENDENCIA * 86_400_000).toISOString()
  const inicioActual = Date.now() - DIAS_TENDENCIA * 86_400_000

  const [{ data: stock }, { data: productos }, { data: recientes }, { data: delPeriodo }, { data: actividad }] =
    await Promise.all([
      supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
      supabase.from('productos').select('id,nombre,precio_base,costo_unitario,activo'),
      supabase
        .from('pedidos')
        .select('id,numero,cliente_nombre,estado,total_clp,created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('pedidos')
        .select('estado,total_clp,created_at')
        .gte('created_at', desde),
      supabase
        .from('actividad_tienda')
        .select('id,accion,entidad,detalle,created_at,dim_integrantes(nombre)')
        .order('created_at', { ascending: false })
        .limit(8),
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

  const dosPeriodos = delPeriodo ?? []
  const esActual = (p: { created_at: string }) => new Date(p.created_at).getTime() >= inicioActual
  const periodo = dosPeriodos.filter(esActual)
  const vendido = periodo
    .filter((p) => VENDIDOS.includes(p.estado))
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const vendidoAnterior = dosPeriodos
    .filter((p) => !esActual(p) && VENDIDOS.includes(p.estado))
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const porCobrar = periodo
    .filter((p) => p.estado === 'pendiente')
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const pendientes = periodo.filter((p) => p.estado === 'pendiente').length

  // Serie por día: se parte de los días, no de los pedidos, para que un día
  // sin ventas valga cero en vez de desaparecer y falsear la curva.
  const serie = Array.from({ length: DIAS_TENDENCIA }, (_, i) => {
    const d = new Date(Date.now() - (DIAS_TENDENCIA - 1 - i) * 86_400_000)
    const clave = d.toISOString().slice(0, 10)
    const valor = periodo
      .filter(
        (p) => VENDIDOS.includes(p.estado) && p.created_at?.slice(0, 10) === clave
      )
      .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
    return { dia: clave, valor }
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
    />
  )
}
