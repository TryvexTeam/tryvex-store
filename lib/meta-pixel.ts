import { urlSitio } from '@/lib/sitio'
import { guardarAtribucion, leerAtribucion } from '@/lib/atribucion'

/**
 * Meta Pixel: la única puerta para mandarle eventos a Meta.
 *
 * El ID no es un secreto (viaja en el HTML de cualquier tienda con pixel), así
 * que vive aquí; `NEXT_PUBLIC_META_PIXEL_ID` lo reemplaza y `off` lo apaga.
 *
 * Solo dispara en el dominio de la tienda (`urlSitio()`): las vistas previas de
 * Vercel y `localhost` no le mandan visitas falsas a Meta, que ensuciarían las
 * audiencias y el aprendizaje de las campañas. Para probar en local:
 * `NEXT_PUBLIC_META_PIXEL_FORZAR=1`.
 *
 * Si Meta no carga (bloqueador de anuncios, sin red), todo esto no hace nada:
 * medir nunca puede romper una compra.
 */

const ID_POR_DEFECTO = '1797120077973891'
export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim() || ID_POR_DEFECTO).replace(/^off$/i, '')

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue: unknown[]; loaded: boolean; version: string; push: unknown }

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

export type EventoEstandar = 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase' | 'Lead' | 'Contact'

export interface ParametrosEvento {
  content_name?: string
  content_category?: string
  content_ids?: string[]
  content_type?: 'product' | 'product_group'
  value?: number
  currency?: 'CLP'
  num_items?: number
  [otro: string]: unknown
}

function pixelActivo(): boolean {
  if (typeof window === 'undefined' || !META_PIXEL_ID) return false
  if (process.env.NEXT_PUBLIC_META_PIXEL_FORZAR === '1') return true
  return location.hostname === new URL(urlSitio()).hostname
}

let iniciado = false

/**
 * El código oficial de Meta, ejecutado una sola vez y a pedido: crea la cola
 * `fbq`, pide `fbevents.js` en segundo plano (async, no frena la página) e
 * inicia el pixel. Como `init` va antes que cualquier evento en la cola, da
 * igual qué componente mida primero.
 */
function asegurarPixel(): Fbq | null {
  if (!pixelActivo()) return null
  if (iniciado && window.fbq) return window.fbq
  if (!window.fbq) {
    const n = function (...args: unknown[]) {
      if (n.callMethod) n.callMethod(...args)
      else n.queue.push(args)
    } as Fbq
    n.push = n
    n.loaded = true
    n.version = '2.0'
    n.queue = []
    window.fbq = n
    if (!window._fbq) window._fbq = n
    const script = document.createElement('script')
    script.async = true
    script.src = 'https://connect.facebook.net/en_US/fbevents.js'
    document.head.appendChild(script)
  }
  window.fbq('init', META_PIXEL_ID)
  iniciado = true
  guardarAtribucion()
  return window.fbq
}

/** Evento estándar de Meta (los nombres exactos que Meta optimiza). `eventID` deja lista la deduplicación con Conversions API. */
export function rastrear(evento: EventoEstandar, parametros: ParametrosEvento = {}, eventID?: string): void {
  try {
    const fbq = asegurarPixel()
    if (!fbq) return
    const datos = { ...parametros, ...leerAtribucion() }
    if (eventID) fbq('track', evento, datos, { eventID })
    else fbq('track', evento, datos)
  } catch {
    // Medir no puede romper la página.
  }
}

/** Evento propio (CyberHeroCTA_Click, etc.): sirve para audiencias y reportes, no para optimizar. */
export function rastrearPropio(evento: string, parametros: ParametrosEvento = {}): void {
  try {
    const fbq = asegurarPixel()
    if (!fbq) return
    fbq('trackCustom', evento, { ...parametros, ...leerAtribucion() })
  } catch {
    // Medir no puede romper la página.
  }
}
