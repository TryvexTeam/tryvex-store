import type { Metadata } from 'next'
import Link from 'next/link'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Cambios y devoluciones',
  description: 'Información vigente sobre garantía y retracto en Tryvex.',
}

export default async function CambiosYDevoluciones() {
  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null
  const garantia = configuracion?.garantia_texto?.trim()
  const retracto = configuracion?.retracto_texto?.trim()

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp} />
      <PaginaServicio etiqueta="Ayuda" titulo="Cambios y devoluciones" descripcion="Consulte las condiciones vigentes antes de iniciar una solicitud.">
        {garantia || retracto ? (
          <div className="space-y-8">
            {garantia && <section><h2 className="text-[22px] font-semibold tracking-tarjeta text-tinta">Garantía</h2><p className="mt-3 whitespace-pre-line">{garantia}</p></section>}
            {retracto && <section><h2 className="text-[22px] font-semibold tracking-tarjeta text-tinta">Derecho a retracto</h2><p className="mt-3 whitespace-pre-line">{retracto}</p></section>}
          </div>
        ) : (
          <p>Las condiciones aún no están publicadas. <Link href="/contacto" className="text-spark hover:underline">Revise los canales de contacto.</Link></p>
        )}
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
