import Link from 'next/link'
import Image from 'next/image'
import { ViewTransition } from 'react'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'
import type { ProductoTienda } from '@/lib/tienda'
import { AgregarRapido } from './agregar-rapido'

const MAX_MUESTRAS = 6

/**
 * Tile de la colección.
 *
 * La foto manda: cuadrada, limpia, y solo «Agotado» marcado en la esquina (la lección de Dune Dragon: el cliente escanea fotos, no
 * textos). Debajo, nombre, precio con el anterior tachado y los colores,
 * siempre en el mismo orden para que la grilla se lea como una tabla.
 *
 * La oferta no lleva píldora roja sobre la foto: el precio tachado ya la
 * cuenta, y el porcentaje va al pie, a la derecha, en rojo vino: se nota
 * sin que una grilla con todo en oferta se vea como un mar de rojo.
 */
export function TileProducto({ producto, prioridad = false }: { producto: ProductoTienda; prioridad?: boolean }) {
  const { nombre, slug, imagen, precio, precioAntes, agotado, colores, href } = producto
  // Solo «Agotado» se marca sobre la foto, en neutro: las etiquetas de
  // colores («Últimas unidades», ofertas) competían con el producto.
  const insignia = agotado ? 'Agotado' : null
  const descuento = !agotado && precioAntes && precioAntes > precio ? Math.floor((1 - precio / precioAntes) * 100) : 0

  return (
    <div className="relative min-w-0">
    <Link href={href} className="tienda-tile-colec group block min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-[18px] bg-white">
        {imagen ? (
          <ViewTransition name={`producto-${slug}`}>
            <Image
              src={imagen}
              alt=""
              fill
              priority={prioridad}
              sizes="(min-width: 1069px) 280px, (min-width: 1024px) 320px, 50vw"
              className={`tienda-tile-colec-foto object-contain p-[10%] ${agotado ? 'opacity-50' : ''}`}
            />
          </ViewTransition>
        ) : (
          <span className="grid size-full place-items-center text-borde"><Estrella size={48} /></span>
        )}
        {insignia && (
          <span
            className="absolute top-3 left-3 rounded-full bg-tinta px-2.5 py-1 text-[11px] font-semibold tracking-etiqueta text-white"
          >
            {insignia}
          </span>
        )}
      </div>

      <div className="px-1 pt-3">
        <h3 className="line-clamp-2 text-[15px] leading-snug font-semibold tracking-apoyo t:text-[17px]">{nombre}</h3>
        <p className="mt-1 flex flex-wrap items-baseline gap-x-2 text-[14px] t:text-[15px]">
          <span className={`cifra ${agotado ? 'text-gris' : 'text-tinta'}`}>{clp(precio)}</span>
          {precioAntes && (
            <span className="cifra text-gris line-through">
              <span className="sr-only">antes </span>
              {clp(precioAntes)}
            </span>
          )}
          {descuento > 0 && (
            <span className="cifra ml-auto text-[12px] font-semibold text-vino t:text-[13px]">
              {descuento}% menos
            </span>
          )}
        </p>
        {colores.length > 0 && (
          <ul aria-label={`${colores.length} ${colores.length === 1 ? 'color' : 'colores'}`} className="mt-2 flex gap-1.5">
            {colores.slice(0, MAX_MUESTRAS).map((c) => (
              <li key={c.nombre} title={c.nombre} className="size-3.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
            ))}
          </ul>
        )}
      </div>
    </Link>
      <div className="pointer-events-none absolute inset-x-0 top-0 flex aspect-square items-start justify-end p-3">
        <AgregarRapido producto={producto} />
      </div>
    </div>
  )
}
