/** Contenido editorial público; los importes y condiciones vigentes viven en configuración. */
export interface PreguntaFrecuente {
  pregunta: string
  respuesta: string
  enlace: { href: string; texto: string }
}

export const PREGUNTAS_FRECUENTES: PreguntaFrecuente[] = [
  {
    pregunta: '¿Hacen envíos?',
    respuesta: 'La información disponible sobre cobertura, modalidades y retiro se mantiene en la página de envíos.',
    enlace: { href: '/envios', texto: 'Ver envíos' },
  },
  {
    pregunta: '¿Cuánto tarda mi pedido?',
    respuesta: 'El plazo vigente se publica junto con las condiciones de despacho.',
    enlace: { href: '/envios', texto: 'Consultar plazos de envío' },
  },
  {
    pregunta: '¿Cómo funciona la garantía de 6 meses?',
    respuesta: 'Las condiciones vigentes de garantía se explican en la página de cambios y devoluciones.',
    enlace: { href: '/cambios-y-devoluciones', texto: 'Revisar garantía' },
  },
  {
    pregunta: '¿Puedo ejercer retracto dentro de 10 días?',
    respuesta: 'La información aplicable sobre retracto está disponible junto con las políticas de cambios y devoluciones.',
    enlace: { href: '/cambios-y-devoluciones', texto: 'Ver cambios y devoluciones' },
  },
  {
    pregunta: '¿Qué medios de pago aceptan?',
    respuesta: 'Al finalizar la compra podrá elegir transferencia o Mercado Pago y revisar el total antes de confirmar.',
    enlace: { href: '/comprar', texto: 'Ir a finalizar compra' },
  },
  {
    pregunta: '¿Puedo solicitar un cambio?',
    respuesta: 'Revise primero las condiciones de cambios y devoluciones; si necesita orientación, contáctenos antes de avanzar.',
    enlace: { href: '/cambios-y-devoluciones', texto: 'Consultar condiciones' },
  },
  {
    pregunta: '¿Cómo reviso la originalidad, el estado y los detalles de un producto?',
    respuesta: 'Cada ficha reúne las características disponibles. Si necesita confirmar algo antes de comprar, puede escribirnos.',
    enlace: { href: '/contacto', texto: 'Contactar a Tryvex' },
  },
  {
    pregunta: '¿Cómo hago seguimiento a mi pedido?',
    respuesta: 'Para consultar un pedido, comuníquese por uno de los canales publicados por la tienda.',
    enlace: { href: '/contacto', texto: 'Ver canales de contacto' },
  },
]

export interface EnlacePie {
  texto: string
  href: string
}

export interface GrupoPie {
  titulo: string
  enlaces: EnlacePie[]
}

export const GRUPOS_PIE: GrupoPie[] = [
  {
    titulo: 'Tienda',
    enlaces: [
      { texto: 'Inicio', href: '/' },
      { texto: 'Catálogo', href: '/tienda' },
    ],
  },
  {
    titulo: 'Ayuda',
    enlaces: [
      { texto: 'Centro de ayuda', href: '/ayuda' },
      { texto: 'Preguntas frecuentes', href: '/ayuda/preguntas-frecuentes' },
      { texto: 'Envíos', href: '/envios' },
      { texto: 'Cambios y devoluciones', href: '/cambios-y-devoluciones' },
    ],
  },
  {
    titulo: 'Tryvex',
    enlaces: [{ texto: 'Nosotros', href: '/nosotros' }],
  },
  {
    titulo: 'Contacto',
    enlaces: [{ texto: 'Canales de contacto', href: '/contacto' }],
  },
]

export const HISTORIA_TRYVEX = [
  'Tryvex nace como una tienda para explorar tecnología de manera clara, con un catálogo y una compra que se entienden sin rodeos.',
  'Preferimos que cada paso —desde descubrir un producto hasta pedir ayuda— tenga una ruta visible. Por eso reunimos aquí la información que acompaña la compra.',
]
