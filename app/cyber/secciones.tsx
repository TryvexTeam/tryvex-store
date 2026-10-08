import Image from 'next/image'
import type { ReactNode } from 'react'
import type { CategoriaTienda, ProductoTienda } from '@/lib/tienda'
import { CardProducto } from '@/components/tienda/card-producto'
import { clp } from '@/lib/formato'
import { PACKS_CYBER, copyCyber, type PackCyber, type PreguntaCyber } from '@/lib/cyber'
import { EnlaceMedido, IconoWhatsapp, ZonaProductos } from './rastreo'

/**
 * Secciones de /cyber, de servidor. Mismo lenguaje visual que la tienda
 * (papel, tinta, tarjetas de 18 px, botones píldora) con el rojo `spark` como
 * acento de urgencia. Cada CTA mide su clic con `EnlaceMedido`.
 */

const BOTON_PRIMARIO = 'tienda-boton bg-spark text-[16px] font-semibold text-white hover:bg-spark-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta'
const BOTON_SECUNDARIO = 'tienda-boton bg-papel text-[16px] font-semibold text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta'
const BOTON_OSCURO = 'tienda-boton bg-tinta text-[16px] font-semibold text-white hover:bg-tinta/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark'

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-spark">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function Encabezado({ id, etiqueta, titulo, bajada, centrado = false }: { id: string; etiqueta?: string; titulo: string; bajada?: string; centrado?: boolean }) {
  return (
    <div className={centrado ? 'mx-auto max-w-[680px] text-center' : 'max-w-[680px]'}>
      {etiqueta && <p className="text-[13px] font-semibold tracking-[0.12em] text-spark uppercase">{etiqueta}</p>}
      <h2 id={id} className="mt-1 text-[28px] leading-[1.1] font-semibold tracking-seccion text-balance text-tinta t:text-[38px]">{titulo}</h2>
      {bajada && <p className="mt-2 text-[16px] leading-relaxed text-tinta-suave t:text-[17px]">{bajada}</p>}
    </div>
  )
}

/* 1 · Barra superior ------------------------------------------------------ */

export function BarraCyber({ envio }: { envio: string }) {
  return (
    <aside aria-label="Cyber Tryvex" className="bg-tinta px-4 text-white">
      <div className="mx-auto flex min-h-11 max-w-[1204px] flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[13px] leading-snug">
        <p className="font-medium">
          <span className="mr-1.5 inline-block size-2 rounded-full bg-spark align-middle" aria-hidden />
          {copyCyber.barra}
          <span className="hidden d:inline"> · {envio} · Pago seguro</span>
        </p>
        <EnlaceMedido href="#ofertas" evento="CyberBarCTA_Click" className="inline-flex min-h-8 items-center font-semibold underline decoration-white/70 underline-offset-2 hover:decoration-white">
          Ver ofertas →
        </EnlaceMedido>
      </div>
    </aside>
  )
}

/* 3 · Hero ------------------------------------------------------------------ */

