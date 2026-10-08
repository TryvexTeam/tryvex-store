import Image from 'next/image'
import type { CSSProperties } from 'react'
import type { CategoriaTienda, ProductoTienda } from '@/lib/tienda'
import { CardProducto } from '@/components/tienda/card-producto'
import { FilaCategorias } from '@/components/tienda/fila-categorias'
import { clp } from '@/lib/formato'
import { copyCyber, type PackCyber, type PreguntaCyber } from '@/lib/cyber'
import { EnlaceMedido, IconoWhatsapp, ZonaCategorias, ZonaProductos } from './rastreo'

/**
 * Secciones de /cyber, de servidor, en el mismo mundo visual de la tienda:
 * papel y tinta, tarjetas de 18 px, botones píldora, el rojo `spark` solo como
 * acento de urgencia, y el movimiento de lectura de la portada (`revela`,
 * `revela-escala`, `cierre-revela`), que funciona sin JavaScript y se apaga con
 * movimiento reducido.
 *
 * Sin etiquetas en mayúsculas sobre los títulos ni filas de tarjetas iguales:
 * cada sección tiene su propia composición. Cada CTA mide su clic.
 */

const BOTON_PRIMARIO = 'tienda-boton bg-spark text-[16px] font-semibold text-white hover:bg-spark-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta'
const BOTON_SECUNDARIO = 'tienda-boton bg-papel text-[16px] font-semibold text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta'
const BOTON_OSCURO = 'tienda-boton bg-tinta text-[16px] font-semibold text-white hover:bg-tinta/85 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark'

const escalon = (i: number) => ({ '--i': `${i * 4}%` }) as CSSProperties

function Check() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="mt-0.5 shrink-0 text-spark">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  )
}

