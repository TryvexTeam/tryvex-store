import type { Metadata } from 'next'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaBolsa } from '@/components/tienda/bolsa'
import { Carrusel } from '@/components/tienda/carrusel'
import { CardProducto } from '@/components/tienda/card-producto'
import { hitosDeEnvio } from '@/lib/plazo-envio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Bolsa',
  robots: { index: false },
}

/**
 * La bolsa como página propia, como en apple.com/cl/shop/bag. El contenido
 * vive en el navegador (`PaginaBolsa`); aquí solo va el marco de la tienda.
 */
export default async function Bolsa() {
  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp} />
      <main className="mx-auto min-h-[70svh] w-full max-w-[1144px] min-w-0 flex-1 px-[22px] pt-8 pb-20 t:pt-12">
        <PaginaBolsa
          hitosEnvio={hitosDeEnvio(new Date())}
          envioGratis={configuracion !== null && configuracion.envio_tarifa_clp === 0 && !configuracion.envio_gratis_desde_clp}
        />
      </main>

      {/* Con la bolsa vacía o llena, lo que sigue es seguir descubriendo. */}
      {vitrina.productos.length > 0 && (
        <section aria-labelledby="bolsa-mas-titulo" className="bg-papel-alt pb-16">
          <h2 id="bolsa-mas-titulo" className="mb-1 px-[var(--canal)] text-[24px] font-semibold tracking-tarjeta d:text-[28px]">
            <span className="text-tinta">Te puede interesar</span>
          </h2>
          <Carrusel etiqueta="Productos de la tienda">
            {vitrina.productos.slice(0, 8).map((p) => (
              <CardProducto key={p.id} producto={p} />
            ))}
          </Carrusel>
        </section>
      )}
      <PieTienda
        nombre={configuracion?.nombre_tienda ?? 'Tryvex'}
        email={configuracion?.email_contacto ?? null} emailVisible={configuracion?.email_visible ?? null}
        whatsapp={configuracion?.whatsapp ?? null}
        garantia={configuracion?.garantia_texto ?? null}
        retracto={configuracion?.retracto_texto ?? null}
      />
    </div>
  )
}
