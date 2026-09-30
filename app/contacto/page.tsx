import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { leerConfiguracion } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { IconoRed } from '@/components/tienda/icono-red'
import { CopiarCorreo } from '@/components/tienda/copiar-correo'
import { REDES_TIENDA, SERVICIOS_TECH, TRYVEX_TECH } from '@/lib/redes'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Contacto',
  description: 'Escríbenos por correo o WhatsApp y síguenos en Instagram y TikTok.',
}

/** Trazos de 24×24, al estilo de los íconos de beneficios. */
const TRAZOS = {
  correo: 'M3 6h18v12H3zM3.5 7l8.5 6.5L20.5 7',
  chat: 'M5 5h14v10h-8.5L5 19V5Z',
  pedido: 'M3 7.5 12 3l9 4.5v9L12 21l-9-4.5v-9ZM3 7.5l9 4.5 9-4.5M12 12v9',
  envio: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  cambio: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  duda: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM9.6 9.4a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2 1-1.2 1.9M12 17h.01',
  software: 'm8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12',
  automatizacion: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  web: 'M3 5h18v14H3zM3 9h18M6.5 7h.01M9 7h.01',
  posicionamiento: 'M4 19V5M4 19h16M8 15l3.5-4 3 2.5L20 7M16 7h4v4',
} as const

function Icono({ trazo, size = 24 }: { trazo: keyof typeof TRAZOS; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={TRAZOS[trazo]} />
    </svg>
  )
}

/** Atajos a lo que más se consulta: resuelven la duda sin escribir. */
const ATAJOS = [
  { href: '/cuenta', icono: 'pedido', titulo: 'Mi pedido', texto: 'Revisa dónde va tu compra.' },
  { href: '/envios', icono: 'envio', titulo: 'Envíos', texto: 'Cobertura, plazos y cómo llega.' },
  { href: '/cambios-y-devoluciones', icono: 'cambio', titulo: 'Cambios y garantía', texto: 'Las condiciones, explicadas.' },
  { href: '/ayuda/preguntas-frecuentes', icono: 'duda', titulo: 'Preguntas frecuentes', texto: 'Respuestas rápidas.' },
] as const

