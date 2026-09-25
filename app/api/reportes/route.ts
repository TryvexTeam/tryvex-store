import { NextRequest, NextResponse } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export const dynamic = 'force-dynamic'

const VENDIDOS = ['pagado', 'preparando', 'enviado', 'entregado', 'completado']
const TIPOS = ['ventas', 'pedidos', 'inventario', 'finanzas'] as const
type Tipo = (typeof TIPOS)[number]

function csv(valor: unknown): string {
  const texto = String(valor ?? '')
  return `"${texto.replaceAll('"', '""')}"`
}
function archivo(nombre: string, cabeceras: string[], filas: unknown[][]) {
  return '\uFEFF' + [cabeceras, ...filas].map((fila) => fila.map(csv).join(',')).join('\r\n')
}

export async function GET(request: NextRequest) {
  const tipo = request.nextUrl.searchParams.get('tipo')
  if (!TIPOS.includes(tipo as Tipo)) return NextResponse.json({ error: 'Reporte no válido.' }, { status: 400 })
  const reporte = tipo as Tipo

  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 })
  const { data: integrante } = await supabase
    .from('dim_integrantes').select('ver_finanzas').eq('auth_user_id', user.id).eq('activo', true).maybeSingle()
  if (!integrante) return NextResponse.json({ error: 'No autorizado.' }, { status: 403 })
  if (tipo === 'finanzas' && !integrante.ver_finanzas) return NextResponse.json({ error: 'Sin permiso.' }, { status: 403 })

  let salida: string
  if (tipo === 'inventario') {
    const [{ data: stock }, { data: productos }] = await Promise.all([
      supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
      supabase.from('productos').select('id,stock_minimo').neq('estado', 'archivado'),
    ])
    const minimos = new Map((productos ?? []).map((p) => [p.id, Number(p.stock_minimo ?? 5)]))
    salida = archivo('inventario', ['SKU', 'Producto', 'Stock disponible', 'Mínimo', 'Reponer'], (stock ?? []).map((s) => {
      const minimo = minimos.get(s.producto_id) ?? 5
      return [s.sku, s.nombre, s.stock, minimo, Number(s.stock) <= minimo ? 'Sí' : 'No']
    }))
  } else if (tipo === 'finanzas') {
    const { data } = await supabase.from('movimientos_financieros').select('tipo,categoria,descripcion,monto_clp,fecha,metodo_pago,contraparte').order('fecha', { ascending: false }).limit(5000)
    salida = archivo('finanzas', ['Tipo', 'Categoría', 'Descripción', 'Monto CLP', 'Fecha', 'Método', 'Contraparte'], (data ?? []).map((m) => [m.tipo, m.categoria, m.descripcion, m.monto_clp, m.fecha, m.metodo_pago, m.contraparte]))
  } else {
    const { data } = await supabase.from('pedidos').select('numero,cliente_nombre,cliente_email,cliente_fono,canal,estado,metodo_pago,total_clp,created_at,pagado_at,envio_courier,envio_seguimiento').order('created_at', { ascending: false }).limit(5000)
    const filas = (data ?? []).filter((p) => tipo === 'pedidos' || VENDIDOS.includes(p.estado))
    salida = archivo(reporte, ['Número', 'Cliente', 'Email', 'Teléfono', 'Canal', 'Estado', 'Pago', 'Total CLP', 'Creado', 'Pagado', 'Courier', 'Seguimiento'], filas.map((p) => [p.numero, p.cliente_nombre, p.cliente_email, p.cliente_fono, p.canal, p.estado, p.metodo_pago, p.total_clp, p.created_at, p.pagado_at, p.envio_courier, p.envio_seguimiento]))
  }

  return new NextResponse(salida, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="tryvex-${reporte}.csv"`, 'Cache-Control': 'private, no-store' } })
}
