/**
 * Lo que ofrece Tryvex Tech, tal como lo publica tryvex.tech (servicios y planes,
 * leído el 2026-09-30). Son los precios y plazos «desde» de su propio sitio: si
 * allá cambian, hay que actualizarlos acá. No se copian sus cifras de resultados
 * (clientes, conversión, uptime): esas viven en su sitio, donde el dueño las controla.
 *
 * Sin dependencias de React: lo usa la sección de /contacto.
 */

const SITIO = 'https://www.tryvex.tech'

/** WhatsApp de Tryvex Tech (el que publica tryvex.tech/links), solo dígitos. */
const WHATSAPP_TECH = '56950358818'

/**
 * Enlace a tryvex.tech con la marca de origen: así, en su analítica se ve cuántos
 * contactos llegan desde la tienda y desde qué parte de la página.
 */
export function enlaceTech(ruta = '', contenido = 'acordeon'): string {
  const base = `${SITIO}${ruta}`
  return `${base}${base.includes('?') ? '&' : '?'}utm_source=tryvex-store&utm_medium=contacto&utm_campaign=tryvex-tech&utm_content=${contenido}`
}

/** WhatsApp con el mensaje ya escrito, que dice de dónde viene el contacto y qué le interesa. */
export function whatsappTech(interes?: string): string {
  const texto = interes
    ? `Hola Tryvex Tech, vengo de la tienda Tryvex y me interesa: ${interes}.`
    : 'Hola Tryvex Tech, vengo de la tienda Tryvex y quiero conversar sobre un proyecto.'
  return `https://wa.me/${WHATSAPP_TECH}?text=${encodeURIComponent(texto)}`
}

export interface ItemTech {
  nombre: string
  /** Precio en CLP. Con `desde`, es «desde $X»; sin él, el precio es ese. */
  precio?: number
  desde?: boolean
  /** Plan mensual: se muestra como «$X/mes». */
  mensual?: boolean
  plazo?: string
  texto: string
  puntos?: string[]
  recomendado?: boolean
  /** Páginas de tryvex.tech que amplían este servicio. */
  ver?: { ruta: string; texto: string }[]
}

export type IconoGrupo = 'inicio' | 'ia' | 'automatizacion' | 'web' | 'software' | 'mantencion'

export interface GrupoTech {
  id: string
  icono: IconoGrupo
  titulo: string
  /** Una línea que dice para qué sirve, visible con el panel cerrado. */
  resumen: string
  items: ItemTech[]
}

