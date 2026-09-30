/**
 * A dónde lleva una pieza de la portada, y cómo se reparte una imagen en
 * zonas que llevan a lugares distintos.
 *
 * Vive fuera de `lib/secciones.ts` porque ese módulo es solo de servidor y el
 * banner, que es cliente, también necesita resolver destinos y zonas.
 */

/** A dónde lleva una pieza cuando el visitante la toca. */
export type DestinoPieza =
  | { tipo: 'ninguno' }
  /** Una dirección completa, para campañas o redes. */
  | { tipo: 'url'; valor: string }
  /** Una sección de la propia portada, por ancla. */
  | { tipo: 'seccion'; valor: string }
  /** Un producto, por slug. */
  | { tipo: 'producto'; valor: string }
  /** Una familia del catálogo, por slug. */
  | { tipo: 'categoria'; valor: string }

export const TIPOS_DESTINO = ['ninguno', 'url', 'seccion', 'producto', 'categoria'] as const
export type TipoDestino = (typeof TIPOS_DESTINO)[number]

/**
 * Convierte el destino guardado en una dirección utilizable.
 * Devuelve `null` cuando la pieza no debe enlazar a ninguna parte: así quien
 * la dibuja decide entre renderizar un enlace o una imagen quieta.
 */
export function hrefDeDestino(destino: DestinoPieza | null | undefined): string | null {
  if (!destino || destino.tipo === 'ninguno') return null
  switch (destino.tipo) {
    case 'url': {
      const v = destino.valor?.trim()
      if (!v) return null
      // Solo direcciones internas o http(s). Sin esto, una pieza mal cargada
      // podría inyectar `javascript:` en un enlace de la portada.
      if (v.startsWith('/') && !v.startsWith('//')) return v
      return /^https?:\/\//i.test(v) ? v : null
    }
    case 'seccion': {
      const v = destino.valor?.trim().replace(/^#/, '')
      return v ? `/#${v}` : null
    }
    case 'producto': {
      const v = destino.valor?.trim()
      return v ? `/producto/${encodeURIComponent(v)}` : null
    }
    case 'categoria': {
      const v = destino.valor?.trim()
      return v ? `/tienda?cat=${encodeURIComponent(v)}` : null
    }
    default:
      return null
  }
}

/** Lee un destino guardado, tolerando contenido incompleto o malformado. */
export function leerDestino(d: unknown): DestinoPieza {
  const crudo = d as { tipo?: string; valor?: string } | null | undefined
  const tipo = TIPOS_DESTINO.find((t) => t === crudo?.tipo)
  if (!tipo || tipo === 'ninguno') return { tipo: 'ninguno' }
  return { tipo, valor: String(crudo?.valor ?? '') }
}

/** Lee el destino de una pieza, tolerando contenido incompleto o malformado. */
export function destinoDe(contenido: Record<string, unknown> | undefined): DestinoPieza {
  return leerDestino(contenido?.destino)
}

export const esExterno = (href: string): boolean => /^https?:\/\//i.test(href)

/* ── Zonas de una imagen ──────────────────────────────────────────────
   Una imagen puede partirse para que cada parte lleve a un lugar distinto
   (la mitad izquierda a TikTok, la derecha a Instagram). Las divisiones son
   fijas y no un recuadro libre: se eligen en un teléfono con el pulgar y
   funcionan igual sobre la foto vertical y la panorámica. */

export interface AreaZona {
  /** Porcentajes sobre la imagen: posición y tamaño. */
  x: number
  y: number
  ancho: number
  alto: number
  /** Cómo se nombra la zona en el panel. */
  nombre: string
}

export const DIVISIONES = {
  completa: [{ x: 0, y: 0, ancho: 100, alto: 100, nombre: 'Toda la imagen' }],
  'mitades-v': [
    { x: 0, y: 0, ancho: 50, alto: 100, nombre: 'Mitad izquierda' },
    { x: 50, y: 0, ancho: 50, alto: 100, nombre: 'Mitad derecha' },
  ],
  'mitades-h': [
    { x: 0, y: 0, ancho: 100, alto: 50, nombre: 'Mitad de arriba' },
    { x: 0, y: 50, ancho: 100, alto: 50, nombre: 'Mitad de abajo' },
  ],
  tercios: [
    { x: 0, y: 0, ancho: 100 / 3, alto: 100, nombre: 'Tercio izquierdo' },
    { x: 100 / 3, y: 0, ancho: 100 / 3, alto: 100, nombre: 'Tercio del centro' },
    { x: 200 / 3, y: 0, ancho: 100 / 3, alto: 100, nombre: 'Tercio derecho' },
  ],
} as const satisfies Record<string, readonly AreaZona[]>

export type Division = keyof typeof DIVISIONES
export const NOMBRES_DIVISION: Record<Division, string> = {
  completa: 'Una sola: toda la imagen',
  'mitades-v': 'Dos mitades: izquierda y derecha',
  'mitades-h': 'Dos mitades: arriba y abajo',
  tercios: 'Tres columnas',
}

export const esDivision = (v: unknown): v is Division => typeof v === 'string' && v in DIVISIONES

/** Zona lista para dibujar: dónde está, a dónde lleva y cómo se anuncia. */
export interface ZonaEnlace {
  x: number
  y: number
  ancho: number
  alto: number
  href: string
  etiqueta: string
  externo: boolean
}

/**
 * Zonas enlazadas de una pieza, a partir de `division` y `zonas`.
 * Con una sola zona se usa el destino general de la pieza. Las zonas sin
 * destino no se dibujan: esa parte de la imagen queda quieta.
 */
export function zonasDe(contenido: Record<string, unknown> | undefined, etiquetaPorDefecto: string): ZonaEnlace[] {
  const division = esDivision(contenido?.division) ? contenido.division : 'completa'
  const guardadas = Array.isArray(contenido?.zonas) ? (contenido.zonas as unknown[]) : []
  return DIVISIONES[division].flatMap((area, i): ZonaEnlace[] => {
    const z = (division === 'completa' ? { destino: contenido?.destino, etiqueta: null } : guardadas[i]) as
      | { destino?: unknown; etiqueta?: unknown }
      | undefined
    const href = hrefDeDestino(leerDestino(z?.destino))
    if (!href) return []
    const etiqueta = typeof z?.etiqueta === 'string' && z.etiqueta.trim() ? z.etiqueta.trim() : etiquetaPorDefecto
    return [{ x: area.x, y: area.y, ancho: area.ancho, alto: area.alto, href, etiqueta, externo: esExterno(href) }]
  })
}

/* ── Cápsulas sobre el banner ─────────────────────────────────────────
   Etiquetas como la de «Desde $45.000 · Comprar», que se ponen donde se
   quiera sobre la escena y llevan a un destino. Cada una tiene una posición
   para teléfono y otra para escritorio: lo que queda bien sobre una foto
   panorámica tapa el producto en la vertical. */

export const MAX_CAPSULAS = 3
export const POSICIONES = [0, 50, 100] as const
export type Coordenada = (typeof POSICIONES)[number]
/** Posición en una rejilla de 3 × 3: x e y en 0 (inicio), 50 (centro) o 100 (fin). */
export interface Posicion { x: Coordenada; y: Coordenada }

export interface CapsulaEscena {
  /** Texto propio. Sin texto y con un producto de destino, se muestra su precio. */
  texto: string | null
  boton: string | null
  href: string | null
  externo: boolean
  /** Producto al que lleva, para leer su precio real de la vitrina. */
  productoSlug: string | null
  movil: Posicion
  escritorio: Posicion
}

// `Number('')` es 0: sin este filtro, un campo vacío caía arriba a la izquierda.
const coordenada = (v: unknown, porDefecto: Coordenada): Coordenada =>
  v === '' || v == null ? porDefecto : POSICIONES.find((p) => p === Number(v)) ?? porDefecto

export function leerPosicion(v: unknown, porDefecto: Posicion): Posicion {
  const p = v as { x?: unknown; y?: unknown } | null | undefined
  return { x: coordenada(p?.x, porDefecto.x), y: coordenada(p?.y, porDefecto.y) }
}

const texto = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)

export function capsulasDe(contenido: Record<string, unknown> | undefined): CapsulaEscena[] {
  const lista = Array.isArray(contenido?.capsulas) ? (contenido.capsulas as Record<string, unknown>[]) : []
  return lista.slice(0, MAX_CAPSULAS).flatMap((c): CapsulaEscena[] => {
    const destino = leerDestino(c?.destino)
    const href = hrefDeDestino(destino)
    const productoSlug = destino.tipo === 'producto' ? destino.valor.trim() || null : null
    const t = texto(c?.texto)
    // Una cápsula sin texto ni producto no tiene nada que decir.
    if (!t && !productoSlug) return []
    return [{
      texto: t,
      boton: href ? texto(c?.boton) ?? 'Comprar' : null,
      href,
      externo: href ? esExterno(href) : false,
      productoSlug,
      movil: leerPosicion(c?.movil, { x: 50, y: 100 }),
      escritorio: leerPosicion(c?.escritorio, { x: 100, y: 100 }),
    }]
  })
}
