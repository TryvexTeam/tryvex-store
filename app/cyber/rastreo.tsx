'use client'

import Link from 'next/link'
import { useEffect, useState, type ReactNode } from 'react'
import { rastrear, rastrearPropio, type EventoEstandar, type ParametrosEvento } from '@/lib/meta-pixel'

/**
 * Islas de cliente de /cyber: lo único de la landing que necesita JavaScript.
 * Las secciones son de servidor y usan estos botones para medir cada clic.
 */

const MEDIDA_LANDING = { content_category: 'Cyber', currency: 'CLP' as const }

/**
 * Enlace que mide su clic antes de navegar. El pixel encola el evento al
 * instante (no espera la red), así que no retrasa la navegación.
 *  - `evento`: evento propio (CyberHeroCTA_Click…), para audiencias y reportes.
 *  - `estandar`: además, un evento estándar (Lead o Contact en WhatsApp).
 * Los enlaces a WhatsApp abren en otra pestaña: la landing queda abierta.
 */
export function EnlaceMedido({
  href,
  evento,
  estandar,
  parametros,
  className,
  children,
  etiqueta,
}: {
  href: string
  evento: string
  estandar?: Extract<EventoEstandar, 'Lead' | 'Contact'>
  parametros?: ParametrosEvento
  className?: string
  children: ReactNode
  etiqueta?: string
}) {
  const medir = () => {
    rastrearPropio(evento, { ...MEDIDA_LANDING, ...parametros })
    if (estandar) rastrear(estandar, { content_name: evento, ...MEDIDA_LANDING })
  }
  const externo = /^https?:\/\//.test(href)
  if (externo) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" onClick={medir} className={className} aria-label={etiqueta}>
        {children}
      </a>
    )
  }
  if (href.startsWith('#')) {
    return <a href={href} onClick={medir} className={className} aria-label={etiqueta}>{children}</a>
  }
  return <Link href={href} onClick={medir} className={className} aria-label={etiqueta}>{children}</Link>
}

export interface ProductoMedible {
  href: string
  sku: string
  nombre: string
  precio: number
}

/**
 * Mide el clic en cualquier card de producto que lleve dentro, sin tocar la
 * card (es la misma de toda la tienda). El «+» de agregar a la bolsa no es
 * un enlace: ese lo mide AddToCart desde la bolsa.
 */
export function ZonaProductos({ productos, children }: { productos: ProductoMedible[]; children: ReactNode }) {
  return (
    <div
      onClickCapture={(e) => {
        const enlace = (e.target as HTMLElement).closest('a[href^="/producto/"]')
        if (!enlace) return
        const ruta = enlace.getAttribute('href')?.split('?')[0]
        const p = productos.find((x) => x.href === ruta)
        if (!p) return
        rastrearPropio('CyberProduct_Click', { content_ids: [p.sku], content_name: p.nombre, content_type: 'product', value: p.precio, currency: 'CLP' })
      }}
    >
      {children}
    </div>
  )
}

/** Mide el clic en la fila de familias de la tienda (la misma de la portada), sin tocarla. */
export function ZonaCategorias({ children }: { children: ReactNode }) {
  return (
    <div
      onClickCapture={(e) => {
        const enlace = (e.target as HTMLElement).closest('a[href*="cat="]')
        if (!enlace) return
        rastrearPropio('CyberCategory_Click', { category_name: enlace.textContent?.trim() ?? '', content_category: 'Cyber' })
      }}
    >
      {children}
    </div>
  )
}

/**
 * Barra inferior del teléfono: «Ver ofertas» y WhatsApp siempre a mano.
 * Se esconde cuando aparece el pie de página (ahí ya están esos enlaces y
 * la barra taparía los legales). Solo vive en /cyber: no toca bolsa ni checkout.
 */
export function BarraMovil({ whatsapp }: { whatsapp: string }) {
  // Aparece recién cuando los botones del héroe salen de la pantalla (antes
  // serían dos pares de botones iguales) y se va al llegar al pie.
  const [heroVisible, setHeroVisible] = useState(true)
  const [enPie, setEnPie] = useState(false)
  const oculta = heroVisible || enPie
  useEffect(() => {
    const ctas = document.getElementById('cyber-ctas')
    const fin = document.getElementById('cyber-fin')
    if (!('IntersectionObserver' in window)) return setHeroVisible(false)
    const obs = new IntersectionObserver((entradas) => {
      for (const e of entradas) {
        if (e.target === ctas) setHeroVisible(e.isIntersecting || e.boundingClientRect.top > 0)
        if (e.target === fin) setEnPie(e.isIntersecting || e.boundingClientRect.top < 0)
      }
    })
    if (ctas) obs.observe(ctas)
    else setHeroVisible(false)
    if (fin) obs.observe(fin)
    return () => obs.disconnect()
  }, [])
  return (
    <div
      aria-hidden={oculta || undefined}
      inert={oculta || undefined}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-borde/70 bg-papel/95 px-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-md transition-transform duration-200 ease-salida motion-reduce:transition-none t:hidden ${oculta ? 'translate-y-full' : 'translate-y-0'}`}
    >
      <div className="grid grid-cols-2 gap-3">
        <EnlaceMedido href="#ofertas" evento="CyberStickyOffers_Click" className="tienda-boton bg-spark text-[15px] font-semibold text-white hover:bg-spark-hover">
          Ver ofertas
        </EnlaceMedido>
        <EnlaceMedido href={whatsapp} evento="CyberStickyWhatsapp_Click" estandar="Contact" className="tienda-boton gap-2 bg-tinta text-[15px] font-semibold text-white hover:bg-tinta/85">
          <IconoWhatsapp /> WhatsApp
        </EnlaceMedido>
      </div>
    </div>
  )
}

/** Botón flotante de WhatsApp, solo desde tablet: en el teléfono ya está la barra inferior. */
export function WhatsappFlotante({ href }: { href: string }) {
  return (
    <EnlaceMedido
      href={href}
      evento="CyberFloatingWhatsapp_Click"
      estandar="Contact"
      etiqueta="Consultar stock por WhatsApp"
      className="fixed right-5 bottom-5 z-40 hidden size-14 items-center justify-center rounded-full bg-verde text-white shadow-alzado transition-transform duration-200 ease-salida hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta motion-reduce:transition-none t:flex"
    >
      <IconoWhatsapp size={28} />
    </EnlaceMedido>
  )
}

export function IconoWhatsapp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className="shrink-0">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.66.15-.2.3-.76.96-.93 1.16-.17.2-.34.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.66-1.6-.91-2.19-.24-.58-.48-.5-.66-.5h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.12-.27-.2-.57-.35M12.05 21.5h-.01a9.4 9.4 0 0 1-4.8-1.31l-.34-.2-3.57.94.95-3.48-.22-.36a9.4 9.4 0 0 1-1.44-5.01c0-5.2 4.24-9.44 9.45-9.44a9.38 9.38 0 0 1 9.44 9.45c0 5.2-4.24 9.43-9.45 9.43m8.04-17.47A11.3 11.3 0 0 0 12.05.7C5.78.7.68 5.8.68 12.07c0 2 .52 3.96 1.52 5.68L.58 23.7l6.08-1.6a11.33 11.33 0 0 0 5.4 1.38h.01c6.27 0 11.37-5.1 11.37-11.37 0-3.04-1.18-5.9-3.33-8.05" />
    </svg>
  )
}
