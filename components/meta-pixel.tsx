'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { META_PIXEL_ID, rastrear } from '@/lib/meta-pixel'

/**
 * PageView en cada página. La tienda navega sin recargar (App Router), así que
 * el PageView se dispara al cambiar la ruta y no solo al entrar.
 */
export function MetaPixel() {
  const ruta = usePathname()
  useEffect(() => {
    // El panel interno no es tráfico de clientes.
    if (ruta.startsWith('/panel')) return
    rastrear('PageView')
  }, [ruta])
  return null
}

/** Respaldo oficial de Meta para navegadores sin JavaScript. */
export function MetaPixelSinScript() {
  if (!META_PIXEL_ID) return null
  return (
    <noscript>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img height="1" width="1" style={{ display: 'none' }} alt="" src={`https://www.facebook.com/tr?id=${META_PIXEL_ID}&ev=PageView&noscript=1`} />
    </noscript>
  )
}