function Titulo({ id, titulo, bajada, centrado = false }: { id: string; titulo: string; bajada?: string; centrado?: boolean }) {
  return (
    <div className={`revela ${centrado ? 'mx-auto max-w-[680px] text-center' : 'max-w-[680px]'}`}>
      <h2 id={id} className="text-[28px] leading-[1.1] font-semibold tracking-seccion text-balance text-tinta t:text-[38px]">{titulo}</h2>
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
    <section aria-labelledby="cyber-titulo" className="px-[var(--canal)] pt-8 pb-10 t:pt-12 t:pb-14">
      <div className="mx-auto grid max-w-[1204px] items-center gap-8 n:grid-cols-[1.05fr_1fr] n:gap-12">
        <div>
          <h1 id="cyber-titulo" className="text-[44px] leading-[1] font-semibold tracking-mega text-balance text-tinta t:text-[60px] d:text-[72px]">
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
              <li key={p.id} className="revela-escala" style={escalon(i)}>
                <a href={p.href} className="tienda-marco group relative flex aspect-square flex-col overflow-hidden rounded-[18px] bg-papel p-3 t:p-4">
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
                      className="tienda-card-objeto object-contain"
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

/* 4 · Confianza: la misma franja de la portada ----------------------------- */

const TRAZOS = {
  envio: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM17.5 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  garantia: 'M12 3l7 3v5c0 4.5-3 8.3-7 10-4-1.7-7-5.5-7-10V6l7-3zM9 12l2 2 4-4',
  retracto: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4M12 8v4l3 2',
  pago: 'M3 6h18v12H3zM3 10h18M7 15h3',
}

export function ConfianzaCyber({ envio }: { envio: string }) {
  const items = [
    { trazo: TRAZOS.envio, texto: envio },
    { trazo: TRAZOS.garantia, texto: 'Garantía de 6 meses' },
    { trazo: TRAZOS.retracto, texto: '10 días para arrepentirte' },
    { trazo: TRAZOS.pago, texto: 'Pago seguro con Mercado Pago o transferencia' },
  ]
  return (
    <section aria-label="Compra online con respaldo" className="border-y border-borde/60 bg-papel">
      <ul className="mx-auto grid max-w-[1204px] grid-cols-2 gap-x-4 gap-y-3 px-[var(--canal)] py-5 d:grid-cols-4 d:px-0">
        {items.map((it) => (
          <li key={it.texto} className="flex items-center gap-2.5 text-[13px] leading-snug font-medium text-tinta-suave t:text-[14px] d:justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-spark"><path d={it.trazo} /></svg>
            {it.texto}
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
        <div className="flex flex-col gap-3 t:flex-row t:items-end t:justify-between">
          <Titulo id="ofertas-titulo" titulo="Top ofertas Cyber" bajada="Productos seleccionados con stock sujeto a disponibilidad." />
          <EnlaceMedido href="/tienda?ofertas=1&disponibles=1" evento="CyberAllOffers_Click" className="inline-flex min-h-11 items-center text-[15px] font-semibold text-tinta underline decoration-borde underline-offset-4 hover:decoration-tinta">
            Ver todas las ofertas
          </EnlaceMedido>
        </div>
        <ZonaProductos productos={productos.map((p) => ({ href: p.href, sku: p.sku, nombre: p.nombre, precio: p.precio }))}>
          <ul className="mt-6 grid grid-cols-2 gap-3 t:gap-4 d:grid-cols-4">
            {productos.map((p, i) => (
              <li key={p.id} className="revela-escala min-w-0" style={escalon(i % 4)}>
                <CardProducto producto={p} fluida transicion={false} />
              </li>
            ))}
          </ul>
        </ZonaProductos>
      </div>
    </section>
  )
}

/* 6 · Compra por objetivo: dos caminos claros y el mayorista en grande ------ */

export function ObjetivoCyber({ whatsappMayorista, regalo, fotos }: { whatsappMayorista: string; regalo: string; fotos: { src: string; alt: string }[] }) {
  const caminos = [
    { titulo: 'Comprar para mí', texto: 'Productos tech para uso diario, regalo o renovación de accesorios.', cta: 'Ver productos al detalle', href: '#ofertas', evento: 'CyberIntent_Detail_Click' },
    { titulo: 'Comprar para regalar', texto: 'Audífonos, relojes y accesorios fáciles de regalar.', cta: 'Ver ideas de regalo', href: regalo, evento: 'CyberIntent_Gift_Click' },
  ]
  return (
    <section aria-labelledby="objetivo-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[1204px]">
        <Titulo id="objetivo-titulo" titulo="¿Qué estás buscando hoy?" />
        <div className="mt-6 grid gap-3 t:gap-4 d:grid-cols-[1fr_1.15fr]">
          <ul className="grid gap-3 t:grid-cols-2 t:gap-4 d:grid-cols-1">
            {caminos.map((c, i) => (
              <li key={c.titulo} className="revela-escala flex flex-col justify-between gap-5 rounded-[18px] bg-papel p-6 t:p-7" style={escalon(i)}>
                <div>
                  <h3 className="text-[21px] leading-tight font-semibold tracking-tarjeta text-tinta">{c.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">{c.texto}</p>
                </div>
                <EnlaceMedido href={c.href} evento={c.evento} className="inline-flex min-h-11 items-center self-start text-[15px] font-semibold text-tinta underline decoration-borde underline-offset-4 hover:decoration-tinta">
                  {c.cta} <span aria-hidden className="ml-1">→</span>
                </EnlaceMedido>
              </li>
            ))}
          </ul>
          <div className="revela-escala relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-[18px] bg-tinta p-6 text-white t:p-8" style={escalon(2)}>
            <div className="relative z-10 max-w-[30ch]">
              <h3 className="text-[26px] leading-tight font-semibold tracking-tarjeta t:text-[32px]">Comprar para revender</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-white/75">Productos de alta rotación para emprendedores. Precios por cantidad y stock sujeto a disponibilidad.</p>
            </div>
            {fotos.length > 0 && (
              <ul aria-hidden className="pointer-events-none my-6 flex items-end justify-center gap-2 t:absolute t:right-6 t:bottom-6 t:my-0 t:w-[48%] d:w-[52%]">
                {fotos.map((f, i) => (
                  <li key={f.src} className={`relative aspect-square flex-1 rounded-[14px] bg-white/[0.07] ${i === 1 ? 't:-translate-y-6' : ''}`}>
                    <Image src={f.src} alt="" fill sizes="(min-width: 1069px) 160px, 30vw" loading="lazy" className="object-contain p-2" />
                  </li>
                ))}
              </ul>
            )}
            <EnlaceMedido href={whatsappMayorista} evento="CyberIntent_Wholesale_Click" estandar="Lead" className={`${BOTON_PRIMARIO} relative z-10 gap-2 self-start`}>
              <IconoWhatsapp /> Pedir lista mayorista
            </EnlaceMedido>
          </div>
        </div>
      </div>
    </section>
  )
}

/* 7 · Packs: cada uno con una foto real de su categoría --------------------- */

export type PackVisible = PackCyber & { href: string; foto: string | null }

export function PacksCyber({ packs }: { packs: PackVisible[] }) {
  if (packs.length === 0) return null
  return (
    <section aria-labelledby="packs-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="mx-auto max-w-[1204px]">
        <Titulo id="packs-titulo" titulo="Packs para comprar, regalar o revender" bajada="Elige según tu objetivo y consulta disponibilidad." />
        <ul className="mt-6 grid gap-3 t:grid-cols-2 t:gap-4">
          {packs.map((p, i) => {
            const porWhatsapp = 'whatsapp' in p.destino
            return (
              <li
                key={p.id}
                // El botón va a todo el ancho de la tarjeta en el teléfono: en la columna
                // de texto, «Pedir precios por cantidad» se partía en dos líneas.
                className={`revela-escala grid min-h-[200px] overflow-hidden rounded-[18px] bg-papel ${p.foto ? 'grid-cols-[minmax(0,1fr)_34%] t:grid-cols-[minmax(0,1fr)_38%]' : 'grid-cols-1'}`}
                style={escalon(i % 2)}
              >
                <div className="min-w-0 px-6 pt-6">
                  <h3 className="text-[20px] leading-tight font-semibold tracking-tarjeta text-tinta">{p.titulo}</h3>
                  <p className="mt-1 text-[14px] font-medium text-gris">{p.contenido}</p>
                  <p className="mt-3 text-[15px] leading-relaxed text-tinta-suave">{p.frase}</p>
                </div>
                {p.foto && (
                  <div className="relative min-h-[120px] d:row-span-2">
                    <Image src={p.foto} alt="" fill sizes="(min-width: 735px) 220px, 34vw" loading="lazy" className="tienda-card-objeto object-contain p-4" />
                  </div>
                )}
                <div className="col-span-full self-end px-6 pt-5 pb-6 d:col-span-1">
                  <EnlaceMedido
                    href={p.href}
                    evento="CyberPack_Click"
                    estandar={porWhatsapp ? 'Lead' : undefined}
                    parametros={{ content_name: p.titulo }}
                    className={`${porWhatsapp ? BOTON_PRIMARIO : BOTON_OSCURO} !text-[15px] whitespace-nowrap`}
                  >
                    {p.cta}
                  </EnlaceMedido>
                </div>
              </li>
            )
          })}
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
        <div className="revela">
          <h2 id="mayorista-titulo" className="text-[30px] leading-[1.08] font-semibold tracking-seccion text-balance t:text-[42px]">¿Quieres emprender vendiendo tecnología?</h2>
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
        <ul className="divide-y divide-white/10 border-y border-white/10">
          {bullets.map((b) => (
            <li key={b} className="flex items-start gap-3 py-3.5 text-[15px] leading-snug text-white/90">
              <Check />{b}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

/* 9 · Categorías: la fila de familias de la tienda -------------------------- */

export function CategoriasCyber({ categorias }: { categorias: CategoriaTienda[] }) {
  if (categorias.length === 0) return null
  return (
    <section aria-labelledby="categorias-cyber-titulo" className="pt-16 t:pt-24">
      <div className="px-[var(--canal)]">
        <div className="mx-auto max-w-[1204px]">
          <Titulo id="categorias-cyber-titulo" titulo="Top categorías" />
        </div>
      </div>
      <div className="mt-3">
        <ZonaCategorias>
          <FilaCategorias categorias={categorias} activa={null} />
        </ZonaCategorias>
      </div>
    </section>
  )
}

/* 11 · Cómo comprar: una secuencia, no tarjetas ----------------------------- */

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
        <Titulo id="como-titulo" titulo="Comprar en Tryvex es simple" />
        <ol className="mt-8 grid gap-x-8 t:grid-cols-2 d:grid-cols-4">
          {pasos.map(([titulo, texto], i) => (
            <li key={titulo} className="revela border-t border-borde py-5" style={escalon(i)}>
              <span className="cifra text-[15px] font-semibold text-spark" aria-hidden>{i + 1}</span>
              <h3 className="mt-2 text-[18px] font-semibold text-tinta"><span className="sr-only">Paso {i + 1}: </span>{titulo}</h3>
              <p className="mt-1 text-[15px] leading-relaxed text-tinta-suave">{texto}</p>
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-col gap-3 t:flex-row">
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
        <Titulo id="faq-titulo" titulo="Preguntas frecuentes" centrado />
        <div className="mt-6 divide-y divide-borde/70 rounded-[18px] bg-papel ring-1 ring-borde/60">
          {preguntas.map((p) => (
            <details key={p.pregunta} className="group px-5 t:px-6">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[16px] font-semibold text-tinta focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark [&::-webkit-details-marker]:hidden">
                {p.pregunta}
                <span aria-hidden className="text-[22px] leading-none text-gris transition-transform duration-200 ease-salida group-open:rotate-45 motion-reduce:transition-none">+</span>
              </summary>
              <p className="pb-5 text-[15px] leading-relaxed text-tinta-suave">{p.respuesta}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

/* 13 · CTA final: el mismo gesto de cierre de la portada --------------------- */

export function CierreCyber({ whatsappMayorista }: { whatsappMayorista: string }) {
  return (
    <section aria-labelledby="cierre-cyber-titulo" className="px-[var(--canal)] pt-16 pb-16 t:pt-24 t:pb-24">
      <div className="cierre-revela mx-auto max-w-[1204px] rounded-[28px] bg-[#f6efe6] px-6 py-12 text-center t:py-16">
        <h2 id="cierre-cyber-titulo" className="mx-auto max-w-[18ch] text-[32px] leading-[1.05] font-semibold tracking-seccion text-balance text-tinta t:text-[46px]">{copyCyber.tituloFinal}</h2>
        <p className="mx-auto mt-3 max-w-[44ch] text-[16px] text-tinta-suave t:text-[18px]">{copyCyber.bajadaFinal}</p>
        <div className="mt-8 flex flex-col justify-center gap-3 t:flex-row">
          <EnlaceMedido href="#ofertas" evento="CyberFinalCTA_Click" className={`${BOTON_PRIMARIO} !min-h-[52px] t:px-8`}>Ver ofertas</EnlaceMedido>
          <EnlaceMedido href={whatsappMayorista} evento="CyberWholesaleCTA_Click" estandar="Lead" parametros={{ ubicacion: 'cierre' }} className={`${BOTON_SECUNDARIO} !min-h-[52px] gap-2 t:px-8`}>
            <IconoWhatsapp /> Pedir lista mayorista
          </EnlaceMedido>
        </div>
      </div>
    </section>
  )
}
