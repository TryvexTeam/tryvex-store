import Image from 'next/image'
import { ViewTransition } from 'react'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'
import type { ProductoTienda } from '@/lib/tienda'

/** Piezas compartidas por las cards de la vitrina (servidor y cliente). */

export const MAX_MUESTRAS = 6

export function Precio({ producto, className = '' }: { producto: ProductoTienda; className?: string }) {
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

export function Foto({ src, slug, sizes, prioridad, className, transicion = true }: { src: string | null; slug: string; sizes: string; prioridad?: boolean; className: string; transicion?: boolean }) {
  if (!src)
    return (
      <span aria-hidden className="grid size-full place-items-center opacity-25">
        <Estrella size={64} />
      </span>
    )
  const imagen = <Image src={src} alt="" fill sizes={sizes} priority={prioridad} className={className} />
  return transicion ? <ViewTransition name={`producto-${slug}`}>{imagen}</ViewTransition> : imagen
}

/**
 * Qué se anuncia sobre el nombre. Apple pone ahí «Nuevo»; aquí también va la
 * oferta, con su porcentaje. «Últimas unidades» no: el señor Ignacio la
 * descartó, y la urgencia ya la cuenta la ficha.
 */
export function avisoDe(producto: ProductoTienda): string | null {
  const { precio, precioAntes, agotado, etiqueta } = producto
  if (agotado) return 'Agotado'
  if (precioAntes && precioAntes > precio) return `${Math.floor((1 - precio / precioAntes) * 100)}% de descuento` // hacia abajo: nunca promete de más
  if (etiqueta && !/últimas unidades/i.test(etiqueta)) return etiqueta
  return null
}
