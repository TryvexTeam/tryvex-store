import { crearClienteServidor } from '@/lib/supabase/servidor'
import { productosConVariantes } from '@/lib/variantes-cliente'
import { NuevoPedido } from '../pedidos/controles'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Venta rápida' }

export default async function Ventas() {
  const supabase = await crearClienteServidor()
  const [productos, { data: stock }] = await Promise.all([
    productosConVariantes(supabase),
    supabase.from('v_stock_actual').select('stock'),
  ])
  const disponible = (stock ?? []).reduce((total, fila) => total + Number(fila.stock ?? 0), 0)
  return (
    <>
      <header className="mb-8"><h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Venta rápida</h1><p className="mt-1 text-[15px] text-gris">Para showroom, feria o retiro presencial. Crea el pedido, cobra y descuenta el stock en el flujo existente.</p></header>
      {productos?.length ? <div className="max-w-[680px]"><NuevoPedido productos={productos} stock={disponible} modoRapido /></div> : <div className="rounded-[var(--radius-tarjeta)] bg-papel p-6 text-gris ring-1 ring-borde/70">No hay productos disponibles para vender.</div>}
    </>
  )
}
