import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { ProductoTienda } from '@/lib/tienda'
import { TileProducto } from './tile-producto'

/** Novedades del catálogo, con límite deliberado para conservar una portada ágil. */
export function ListaProductos({ productos }: { productos: ProductoTienda[] }) {
  const recientes = productos.slice(0, 8)
  if (recientes.length === 0) return null

  return (
    <section id="lo-nuevo" aria-labelledby="lo-nuevo-titulo" className="mx-auto w-full max-w-[1204px] px-[22px] pt-10 t:pt-16">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 id="lo-nuevo-titulo" className="revela text-[28px] leading-[1.1] font-semibold tracking-seccion t:text-[36px]">Todo lo nuevo.</h2>
          <p className="mt-2 text-[16px] text-tinta-suave t:text-[17px]">Lo más reciente que llegó a la tienda.</p>
        </div>
        <Link href="/tienda" className="hidden shrink-0 text-[14px] font-medium text-spark hover:underline t:inline">Ver todo ({productos.length}) →</Link>
      </div>
      {/* La grilla se adapta a lo que hay. Con cuatro columnas fijas, un catálogo
          de un producto dejaba la tarjeta sola en la esquina con 1.273 px de
          desierto al lado; auto-fit colapsa las pistas vacías y el conjunto
          queda centrado, así una vitrina corta se ve intencional en vez de
          rota. Con catálogo lleno se comporta igual que antes. */}
      <ul className="mt-6 grid grid-cols-2 justify-center gap-x-4 gap-y-8 t:grid-cols-[repeat(auto-fit,minmax(240px,300px))] d:gap-x-5">
        {recientes.map((producto, indice) => <li key={producto.id} className="revela min-w-0" style={{ '--i': `${indice * 4}%` } as CSSProperties}><div className="tienda-marco h-full overflow-hidden rounded-[18px] bg-papel p-2 pb-4 t:p-3 t:pb-5"><TileProducto producto={producto} prioridad={indice < 4} /></div></li>)}
      </ul>
      {/* El envoltorio oculta: `tienda-boton` fija su propio display y le gana a `t:hidden`. */}
      <div className="mt-8 flex justify-center t:hidden">
        <Link href="/tienda" className="tienda-boton bg-tinta text-white hover:bg-tinta/90">Ver todo ({productos.length})</Link>
      </div>
    </section>
  )
}
