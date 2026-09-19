import type { Metadata } from 'next'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Envíos',
  description: 'Información vigente sobre envíos, plazos, tarifas y retiro en Tryvex.',
}

export default async function Envios() {
  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null
  const politica = configuracion?.envio_politica_texto?.trim()
  const plazo = configuracion?.envio_plazo_texto?.trim()
  const retiro = configuracion?.retiro_habilitado && configuracion.retiro_direccion?.trim()
  const hayInformacion = Boolean(politica || plazo || configuracion || retiro)

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp} />
      <PaginaServicio etiqueta="Ayuda" titulo="Envíos" descripcion="Las condiciones publicadas aquí salen de la configuración vigente de la tienda.">
        {hayInformacion ? (
          <div className="space-y-7">
            {politica && <section><h2 className="text-[22px] font-semibold tracking-tarjeta text-tinta">Política de envío</h2><p className="mt-3 whitespace-pre-line">{politica}</p></section>}
            {plazo && <section><h2 className="text-[22px] font-semibold tracking-tarjeta text-tinta">Plazo de despacho</h2><p className="mt-3 whitespace-pre-line">{plazo}</p></section>}
            {configuracion && (
              <section aria-label="Costos de envío" className="rounded-[18px] bg-papel p-5 ring-1 ring-borde/70">
                <h2 className="text-[18px] font-semibold text-tinta">Costos</h2>
                <dl className="mt-3 divide-y divide-borde/70 text-[15px]">
                  <div className="flex justify-between gap-5 py-2.5"><dt>Tarifa</dt><dd className="cifra text-right font-medium text-tinta">{configuracion.envio_tarifa_clp > 0 ? clp(configuracion.envio_tarifa_clp) : 'Sin costo'}</dd></div>
                  {configuracion.envio_gratis_desde_clp !== null && <div className="flex justify-between gap-5 py-2.5"><dt>Envío gratis desde</dt><dd className="cifra text-right font-medium text-tinta">{clp(configuracion.envio_gratis_desde_clp)}</dd></div>}
                </dl>
              </section>
            )}
            {retiro && <section><h2 className="text-[22px] font-semibold tracking-tarjeta text-tinta">Retiro</h2><p className="mt-3 whitespace-pre-line">{configuracion?.retiro_direccion}</p></section>}
          </div>
        ) : (
          <p>La información de envío aún no está publicada. <Link href="/contacto" className="text-spark hover:underline">Revise los canales de contacto.</Link></p>
        )}
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
