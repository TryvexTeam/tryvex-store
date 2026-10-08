import type { Metadata } from 'next'
import { unstable_cache } from 'next/cache'
import { leerVitrina } from '@/lib/tienda'
import { leerResenas, leerResumenResenas } from '@/lib/resenas'
import { CYBER_CATEGORIAS, MENSAJES_WHATSAPP, type PackCyber, type PreguntaCyber } from '@/lib/cyber'
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
    const [vitrina, resenas, resumenResenas, minimoMayorista] = await Promise.all([leerVitrina(), leerResenas(), leerResumenResenas(), leerMinimoMayorista().catch(() => null)])
    return { vitrina, resenas, resumenResenas, minimoMayorista }
  },
  ['cyber'],
  { revalidate: 300, tags: ['resenas', 'portada'] },
)

export default async function PaginaCyber() {
  const { vitrina, resenas, resumenResenas, minimoMayorista } = await datosCyber()
  const { productos, categorias, configuracion: c } = vitrina

  const { lista } = productosCyber(productos)
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
  const regalo = enlaceCategoria('relojes') ?? enlaceCategoria('audifonos') ?? '#ofertas'

  const preguntas: PreguntaCyber[] = [
    { pregunta: '¿Hacen envíos a todo Chile?', respuesta: 'Sí, Tryvex realiza envíos a todo Chile, según disponibilidad y las condiciones indicadas en la tienda. El costo y el plazo se muestran antes de pagar.' },
    { pregunta: '¿Los precios tienen IVA incluido?', respuesta: 'Sí, los precios están en pesos chilenos con IVA incluido.' },
    { pregunta: '¿Tienen garantía?', respuesta: c?.garantia_texto ?? 'Sí, los productos cuentan con garantía legal de 6 meses desde la recepción (Ley 21.398).' },
    { pregunta: '¿Puedo arrepentirme de mi compra?', respuesta: c?.retracto_texto ?? 'Sí, tienes 10 días para arrepentirte desde que recibes tu compra, según las condiciones publicadas en la tienda.' },
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
        <HeroCyber productos={lista} whatsappMayorista={whatsappMayorista} envio={envio} />
        <ConfianzaCyber envio={envio} />
        <OfertasCyber productos={lista} />
        <ObjetivoCyber whatsappMayorista={whatsappMayorista} regalo={regalo} />
        <PacksCyber hrefDe={hrefPack} />
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
