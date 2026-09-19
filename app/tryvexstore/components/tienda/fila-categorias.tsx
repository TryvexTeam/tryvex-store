import Link from 'next/link'
import Image from 'next/image'
import { Estrella } from '@/app/marca'
import type { CategoriaTienda } from '@/lib/tienda'

/**
 * Navegador de familias: la fila de acceso que abre el catálogo.
 *
 * Patrón de navegación por reconocimiento: el objeto se ve, no se lee. La foto
 * va suelta sobre el papel —sin caja, sin borde, sin sombra— y solo la etiqueta
 * ancla debajo. Cualquier contenedor visible compite con el producto y vuelve
 * la fila un muestrario de tarjetas en vez de una barra de navegación.
 *
 * La familia activa se marca con subrayado, no con relleno ni con anillo: el
 * subrayado pesa lo justo para decir «estás aquí» sin robarle atención al resto
 * de la fila.
 *
 * Carrusel por scroll nativo con `snap`: sin librería. En teléfono se arrastra
 * con el dedo como cualquier fila del sistema; en escritorio la última asoma y
 * sugiere que hay más.
 */
export function FilaCategorias({ categorias, activa }: { categorias: CategoriaTienda[]; activa: string | null }) {
  if (categorias.length === 0) return null

  return (
    <nav aria-label="Familias de productos" className="border-b border-borde/50 bg-papel-alt">
      <ul className="sin-barra mx-auto flex max-w-[1204px] snap-x snap-mandatory gap-2 overflow-x-auto px-[22px] py-6 t:justify-center t:gap-4 t:py-8">
        {categorias.map((c) => {
          const foto = c.productos.find((p) => p.imagen)?.imagen ?? null
          const esActiva = activa === c.slug

          return (
            <li key={c.id} className="shrink-0 snap-start">
              <Link
                href={`/tienda?cat=${encodeURIComponent(c.slug)}`}
                aria-current={esActiva ? 'page' : undefined}
                className="tienda-familia group flex w-[104px] flex-col items-center gap-3 rounded-[12px] px-2 py-2 text-center t:w-[124px]"
              >
                <span className="relative h-[72px] w-full t:h-[84px]">
                  {foto ? (
                    <Image
                      src={foto}
                      alt=""
                      fill
                      sizes="124px"
                      className="tienda-card-objeto object-contain"
                    />
                  ) : (
                    <span aria-hidden className="grid size-full place-items-center text-borde">
                      <Estrella size={34} />
                    </span>
                  )}
                </span>
                <span
                  className={`text-[12px] leading-tight tracking-apoyo t:text-[14px] ${
                    esActiva
                      ? 'font-semibold text-tinta underline decoration-2 underline-offset-[6px]'
                      : 'text-tinta-suave group-hover:text-tinta'
                  }`}
                >
                  {c.nombre}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
