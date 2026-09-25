'use client'

import Link from 'next/link'
import type { ProductoTienda } from '@/lib/tienda'
import { useBolsa } from './bolsa'

const estilo = 'pointer-events-auto grid size-10 place-items-center rounded-full bg-white text-[24px] leading-none font-normal text-tinta shadow-md ring-1 ring-borde transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-spark'

/**
 * Acción rápida de la tarjeta. Una variante no se puede inferir: en ese caso
 * el mismo ícono lleva a la ficha para que la persona elija color antes de
 * agregarla. Los productos sin variantes se agregan directamente a la bolsa.
 */
export function AgregarRapido({ producto }: { producto: ProductoTienda }) {
  const { agregar } = useBolsa()
  if (producto.agotado) return null

  if (producto.colores.length) {
    return (
      <Link href={producto.href} className={estilo} aria-label={`Elegir variante de ${producto.nombre}`} title="Elegir variante">
        <span aria-hidden>+</span>
      </Link>
    )
  }

  return (
    <button
      type="button"
      className={estilo}
      aria-label={`Agregar ${producto.nombre} a la bolsa`}
      title="Agregar a la bolsa"
      onClick={() => agregar({ sku: producto.sku, varianteId: null, cantidad: 1, slug: producto.slug, nombre: producto.nombre, variante: null, imagen: producto.imagen, precio: producto.precio })}
    >
      <span aria-hidden>+</span>
    </button>
  )
}
