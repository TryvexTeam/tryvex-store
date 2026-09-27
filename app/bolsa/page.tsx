import type { Metadata } from 'next'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaBolsa } from '@/components/tienda/bolsa'

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
        <PaginaBolsa />
      </main>
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
