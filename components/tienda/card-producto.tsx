import Link from 'next/link'
import Image from 'next/image'
import { ViewTransition } from 'react'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'
import type { CategoriaTienda, ProductoTienda } from '@/lib/tienda'
import { AgregarRapido } from './agregar-rapido'

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

const MAX_MUESTRAS = 6

function Precio({ producto, className = '' }: { producto: ProductoTienda; className?: string }) {
  if (producto.agotado) return <span className={`font-semibold opacity-60 ${className}`}>Agotado</span>
  return (
    <span className={className}>
      <span className="cifra">{clp(producto.precio)}</span>
      {producto.precioAntes && (
        <span className="cifra ml-2 font-normal text-gris line-through">
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

/**
 * Qué se anuncia sobre el nombre. Apple pone ahí «Nuevo»; aquí también va la
 * oferta, con su porcentaje. «Últimas unidades» no: el señor Ignacio la
 * descartó, y la urgencia ya la cuenta la ficha.
 */
function avisoDe(producto: ProductoTienda): string | null {
  const { precio, precioAntes, agotado, etiqueta } = producto
  if (agotado) return 'Agotado'
  if (precioAntes && precioAntes > precio) return `${Math.floor((1 - precio / precioAntes) * 100)}% de descuento` // hacia abajo: nunca promete de más
  if (etiqueta && !/últimas unidades/i.test(etiqueta)) return etiqueta
  return null
}

/**
 * Card de producto, medida sobre la fila «Accesorios» de apple.com/cl/store
 * (313 × 500, margen de 28 a los lados):
 *
 *   foto 230 × 230 a 69 del borde · colores de 12 px centrados a 324 ·
 *   aviso 12/600 a 360 · nombre 17/600 con dos líneas reservadas a 381 ·
 *   precio 14/400 a 451.
 *
 * El aviso va donde Apple dice «Nuevo», en rojo vino: se distingue sin
 * gritar como el rojo de la marca. «Agotado» va en gris. El + queda arriba a la derecha, fuera del
 * enlace, porque un botón dentro de un enlace no es válido.
 */
export function CardProducto({
  producto,
  transicion = true,
  fluida = false,
}: {
  producto: ProductoTienda
  transicion?: boolean
  /** En una grilla, la card toma el ancho de su columna en vez de los 313 px fijos. */
  fluida?: boolean
}) {
  const { nombre, imagen, agotado, colores, href } = producto
  const aviso = avisoDe(producto)

  return (
    <div className="relative">
      <Link href={href} className={`tienda-card tienda-card-producto relative flex h-[450px] flex-col overflow-hidden rounded-[18px] bg-papel px-7 d:h-[500px] ${fluida ? 'tienda-card-fluida' : ''}`}>
        <div className="relative mx-auto mt-[52px] size-[200px] shrink-0 d:mt-[69px] d:size-[230px]">
          <Foto src={imagen} slug={producto.slug} sizes="230px" className={`tienda-card-objeto object-contain ${agotado ? 'opacity-60' : ''}`} transicion={transicion} />
        </div>

        {/* Franja de colores: 58 px aunque no haya, para que el texto de
            todas las cards de la fila quede a la misma altura. */}
        <div className="flex h-[48px] shrink-0 items-center justify-center d:h-[58px]">
          {colores.length > 0 && (
            <ul aria-label={`${colores.length} ${colores.length === 1 ? 'color' : 'colores'}`} className="flex gap-[7px]">
              {colores.slice(0, MAX_MUESTRAS).map((c) => (
                <li key={c.nombre} title={c.nombre} className="size-3 rounded-full ring-1 ring-black/15 ring-inset" style={{ background: c.hex }} />
              ))}
            </ul>
          )}
        </div>

        <p className={`mt-[3px] h-4 text-[12px] leading-4 font-semibold tracking-[-0.01em] ${agotado ? 'text-tinta-suave' : 'text-vino'}`}>{aviso}</p>
        <h3 className="mt-[5px] line-clamp-2 h-[42px] text-[17px] leading-[21px] font-semibold tracking-[-0.022em]">{nombre}</h3>
        <p className="mt-auto pb-[33px] text-[14px] leading-[18px] tracking-[-0.016em] text-tinta">
          <Precio producto={producto} />
        </p>
      </Link>
      <div className="absolute top-4 right-4">
        <AgregarRapido producto={producto} />
      </div>
    </div>
  )
}