export const GRUPOS_TECH: readonly GrupoTech[] = [
  {
    id: 'empieza-aqui',
    icono: 'inicio',
    titulo: 'Empieza aquí',
    resumen: 'Dos formas de probar, en una o dos semanas, antes de comprometer un proyecto.',
    items: [
      {
        nombre: 'Sprint de diagnóstico',
        precio: 450_000,
        plazo: '1 semana',
        texto: 'Qué se puede automatizar en tu negocio y cuánto rinde.',
        recomendado: true,
      },
      {
        nombre: 'Prueba de concepto',
        precio: 900_000,
        plazo: '2 semanas',
        texto: 'El problema difícil, resuelto en pequeño.',
      },
    ],
  },
  {
    id: 'ia',
    icono: 'ia',
    titulo: 'Inteligencia artificial',
    resumen: 'La desarrollamos nosotros, a la medida de cada negocio.',
    items: [
      {
        nombre: 'Agentes de IA',
        precio: 1_600_000,
        desde: true,
        plazo: '4 semanas',
        texto: 'Clasifica, redacta y consulta tus sistemas.',
        puntos: ['Conectado a tus sistemas actuales', 'Clasificación y redacción automática', 'Trazabilidad de cada acción', 'Fase de validación antes del alcance final'],
        ver: [
          { ruta: '/procesar-facturas-y-contratos-con-ia', texto: 'Facturas y contratos con IA' },
          { ruta: '/ia-en-tu-propio-servidor', texto: 'IA en tu propio servidor' },
        ],
      },
    ],
  },
  {
    id: 'automatizacion',
    icono: 'automatizacion',
    titulo: 'Automatización de procesos',
    resumen: 'Procesos que corren mientras duermes.',
    items: [
      {
        nombre: 'Automatización de un proceso',
        precio: 450_000,
        desde: true,
        plazo: '2 semanas',
        texto: 'Un flujo, hasta 3 integraciones.',
        puntos: ['Ingeniería propia primero; n8n o Zapier cuando conviene', 'Logs y alertas', 'Mantención los primeros 90 días sin costo'],
      },
      {
        nombre: 'Automatización operativa',
        precio: 1_200_000,
        desde: true,
        plazo: '4 semanas',
        texto: 'Varios flujos, panel de control.',
        puntos: ['Múltiples flujos coordinados', 'Panel de control en tiempo real', 'Conexión con Shopify, Bsale, Mercado Libre y más'],
      },
      {
        nombre: 'Integración con sistemas chilenos',
        precio: 850_000,
        desde: true,
        plazo: '3 semanas',
        texto: 'SII, Bsale, Shopify, Mercado Libre.',
        puntos: ['Facturación electrónica SII', 'Sincronización de inventario y ventas', 'Panel con estado en tiempo real'],
        ver: [{ ruta: '/automatizar-facturacion-sii', texto: 'Automatizar la facturación SII' }],
      },
      {
        nombre: 'Atención automatizada por WhatsApp',
        precio: 900_000,
        desde: true,
        plazo: '3 semanas',
        texto: 'Responde, agenda y deriva sin que nadie esté pegado al teléfono.',
        puntos: ['Respuestas y agendamiento automático', 'Derivación a una persona cuando corresponde', 'Conexión con Google Calendar y CRM', 'Métricas de conversación'],
        ver: [{ ruta: '/agente-de-whatsapp-para-empresas', texto: 'Agente de WhatsApp para empresas' }],
      },
    ],
  },
  {
    id: 'web',
    icono: 'web',
    titulo: 'Páginas web y posicionamiento',
    resumen: 'Páginas que cargan rápido y convierten, sin plantillas.',
    items: [
      {
        nombre: 'Landing esencial',
        precio: 150_000,
        desde: true,
        plazo: '7 días hábiles',
        texto: 'Una página, un formulario, métricas desde el día uno.',
        puntos: ['Diseño y copy enfocados en conversión', 'SEO técnico desde el día uno', 'Seguimiento de conversiones', 'Rendimiento 90+ en Core Web Vitals'],
      },
      {
        nombre: 'Landing avanzada',
        precio: 650_000,
        desde: true,
        plazo: '3 semanas',
        texto: 'Multipágina, animación, contenido editable.',
        puntos: ['Múltiples secciones y rutas', 'Animación e interacción a medida', 'Pruebas A/B y mejora continua'],
      },
    ],
  },
  {
    id: 'software',
    icono: 'software',
    titulo: 'Productos a medida',
    resumen: 'Software hecho para cómo trabaja tu negocio, sin ruedas.',
    items: [
      {
        nombre: 'Producto a medida (MVP)',
        precio: 2_800_000,
        desde: true,
        plazo: '8 semanas',
        texto: 'Frontend, backend, autenticación y despliegue completo.',
        puntos: ['Next.js, TypeScript y PostgreSQL', 'Autenticación, roles y panel de administración', 'Despliegue en producción con CI/CD'],
      },
      {
        nombre: 'Panel interno / dashboard',
        precio: 1_400_000,
        desde: true,
        plazo: '4 semanas',
        texto: 'Operación visible en un solo lugar.',
        puntos: ['Métricas y estado en tiempo real', 'Roles y permisos por usuario', 'Exportación de reportes'],
      },
      {
        nombre: 'Portal de clientes',
        precio: 2_200_000,
        desde: true,
        plazo: '5 semanas',
        texto: 'Acceso, estado y documentos, sin correos de ida y vuelta.',
        puntos: ['Acceso con autenticación propia', 'Estado y documentos centralizados', 'Notificaciones automáticas', 'Panel de administración incluido'],
      },
    ],
  },
  {
    id: 'mantencion',
    icono: 'mantencion',
    titulo: 'Planes de mantención',
    resumen: 'Los primeros 90 días van incluidos en todos los servicios.',
    items: [
      {
        nombre: 'Esencial',
        precio: 20_000,
        mensual: true,
        texto: 'Sitios sin panel ni datos que operar.',
        puntos: ['Infraestructura, dominio y certificado', 'Respaldos y actualizaciones de seguridad', 'Respuesta a incidentes en 72 horas'],
      },
      {
        nombre: 'Activo',
        precio: 139_000,
        mensual: true,
        texto: 'Para automatizaciones, paneles e integraciones.',
        puntos: ['Todo lo del plan Esencial', '3 horas de evolución al mes', 'Respuesta a incidentes en 48 horas', 'Informe mensual'],
        recomendado: true,
      },
      {
        nombre: 'Socio',
        precio: 320_000,
        mensual: true,
        texto: 'Para MVP, portales y agentes de IA.',
        puntos: ['Todo lo del plan Activo', '8 horas de evolución al mes', 'Respuesta a incidentes en 24 horas', 'Revisión mensual'],
      },
    ],
  },
]

/** Precio más bajo del grupo, para mostrarlo con el panel cerrado. */
export function precioMinimo(grupo: GrupoTech): { precio: number; desde: boolean; mensual: boolean } | null {
  const con = grupo.items.filter((i) => i.precio !== undefined)
  if (con.length === 0) return null
  const menor = con.reduce((a, b) => ((a.precio as number) <= (b.precio as number) ? a : b))
  return { precio: menor.precio as number, desde: con.length > 1 || Boolean(menor.desde), mensual: Boolean(menor.mensual) }
}
