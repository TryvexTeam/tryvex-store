import type { MetadataRoute } from 'next'
import { urlSitio } from '@/lib/sitio'

/**
 * Lo público se indexa; lo que es de una persona o del equipo, no. La bolsa y
 * el checkout ya llevan `noindex`, pero vetarlos acá ahorra visitas inútiles
 * del rastreador.
 */
export default function robots(): MetadataRoute.Robots {
  const base = urlSitio()
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/panel', '/api/', '/auth/', '/bolsa', '/comprar', '/cuenta', '/seguimiento/'] }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
