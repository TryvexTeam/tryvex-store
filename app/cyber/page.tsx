import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { leerVitrinaGuardada } from '@/lib/tienda'
import { leerPiezas, type PiezaLanding } from '@/lib/secciones'
import { HeroeCampana } from '@/components/tienda/campana'
import { FraseProductos, productosPorCategoria } from '@/components/tienda/frase-productos'
import { ProductoAnotado } from './producto-anotado'
import { leerResenas, leerResumenResenas } from '@/lib/resenas'
import { CYBER_CATEGORIAS, MENSAJES_WHATSAPP, PACKS_CYBER, type PackCyber, type PreguntaCyber } from '@/lib/cyber'
import { leerMinimoMayorista, productosCyber, vendibleEnCampana } from '@/lib/cyber-productos'
import { enlaceWhatsapp } from '@/lib/whatsapp'
import { Cabecera } from '@/components/tienda/cabecera'
import { Comentarios } from '@/components/tienda/comentarios'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { Medir } from '@/components/medir'
import { BarraMovil, WhatsappFlotante } from './rastreo'
import {
  BarraCyber,
  CategoriasCyber,
  CierreCyber,
  ComoComprarCyber,
  ConfianzaCyber,
  FaqCyber,
  HeroCyber,
  MayoristaCyber,
  ObjetivoCyber,
  OfertasCyber,
  PacksCyber,
  type PackVisible,
} from './secciones'

/**
 * /cyber — landing para tráfico de Meta Ads, Instagram, TikTok y WhatsApp.
 *
 * Copy, modo (live/extended) y productos se editan en `lib/cyber.ts`; precios,
 * fotos y stock salen del catálogo real. Igual que la portada: se arma en cada
 * visita y la consulta se guarda 300 s (ver la nota en app/page.tsx).
 */
export const dynamic = 'force-dynamic'

const TITULO = 'Cyber Tryvex | Tecnología para comprar, regalar o revender'
const DESCRIPCION = 'Ofertas Cyber en productos tech: audífonos, smartwatches, cargadores, accesorios y productos para emprendedores. Mayorista + detalle.'

export const metadata: Metadata = {
  // `absolute`: el título ya trae la marca; sin esto saldría «… — Tryvex» repetido.
  title: { absolute: TITULO },
  description: DESCRIPCION,
  alternates: { canonical: '/cyber' },
  robots: { index: true, follow: true },
  openGraph: { title: TITULO, description: DESCRIPCION, url: '/cyber', type: 'website', locale: 'es_CL', siteName: 'Tryvex Store' },
  twitter: { card: 'summary_large_image', title: TITULO, description: DESCRIPCION },
}

const datosCyber = unstable_cache(
  async () => {
    const [vitrina, piezas, resenas, resumenResenas, minimoMayorista] = await Promise.all([leerVitrinaGuardada(), leerPiezas(), leerResenas(), leerResumenResenas(), leerMinimoMayorista().catch(() => null)])
    // Un Map no sobrevive al caché (se guarda como JSON): viaja como pares, igual que en la portada.
    return { vitrina, piezas: [...piezas] as [string, PiezaLanding][], resenas, resumenResenas, minimoMayorista }
  },
  ['cyber'],
  { revalidate: 300, tags: ['resenas', 'portada'] },
)

