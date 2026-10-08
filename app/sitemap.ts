import type { MetadataRoute } from 'next'
import { leerVitrinaGuardada } from '@/lib/tienda'
import { urlSitio } from '@/lib/sitio'

// Los productos cambian desde el panel: se arma en cada petición.
export const dynamic = 'force-dynamic'

const PAGINAS = ['/', '/tienda', '/cyber', '/nosotros', '/contacto', '/envios', '/cambios-y-devoluciones', '/ayuda', '/ayuda/preguntas-frecuentes']

/**
 * Páginas fijas más una entrada por producto publicado. Si la base no responde
 * el sitemap igual sale, con las páginas fijas: un sitemap caído no debe
 * mostrarle a Google un error en lugar de la tienda.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlSitio()
  const fijas: MetadataRoute.Sitemap = PAGINAS.map((ruta) => ({
    url: `${base}${ruta === '/' ? '' : ruta}`,
    changeFrequency: ruta === '/' || ruta === '/tienda' ? 'daily' : 'monthly',
    priority: ruta === '/' ? 1 : ruta === '/tienda' ? 0.9 : 0.5,
  }))

  try {
    const { productos } = await leerVitrinaGuardada()
    return [
      ...fijas,
      ...productos.map((p) => ({ url: `${base}/producto/${encodeURIComponent(p.slug)}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    ]
  } catch {
    return fijas
  }
}
