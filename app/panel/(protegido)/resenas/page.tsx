import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { urlPublicaResena } from '@/lib/resenas'
import { ResenasPanel, type ResenaPanel } from './resenas-panel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reseñas' }

export default async function PaginaResenas() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data: pedidos }, { data: resenas }] = await Promise.all([
    supabase
      .from('pedidos')
      .select('id,numero,cliente_nombre,pedido_items(producto_id,productos(nombre))')
      .eq('estado', 'entregado')
      .order('entregado_at', { ascending: false })
      .limit(100),
    supabase
      .from('resenas_tienda')
      .select('id,pedido_id,producto_id,cliente_nombre,texto,foto_path,visible,created_at,pedidos(numero),productos(nombre)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  type ItemCrudo = { producto_id: string; productos: { nombre: string } | null }
  type PedidoCrudo = { id: string; numero: number; cliente_nombre: string; pedido_items: ItemCrudo[] | null }
  type ResenaCruda = Omit<ResenaPanel, 'foto' | 'pedidoNumero' | 'producto'> & {
    foto_path: string | null
    pedidos: { numero: number } | null
    productos: { nombre: string } | null
  }

  const opciones = ((pedidos ?? []) as unknown as PedidoCrudo[]).flatMap((p) =>
    (p.pedido_items ?? []).map((i) => ({
      pedidoId: p.id,
      pedidoNumero: p.numero,
      cliente: p.cliente_nombre,
      productoId: i.producto_id,
      producto: i.productos?.nombre ?? 'Producto',
    })),
  )
  const lista: ResenaPanel[] = ((resenas ?? []) as unknown as ResenaCruda[]).map((r) => ({
    ...r,
    pedidoNumero: r.pedidos?.numero ?? 0,
    producto: r.productos?.nombre ?? 'Producto',
    foto: urlPublicaResena(r.foto_path),
  }))

  return <ResenasPanel opciones={opciones} resenas={lista} />
}
