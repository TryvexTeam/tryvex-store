/**
 * Landing /cyber — CONFIGURACIÓN EDITABLE.
 *
 * Todo lo que el equipo puede querer cambiar sin tocar el diseño está aquí:
 * el modo (durante o después del Cyber), los textos, los productos y las
 * categorías destacadas. Precios, fotos y stock NO se escriben aquí: salen
 * siempre del catálogo real (Panel → Productos).
 *
 * Reglas de copy (no romper):
 *  - Nada de «original Apple», «garantía Apple» ni marcas ajenas como propias.
 *  - Nada de promesas de ganancia ni cifras de clientes sin respaldo.
 *  - Siempre «stock sujeto a disponibilidad»; nunca «stock ilimitado».
 *  - No decir que Tryvex participa oficialmente en cyber.cl.
 */

/** «live» durante el Cyber; «extended» después (Cyber oficial 2026: 5 al 7 de octubre). */
export type ModoCyber = 'live' | 'extended'
export const CYBER_MODE: ModoCyber = 'extended'

/**
 * Productos destacados, en orden. Se usan los slugs de la URL del producto
 * (/producto/<slug>). Si uno no existe, está agotado o tiene precio de prueba,
 * se omite solo. «Audífonos Pro 2» no existe en el catálogo (8 oct 2026).
 */
export const CYBER_SLUGS = [
  'audifonos-pro-3',
  'reloj-ultra-3-49mm',
  'reloj-serie-11-46mm',
  'audifono-max',
  'powerbank-irm-20000-mah-carga-rapida',
  'proyector-4k-android-wifi-bluetooth',
  'cargador-120w-cable-usb-c',
  'parlante-bluetooth-40w',
] as const

/** Cuántas cards muestra «Top ofertas»; si los slugs no alcanzan, se completa con ofertas disponibles. */
export const CYBER_MAX_PRODUCTOS = 8
export const CYBER_MIN_PRODUCTOS = 4

/** Bajo este precio se asume un producto de prueba y no se muestra en la campaña. */
export const PRECIO_MINIMO_REAL = 1000

/** Categorías de acceso rápido (slug de /tienda?cat=). Solo se muestran las que existen y tienen productos. */
export const CYBER_CATEGORIAS = ['audifonos', 'audifonos-grandes', 'relojes', 'cargadores-y-cables', 'baterias', 'parlantes', 'proyectores'] as const

export const MENSAJES_WHATSAPP = {
  stock: 'Hola Tryvex, vengo de la landing Cyber y quiero consultar stock.',
  mayorista: 'Hola Tryvex, quiero la lista mayorista Cyber.',
  cantidad: 'Hola Tryvex, quiero precios por cantidad del Pack Emprende Tech.',
} as const

interface CopyModo {
  barra: string
  /** Etiqueta roja sobre el título. */
  insignia: string
  titulo: string
  subtitulo: string
  texto: string
  ctaOfertas: string
  tituloFinal: string
  bajadaFinal: string
}

const COPY: Record<ModoCyber, CopyModo> = {
  live: {
    barra: 'Cyber Tryvex activo · Ofertas por tiempo limitado · Stock sujeto a disponibilidad',
    insignia: 'Cyber activo · Ofertas por tiempo limitado',
    titulo: 'Cyber Tryvex',
    subtitulo: 'Tecnología para comprar, regalar o revender.',
    texto: 'Audífonos, smartwatches, cargadores, accesorios y productos tech con precios especiales por tiempo limitado.',
    ctaOfertas: 'Ver ofertas',
    tituloFinal: 'Últimas ofertas Cyber Tryvex',
    bajadaFinal: 'Compra al detalle o pide lista mayorista antes de que se agote el stock.',
  },
  extended: {
    barra: 'Cyber extendido Tryvex · Últimas ofertas disponibles · Stock sujeto a disponibilidad',
    insignia: 'Cyber extendido · Últimas ofertas',
    titulo: 'Cyber extendido Tryvex',
    subtitulo: 'Últimas ofertas en tecnología para uso diario, regalo o reventa.',
    texto: 'Audífonos, smartwatches, cargadores y accesorios seleccionados. Aprovéchalos antes de que se agote el stock.',
    ctaOfertas: 'Ver últimas ofertas',
    tituloFinal: 'No dejes pasar las ofertas Tryvex',
    bajadaFinal: 'Compra al detalle o pide precios por cantidad.',
  },
}

export const copyCyber = COPY[CYBER_MODE]

export interface PackCyber {
  id: string
  titulo: string
  contenido: string
  frase: string
  cta: string
  /** Categoría real (slug de /tienda?cat=) o WhatsApp. Sin precio: no hay productos tipo pack en el catálogo. */
  destino: { categoria: string } | { whatsapp: keyof typeof MENSAJES_WHATSAPP }
}

export const PACKS_CYBER: PackCyber[] = [
  { id: 'regalo', titulo: 'Pack Regalo Tech', contenido: 'Smartwatch + audífonos', frase: 'El regalo tecnológico que siempre salva.', cta: 'Ver relojes', destino: { categoria: 'relojes' } },
  { id: 'emprende', titulo: 'Pack Emprende Tech', contenido: 'Mix de productos para revender', frase: 'Arma tu primer catálogo con productos de alta rotación.', cta: 'Pedir precios por cantidad', destino: { whatsapp: 'cantidad' } },
  { id: 'carga', titulo: 'Pack Carga Rápida', contenido: 'Cargadores + cables + powerbank', frase: 'Lo que todos usan y siempre hace falta.', cta: 'Ver accesorios de carga', destino: { categoria: 'cargadores-y-cables' } },
  { id: 'cine', titulo: 'Pack Cine en Casa', contenido: 'Proyector + parlante', frase: 'Convierte cualquier pieza en cine.', cta: 'Ver proyectores', destino: { categoria: 'proyectores' } },
]

export interface PreguntaCyber {
  pregunta: string
  respuesta: string
}
