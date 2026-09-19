import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import { leerPromosHeroe, type ProductoTienda } from '@/lib/tienda'

/**
 * Escenas guiadas por el scroll (v15). Todo en CSS con `animation-timeline`:
 * corre fuera del hilo principal, sin listeners de scroll. Cada escena se
 * encuadra bajo la cabecera fija (`--alto-cabecera`) para que ocupe
 * exactamente la pantalla útil. Sin soporte o con movimiento reducido, las
 * escenas se ven completas y estáticas.
 */

/* ── Producto en foco ──────────────────────────────────────────────
   Escenario fijo durante un tramo alto: el producto sube, crece y gira,
   el halo se enciende, tres afirmaciones se relevan y una barra marca el
   avance. Al final aparece la compra. */
export async function ProductoFoco({ producto }: { producto: ProductoTienda | null }) {
  if (!producto?.imagen) return null
  const promo = await leerPromosHeroe()
  const afirmaciones = [
    { antes: 'Diseñados para', resaltado: 'acompañarte.' },
    promo.ahorroMaximo
      ? { antes: `Hasta ${promo.ahorroMaximo}% menos`, resaltado: 'comprando por volumen.' }
      : { antes: 'Precios claros,', resaltado: 'sin sorpresas.' },
    { antes: 'Envío a todo', resaltado: 'Chile.' },
  ]

  return (
    <section aria-labelledby="foco-titulo" className="foco-tramo relative mt-16 t:mt-24">
      <div className="foco-escenario escena-encuadre flex flex-col items-center justify-center overflow-hidden bg-black px-[22px] text-white">
        <span aria-hidden className="foco-halo pointer-events-none absolute inset-0" />
        <p className="foco-antetitulo relative text-[13px] font-semibold tracking-[0.12em] text-white/60 uppercase t:text-[15px]">{producto.nombre}</p>
        <h2 id="foco-titulo" className="sr-only">{afirmaciones.map((a) => `${a.antes} ${a.resaltado}`).join(' ')}</h2>
        <div aria-hidden className="foco-frases relative mt-3 grid w-full max-w-[18ch] place-items-center text-center font-semibold tracking-display">
          {afirmaciones.map((a, i) => (
            <p key={a.antes} className={`foco-frase foco-frase-${i + 1} col-start-1 row-start-1 text-balance`}>
              {a.antes} <span className="foco-degradado">{a.resaltado}</span>
            </p>
          ))}
        </div>
        <div className="foco-producto relative mt-4 aspect-square">
          <Image src={producto.imagen} alt="" fill sizes="(min-width: 735px) 560px, 70vw" className="object-contain" />
        </div>
        <Link href={producto.href} className="foco-cta tienda-boton relative mt-2 bg-white text-black hover:bg-white/85">
          Comprar desde <span className="cifra ml-1">{clp(producto.precio)}</span>
        </Link>
      </div>
    </section>
  )
}

/* ── Confianza en movimiento ───────────────────────────────────────
   Tras la escena negra del producto, un fondo claro con dos franjas de texto
   gigante que cruzan en sentidos opuestos a medida que se baja, y abajo las
   cuatro garantías concretas. Es el momento de dar seguridad antes de comprar. */
