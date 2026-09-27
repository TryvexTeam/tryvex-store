import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { ProductoTienda } from '@/lib/tienda'
import { Carrusel } from './carrusel'
import { CardProducto } from './card-producto'

/**
 * Novedades del catálogo, en la misma fila deslizable que usa Apple para
 * «Accesorios»: cards de 313 × 500 que no se estiran, y la siguiente siempre
 * asomándose por el borde. Con límite deliberado para una portada ágil.
 */
export function ListaProductos({ productos }: { productos: ProductoTienda[] }) {
  const recientes = productos.slice(0, 8)
  if (recientes.length === 0) return null

  return (
    <section id="lo-nuevo" aria-labelledby="lo-nuevo-titulo" className="pt-10 t:pt-16">
      <div className="mx-auto flex w-full max-w-[1204px] items-end justify-between gap-4 px-[22px]">
        <div>
          <h2 id="lo-nuevo-titulo" className="revela text-[28px] leading-[1.1] font-semibold tracking-seccion t:text-[36px]">Todo lo nuevo.</h2>
          <p className="mt-2 text-[16px] text-tinta-suave t:text-[17px]">Lo más reciente que llegó a la tienda.</p>
        </div>
        <Link href="/tienda" className="shrink-0 text-[14px] font-medium text-spark hover:underline">Ver todo ({productos.length}) →</Link>
      </div>
      <div className="mt-3 px-[var(--canal)]">
        <Carrusel etiqueta="Todo lo nuevo">
          {recientes.map((producto, indice) => (
            <div key={producto.id} className="revela-escala" style={{ '--i': `${indice * 4}%` } as CSSProperties}>
              <CardProducto producto={producto} />
            </div>
          ))}
        </Carrusel>
      </div>
    </section>
  )
}
