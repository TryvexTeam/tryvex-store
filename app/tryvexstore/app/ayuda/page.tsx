import type { Metadata } from 'next'
import Link from 'next/link'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Ayuda',
  description: 'Encuentre respuestas, envíos, cambios, devoluciones y canales de contacto de Tryvex.',
}

const ENLACES = [
  { titulo: 'Preguntas frecuentes', texto: 'Respuestas rápidas para acompañar su compra.', href: '/ayuda/preguntas-frecuentes' },
  { titulo: 'Envíos', texto: 'Revise despachos, tarifas, plazos y retiro.', href: '/envios' },
  { titulo: 'Cambios y devoluciones', texto: 'Consulte las condiciones de garantía y retracto.', href: '/cambios-y-devoluciones' },
  { titulo: 'Contacto', texto: 'Vea los canales disponibles para escribirnos.', href: '/contacto' },
  { titulo: 'Nosotros', texto: 'Conozca la forma en que pensamos la experiencia Tryvex.', href: '/nosotros' },
]

export default async function Ayuda() {
  const { categorias, configuracion } = await leerVitrina()
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={whatsapp} />
      <PaginaServicio etiqueta="Ayuda" titulo="¿En qué podemos ayudarle?" descripcion="Encuentre la información de su compra en un solo lugar.">
        <nav aria-label="Secciones de ayuda" className="grid gap-3 t:grid-cols-2">
          {ENLACES.map((enlace) => (
            <Link key={enlace.href} href={enlace.href} className="rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark">
              <h2 className="text-[19px] font-semibold tracking-cuerpo text-tinta">{enlace.titulo}</h2>
              <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">{enlace.texto}</p>
              <span className="mt-4 inline-block text-[14px] font-medium text-spark">Abrir →</span>
            </Link>
          ))}
        </nav>
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
