'use client'

import Link from 'next/link'
import type { ProductoTienda } from '@/lib/tienda'
import { useBolsa } from './bolsa'

export function AgregarRapido({ producto }: { producto: ProductoTienda }) {
  const { agregar } = useBolsa()
  if (producto.agotado) return null
  const estilo = 'pointer-events-auto inline-flex min-h-11 items-center rounded-full bg-white px-3 text-[13px] font-semibold text-tinta shadow-md ring-1 ring-borde focus-visible:outline-2 focus-visible:outline-spark'
  if (producto.colores.length) return <Link href={producto.href} className={estilo}>Elegir color</Link>
  return <button type="button" className={estilo} aria-label={`Agregar ${producto.nombre} a la bolsa`} onClick={() => agregar({ sku: producto.sku, varianteId: null, cantidad: 1, slug: producto.slug, nombre: producto.nombre, variante: null, imagen: producto.imagen, precio: producto.precio })}>Agregar</button>
}
