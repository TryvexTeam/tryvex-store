import Link from 'next/link'
import Image from 'next/image'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'
import type { CategoriaTienda, ProductoTienda } from '@/lib/tienda'
import { Foto, Precio } from './card-producto-partes'

// La card de producto es interactiva (círculos de color): vive en su propio
// componente de cliente. Se reexporta para que las páginas no cambien.
export { CardProducto } from './card-producto-cliente'

/**
 * Las tres cards de la vitrina, medidas en la Tienda de Apple.
 *
 *  - Destacada (400 × 500): cuenta un lanzamiento. Texto y precio arriba,
 *    la foto ocupa la mitad de abajo. Puede ir en claro u oscuro: mezclarlas
 *    da ritmo a la fila.
 *  - Editorial (400 × 500): abre cada categoría contando por qué, antes de
 *    mostrar qué. Primero la historia, después el catálogo.
 *  - Producto (313 × 500): foto arriba, colores, nombre y el
 *    precio siempre al pie, donde el ojo lo busca al recorrer la fila.
 *
 * En teléfono todas miden 309 × 450. Ninguna se estira: con más ancho se
 * ven más. Cada card entera es un solo enlace.
 *
 * `relative` en cada card la vuelve el bloque contenedor de lo absoluto que
 * lleva dentro (foto, texto sr-only): sin él escaparía del recorte del
 * carrusel y ensancharía la página.
 */

export function CardDestacada({
  producto,
  oscura = false,
  prioridad = false,
  transicion = true,
}: {
  producto: ProductoTienda
  oscura?: boolean
  prioridad?: boolean
  transicion?: boolean
}) {
  return (
    <Link
      href={producto.href}
      className={`tienda-card tienda-card-grande relative flex h-[450px] flex-col overflow-hidden rounded-[18px] d:h-[500px] ${
        oscura ? 'bg-black text-white' : 'bg-papel text-tinta'
      }`}
    >
      <div className="relative z-10 px-6 pt-7 d:px-7">
        <h3 className="mt-1.5 line-clamp-2 text-[24px] leading-[1.12] font-semibold tracking-tarjeta d:text-[28px]">
          {producto.nombre}
        </h3>
        {producto.frase && (
          <p className={`mt-2 line-clamp-2 text-[14px] leading-snug font-semibold ${oscura ? 'text-white/80' : 'text-tinta'}`}>
            {producto.frase}
          </p>
        )}
        <p className={`mt-1.5 text-[14px] ${oscura ? 'text-white/80' : 'text-tinta-suave'}`}>
          <Precio producto={producto} />
        </p>
      </div>
      <div className="relative mt-auto h-[55%]">
        <Foto
          src={producto.imagen}
          slug={producto.slug}
          sizes="(min-width: 1069px) 400px, 309px"
          prioridad={prioridad}
          className={`tienda-card-objeto object-contain object-bottom px-6 pb-2 ${producto.agotado ? 'opacity-60' : ''}`}
          transicion={transicion}
        />
      </div>
    </Link>
  )
}

export function CardEditorial({ categoria, href }: { categoria: CategoriaTienda; href: string }) {
  const conFoto = categoria.productos.filter((p) => p.imagen).slice(0, 3)
  const desde = Math.min(...categoria.productos.filter((p) => !p.agotado).map((p) => p.precio))
  const n = categoria.productos.length

  return (
    <a href={href} className="tienda-card tienda-card-grande relative flex h-[450px] flex-col overflow-hidden rounded-[18px] bg-papel d:h-[500px]">
      <div className="px-6 pt-8 d:px-7">
        <h3 className="text-[24px] leading-[1.14] font-semibold tracking-tarjeta text-balance d:text-[28px]">
          {categoria.descripcion ?? `Todo en ${categoria.nombre.toLowerCase()}.`}
        </h3>
        <p className="mt-2.5 text-[14px] leading-snug text-tinta-suave">
          {n} {n === 1 ? 'producto' : 'productos'}
          {Number.isFinite(desde) && <> · desde <span className="cifra font-semibold text-tinta">{clp(desde)}</span></>}
        </p>
      </div>
      {/* Hasta tres fotos que se superponen: el conjunto cuenta la categoría. */}
      <div className="relative mt-auto h-[58%]">
        {conFoto.length === 0 ? (
          <span aria-hidden className="grid size-full place-items-center text-borde">
            <Estrella size={72} />
          </span>
        ) : (
          conFoto.map((p, i) => (
            <span
              key={p.id}
              className="absolute bottom-0"
              style={{
                left: `${[8, 38, 62][i] - (conFoto.length === 1 ? -14 : 0)}%`,
                width: conFoto.length === 1 ? '72%' : '46%',
                height: `${[92, 78, 70][i]}%`,
                zIndex: 3 - i,
              }}
            >
              <Image src={p.imagen!} alt="" fill sizes="200px" className="object-contain object-bottom" />
            </span>
          ))
        )}
      </div>
    </a>
  )
}

