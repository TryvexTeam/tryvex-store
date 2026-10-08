import type { ConfiguracionTienda } from '@/lib/configuracion'
import { REDES_TIENDA } from '@/lib/redes'
import { urlSitio } from '@/lib/sitio'

/**
 * Datos estructurados (schema.org) que comparten varias páginas.
 *
 * Google los usa para el resultado enriquecido y los asistentes de IA
 * (ChatGPT, Perplexity, el resumen de Google) para saber quién es la tienda
 * y citarla. Solo entra lo que la tienda ya muestra: nada inventado.
 */

/** Tienda y sitio, para la portada. El buscador es el de /tienda (`?q=`). */
export function datosTienda(configuracion: ConfiguracionTienda | null) {
  const base = urlSitio()
  const nombre = configuracion?.nombre_tienda?.trim() || 'Tryvex Store'
  // El correo de marca, como en /contacto. El WhatsApp no entra: el visible hoy
  // es el de Tryvex Tech, no el de la tienda.
  const correo = configuracion?.email_visible?.trim() || configuracion?.email_contacto?.trim() || null
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'OnlineStore',
        '@id': `${base}/#tienda`,
        name: nombre,
        url: base,
        logo: `${base}/marca/tryvex-tx.webp`,
        description:
          'Tienda online chilena de tecnología: audífonos, iPhone, relojes, parlantes, cámaras, proyectores, baterías y cargadores, con envío a todo Chile y garantía de 6 meses.',
        areaServed: { '@type': 'Country', name: 'Chile' },
        sameAs: REDES_TIENDA.map((r) => r.href),
        ...(correo ? { contactPoint: { '@type': 'ContactPoint', contactType: 'customer service', email: correo, availableLanguage: 'es' } } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${base}/#sitio`,
        name: nombre,
        url: base,
        inLanguage: 'es-CL',
        publisher: { '@id': `${base}/#tienda` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${base}/tienda?q={search_term_string}` },
          'query-input': 'required name=search_term_string',
        },
      },
    ],
  }
}

/** Migas de pan: cada paso es [nombre, ruta]; el último es la página actual. */
export function migasDePan(pasos: [string, string][]) {
  const base = urlSitio()
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: pasos.map(([name, ruta], i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name,
      item: `${base}${ruta}`,
    })),
  }
}

/** JSON listo para `<script type="application/ld+json">`; `<` escapado para que ningún texto cierre la etiqueta. */
export function jsonLd(datos: unknown): string {
  return JSON.stringify(datos).replace(/</g, '\\u003c')
}
