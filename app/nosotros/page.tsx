import type { Metadata } from 'next'
import Link from 'next/link'
import { HISTORIA_TRYVEX } from '@/lib/ayuda'
import { leerVitrinaGuardada } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  alternates: { canonical: '/nosotros' },
  title: 'Nosotros',
  description: 'La forma en que Tryvex acompaña el descubrimiento y la compra de tecnología.',
}

export default async function Nosotros() {
  const { categorias, configuracion } = await leerVitrinaGuardada()
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={whatsapp} />
      <PaginaServicio etiqueta="Tryvex" titulo="Una experiencia clara para elegir tecnología." descripcion="Queremos que la información importante esté a mano antes, durante y después de su compra.">
        <div className="space-y-5">
          {HISTORIA_TRYVEX.map((parrafo) => <p key={parrafo}>{parrafo}</p>)}
        </div>
        <aside aria-labelledby="nosotros-contacto" className="mt-12 border-t border-borde/70 pt-8">
          <h2 id="nosotros-contacto" className="text-[24px] leading-tight font-semibold tracking-tarjeta text-tinta">¿Tiene una consulta?</h2>
          <p className="mt-2">Vea los canales disponibles para escribirnos.</p>
          <Link href="/contacto" className="tienda-boton mt-6 bg-tinta text-white hover:bg-tinta-suave">Ir a contacto</Link>
        </aside>
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} emailVisible={configuracion?.email_visible ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
