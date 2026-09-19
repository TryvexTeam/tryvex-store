import type { Metadata } from 'next'
import { HISTORIA_TRYVEX } from '@/lib/ayuda'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Nosotros',
  description: 'La forma en que Tryvex acompaña el descubrimiento y la compra de tecnología.',
}

export default async function Nosotros() {
  const { categorias, configuracion } = await leerVitrina()
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={whatsapp} />
      <PaginaServicio etiqueta="Tryvex" titulo="Una experiencia clara para elegir tecnología." descripcion="Queremos que la información importante esté a mano antes, durante y después de su compra.">
        <div className="space-y-5">
          {HISTORIA_TRYVEX.map((parrafo) => <p key={parrafo}>{parrafo}</p>)}
        </div>
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
