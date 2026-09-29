import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { urlPublica } from '@/lib/imagenes'
import { Ordenar, type ProductoOrden } from './ordenar'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Orden de la vitrina' }

/**
 * Orden de la vitrina: qué va en «Todo lo nuevo» de la portada y en qué orden
 * se ve el catálogo completo en /tienda. Solo cuenta lo publicado: un
 * borrador no se ve en la tienda, así que no tiene lugar que ocupar.
 */
export default async function OrdenVitrina() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data: productos }, { data: stock }] = await Promise.all([
    supabase
      .from('productos')
      .select('id,nombre,imagen_url,orden,nuevo_orden,publicado_at')
      .eq('estado', 'publicado')
      .order('orden', { ascending: true, nullsFirst: false })
      .order('publicado_at', { ascending: false, nullsFirst: false }),
    supabase.from('v_stock_actual').select('producto_id,stock'),
  ])

  const stockPor = new Map((stock ?? []).map((s) => [s.producto_id as string, Number(s.stock ?? 0)]))
  const lista: ProductoOrden[] = (productos ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    imagen: p.imagen_url ? urlPublica(p.imagen_url) : null,
    agotado: (stockPor.get(p.id) ?? 0) <= 0,
  }))
  const loNuevo = (productos ?? [])
    .filter((p) => p.nuevo_orden !== null)
    .sort((a, b) => Number(a.nuevo_orden) - Number(b.nuevo_orden))
    .map((p) => p.id as string)

  return (
    <>
      <header className="mb-6">
        <Link href="/panel/productos" className="text-[14px] font-medium text-spark hover:underline">
          ← Productos
        </Link>
        <h1 className="mt-3 text-[34px] leading-[1.05] font-semibold tracking-[-0.03em] sm:text-[48px]">Orden de la vitrina.</h1>
        <p className="mt-2 text-[15px] text-tinta-suave sm:text-[17px]">
          Arrastra para decidir qué ve primero el cliente. Se guarda solo.
        </p>
      </header>
      <Ordenar productos={lista} loNuevo={loNuevo} />
    </>
  )
}
