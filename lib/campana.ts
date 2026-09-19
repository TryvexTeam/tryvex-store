/**
 * Voz editorial de la portada. Productos, categorías, precios y stock se
 * leen siempre desde la vitrina; aquí solo viven los textos de marca.
 */
export interface FotoCampana {
  src: string
  ancho: number
  alto: number
  alt: string
}

/** Escena del héroe «Escenario»: composición por quiebre y capa de producto. */
export interface EscenaHeroe {
  id: string
  tono: 'claro' | 'oscuro'
  etiqueta: string
  antetitulo: string
  titulo: readonly [string, string]
  bajada: string
  /** Ausente en escenas `tarjeta`: se dibujan en CSS, sin imagen. */
  fotos?: {
    movil: FotoCampana
    escritorio: FotoCampana
  }
  estilo?: 'foto' | 'tarjeta'
  /** Centro del producto para que el recorte nazca exactamente en él. */
  foco: { x: number; y: number }
  /** % desde arriba donde empieza la foto en teléfono (0 = a sangre). */
  movilDesde?: number
  /** Dónde va el titular: al centro (productos a los lados) o arriba (productos abajo). */
  texto?: 'centro' | 'arriba'
  /** Cifra grande calculada en el servidor desde `precio_tramos`: nunca un número escrito a mano. */
  promo?: 'mayorista' | 'volumen'
  productoSlug?: string
}

export const CAMPANA = {
  cierre: {
    titulo: 'Encuentra lo que buscas.',
    bajada: 'Recorre el catálogo completo y elige a tu ritmo.',
  },
} as const

/** Fotos de un banner con las dimensiones reales de los WebP generados (T-010 y T-012). */
const fotosBanner = (archivo: string, alt: string): NonNullable<EscenaHeroe['fotos']> => ({
  movil: { src: `/tienda/campana/banners/${archivo}-movil.webp`, ancho: 1122, alto: 1402, alt },
  escritorio: { src: `/tienda/campana/banners/${archivo}-escritorio.webp`, ancho: 1930, alto: 815, alt },
})

/**
 * Escenas activas del héroe: cinco como máximo (NN/g), una idea por escena.
 * Tendencia primero (iPhone 18 Pro Max, lanzado el 9-sep-2026), luego promoción,
 * categorías y la propuesta de proveedor. Los banners restantes (cargadores,
 * tablet y laptop, hogar, fundas 17 Pro Max, relojes) quedan para la portada.
 */
export const ESCENAS_BANNER: readonly EscenaHeroe[] = [
  {
    // Imagen sin halo mientras llegan las de alta gama (T-017); el diseño exterior del 18 Pro es casi igual.
    id: 'iphone',
    tono: 'oscuro',
    etiqueta: 'iPhone',
    antetitulo: 'Recién llegado',
    titulo: ['Tu iPhone,', 'protegido.'],
    bajada: 'Fundas transparentes y accesorios para los iPhone Pro más nuevos.',
    fotos: fotosBanner('fundas-iphone17pm', 'Tres iPhone Pro Max de espalda en fundas transparentes, plata, naranja y azul, sobre fondo negro'),
    foco: { x: 50, y: 72 },
    movilDesde: 40,
    texto: 'arriba',
  },
  {
    id: 'volumen',
    tono: 'claro',
    etiqueta: 'Ofertas',
    antetitulo: 'Ofertas por volumen',
    titulo: ['Mientras más llevas,', 'menos pagas.'],
    bajada: 'Precios por pack calculados al instante en tu bolsa.',
    estilo: 'tarjeta',
    foco: { x: 50, y: 50 },
    promo: 'volumen',
  },
  {
    id: 'audio',
    tono: 'claro',
    etiqueta: 'Audio',
    antetitulo: 'Escucha tu momento',
    titulo: ['Sonido que', 'te acompaña.'],
    bajada: 'Audífonos y accesorios para llevar tu música a donde vayas.',
    fotos: fotosBanner('flanco', 'Audífonos blancos flotando junto a estuches con fundas lila y coral sobre fondo celeste'),
    foco: { x: 50, y: 50 },
    // Su versión vertical pone los estuches al centro: en teléfono empieza bajo el texto.
    movilDesde: 40,
    productoSlug: 'audifonos-pods-pro',
  },
  {
    id: 'reloj',
    tono: 'claro',
    etiqueta: 'Reloj',
    antetitulo: 'Correas y accesorios',
    titulo: ['Tu reloj,', 'tu estilo.'],
    bajada: 'Correas deportivas y metálicas para cambiar de look en segundos.',
    fotos: fotosBanner('watch', 'Reloj inteligente con correa deportiva roja y otro con correa metálica tejida sobre fondo celeste'),
    foco: { x: 50, y: 50 },
    movilDesde: 42,
  },
  {
    id: 'mayorista',
    tono: 'claro',
    etiqueta: 'Mayorista',
    antetitulo: 'También somos proveedores',
    titulo: ['Precios por mayor', 'para tu negocio.'],
    bajada: 'Compra por volumen con despacho a todo Chile.',
    estilo: 'tarjeta',
    foco: { x: 50, y: 50 },
    promo: 'mayorista',
  },
]

/**
 * Forma mínima de una pieza editable, sin importar el módulo de servidor.
 * `lib/secciones.ts` es 'server-only' y este archivo lo consume la cabecera,
 * que es cliente: tiparlo aquí de forma estructural evita arrastrar código de
 * servidor al bundle del navegador.
 */
export interface PiezaEscena {
  visible: boolean
  contenido: Record<string, unknown>
}

const txt = (c: Record<string, unknown>, k: string): string | null => {
  const v = c[k]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Aplica lo que el equipo editó en el panel sobre las escenas del código.
 *
 * Cada escena se busca por la clave `heroe-<id>`. Si no hay fila para ella,
 * la escena queda tal como está escrita aquí: la portada nunca depende de que
 * la tabla esté poblada. Si la fila existe pero está marcada como oculta, la
 * escena sale del carrusel.
 *
 * Las fotos solo se reemplazan si la pieza trae las DOS (teléfono y
 * escritorio). Mezclar una foto nueva con una vieja daría un carrusel donde
 * el teléfono muestra una campaña y el escritorio otra.
 */
export function escenasConPiezas(
  escenas: readonly EscenaHeroe[],
  piezas?: Map<string, PiezaEscena>,
): readonly EscenaHeroe[] {
  if (!piezas || piezas.size === 0) return escenas

  return escenas.flatMap((e) => {
    const pieza = piezas.get(`heroe-${e.id}`)
    if (!pieza) return [e]
    if (!pieza.visible) return []

    const c = pieza.contenido
    const t1 = txt(c, 'titulo_1')
    const t2 = txt(c, 'titulo_2')
    const movil = txt(c, 'foto_movil')
    const escritorio = txt(c, 'foto_escritorio')
    const alt = txt(c, 'alt') ?? e.fotos?.movil.alt ?? ''

    return [{
      ...e,
      etiqueta: txt(c, 'etiqueta') ?? e.etiqueta,
      antetitulo: txt(c, 'antetitulo') ?? e.antetitulo,
      titulo: (t1 && t2 ? [t1, t2] : e.titulo) as readonly [string, string],
      bajada: txt(c, 'bajada') ?? e.bajada,
      fotos: movil && escritorio
        ? {
            movil: { src: movil, ancho: 1122, alto: 1402, alt },
            escritorio: { src: escritorio, ancho: 1930, alto: 815, alt },
          }
        : e.fotos,
    }]
  })
}
