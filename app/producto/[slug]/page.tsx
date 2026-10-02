import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { leerVitrina } from '@/lib/tienda'
import { leerFicha, relacionados } from '@/lib/ficha'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { Carrusel } from '@/components/tienda/carrusel'
import { CardProducto } from '@/components/tienda/card-producto'
import { Ficha } from '@/components/tienda/ficha'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { Comentarios } from '@/components/tienda/comentarios'
import { leerResenas, leerResumenResenas } from '@/lib/resenas'
import { leerLanding } from '@/lib/landing-lectura'
import { leerPruebaSocial } from '@/lib/prueba-social'
import { LandingProducto } from '@/components/tienda/landing-producto'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { hitosDeEnvio, PLAZO_TRYVEX } from '@/lib/plazo-envio'
import { urlSitio } from '@/lib/sitio'
import { CintaConfianza } from '@/components/tienda/cinta-confianza'

/**
 * Ficha de producto.
 *
 * Se genera sola para cada producto publicado: la URL es su slug. Si se
 * archiva, la ficha responde 404 en vez de vender algo que ya no está.
 */
// Por petición: la ficha muestra stock y precio vivos, y así no depende del
// worker de rutas estáticas, que se caía sin dejar mensaje.
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/producto/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const ficha = await leerFicha(slug)
  if (!ficha) return { title: 'Producto no disponible' }
  return {
    title: ficha.nombre,
    description: ficha.descripcion ?? `${ficha.nombre} en Tryvex Store.`,
    openGraph: { title: ficha.nombre, images: ficha.galeria.slice(0, 1) },
  }
}

export default async function PaginaProducto(props: PageProps<'/producto/[slug]'>) {
  const { slug } = await props.params
  // Color elegido en la card: solo un id con forma de uuid, lo demás se ignora.
  const v = (await props.searchParams).v
  const varianteInicial = typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v) ? v : null
  const [ficha, vitrina] = await Promise.all([leerFicha(slug), leerVitrina()])
  if (!ficha) notFound()
  const [resenas, resumenResenas, landing, pruebaSocial] = await Promise.all([
    leerResenas(ficha.id),
    leerResumenResenas(ficha.id),
    leerLanding(ficha.id),
    leerPruebaSocial(ficha.id),
  ])

  const c = vitrina.configuracion
  const whatsapp = c?.whatsapp ? `https://wa.me/${c.whatsapp.replace(/\D/g, '')}` : null
  const otros = relacionados(ficha, vitrina.productos)

  const envio = {
    plazo: c?.envio_plazo_texto ?? null,
    tarifa: c?.envio_tarifa_clp ?? 0,
    gratisDesde: c?.envio_gratis_desde_clp ?? null,
    politica: c?.envio_politica_texto ?? 'El costo y el plazo del envío se muestran antes de pagar.',
  }

  // Datos estructurados para Google (precio, stock, envío y valoración). Solo
  // entra lo que la ficha ya muestra: nada inventado, y la valoración únicamente
  // si hay reseñas reales.
  const urlFicha = `${urlSitio()}/producto/${encodeURIComponent(ficha.slug)}`
  // Solo con la configuración leída: si la base no respondió, no se declara envío gratis.
  const envioGratisConfirmado = c !== null && c.envio_tarifa_clp === 0 && !c.envio_gratis_desde_clp
  const datosProducto = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: ficha.nombre,
    sku: ficha.sku,
    url: urlFicha,
    ...(ficha.descripcion ? { description: ficha.descripcion } : {}),
    ...(ficha.marca ? { brand: { '@type': 'Brand', name: ficha.marca } } : {}),
    ...(ficha.galeria.length ? { image: ficha.galeria } : {}),
    ...(resumenResenas.total > 0
      ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: resumenResenas.promedio, reviewCount: resumenResenas.total } }
      : {}),
    offers: {
      '@type': 'Offer',
      url: urlFicha,
      priceCurrency: 'CLP',
      price: String(Math.round(ficha.precio)),
      itemCondition: ficha.condicion === 'nuevo' ? 'https://schema.org/NewCondition' : 'https://schema.org/UsedCondition',
      availability: ficha.disponible > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      ...(envioGratisConfirmado
        ? {
            shippingDetails: {
              '@type': 'OfferShippingDetails',
              shippingRate: { '@type': 'MonetaryAmount', value: 0, currency: 'CLP' },
              shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'CL' },
              deliveryTime: {
                '@type': 'ShippingDeliveryTime',
                // Derivados de la misma promesa que ve el comprador (PLAZO_TRYVEX): el tránsito es lo que
                // queda entre el despacho y la llegada, tomando el caso más corto y el más largo.
                handlingTime: { '@type': 'QuantitativeValue', minValue: PLAZO_TRYVEX.despacho[0], maxValue: PLAZO_TRYVEX.despacho[1], unitCode: 'DAY' },
                transitTime: {
                  '@type': 'QuantitativeValue',
                  minValue: Math.max(0, PLAZO_TRYVEX.llegada[0] - PLAZO_TRYVEX.despacho[1]),
                  maxValue: PLAZO_TRYVEX.llegada[1] - PLAZO_TRYVEX.despacho[0],
                  unitCode: 'DAY',
                },
              },
            },
          }
        : {}),
    },
  }

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      {/* `<` se escapa para que ningún texto de producto pueda cerrar la etiqueta. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(datosProducto).replace(/</g, '\\u003c') }} />
      <FranjaAnuncio configuracion={c} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp} />

      <main className="min-w-0 flex-1">
        <Ficha
          ficha={ficha}
          envio={envio}
          garantia={c?.garantia_texto ?? 'Garantía legal de 6 meses desde la recepción (Ley 21.398).'}
          retracto={c?.retracto_texto ?? 'Tienes 10 días desde que lo recibes para arrepentirte.'}
          whatsapp={whatsapp}
          hitosEnvio={hitosDeEnvio(new Date())}
          varianteInicial={varianteInicial}
          pruebaSocial={pruebaSocial}
        />

        <CintaConfianza
          items={[
            envioGratisConfirmado ? 'Envío gratis a todo Chile' : 'Envíos a todo Chile',
            'Garantía legal de 6 meses',
            'Pago seguro con Mercado Pago',
            ...(whatsapp ? ['Atención por WhatsApp'] : []),
          ]}
        />

        <LandingProducto bloques={landing} />

        <Comentarios
          resenas={resenas}
          titulo={`Reseñas de ${ficha.nombre}`}
          bajada="Opiniones sobre este producto."
          resumen={resumenResenas}
        />

        {otros.length > 0 && (
          <section aria-labelledby="relacionados-titulo" className="bg-papel-alt pt-12 pb-6 t:pt-16">
            <h2 id="relacionados-titulo" className="mb-1 px-[var(--canal)] text-[24px] font-semibold tracking-tarjeta d:text-[28px]">
              <span className="text-tinta">Completa tu compra</span>
            </h2>
            <Carrusel etiqueta="Productos relacionados">
              {otros.map((p) => (
                <CardProducto key={p.id} producto={p} />
              ))}
            </Carrusel>
          </section>
        )}
      </main>
      <PieTienda
        nombre={c?.nombre_tienda ?? 'Tryvex'}
        email={c?.email_contacto ?? null} emailVisible={c?.email_visible ?? null}
        whatsapp={c?.whatsapp ?? null}
        garantia={c?.garantia_texto ?? null}
        retracto={c?.retracto_texto ?? null}
      />
    </div>
  )
}