export default async function PaginaCyber() {
  const { vitrina, piezas: paresDePiezas, resenas, resumenResenas, minimoMayorista } = await datosCyber()
  const piezas = new Map(paresDePiezas)
  const { productos, categorias, configuracion: c } = vitrina

  const { lista } = productosCyber(productos)
  // La oferta con mayor descuento de la selección, para el producto anotado.
  const mayorOferta = [...lista].filter((p) => p.precioAntes).sort((a, b) => b.precioAntes! / b.precio - a.precioAntes! / a.precio)[0] ?? lista[0]
  const [audio, reloj, carga] = productosPorCategoria(productos, categorias, ['audifonos', 'relojes', 'cargadores-y-cables'])
  // Reseñas reales, pero sin las que hablan de «original»/«Apple»: en una página de
  // anuncios eso se lee como afirmación de la tienda y Meta puede rechazar la campaña.
  const resenasCampana = resenas.filter((r) => !/\b(apple|original(es)?)\b/i.test(r.texto))
  // Sin número configurado, los botones de WhatsApp llevan a Contacto en vez de quedar rotos.
  const whatsapp = (texto: string) => enlaceWhatsapp(c?.whatsapp, texto) ?? '/contacto'
  const whatsappMayorista = whatsapp(MENSAJES_WHATSAPP.mayorista)
  const whatsappStock = whatsapp(MENSAJES_WHATSAPP.stock)

  // Solo con la configuración leída se promete envío gratis (mismo criterio que la ficha).
  const envioGratis = c !== null && c.envio_tarifa_clp === 0 && !c.envio_gratis_desde_clp
  const envio = envioGratis ? 'Envío gratis a todo Chile' : 'Envío a todo Chile'

  const conProductos = categorias.filter((cat) => cat.productos.some(vendibleEnCampana))
  const porSlug = new Map(conProductos.map((cat) => [cat.slug, cat]))
  const destacadas = CYBER_CATEGORIAS.flatMap((slug) => porSlug.get(slug) ?? [])
  const enlaceCategoria = (slug: string) => (porSlug.has(slug) ? `/tienda?cat=${encodeURIComponent(slug)}` : null)
  const hrefPack = (p: PackCyber) => ('categoria' in p.destino ? enlaceCategoria(p.destino.categoria) : whatsapp(MENSAJES_WHATSAPP[p.destino.whatsapp]))
  // Foto real: la del primer producto vendible de la categoría del pack; el pack
  // de reventa (va a WhatsApp) muestra un producto de las ofertas.
  const fotoCategoria = (slug: string) => porSlug.get(slug)?.productos.find(vendibleEnCampana)?.imagen ?? null
  const packs: PackVisible[] = PACKS_CYBER.flatMap((p) => {
    const href = hrefPack(p)
    if (!href) return []
    const foto = 'categoria' in p.destino ? fotoCategoria(p.destino.categoria) : (lista[0]?.imagen ?? null)
    return [{ ...p, href, foto }]
  })
  // Tres productos de familias distintas para el bloque de reventa.
  const familias = new Set<string | null>()
  const fotosReventa = lista
    .filter((p) => (familias.has(p.categoriaId) ? false : (familias.add(p.categoriaId), true)))
    .slice(0, 3)
    .map((p) => ({ src: p.imagen!, alt: p.nombre }))
  const regalo = enlaceCategoria('relojes') ?? enlaceCategoria('audifonos') ?? '#ofertas'

  const preguntas: PreguntaCyber[] = [
    { pregunta: '¿Hacen envíos a todo Chile?', respuesta: 'Sí, Tryvex realiza envíos a todo Chile, según disponibilidad y las condiciones indicadas en la tienda. El costo y el plazo se muestran antes de pagar.' },
    { pregunta: '¿Los precios tienen IVA incluido?', respuesta: 'Sí, los precios están en pesos chilenos con IVA incluido.' },
    { pregunta: '¿Tienen garantía?', respuesta: c?.garantia_texto ?? 'Sí, garantía legal de 6 meses desde la recepción, por fallas de fábrica.' },
    { pregunta: '¿Puedo devolver un producto?', respuesta: 'Los cambios y devoluciones se rigen por la Ley del Consumidor. Revisa las condiciones en la página de Cambios y devoluciones.' },
    { pregunta: '¿Venden al por mayor?', respuesta: 'Sí, puedes pedir la lista mayorista por WhatsApp y consultar precios por cantidad.' },
    { pregunta: '¿Cómo consulto stock?', respuesta: 'Puedes revisar el producto en la tienda o escribirnos por WhatsApp para confirmar disponibilidad.' },
    { pregunta: '¿Puedo comprar para revender?', respuesta: 'Sí, hay productos de alta rotación ideales para emprendedores. Pide la lista mayorista para ver precios por cantidad.' },
  ]

  const destinos = [
    { nombre: 'Ofertas', href: '#ofertas' },
    { nombre: 'Mayorista', href: '#mayorista' },
    { nombre: 'Cómo comprar', href: '#como-comprar' },
  ]

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <Medir evento="ViewContent" parametros={{ content_name: 'Cyber Tryvex Landing', content_category: 'Cyber', currency: 'CLP' }} />
      <BarraCyber envio={envio} />
      <Cabecera destinos={destinos} ayuda={whatsappStock} />

      <main className="min-w-0 flex-1">
        {/* El mismo héroe de la portada (escenas y videos de Panel → Portada). */}
        <HeroeCampana productos={productos} piezas={piezas} />
        <HeroCyber whatsappMayorista={whatsappMayorista} envio={envio} />
        <ConfianzaCyber />
        {audio && reloj && carga && (
          <FraseProductos
            id="frase-cyber"
            className="pt-16 t:pt-24"
            partes={['Ofertas Cyber en audífonos ', { producto: audio }, ', relojes ', { producto: reloj }, ' y carga rápida ', { producto: carga }, { tono: 'gris', texto: ' hasta agotar stock.' }]}
          />
        )}
        <OfertasCyber productos={lista} />
        {mayorOferta && <ProductoAnotado producto={mayorOferta} />}
        <ObjetivoCyber whatsappMayorista={whatsappMayorista} regalo={regalo} fotos={fotosReventa} />
        <PacksCyber packs={packs} />
        <MayoristaCyber whatsappMayorista={whatsappMayorista} revender="/tienda?disponibles=1" desde={minimoMayorista} />
        <CategoriasCyber categorias={destacadas} />
        {resenasCampana.length > 0 && (
          <Comentarios resenas={resenasCampana} resumen={resumenResenas} titulo="Clientes reales, pedidos reales" bajada="Compras y entregas de personas que ya confiaron en Tryvex." />
        )}
        <ComoComprarCyber whatsappStock={whatsappStock} />
        <FaqCyber preguntas={preguntas} />
        <CierreCyber whatsappMayorista={whatsappMayorista} />
      </main>

      {/* Marca dónde empieza el pie: ahí se esconde la barra del teléfono. */}
      <div id="cyber-fin" aria-hidden />
      <PieTienda
        nombre={c?.nombre_tienda ?? 'Tryvex'}
        email={c?.email_contacto ?? null}
        emailVisible={c?.email_visible ?? null}
        whatsapp={c?.whatsapp ?? null}
        garantia={c?.garantia_texto ?? null}
        retracto={c?.retracto_texto ?? null}
      />
      <BarraMovil whatsapp={whatsappStock} />
      <WhatsappFlotante href={whatsappStock} />
    </div>
  )
}