export default async function Contacto() {
  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = (configuracion?.whatsapp ?? '').replace(/\D/g, '')
  const email = configuracion?.email_contacto?.trim()
  // Se muestra el correo de marca; el clic escribe al buzón que el equipo lee.
  const emailVisible = configuracion?.email_visible?.trim() || email
  const tiktok = REDES_TIENDA.find((r) => r.red === 'tiktok')
  const instagram = REDES_TIENDA.find((r) => r.red === 'instagram')

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp ? `https://wa.me/${whatsapp}` : null} />

      <main className="flex-1">
        {/* ── Portada: titular grande a la izquierda, canales a la derecha ── */}
        <section aria-labelledby="contacto-titulo" className="relative isolate overflow-hidden">
          <span aria-hidden className="absolute -top-32 -left-24 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(229_57_53/10%),transparent)]" />
          <span aria-hidden className="absolute -right-32 bottom-[-140px] -z-10 size-[460px] rounded-full bg-[radial-gradient(closest-side,rgb(10_132_255/10%),transparent)]" />
          <div className="mx-auto grid w-full max-w-[1204px] grid-cols-[minmax(0,1fr)] gap-10 px-[22px] py-14 t:py-20 lg:grid-cols-[minmax(0,1fr)_minmax(0,460px)] lg:items-center lg:gap-16 lg:py-28">
            <div>
              <p className="text-[14px] font-semibold tracking-etiqueta text-spark uppercase">Contacto</p>
              <h1 id="contacto-titulo" className="mt-3 text-[clamp(44px,13.5vw,64px)] leading-[0.96] font-semibold tracking-titulo text-tinta t:text-[96px] d:text-[112px]">Hablemos.</h1>
              <p className="mt-6 max-w-[34ch] text-[19px] leading-relaxed text-tinta-suave t:text-[21px]">
                Escríbenos por el canal que prefieras. Si es por una compra, ten a mano tu número de pedido.
              </p>
              <ul aria-label="Nuestras redes" className="mt-8 flex flex-wrap gap-2.5">
                {REDES_TIENDA.map((r) => (
                  <li key={r.href}>
                    <a href={r.href} target="_blank" rel="noopener noreferrer" className="tarjeta-enlace inline-flex min-h-12 items-center gap-2.5 rounded-full bg-tinta py-1.5 pr-5 pl-2 text-[15px] font-semibold text-white hover:shadow-[0_10px_30px_rgb(0_0_0/0.18)]">
                      <span className="grid size-9 place-items-center rounded-full bg-white/14"><IconoRed red={r.red} size={18} /></span>
                      {r.estadisticas ? <>{r.usuario}<span aria-hidden className="cifra font-medium text-white/65">· {r.estadisticas.seguidores}</span></> : r.usuario}
                      <span className="sr-only">{r.estadisticas ? ` en ${r.nombre}, ${r.estadisticas.seguidores} seguidores` : ` en ${r.nombre}`} (se abre en otra pestaña)</span>
                    </a>
                  </li>
                ))}
                <li>
                  <a href="#tryvex-tech" className="tarjeta-enlace inline-flex min-h-12 items-center gap-2.5 rounded-full bg-papel py-1.5 pr-5 pl-2 text-[15px] font-semibold whitespace-nowrap text-tinta ring-1 ring-borde hover:shadow-[0_10px_30px_rgb(0_0_0/0.12)] hover:ring-tinta">
                    <span className="grid size-9 place-items-center rounded-full bg-tinta text-white"><Icono trazo="software" size={18} /></span>
                    Tryvex Tech
                    <span className="hidden font-medium text-tinta-suave t:inline">· agencia de software</span>
                  </a>
                </li>
              </ul>
            </div>

            <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
              {email || whatsapp ? (
                <>
                  {email && (
                    <div className="medalla-marco relative mt-7">
                      <span aria-hidden className="medalla absolute -top-9 right-5 z-10 block size-[84px] overflow-hidden rounded-full bg-[#fdf9f0] shadow-[0_14px_34px_rgb(0_0_0/0.28)] ring-4 ring-papel-alt t:-top-11 t:right-7 t:size-[104px]">
                        <Image src="/marca/tryvex-tx.webp" alt="" fill sizes="(min-width: 735px) 104px, 84px" className="object-cover" />
                      </span>
                    <div className="relative isolate overflow-hidden rounded-[28px] bg-tinta p-7 text-white t:p-8">
                      <span aria-hidden className="absolute -top-16 -right-16 -z-10 size-56 rounded-full bg-[radial-gradient(closest-side,rgb(255_255_255/14%),transparent)]" />
                      <span className="grid size-12 place-items-center rounded-full bg-white/12"><Icono trazo="correo" /></span>
                      <p className="mt-6 text-[13px] font-semibold tracking-etiqueta text-white/60 uppercase">Correo electrónico</p>
                      <p className="mt-1.5 text-[24px] leading-tight font-semibold tracking-tarjeta break-all t:text-[28px]">{emailVisible}</p>
                      <div className="mt-7 flex flex-wrap gap-2.5">
                        {/* `mailto:` solo funciona si el equipo tiene una app de correo configurada: en un
                            escritorio sin ella el clic no hace nada. Por eso, donde hay cursor, el botón abre
                            la redacción de Gmail (el buzón es de Gmail) con el destinatario puesto; en el
                            teléfono queda el `mailto:`, que abre la app de correo del aparato. */}
                        <div className="solo-tactil">
                          <a href={`mailto:${email}`} className="tienda-boton bg-white text-tinta hover:bg-white/85">Escribir un correo</a>
                        </div>
                        <div className="solo-cursor">
                          <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`} target="_blank" rel="noopener noreferrer" className="tienda-boton bg-white text-tinta hover:bg-white/85">
                            Escribir en Gmail<span className="sr-only"> (se abre en otra pestaña)</span>
                          </a>
                        </div>
                        {/* Se copia la misma dirección a la que apunta «Escribir un correo»: el buzón que el equipo lee. */}
                        <CopiarCorreo correo={email} className="tienda-boton gap-2 text-white ring-1 ring-white/30 ring-inset hover:bg-white/10" />
                      </div>
                    </div>
                    </div>
                  )}
                  {whatsapp && (
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer" className="tarjeta-enlace flex items-center gap-4 rounded-[24px] bg-papel p-5 ring-1 ring-borde/70 hover:shadow-[0_10px_30px_rgb(0_0_0/0.08)] hover:ring-tinta t:p-6">
                      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-verde/10 text-verde"><Icono trazo="chat" /></span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-semibold tracking-etiqueta text-gris uppercase">WhatsApp</span>
                        <span className="mt-0.5 block text-[19px] font-semibold text-tinta">Abrir conversación</span>
                      </span>
                      <span aria-hidden className="flecha ml-auto text-[20px] text-gris">↗</span>
                      <span className="sr-only">(se abre en otra pestaña)</span>
                    </a>
                  )}
                </>
              ) : (
                <p className="rounded-[24px] bg-papel p-6 text-tinta-suave ring-1 ring-borde/70">Los canales de contacto se mostrarán aquí cuando estén configurados.</p>
              )}
            </div>
          </div>
        </section>

        {/* ── Redes: con peso propio, justo después de la portada ── */}
        <section aria-labelledby="redes-titulo" className="mx-auto w-full max-w-[1204px] px-[22px] pb-14 t:pb-20">
          <h2 id="redes-titulo" className="text-[32px] leading-[1.05] font-semibold tracking-seccion text-tinta t:text-[44px]">Síguenos.</h2>
          <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-tinta-suave">Novedades, llegadas y ofertas, primero en nuestras redes.</p>
          <div className="mt-9 grid grid-cols-[minmax(0,1fr)] gap-3 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
            {tiktok && tiktok.estadisticas && (
              <a href={tiktok.href} target="_blank" rel="noopener noreferrer" className="tarjeta-enlace relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-[28px] bg-tinta p-7 text-white hover:shadow-[0_18px_44px_rgb(0_0_0/0.22)] t:p-10">
                <span aria-hidden className="absolute -top-20 -right-20 -z-10 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(229_57_53/38%),transparent)]" />
                <span aria-hidden className="absolute -bottom-28 -left-16 -z-10 size-80 rounded-full bg-[radial-gradient(closest-side,rgb(90_200_250/22%),transparent)]" />
                <span className="flex items-center gap-3 t:gap-4">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-full bg-[#fdf9f0] ring-1 ring-white/20 t:size-20"><Image src="/marca/tryvex-tx.webp" alt="Logo de Tryvex" fill sizes="(min-width: 735px) 80px, 56px" className="object-cover" /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-[clamp(17px,5.4vw,20px)] leading-tight font-semibold tracking-tarjeta t:text-[22px]">{tiktok.usuario}</span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-[14px] text-white/65"><IconoRed red="tiktok" size={14} />TikTok</span>
                  </span>
                  <span aria-hidden className="flecha ml-auto self-start text-[22px] text-white/60">↗</span>
                </span>
                <dl className="mt-9 grid grid-cols-[minmax(0,1fr)] gap-6 t:grid-cols-2">
                  <div className="flex flex-col-reverse">
                    <dt className="mt-2 text-[14px] font-medium text-white/65">Seguidores</dt>
                    <dd className="cifra text-[44px] leading-none font-semibold tracking-titulo t:text-[64px]">{tiktok.estadisticas.seguidores}</dd>
                  </div>
                  <div className="flex flex-col-reverse">
                    <dt className="mt-2 text-[14px] font-medium text-white/65">Me gusta</dt>
                    <dd className="cifra text-[44px] leading-none font-semibold tracking-titulo t:text-[64px]">{tiktok.estadisticas.meGusta}</dd>
                  </div>
                </dl>
                <p className="mt-7 max-w-[40ch] text-[16px] leading-relaxed text-white/75">Tecnología de alta rotación, al por mayor y al detalle.</p>
                <span className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-8">
                  <span className="inline-flex min-h-11 items-center rounded-full bg-white px-5 text-[16px] font-medium text-tinta">Seguir en TikTok</span>
                  <span className="text-[12px] text-white/50">Cifras de TikTok al {tiktok.estadisticas.al}</span>
                </span>
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            )}
            {instagram && (
              <a href={instagram.href} target="_blank" rel="noopener noreferrer" className="tarjeta-enlace relative isolate flex min-h-[340px] flex-col overflow-hidden rounded-[28px] bg-papel p-7 ring-1 ring-borde/70 hover:shadow-[0_18px_44px_rgb(0_0_0/0.12)] hover:ring-tinta t:p-10">
                <span aria-hidden className="absolute -top-16 -right-16 -z-10 size-64 rounded-full bg-[radial-gradient(closest-side,rgb(229_57_53/12%),transparent)]" />
                <span className="flex items-start justify-between">
                  <span className="grid size-16 place-items-center rounded-full bg-tinta text-white"><IconoRed red="instagram" size={30} /></span>
                  <span aria-hidden className="flecha text-[22px] text-gris">↗</span>
                </span>
                <span className="mt-9 block text-[14px] font-semibold tracking-etiqueta text-gris uppercase">Instagram</span>
                <span className="mt-1 block truncate text-[clamp(22px,7vw,28px)] leading-tight font-semibold tracking-tarjeta text-tinta t:text-[34px]">{instagram.usuario}</span>
                <p className="mt-4 max-w-[30ch] text-[16px] leading-relaxed text-tinta-suave">Lo nuevo, las llegadas y las ofertas, en fotos y en historias.</p>
                <span className="mt-auto pt-8"><span className="inline-flex min-h-11 items-center rounded-full bg-tinta px-5 text-[16px] font-medium text-white">Seguir en Instagram</span></span>
                <span className="sr-only">(se abre en otra pestaña)</span>
              </a>
            )}
          </div>
        </section>

        {/* ── Atajos: lo más consultado, a un toque ── */}
        <section aria-labelledby="atajos-titulo" className="border-y border-borde/70 bg-papel">
          <div className="mx-auto w-full max-w-[1204px] px-[22px] py-14 t:py-20">
            <h2 id="atajos-titulo" className="text-[32px] leading-[1.05] font-semibold tracking-seccion text-tinta t:text-[44px]">Quizá ya está aquí.</h2>
            <p className="mt-3 max-w-[46ch] text-[17px] leading-relaxed text-tinta-suave">Lo que más nos preguntan, sin tener que esperar respuesta.</p>
            <ul className="mt-9 grid grid-cols-[minmax(0,1fr)] gap-3 t:grid-cols-2 d:grid-cols-4">
              {ATAJOS.map((a) => (
                <li key={a.href}>
                  <Link href={a.href} className="tarjeta-enlace group flex h-full min-h-[172px] flex-col rounded-[24px] bg-papel-alt p-6 ring-1 ring-transparent hover:bg-papel hover:shadow-[0_10px_30px_rgb(0_0_0/0.08)] hover:ring-borde">
                    <span className="flex items-start justify-between text-tinta">
                      <Icono trazo={a.icono} size={30} />
                      <span aria-hidden className="flecha text-[20px] text-gris">↗</span>
                    </span>
                    <span className="mt-auto pt-6">
                      <span className="block text-[19px] leading-tight font-semibold tracking-tarjeta text-tinta">{a.titulo}</span>
                      <span className="mt-1 block text-[15px] leading-snug text-tinta-suave">{a.texto}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Tryvex Tech: la agencia de software detrás de esta tienda. Con peso propio y
            sus servicios a la vista, pero al final: la compra va primero. */}
        <section id="tryvex-tech" aria-labelledby="tech-titulo" className="mx-auto w-full max-w-[1204px] scroll-mt-28 px-[22px] pb-16 t:pb-24">
          <div className="relative isolate overflow-hidden rounded-[32px] bg-black p-7 text-white t:p-12 lg:p-14">
            <span aria-hidden className="absolute -top-28 -right-24 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(90_200_250/42%),transparent)]" />
            <span aria-hidden className="absolute -bottom-32 -left-20 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(175_82_222/34%),transparent)]" />
            <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:items-center lg:gap-14">
              <div>
                <p className="text-[13px] font-semibold tracking-etiqueta text-[#7fd4ff] uppercase">Tryvex Tech · Agencia de software</p>
                <h2 id="tech-titulo" className="mt-4 max-w-[16ch] text-[34px] leading-[1.04] font-semibold tracking-seccion text-balance t:text-[52px]">¿Tu negocio necesita una web como esta?</h2>
                <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-white/75 t:text-[18px]">
                  Somos la agencia que diseñó y programó esta tienda. Hacemos software, automatizaciones, páginas web y posicionamiento para negocios que quieren vender más y trabajar menos.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <a href={TRYVEX_TECH.sitio} target="_blank" rel="noopener noreferrer" className="tienda-boton bg-white text-black hover:bg-white/85">
                    Conoce Tryvex Tech<span className="sr-only"> (se abre en otra pestaña)</span>
                  </a>
                  <a href={TRYVEX_TECH.redes[1].href} target="_blank" rel="noopener noreferrer" className="tienda-boton text-white ring-1 ring-white/30 ring-inset hover:bg-white/10">
                    Ver todos los enlaces<span className="sr-only"> (se abre en otra pestaña)</span>
                  </a>
                </div>
              </div>

              <ul className="grid grid-cols-[minmax(0,1fr)] gap-3 t:grid-cols-2">
                {SERVICIOS_TECH.map((x) => (
                  <li key={x.titulo} className="rounded-[22px] bg-white/[0.07] p-5 ring-1 ring-white/12 backdrop-blur-sm t:p-6">
                    <span className="grid size-11 place-items-center rounded-full bg-white/12 text-[#7fd4ff]"><Icono trazo={x.icono} size={22} /></span>
                    <p className="mt-5 text-[18px] leading-tight font-semibold tracking-tarjeta">{x.titulo}</p>
                    <p className="mt-1.5 text-[14px] leading-snug text-white/65">{x.texto}</p>
                  </li>
                ))}
              </ul>
            </div>

            <ul className="mt-10 flex flex-wrap gap-2 border-t border-white/15 pt-6">
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
          </div>
        </section>
      </main>

      <PieTienda nombre={configuracion?.nombre_tienda ?? 'Tryvex'} email={configuracion?.email_contacto ?? null} emailVisible={configuracion?.email_visible ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}
