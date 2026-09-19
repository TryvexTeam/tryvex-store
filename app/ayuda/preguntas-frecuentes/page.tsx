import type { Metadata } from 'next'
import Link from 'next/link'
import { PREGUNTAS_FRECUENTES } from '@/lib/ayuda'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Preguntas frecuentes',
  description: 'Respuestas a las preguntas frecuentes de Tryvex.',
}

export default async function PreguntasFrecuentes() {
  const { categorias, configuracion } = await leerVitrina()
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null
  const datosEstructurados = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: PREGUNTAS_FRECUENTES.map((item) => ({
      '@type': 'Question',
      name: item.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: item.respuesta },
    })),
  }).replace(/</g, '\\u003c')

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={whatsapp} />
      <PaginaServicio etiqueta="Ayuda" titulo="Preguntas frecuentes" descripcion="Respuestas claras y enlaces a la información vigente.">
        <script type="application/ld+json">{datosEstructurados}</script>
        <div className="divide-y divide-borde/70 rounded-[18px] bg-papel px-5 ring-1 ring-borde/70 t:px-6">
          {PREGUNTAS_FRECUENTES.map((item) => (
            <details key={item.pregunta} className="py-1">
              <summary className="cursor-pointer py-4 pr-6 text-[17px] font-semibold tracking-cuerpo text-tinta">{item.pregunta}</summary>
              <div className="pb-5 pr-6">
                <p>{item.respuesta}</p>
                <Link href={item.enlace.href} className="mt-3 inline-block text-[14px] font-medium text-spark hover:underline">{item.enlace.texto} →</Link>
              </div>
            </details>
          ))}
        </div>
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
