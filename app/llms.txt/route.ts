import { leerVitrinaGuardada } from '@/lib/tienda'
import { urlSitio } from '@/lib/sitio'

// Los productos cambian desde el panel: se arma en cada petición, como el sitemap.
export const dynamic = 'force-dynamic'

const clp = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

/**
 * /llms.txt: resumen de la tienda para asistentes de IA (convención llmstxt.org).
 *
 * ChatGPT, Perplexity y compañía lo leen para entender qué es la tienda y dónde
 * está cada cosa sin recorrer el HTML. Solo lleva lo público y vigente; si la
 * base no responde, sale igual con las páginas fijas.
 */
export async function GET() {
  const base = urlSitio()
  const lineas: string[] = [
    '# Tryvex Store',
    '',
    '> Tienda online chilena de tecnología: audífonos, iPhone, relojes, parlantes, cámaras, proyectores, baterías y cargadores. Envío a todo Chile y garantía legal de 6 meses por fallas de fábrica. Precios en pesos chilenos (CLP).',
    '',
    '## Comprar y ayuda',
    '',
    `- [Catálogo completo](${base}/tienda): todos los productos, con filtros por categoría, precio y disponibilidad`,
    `- [Envíos](${base}/envios): plazos, tarifas y retiro`,
    `- [Cambios y devoluciones](${base}/cambios-y-devoluciones): garantía y derecho a retracto`,
    `- [Preguntas frecuentes](${base}/ayuda/preguntas-frecuentes)`,
    `- [Contacto](${base}/contacto): correo y redes sociales`,
    `- [Nosotros](${base}/nosotros)`,
  ]

  try {
    const { productos, categorias } = await leerVitrinaGuardada()
    if (categorias.length) {
      lineas.push('', '## Categorías', '')
      for (const c of categorias) {
        lineas.push(`- [${c.nombre}](${base}/tienda?cat=${encodeURIComponent(c.slug)})${c.descripcion ? `: ${c.descripcion.replace(/\s+/g, ' ').trim()}` : ''}`)
      }
    }
    const disponibles = productos.filter((p) => !p.agotado)
    if (disponibles.length) {
      lineas.push('', '## Productos disponibles', '')
      for (const p of disponibles) {
        const oferta = p.precioAntes && p.precioAntes > p.precio ? ` (antes ${clp(p.precioAntes)})` : ''
        lineas.push(`- [${p.nombre}](${base}/producto/${encodeURIComponent(p.slug)}): ${clp(p.precio)}${oferta}`)
      }
    }
  } catch {
    // Sin base de datos el resumen sigue sirviendo con las páginas fijas.
  }

  return new Response(lineas.join('\n') + '\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
