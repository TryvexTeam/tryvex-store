import Link from 'next/link'
import Image from 'next/image'
import { ViewTransition } from 'react'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'
import type { CategoriaTienda, ProductoTienda } from '@/lib/tienda'

/**
 * Las tres cards de la vitrina, medidas en la Tienda de Apple.
 *
 *  - Destacada (400 × 500): cuenta un lanzamiento. Texto y precio arriba,
 *    la foto ocupa la mitad de abajo. Puede ir en claro u oscuro: mezclarlas
 *    da ritmo a la fila.
 *  - Editorial (400 × 500): abre cada categoría contando por qué, antes de
 *    mostrar qué. Primero la historia, después el catálogo.
 *  - Producto (313 × 500): foto arriba, colores, etiqueta, nombre y el
 *    precio siempre al pie, donde el ojo lo busca al recorrer la fila.
 *
 * En teléfono todas miden 309 × 450. Ninguna se estira: con más ancho se
 * ven más. Cada card entera es un solo enlace.
 *
 * `relative` en cada card la vuelve el bloque contenedor de lo absoluto que
 * lleva dentro (foto, texto sr-only): sin él escaparía del recorte del
 * carrusel y ensancharía la página.
 */

const MAX_MUESTRAS = 6

function Precio({ producto, className = '' }: { producto: ProductoTienda; className?: string }) {
  if (producto.agotado) return <span className={`font-semibold opacity-60 ${className}`}>Agotado</span>
  return (
    <span className={className}>
      <span className="cifra">{clp(producto.precio)}</span>
      {producto.precioAntes && (
        <span className="cifra ml-2 font-normal line-through opacity-55">
          <span className="sr-only">antes </span>
          {clp(producto.precioAntes)}
        </span>
      )}
    </span>
  )
}

function Foto({ src, slug, sizes, prioridad, className, transicion = true }: { src: string | null; slug: string; sizes: string; prioridad?: boolean; className: string; transicion?: boolean }) {
  if (!src)
    return (
      <span aria-hidden className="grid size-full place-items-center opacity-25">
        <Estrella size={64} />
      </span>
    )
  const imagen = <Image src={src} alt="" fill sizes={sizes} priority={prioridad} className={className} />
  return transicion ? <ViewTransition name={`producto-${slug}`}>{imagen}</ViewTransition> : imagen
}

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
        {producto.etiqueta && (
          <p className={`text-[12px] font-semibold tracking-etiqueta uppercase ${oscura ? 'text-[#ff7a6e]' : 'text-spark'}`}>
            {producto.etiqueta}
          </p>
        )}
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

export function CardProducto({ producto, transicion = true }: { producto: ProductoTienda; transicion?: boolean }) {
  const { nombre, etiqueta, imagen, agotado, colores, href } = producto

  return (
    <Link href={href} className="tienda-card tienda-card-producto relative flex h-[450px] flex-col overflow-hidden rounded-[18px] bg-papel d:h-[500px]">
      <div className="relative mx-7 mt-9 h-[210px] d:h-[250px]">
        <Foto src={imagen} slug={producto.slug} sizes="260px" className={`tienda-card-objeto object-contain ${agotado ? 'opacity-60' : ''}`} transicion={transicion} />
      </div>

      <div className="flex h-5 items-center justify-center pt-5">
        {colores.length > 0 && (
          <ul aria-label={`${colores.length} ${colores.length === 1 ? 'color' : 'colores'}`} className="flex gap-1.5">
            {colores.slice(0, MAX_MUESTRAS).map((c) => (
              <li key={c.nombre} title={c.nombre} className="size-2.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
            ))}
          </ul>
        )}
      </div>

      <div className="mt-auto px-7 pb-7">
        <p className="h-4 text-[12px] font-semibold text-spark">{etiqueta}</p>
        <h3 className="mt-1 line-clamp-2 min-h-[2.5em] text-[17px] leading-[1.24] font-semibold tracking-cuerpo">{nombre}</h3>
        <p className="mt-4 text-[14px] text-tinta">
          <Precio producto={producto} />
        </p>
      </div>
    </Link>
  )
}
