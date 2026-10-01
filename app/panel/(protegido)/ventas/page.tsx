import { crearClienteServidor } from '@/lib/supabase/servidor'
import { productosConVariantes } from '@/lib/variantes-cliente'
import { urlPublica } from '@/lib/imagenes'
import { VentaRapida, type ProductoVenta } from './venta-rapida'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Venta rápida' }

export default async function Ventas() {
  const supabase = await crearClienteServidor()
  const [productos, { data: stock }, { data: base }] = await Promise.all([
    productosConVariantes(supabase),
    supabase.from('v_stock_actual').select('producto_id,stock'),
    supabase.from('productos').select('id,sku,precio_base,imagen_url').neq('estado', 'archivado'),
  ])

  const stockPor = new Map((stock ?? []).map((s) => [s.producto_id as string, Number(s.stock ?? 0)]))
  const basePor = new Map((base ?? []).map((p) => [p.id as string, p]))

  const lista: ProductoVenta[] = productos.map((p) => {
    const b = basePor.get(p.id)
    return {
      id: p.id,
      sku: String(b?.sku ?? ''),
      nombre: p.nombre,
      precio: Number(b?.precio_base ?? 0),
      costo: p.costo_unitario,
      imagen: b?.imagen_url ? urlPublica(String(b.imagen_url)) : null,
      stock: stockPor.get(p.id) ?? 0,
      variantes: p.variantes,
    }
  })

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Venta rápida</h1>
        <p className="mt-1 text-[15px] text-gris">Para showroom, feria o retiro presencial. Busca, cobra y descuenta el stock al instante.</p>
      </header>
      {lista.length ? (
        <VentaRapida productos={lista} />
      ) : (
        <div className="rounded-[var(--radius-widget)] bg-papel p-6 text-gris ring-1 ring-borde/60">No hay productos disponibles para vender.</div>
      )}
    </>
  )
}