export function HeroCyber({ productos, whatsappMayorista, envio }: { productos: ProductoTienda[]; whatsappMayorista: string; envio: string }) {
  const vitrina = productos.slice(0, 4)
  return (
    <section aria-labelledby="cyber-titulo" className="px-[var(--canal)] pt-6 pb-10 t:pt-10 t:pb-14">
      <div className="mx-auto grid max-w-[1204px] items-center gap-8 n:grid-cols-[1.05fr_1fr] n:gap-12">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-spark-suave px-3 py-1 text-[13px] font-semibold text-spark">
            <span className="size-2 rounded-full bg-spark" aria-hidden /> {copyCyber.insignia}
          </p>
          <h1 id="cyber-titulo" className="mt-4 text-[44px] leading-[1] font-semibold tracking-mega text-balance text-tinta t:text-[60px] d:text-[72px]">
            {copyCyber.titulo}
          </h1>
          <p className="mt-4 text-[20px] leading-snug font-semibold tracking-cuerpo text-balance text-tinta t:text-[24px]">{copyCyber.subtitulo}</p>
          <p className="mt-3 max-w-[46ch] text-[16px] leading-relaxed text-tinta-suave t:text-[17px]">{copyCyber.texto}</p>
          <ul className="mt-5 grid grid-cols-2 gap-x-4 gap-y-2 text-[15px] font-medium text-tinta">
            {['Mayorista + detalle', envio, 'Pago seguro', 'Stock sujeto a disponibilidad'].map((b) => (
              <li key={b} className="flex items-start gap-2"><Check />{b}</li>
            ))}
          </ul>
          <div id="cyber-ctas" className="mt-7 flex flex-col gap-3 t:flex-row">
            <EnlaceMedido href="#ofertas" evento="CyberHeroCTA_Click" className={`${BOTON_PRIMARIO} !min-h-[52px] t:px-8`}>
              {copyCyber.ctaOfertas}
            </EnlaceMedido>
            <EnlaceMedido href={whatsappMayorista} evento="CyberWholesaleCTA_Click" estandar="Lead" className={`${BOTON_SECUNDARIO} !min-h-[52px] gap-2 t:px-8`}>
              <IconoWhatsapp /> Pedir lista mayorista
            </EnlaceMedido>
          </div>
        </div>

        {vitrina.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 t:gap-4" aria-label="Algunas ofertas">
            {vitrina.map((p, i) => (
              <li key={p.id}>
                <a href={p.href} className="group relative flex aspect-square flex-col overflow-hidden rounded-[18px] bg-papel p-3 ring-1 ring-borde/60 transition-shadow hover:shadow-alzado t:p-4">
                  {p.precioAntes && (
                    <span className="absolute top-3 left-3 z-10 rounded-full bg-spark px-2 py-0.5 text-[12px] font-semibold text-white">
                      -{Math.floor((1 - p.precio / p.precioAntes) * 100)}%
                    </span>
                  )}
                  <span className="relative flex-1">
                    <Image
                      src={p.imagen!}
                      alt={p.nombre}
                      fill
                      priority={i === 0}
                      fetchPriority={i === 0 ? 'high' : undefined}
                      sizes="(min-width: 1069px) 280px, (min-width: 834px) 22vw, 45vw"
                      className="object-contain transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  </span>
                  <span className="mt-2 line-clamp-1 text-[13px] font-semibold text-tinta t:text-[14px]">{p.nombre}</span>
                  <span className="cifra text-[13px] text-tinta-suave t:text-[14px]">{clp(p.precio)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

/* 4 · Confianza ------------------------------------------------------------- */

const TRAZOS = {
  envio: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  garantia: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4',
  retracto: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4M12 8v4l3 2',
  pago: 'M3 6h18v12H3zM3 10h18M7 15h3',
}

export function ConfianzaCyber({ envio }: { envio: string }) {
  const items: { trazo: string; titulo: string; texto: string }[] = [
    { trazo: TRAZOS.envio, titulo: envio, texto: 'Despachos disponibles.' },
    { trazo: TRAZOS.garantia, titulo: 'Garantía de 6 meses', texto: 'Garantía legal desde que lo recibes.' },
    { trazo: TRAZOS.retracto, titulo: '10 días para arrepentirte', texto: 'Según las condiciones de la tienda.' },
    { trazo: TRAZOS.pago, titulo: 'Pago seguro', texto: 'Mercado Pago o transferencia.' },
  ]
  return (
    <section aria-labelledby="confianza-titulo" className="px-[var(--canal)]">
      <h2 id="confianza-titulo" className="sr-only">Compra online con respaldo</h2>
      <ul className="mx-auto grid max-w-[1204px] grid-cols-2 gap-3 d:grid-cols-4">
        {items.map((it) => (
          <li key={it.titulo} className="flex flex-col gap-2 rounded-[18px] bg-papel p-4 ring-1 ring-borde/60 t:flex-row t:items-start t:gap-3 t:p-5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-spark"><path d={it.trazo} /></svg>
            <span>
              <span className="block text-[15px] leading-tight font-semibold text-tinta">{it.titulo}</span>
              <span className="mt-1 block text-[13px] leading-snug text-tinta-suave">{it.texto}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* 5 · Top ofertas ----------------------------------------------------------- */

export function OfertasCyber({ productos }: { productos: ProductoTienda[] }) {
  if (productos.length === 0) return null
  return (
    <section id="ofertas" aria-labelledby="ofertas-titulo" className="scroll-mt-20 px-[var(--canal)] pt-14 t:pt-20">
      <div className="mx-auto max-w-[1204px]">
        <div className="flex flex-col gap-4 t:flex-row t:items-end t:justify-between">
          <Encabezado id="ofertas-titulo" etiqueta="Cyber Tryvex" titulo="Top ofertas Cyber" bajada="Productos seleccionados con stock sujeto a disponibilidad." />
          <EnlaceMedido href="/tienda?ofertas=1&disponibles=1" evento="CyberAllOffers_Click" className="text-[15px] font-semibold text-spark underline-offset-2 hover:underline">
            Ver todas las ofertas →
          </EnlaceMedido>
        </div>
        <ZonaProductos productos={productos.map((p) => ({ href: p.href, sku: p.sku, nombre: p.nombre, precio: p.precio }))}>
          <ul className="mt-6 grid grid-cols-2 gap-3 t:gap-4 d:grid-cols-4">
            {productos.map((p) => (
              <li key={p.id} className="min-w-0">
                <CardProducto producto={p} fluida transicion={false} />
              </li>
            ))}
          </ul>
        </ZonaProductos>
      </div>
    </section>
  )
}

/* 6 · Compra por objetivo -------------------------------------------------- */

export function ObjetivoCyber({ whatsappMayorista, regalo }: { whatsappMayorista: string; regalo: string }) {
  const tarjetas: { titulo: string; texto: string; cta: string; href: string; evento: string; estandar?: 'Lead' }[] = [
    { titulo: 'Comprar para mí', texto: 'Productos tech para uso diario, regalo o renovación de accesorios.', cta: 'Ver productos al detalle', href: '#ofertas', evento: 'CyberIntent_Detail_Click' },
    { titulo: 'Comprar para regalar', texto: 'Audífonos, relojes y accesorios fáciles de regalar.', cta: 'Ver ideas de regalo', href: regalo, evento: 'CyberIntent_Gift_Click' },
    { titulo: 'Comprar para revender', texto: 'Productos de alta rotación para emprendedores.', cta: 'Pedir lista mayorista', href: whatsappMayorista, evento: 'CyberIntent_Wholesale_Click', estandar: 'Lead' },
  ]
  return (
    <section aria-labelledby="objetivo-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[1204px]">
        <Encabezado id="objetivo-titulo" titulo="¿Qué estás buscando hoy?" bajada="Compra tecnología para todos los días: productos prácticos, modernos y fáciles de usar." />
        <ul className="mt-6 grid gap-3 t:grid-cols-3 t:gap-4">
          {tarjetas.map((t, i) => (
            <li key={t.titulo} className={`flex flex-col rounded-[18px] p-6 ring-1 t:p-7 ${i === 2 ? 'bg-tinta text-white ring-tinta' : 'bg-papel text-tinta ring-borde/60'}`}>
              <h3 className="text-[21px] leading-tight font-semibold tracking-tarjeta">{t.titulo}</h3>
              <p className={`mt-2 flex-1 text-[15px] leading-relaxed ${i === 2 ? 'text-white/75' : 'text-tinta-suave'}`}>{t.texto}</p>
              <EnlaceMedido href={t.href} evento={t.evento} estandar={t.estandar} className={`mt-5 self-start ${i === 2 ? BOTON_PRIMARIO : BOTON_OSCURO}`}>
                {t.cta}
              </EnlaceMedido>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 7 · Packs ---------------------------------------------------------------- */

export function PacksCyber({ hrefDe }: { hrefDe: (p: PackCyber) => string | null }) {
  const packs = PACKS_CYBER.flatMap((p) => {
    const href = hrefDe(p)
    return href ? [{ ...p, href }] : []
  })
  if (packs.length === 0) return null
  return (
    <section aria-labelledby="packs-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[1204px]">
        <Encabezado id="packs-titulo" etiqueta="Packs Cyber Tryvex" titulo="Packs para comprar, regalar o revender" bajada="Elige según tu objetivo y consulta disponibilidad." />
        <ul className="mt-6 grid grid-cols-1 gap-3 t:grid-cols-2 t:gap-4 d:grid-cols-4">
          {packs.map((p) => (
            <li key={p.id} className="flex flex-col rounded-[18px] bg-papel p-6 ring-1 ring-borde/60">
              <p className="text-[12px] font-semibold tracking-[0.1em] text-spark uppercase">{p.contenido}</p>
              <h3 className="mt-2 text-[20px] leading-tight font-semibold tracking-tarjeta text-tinta">{p.titulo}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-relaxed text-tinta-suave">{p.frase}</p>
              <EnlaceMedido
                href={p.href}
                evento="CyberPack_Click"
                estandar={'whatsapp' in p.destino ? 'Lead' : undefined}
                parametros={{ content_name: p.titulo }}
                className={`mt-5 self-start ${'whatsapp' in p.destino ? BOTON_PRIMARIO : BOTON_SECUNDARIO} !text-[15px]`}
              >
                {p.cta}
              </EnlaceMedido>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 8 · Mayorista ------------------------------------------------------------ */

export function MayoristaCyber({ whatsappMayorista, revender, desde }: { whatsappMayorista: string; revender: string; desde: number | null }) {
  const bullets = [
    'Productos de alta rotación.',
    'Mayorista + detalle.',
    'Ideal para vender por Instagram, TikTok, WhatsApp o Marketplace.',
    desde ? `Precios por cantidad desde ${desde} unidades.` : 'Consulta precios por cantidad.',
    'Stock sujeto a disponibilidad.',
  ]
  return (
    <section id="mayorista" aria-labelledby="mayorista-titulo" className="scroll-mt-20 px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto grid max-w-[1204px] gap-8 overflow-hidden rounded-[28px] bg-tinta px-6 py-10 text-white t:px-12 t:py-14 n:grid-cols-[1.2fr_1fr] n:items-center">
        <div>
          <p className="text-[13px] font-semibold tracking-[0.12em] text-[#ff8a80] uppercase">Mayorista</p>
          <h2 id="mayorista-titulo" className="mt-2 text-[30px] leading-[1.08] font-semibold tracking-seccion text-balance t:text-[42px]">¿Quieres emprender vendiendo tecnología?</h2>
          <p className="mt-3 max-w-[48ch] text-[16px] leading-relaxed text-white/75 t:text-[17px]">
            Pide lista mayorista y arma tu primer catálogo con productos fáciles de mostrar y vender por redes.
          </p>
          <div className="mt-7 flex flex-col gap-3 t:flex-row">
            <EnlaceMedido href={whatsappMayorista} evento="CyberWholesaleLead_Click" estandar="Lead" className={`${BOTON_PRIMARIO} !min-h-[52px] gap-2 t:px-8`}>
              <IconoWhatsapp /> Pedir lista mayorista
            </EnlaceMedido>
            <EnlaceMedido href={revender} evento="CyberResell_Click" className="tienda-boton !min-h-[52px] text-[16px] font-semibold text-white ring-1 ring-white/40 ring-inset hover:bg-white/10 t:px-8">
              Ver productos para revender
            </EnlaceMedido>
          </div>
        </div>
        <ul className="grid gap-3">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 rounded-[14px] bg-white/[0.06] px-4 py-3 text-[15px] leading-snug text-white/90">
              <Check />{b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 9 · Categorías ------------------------------------------------------------ */

export function CategoriasCyber({ categorias }: { categorias: CategoriaTienda[] }) {
  if (categorias.length === 0) return null
  return (
    <section aria-labelledby="categorias-cyber-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[1204px]">
        <Encabezado id="categorias-cyber-titulo" titulo="Top categorías" bajada="Entra directo a lo que buscas." />
        <ul className="mt-6 grid grid-cols-2 gap-3 t:grid-cols-4 d:grid-cols-7">
          {categorias.map((c) => {
            const foto = c.imagen ?? c.productos.find((p) => p.imagen)?.imagen ?? null
            return (
              <li key={c.id}>
                <EnlaceMedido
                  href={`/tienda?cat=${encodeURIComponent(c.slug)}`}
                  evento="CyberCategory_Click"
                  parametros={{ category_name: c.nombre }}
                  className="group flex h-full flex-col items-center gap-2 rounded-[18px] bg-papel p-4 text-center ring-1 ring-borde/60 transition-shadow hover:shadow-alzado"
                >
                  <span className="relative block size-20">
                    {foto && <Image src={foto} alt="" fill sizes="128px" loading="lazy" className="object-contain transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none" />}
                  </span>
                  <span className="text-[14px] leading-tight font-semibold text-tinta">{c.nombre}</span>
                </EnlaceMedido>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}

/* 11 · Cómo comprar --------------------------------------------------------- */

export function ComoComprarCyber({ whatsappStock }: { whatsappStock: string }) {
  const pasos = [
    ['Elige tu producto', 'Revisa las ofertas o escríbenos para ver el catálogo.'],
    ['Agrégalo a la bolsa', 'O pide la lista mayorista por WhatsApp.'],
    ['Paga seguro', 'Con Mercado Pago o transferencia bancaria.'],
    ['Recibe tu pedido', 'Despacho a domicilio o coordina la entrega.'],
  ]
  return (
    <section id="como-comprar" aria-labelledby="como-titulo" className="scroll-mt-20 px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[1204px]">
        <Encabezado id="como-titulo" titulo="Comprar en Tryvex es simple" />
        <ol className="mt-6 grid gap-3 t:grid-cols-2 d:grid-cols-4">
          {pasos.map(([titulo, texto], i) => (
            <li key={titulo} className="rounded-[18px] bg-papel p-5 ring-1 ring-borde/60">
              <span className="cifra grid size-9 place-items-center rounded-full bg-spark-suave text-[15px] font-semibold text-spark" aria-hidden>{i + 1}</span>
              <h3 className="mt-3 text-[17px] font-semibold text-tinta"><span className="sr-only">Paso {i + 1}: </span>{titulo}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-6 flex flex-col gap-3 t:flex-row">
          <EnlaceMedido href="#ofertas" evento="CyberHowToBuyCTA_Click" parametros={{ boton: 'ofertas' }} className={BOTON_OSCURO}>Ver ofertas</EnlaceMedido>
          <EnlaceMedido href={whatsappStock} evento="CyberHowToBuyCTA_Click" estandar="Contact" parametros={{ boton: 'whatsapp' }} className={`${BOTON_SECUNDARIO} gap-2`}>
            <IconoWhatsapp /> Consultar por WhatsApp
          </EnlaceMedido>
        </div>
      </div>
    </section>
  )
}

/* 12 · FAQ ------------------------------------------------------------------ */

export function FaqCyber({ preguntas }: { preguntas: PreguntaCyber[] }) {
  return (
    <section aria-labelledby="faq-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[820px]">
        <Encabezado id="faq-titulo" titulo="Preguntas frecuentes" centrado />
        <div className="mt-6 divide-y divide-borde/70 rounded-[18px] bg-papel ring-1 ring-borde/60">
          {preguntas.map((p) => (
            <details key={p.pregunta} className="group px-5 t:px-6">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark [&::-webkit-details-marker]:hidden">
                {p.pregunta}
                <span aria-hidden className="text-[22px] leading-none text-gris transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-tinta-suave">{p.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* 13 · CTA final ------------------------------------------------------------ */

export function CierreCyber({ whatsappMayorista, children }: { whatsappMayorista: string; children?: ReactNode }) {
  return (
    <section aria-labelledby="cierre-cyber-titulo" className="px-[var(--canal)] pt-16 pb-16 t:pt-24 t:pb-24">
      <div className="mx-auto max-w-[1204px] rounded-[28px] bg-[#f6efe6] px-6 py-12 text-center t:py-16">
        <h2 id="cierre-cyber-titulo" className="mx-auto max-w-[18ch] text-[32px] leading-[1.05] font-semibold tracking-seccion text-balance text-tinta t:text-[46px]">{copyCyber.tituloFinal}</h2>
        <p className="mx-auto mt-3 max-w-[44ch] text-[16px] text-tinta-suave t:text-[18px]">{copyCyber.bajadaFinal}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 t:flex-row">
          <EnlaceMedido href="#ofertas" evento="CyberFinalCTA_Click" className={`${BOTON_PRIMARIO} !min-h-[52px] t:px-8`}>Ver ofertas</EnlaceMedido>
          <EnlaceMedido href={whatsappMayorista} evento="CyberWholesaleCTA_Click" estandar="Lead" parametros={{ ubicacion: 'cierre' }} className={`${BOTON_SECUNDARIO} !min-h-[52px] gap-2 t:px-8`}>
            <IconoWhatsapp /> Pedir lista mayorista
          </EnlaceMedido>
        </div>
        {children}
      </div>
    </section>
  )
}
