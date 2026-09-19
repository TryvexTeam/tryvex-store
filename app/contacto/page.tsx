import type { Metadata } from 'next'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Canales de contacto disponibles de Tryvex.',
}

export default async function Contacto() {
  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = (configuracion?.whatsapp ?? '').replace(/\D/g, '')
  const email = configuracion?.email_contacto?.trim()

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp ? `https://wa.me/${whatsapp}` : null} />
      <PaginaServicio etiqueta="Ayuda" titulo="Contacto" descripcion="Use el canal que la tienda tenga disponible para su consulta.">
        {email || whatsapp ? (
          <ul className="space-y-3">
            {email && <li><a href={`mailto:${email}`} className="block rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark"><span className="block text-[14px] font-semibold text-gris">Correo electrónico</span><span className="mt-1 block break-words text-[19px] font-semibold text-tinta">{email}</span></a></li>}
            {whatsapp && <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="block rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark"><span className="block text-[14px] font-semibold text-gris">WhatsApp</span><span className="mt-1 block text-[19px] font-semibold text-tinta">Abrir conversación ↗</span></a></li>}
          </ul>
        ) : (
          <p>Los canales de contacto se mostrarán aquí cuando estén configurados.</p>
        )}
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