const FRANJA_A = ['Compra con confianza.', 'Compra con confianza.', 'Compra con confianza.']
const FRANJA_B = ['Garantía de 6 meses', 'Envío a todo Chile', '10 días de retracto', 'Pago seguro', 'Garantía de 6 meses', 'Envío a todo Chile']
const GARANTIAS = [
  { titulo: 'Garantía de 6 meses', texto: 'Si falla, lo reparamos, lo cambiamos o te devolvemos el dinero.', trazo: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3ZM9 12l2 2 4-4' },
  { titulo: 'Envío a todo Chile', texto: 'Conoces el costo y el plazo antes de pagar.', trazo: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' },
  { titulo: '10 días de retracto', texto: 'Si cambias de opinión, puedes devolverlo sin dar explicaciones.', trazo: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4' },
  { titulo: 'Pago seguro', texto: 'Transferencia o Mercado Pago. Tus datos nunca pasan por nosotros.', trazo: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5z' },
] as const

// overflow-x-clip y no overflow-hidden: hidden crea un contenedor de scroll y view() lo toma
// como referencia; como nunca se desplaza, la animación de las franjas quedaba inactiva.
export function ConfianzaEnMovimiento() {
  return (
    <section aria-labelledby="confianza-titulo" className="confianza-seccion relative overflow-x-clip bg-papel pt-20 pb-20 t:pt-28 t:pb-28">
      <h2 id="confianza-titulo" className="sr-only">Compra con confianza: garantía de 6 meses, envío a todo Chile, 10 días de retracto y pago seguro.</h2>
      <div aria-hidden className="flex flex-col gap-2 t:gap-4">
        <p className="confianza-franja confianza-franja-a flex w-max gap-[0.4em] text-[clamp(56px,11vw,168px)] leading-[1] font-semibold tracking-mega whitespace-nowrap text-tinta">
          {FRANJA_A.map((t, i) => <span key={i} className={i === 1 ? 'confianza-degradado' : ''}>{t}</span>)}
        </p>
        <p className="confianza-franja confianza-franja-b flex w-max gap-[0.9em] text-[clamp(28px,5vw,72px)] leading-[1.1] font-semibold tracking-display whitespace-nowrap text-gris">
          {FRANJA_B.map((t, i) => <span key={i} className="flex items-center gap-[0.9em]">{t}<span className="text-spark">·</span></span>)}
        </p>
      </div>
      <ul className="mx-auto mt-14 grid max-w-[1204px] gap-3 px-[22px] t:mt-20 t:grid-cols-2 d:grid-cols-4">
        {GARANTIAS.map((g, i) => (
          <li key={g.titulo} className="revela rounded-[24px] bg-papel-alt p-6" style={{ '--i': `${i * 6}%` } as CSSProperties}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-spark" aria-hidden><path d={g.trazo} /></svg>
            <p className="mt-4 text-[19px] font-semibold tracking-cuerpo">{g.titulo}</p>
            <p className="mt-1.5 text-[15px] leading-relaxed text-tinta-suave">{g.texto}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/* ── Titular eco ───────────────────────────────────────────────────
   La última palabra deja una estela que se despliega al entrar en vista. */
export function TituloEco() {
  return (
    <section aria-labelledby="eco-titulo" className="eco-seccion relative mt-16 overflow-x-clip bg-gradient-to-b from-papel-alt via-[#dff3ea] to-[#1d9e4b] px-[22px] pt-16 pb-24 text-center t:mt-24 t:pt-20">
      <p className="text-[17px] font-semibold text-tinta-suave">Compra por volumen</p>
      <h2 id="eco-titulo" className="mx-auto mt-3 max-w-[14ch] text-[44px] leading-[1.02] font-semibold tracking-titulo text-balance text-tinta t:text-[72px] d:text-[96px]">
        Mientras más llevas, <span className="relative inline-block">menos pagas.
          {[1, 2, 3, 4, 5].map((n) => (
            <span key={n} aria-hidden className={`eco-estela eco-estela-${n} absolute inset-x-0 top-0`}>menos pagas.</span>
          ))}
        </span>
      </h2>
      <Link href="/tienda" className="tienda-boton relative mt-24 bg-tinta text-white hover:bg-tinta/90">Ver precios por pack</Link>
    </section>
  )
}

/* ── Galería horizontal guiada ─────────────────────────────────────
   El scroll vertical desplaza la fila hacia el lado; los bordes se funden
   y una barra muestra cuánto falta. */
const PIEZAS = [
  { src: '/tienda/campana/banners/flanco-movil.webp', titulo: 'Audio a todo color.' },
  { src: '/tienda/campana/banners/watch-movil.webp', titulo: 'Tu reloj, tu estilo.' },
  { src: '/tienda/campana/banners/fundas-iphone17pm-movil.webp', titulo: 'Protección transparente.' },
  { src: '/tienda/campana/banners/relojes-movil.webp', titulo: 'Correas tejidas.' },
  { src: '/tienda/campana/banners/fila-movil.webp', titulo: 'Tu favorito, en tu color.' },
] as const

export function GaleriaGuiada() {
  return (
    <section aria-labelledby="galeria-titulo" className="galeria-tramo relative mt-16 t:mt-24">
      <div className="galeria-escenario escena-encuadre flex flex-col justify-center overflow-hidden">
        <h2 id="galeria-titulo" className="mx-auto w-full max-w-[1204px] px-[22px] text-[32px] leading-[1.05] font-semibold tracking-seccion t:text-[48px]">
          Explora la colección.
        </h2>
        <div className="galeria-ventana mt-6 t:mt-8">
          <ul className="galeria-fila flex gap-4 pl-[max(22px,calc((100vw-1160px)/2))] pr-[max(22px,calc((100vw-1160px)/2))] t:gap-5">
            {PIEZAS.map((p) => (
              <li key={p.src} className="galeria-pieza relative aspect-[1122/1402] shrink-0 overflow-hidden rounded-[28px] bg-papel-alt">
                <Image src={p.src} alt="" fill sizes="(min-width: 735px) 420px, 72vw" className="object-cover" />
                <Link href="/tienda" className="absolute inset-x-4 bottom-4 rounded-full bg-white/85 px-5 py-3 text-[15px] font-semibold text-tinta backdrop-blur-xl hover:bg-white t:text-[16px]">
                  {p.titulo} <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div aria-hidden className="mx-auto mt-6 h-[3px] w-[min(240px,50vw)] overflow-hidden rounded-full bg-black/10">
          <span className="escena-progreso galeria-progreso block h-full w-full origin-left rounded-full bg-tinta" />
        </div>
      </div>
    </section>
  )
}
