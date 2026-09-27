import type { CSSProperties } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import { leerPromosHeroe, type ProductoTienda } from '@/lib/tienda'
import { FRASES_POR_DEFECTO, escenaFocoDe } from '@/lib/foco'
import { VideoFoco } from './video-foco'

/**
 * Escenas guiadas por el scroll (v15). Todo en CSS con `animation-timeline`:
 * corre fuera del hilo principal, sin listeners de scroll. Cada escena se
 * encuadra bajo la cabecera fija (`--alto-cabecera`) para que ocupe
 * exactamente la pantalla útil. Sin soporte o con movimiento reducido, las
 * escenas se ven completas y estáticas.
 */

/* ── Producto en foco ──────────────────────────────────────────────
   Escenario fijo durante un tramo alto: tres afirmaciones se relevan, una
   barra marca el avance y al final aparece la compra. Se edita desde el
   panel (Portada → Escena en foco): el producto, las frases y un video que
   corre en bucle o avanza con el scroll. Sin video, el producto sube, crece
   y gira sobre su halo, como antes.

   La tarjeta mide lo mismo que el banner principal: mismo margen lateral,
   mismas esquinas y misma altura, para que las dos escenas grandes de la
   portada se lean como parte de un mismo sistema. */
export async function ProductoFoco({
  productos,
  destacado,
  pieza,
}: {
  productos: ProductoTienda[]
  destacado: ProductoTienda | null
  pieza: { visible: boolean; contenido: Record<string, unknown> } | undefined
}) {
  if (pieza && !pieza.visible) return null
  const escena = escenaFocoDe(pieza?.contenido)
  const producto = (escena.producto && productos.find((p) => p.slug === escena.producto)) || destacado
  if (!producto) return null
  if (!escena.video && !producto.imagen) return null

  // Sin frases guardadas en el panel, la segunda sigue calculando el ahorro
  // por volumen, como siempre.
  const conFrases = Array.isArray(pieza?.contenido.frases)
  const promo = conFrases ? null : await leerPromosHeroe()
  const afirmaciones = conFrases
    ? escena.frases
    : [
        FRASES_POR_DEFECTO[0],
        promo?.ahorroMaximo
          ? { antes: `Hasta ${promo.ahorroMaximo}% menos`, resaltado: 'comprando por volumen.' }
          : FRASES_POR_DEFECTO[1],
        FRASES_POR_DEFECTO[2],
      ]

  return (
    <section aria-labelledby="foco-titulo" className="foco-tramo relative mt-16 t:mt-24">
      <div className="escena-encuadre flex items-center px-[var(--margen-heroe)]">
        <div className="foco-escenario relative isolate flex h-[min(640px,calc(100svh-96px-var(--margen-heroe)))] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] bg-black px-[22px] text-white d:h-[min(760px,calc(100svh-88px-var(--margen-heroe)))]">
          {escena.video ? (
            <>
              <VideoFoco src={escena.video} modo={escena.modo} />
              {/* Velo: las frases se leen sobre cualquier video. */}
              <span aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_60%_at_50%_45%,rgb(0_0_0/45%),rgb(0_0_0/15%)_70%,transparent)]" />
            </>
          ) : (
            <span aria-hidden className="foco-halo pointer-events-none absolute inset-0" />
          )}
          <p className="foco-antetitulo relative text-[13px] font-semibold tracking-[0.12em] text-white/70 uppercase t:text-[15px]">{producto.nombre}</p>
          <h2 id="foco-titulo" className="sr-only">{afirmaciones.map((a) => `${a.antes} ${a.resaltado}`).join(' ')}</h2>
          <div aria-hidden className="foco-frases relative mt-3 grid w-full max-w-[18ch] place-items-center text-center font-semibold tracking-display">
            {afirmaciones.map((a, i) => (
              <p key={`${i}-${a.antes}`} className={`foco-frase foco-frase-${i + 1} col-start-1 row-start-1 text-balance`}>
                {a.antes} <span className="foco-degradado">{a.resaltado}</span>
              </p>
            ))}
          </div>
          {!escena.video && producto.imagen && (
            <div className="foco-producto relative mt-4 aspect-square">
              <Image src={producto.imagen} alt="" fill sizes="(min-width: 735px) 560px, 70vw" className="object-contain" />
            </div>
          )}
          <Link href={producto.href} className={`foco-cta tienda-boton relative bg-white text-black hover:bg-white/85 ${escena.video ? 'mt-8' : 'mt-2'}`}>
            Comprar desde <span className="cifra ml-1">{clp(producto.precio)}</span>
          </Link>
        </div>
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
      <ul className="mt-14 grid gap-3 px-[var(--canal)] t:mt-20 t:grid-cols-2 d:grid-cols-4">
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

