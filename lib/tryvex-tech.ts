/**
 * Lo que ofrece Tryvex Tech, tal como lo describe tryvex.tech (leído el
 * 2026-09-30). Sin precios ni plazos a propósito: cada proyecto se cotiza a
 * medida, y un precio copiado acá quedaría desactualizado apenas cambie en su
 * sitio. Tampoco se copian sus cifras de resultados (clientes, conversión,
 * uptime): esas viven en tryvex.tech, donde el dueño las controla.
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
  texto: string
  puntos?: string[]
  /** Páginas de tryvex.tech que amplían este servicio. */
  ver?: { ruta: string; texto: string }[]
}

export interface GrupoTech {
  id: string
  titulo: string
  /** Una línea que dice para qué sirve, visible con la fila cerrada. */
  resumen: string
  items: ItemTech[]
}

export const GRUPOS_TECH: readonly GrupoTech[] = [
  {
    id: 'empieza-aqui',
    titulo: 'Empieza aquí',
    resumen: 'Dos formas de probar, en una o dos semanas, antes de comprometer un proyecto.',
    items: [
      { nombre: 'Sprint de diagnóstico', texto: 'Qué se puede automatizar en tu negocio y cuánto rinde. Una semana.' },
      { nombre: 'Prueba de concepto', texto: 'El problema difícil, resuelto en pequeño. Dos semanas.' },
    ],
  },
  {
    id: 'ia',
    titulo: 'Inteligencia artificial',
    resumen: 'La desarrollamos nosotros, a la medida de cada negocio.',
    items: [
      {
        nombre: 'Agentes de IA',
        texto: 'Clasifican, redactan y consultan tus sistemas.',
        puntos: ['Conectados a tus sistemas actuales', 'Clasificación y redacción automática', 'Trazabilidad de cada acción', 'Fase de validación antes del alcance final'],
        ver: [
          { ruta: '/procesar-facturas-y-contratos-con-ia', texto: 'Facturas y contratos con IA' },
          { ruta: '/ia-en-tu-propio-servidor', texto: 'IA en tu propio servidor' },
        ],
      },
    ],
  },
  {
    id: 'automatizacion',
    titulo: 'Automatización de procesos',
    resumen: 'Procesos que corren mientras duermes.',
    items: [
      {
        nombre: 'Automatización de un proceso',
        texto: 'Un flujo, hasta tres integraciones.',
        puntos: ['Ingeniería propia primero; n8n o Zapier cuando conviene', 'Registros y alertas', 'Mantención los primeros 90 días sin costo'],
      },
      {
        nombre: 'Automatización operativa',
        texto: 'Varios flujos coordinados, con panel de control.',
        puntos: ['Panel de control en tiempo real', 'Conexión con Shopify, Bsale, Mercado Libre y más'],
      },
      {
        nombre: 'Integración con sistemas chilenos',
        texto: 'SII, Bsale, Shopify y Mercado Libre.',
        puntos: ['Facturación electrónica SII', 'Sincronización de inventario y ventas', 'Panel con estado en tiempo real'],
        ver: [{ ruta: '/automatizar-facturacion-sii', texto: 'Automatizar la facturación SII' }],
      },
      {
        nombre: 'Atención automatizada por WhatsApp',
        texto: 'Responde, agenda y deriva sin que nadie esté pegado al teléfono.',
        puntos: ['Respuestas y agendamiento automático', 'Derivación a una persona cuando corresponde', 'Conexión con Google Calendar y CRM', 'Métricas de conversación'],
        ver: [{ ruta: '/agente-de-whatsapp-para-empresas', texto: 'Agente de WhatsApp para empresas' }],
      },
    ],
  },
  {
    id: 'web',
    titulo: 'Páginas web y posicionamiento',
    resumen: 'Páginas que cargan rápido y convierten, sin plantillas.',
    items: [
      {
        nombre: 'Landing esencial',
        texto: 'Una página, un formulario y métricas desde el primer día.',
        puntos: ['Diseño y copy enfocados en conversión', 'SEO técnico desde el día uno', 'Seguimiento de conversiones', 'Rendimiento 90+ en Core Web Vitals'],
      },
      {
        nombre: 'Landing avanzada',
        texto: 'Varias páginas, animación y contenido editable.',
        puntos: ['Múltiples secciones y rutas', 'Animación e interacción a medida', 'Pruebas A/B y mejora continua'],
      },
    ],
  },
  {
    id: 'software',
    titulo: 'Productos a medida',
    resumen: 'Software hecho para cómo trabaja tu negocio, sin ruedas.',
    items: [
      {
        nombre: 'Producto a medida (MVP)',
        texto: 'Frontend, backend, autenticación y despliegue completo.',
        puntos: ['Next.js, TypeScript y PostgreSQL', 'Autenticación, roles y panel de administración', 'Despliegue en producción con CI/CD'],
      },
      {
        nombre: 'Panel interno y dashboard',
        texto: 'Tu operación visible en un solo lugar.',
        puntos: ['Métricas y estado en tiempo real', 'Roles y permisos por usuario', 'Exportación de reportes'],
      },
      {
        nombre: 'Portal de clientes',
        texto: 'Acceso, estado y documentos, sin correos de ida y vuelta.',
        puntos: ['Acceso con autenticación propia', 'Estado y documentos centralizados', 'Notificaciones automáticas', 'Panel de administración incluido'],
      },
    ],
  },
  {
    id: 'mantencion',
    titulo: 'Planes de mantención',
    resumen: 'Los primeros 90 días van incluidos en todos los servicios.',
    items: [
      {
        nombre: 'Esencial',
        texto: 'Para sitios sin panel ni datos que operar.',
        puntos: ['Infraestructura, dominio y certificado', 'Respaldos y actualizaciones de seguridad', 'Respuesta a incidentes en 72 horas'],
      },
      {
        nombre: 'Activo',
        texto: 'Para automatizaciones, paneles e integraciones.',
        puntos: ['Todo lo del plan Esencial', '3 horas de evolución al mes', 'Respuesta a incidentes en 48 horas', 'Informe mensual'],
      },
      {
        nombre: 'Socio',
        texto: 'Para MVP, portales y agentes de IA.',
        puntos: ['Todo lo del plan Activo', '8 horas de evolución al mes', 'Respuesta a incidentes en 24 horas', 'Revisión mensual'],
      },
    ],
  },
]
