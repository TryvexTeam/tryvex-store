import type { Metadata } from 'next'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { PaginaServicio } from '@/components/tienda/pagina-servicio'
import { IconoRed } from '@/components/tienda/icono-red'
import { REDES_TIENDA, TRYVEX_TECH } from '@/lib/redes'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escríbenos por correo o WhatsApp y síguenos en Instagram y TikTok.',
}

export default async function Contacto() {
  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = (configuracion?.whatsapp ?? '').replace(/\D/g, '')
  const email = configuracion?.email_contacto?.trim()
  // Se muestra el correo de marca; el clic escribe al buzón que el equipo lee.
  const emailVisible = configuracion?.email_visible?.trim() || email

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp ? `https://wa.me/${whatsapp}` : null} />
      <PaginaServicio etiqueta="Ayuda" titulo="Contacto" descripcion="Escríbenos por el canal que prefieras, o síguenos para ver lo nuevo antes que nadie.">
        <section aria-labelledby="canales-titulo">
          <h2 id="canales-titulo" className="sr-only">Escríbenos</h2>
          {email || whatsapp ? (
            <ul className="space-y-3">
              {email && <li><a href={`mailto:${email}`} className="block rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark"><span className="block text-[14px] font-semibold text-gris">Correo electrónico</span><span className="mt-1 block break-words text-[19px] font-semibold text-tinta">{emailVisible}</span></a></li>}
              {whatsapp && <li><a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="block rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark"><span className="block text-[14px] font-semibold text-gris">WhatsApp</span><span className="mt-1 block text-[19px] font-semibold text-tinta">Abrir conversación ↗</span></a></li>}
            </ul>
          ) : (
            <p>Los canales de contacto se mostrarán aquí cuando estén configurados.</p>
          )}
        </section>

        <section aria-labelledby="redes-titulo" className="mt-12">
          <h2 id="redes-titulo" className="text-[24px] leading-tight font-semibold tracking-seccion text-tinta t:text-[28px]">Síguenos.</h2>
          <p className="mt-2">Novedades, llegadas y ofertas, primero en nuestras redes.</p>
          <ul className="mt-5 grid gap-3 t:grid-cols-2">
            {REDES_TIENDA.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="presionable flex min-h-[88px] items-center gap-4 rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark">
                  <span className="grid size-12 shrink-0 place-items-center rounded-full bg-tinta text-white"><IconoRed red={r.red} size={22} /></span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-gris">{r.nombre}</span>
                    <span className="mt-0.5 block truncate text-[19px] font-semibold text-tinta">{r.usuario}</span>
                  </span>
                  <span aria-hidden className="ml-auto text-gris">↗</span>
                  <span className="sr-only">(se abre en otra pestaña)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        {/* Tryvex Tech: el estudio que construyó esta tienda. Va aparte y al final,
            para no competir con la compra, pero con peso propio. */}
        <section aria-labelledby="tech-titulo" className="relative isolate mt-12 overflow-hidden rounded-[28px] bg-black p-7 text-white t:p-10">
          <span aria-hidden className="absolute -top-24 -right-24 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(90_200_250/45%),transparent)]" />
          <span aria-hidden className="absolute -bottom-28 -left-16 -z-10 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(175_82_222/35%),transparent)]" />
          <p className="text-[13px] font-semibold tracking-etiqueta text-[#7fd4ff] uppercase">Tryvex Tech</p>
          <h2 id="tech-titulo" className="mt-3 max-w-[18ch] text-[30px] leading-[1.06] font-semibold tracking-seccion text-balance t:text-[40px]">¿Tu negocio necesita una web como esta?</h2>
          <p className="mt-4 max-w-[46ch] text-[16px] leading-relaxed text-white/75 t:text-[17px]">
            Tiendas en línea, sitios y sistemas a medida. Esta tienda la diseñamos y la programamos nosotros.
          </p>
          <a href={TRYVEX_TECH.sitio} target="_blank" rel="noopener noreferrer" className="tienda-boton mt-7 bg-white text-black hover:bg-white/85">
            Conoce Tryvex Tech<span className="sr-only"> (se abre en otra pestaña)</span>
          </a>
          <ul className="mt-8 flex flex-wrap gap-2 border-t border-white/15 pt-6">
            {TRYVEX_TECH.redes.map((r) => (
              <li key={r.href}>
                <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white hover:bg-white/20">
                  <IconoRed red={r.red} size={16} />
                  {r.usuario}
                  <span className="sr-only">: {r.nombre} (se abre en otra pestaña)</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      </PaginaServicio>
      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} emailVisible={configuracion?.email_visible ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
