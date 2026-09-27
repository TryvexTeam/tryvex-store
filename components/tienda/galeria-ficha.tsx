'use client'

import { useEffect, useRef, useState, useSyncExternalStore, ViewTransition } from 'react'
import Image from 'next/image'
import { Estrella } from '@/app/marca'
import { esVideo } from '@/lib/imagenes'
import { BotonFavorito } from './boton-favorito'

interface Props {
  /** URLs públicas de fotos y videos, en el orden del panel. `null` = sin foto. */
  medios: (string | null)[]
  nombre: string
  slug: string
  productoId: string
}

const ESCRITORIO = '(min-width: 1024px)'

/**
 * ¿Se ve la versión de escritorio? Las dos galerías están montadas (una se
 * oculta con CSS) y solo la visible puede llevar la transición de la foto:
 * dos <ViewTransition> con el mismo nombre rompen la animación.
 */
function useEscritorio(): boolean {
  return useSyncExternalStore(
    (avisar) => {
      const mq = matchMedia(ESCRITORIO)
      mq.addEventListener('change', avisar)
      return () => mq.removeEventListener('change', avisar)
    },
    () => matchMedia(ESCRITORIO).matches,
    () => false,
  )
}

/**
 * Galería de la ficha, medida sobre la de Dune Dragon:
 *
 *  - Escritorio: fotos a la par en dos columnas, 4:5, sin separación ni
 *    esquinas y sobre el mismo gris de la página, para que no se note dónde
 *    termina cada una.
 *  - Teléfono: carrusel deslizable, una foto por pantalla.
 *  - Visor: al tocar una foto se abre a pantalla completa con todas en fila
 *    vertical, parado en la que se tocó, y miniaturas a la derecha.
 *
 * Los videos conviven con las fotos en la misma lista: se reproducen solos,
 * en silencio y en bucle, como una foto que se mueve.
 */
export function GaleriaFicha({ medios, nombre, slug, productoId }: Props) {
  const [actual, setActual] = useState(0)
  const escritorio = useEscritorio()
  const pista = useRef<HTMLDivElement>(null)
  const visor = useRef<HTMLDialogElement>(null)
  const listaVisor = useRef<HTMLDivElement>(null)
  const origen = useRef<HTMLElement | null>(null)
  const overflowPrevio = useRef('')
  // Lo del visor se monta solo con el diálogo abierto: un medio lazy dentro
  // de un <dialog> cerrado (display:none) no llega a cargarse.
  const [abierto, setAbierto] = useState(false)
  const [enVisor, setEnVisor] = useState(0)

  // Al cambiar de color la lista cambia: el carrusel vuelve al inicio.
  useEffect(() => {
    setActual(0)
    pista.current?.scrollTo({ left: 0 })
  }, [medios])

  useEffect(() => () => {
    if (visor.current?.open) document.body.style.overflow = overflowPrevio.current
  }, [])

  function abrir(i: number) {
    origen.current = document.activeElement as HTMLElement
    overflowPrevio.current = document.body.style.overflow
    setEnVisor(i)
    setAbierto(true)
    visor.current?.showModal()
    document.body.style.overflow = 'hidden'
  }

  // Con el visor montado, se para en el medio que se tocó, sin animación:
  // tiene que abrir ahí, no viajar hasta ahí.
  useEffect(() => {
    if (!abierto) return
    listaVisor.current?.querySelector<HTMLElement>(`[data-medio="${enVisor}"]`)?.scrollIntoView({ block: 'start' })
    // Solo al abrir: después el índice lo mueve el scroll del usuario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto])

  // La miniatura activa sigue al medio que ocupa el centro de la pantalla.
  useEffect(() => {
    const lista = listaVisor.current
    if (!abierto || !lista) return
    const observador = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) if (e.isIntersecting) setEnVisor(Number((e.target as HTMLElement).dataset.medio))
      },
      { root: lista, rootMargin: '-50% 0px -50% 0px' },
    )
    lista.querySelectorAll('[data-medio]').forEach((el) => observador.observe(el))
    return () => observador.disconnect()
  }, [abierto])

  function irEnVisor(i: number) {
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches
    listaVisor.current?.querySelector<HTMLElement>(`[data-medio="${i}"]`)?.scrollIntoView({ block: 'start', behavior: quieto ? 'auto' : 'smooth' })
  }

  const hayVarios = medios.length > 1

  return (
    <>
      {/* ── Teléfono: carrusel ─────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-papel-alt lg:hidden">
        <div className="absolute top-4 right-4 z-10"><BotonFavorito productoId={productoId} nombre={nombre} /></div>
        {hayVarios && (
          <span className="cifra absolute right-4 bottom-4 z-10 rounded-full bg-white px-3 py-1 text-sm text-black" aria-live="polite">
            {actual + 1} / {medios.length}
          </span>
        )}
        <div
          ref={pista}
          onScroll={(e) => setActual(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
          className="sin-barra flex aspect-square snap-x snap-mandatory overflow-x-auto"
          aria-roledescription="carrusel"
          aria-label={`Fotos de ${nombre}`}
        >
          {medios.map((src, i) => (
            <div key={`m-${src}-${i}`} className="relative w-full shrink-0 snap-center" aria-label={`Foto ${i + 1} de ${medios.length}`}>
              <Casilla src={src} indice={i} nombre={nombre} slug={escritorio ? null : slug} total={medios.length} alAbrir={abrir} sizes="100vw" relleno="p-8 t:p-14" />
            </div>
          ))}
        </div>
      </div>

      {/* ── Escritorio: a la par, dos columnas ─────────────────────── */}
      <div className="relative hidden lg:block">
        <div className="absolute top-4 right-4 z-10"><BotonFavorito productoId={productoId} nombre={nombre} /></div>
        <ul className={`grid bg-papel-alt ${hayVarios ? 'grid-cols-2' : 'grid-cols-1'}`} aria-label={`Fotos de ${nombre}`}>
          {medios.map((src, i) => (
            <li key={`g-${src}-${i}`} className={`relative ${hayVarios ? 'aspect-[4/5]' : 'aspect-square'}`}>
              <Casilla src={src} indice={i} nombre={nombre} slug={escritorio ? slug : null} total={medios.length} alAbrir={abrir} sizes="(min-width: 1024px) 34vw, 50vw" relleno="p-10" />
            </li>
          ))}
        </ul>
      </div>

      {/* ── Visor: todo en fila vertical ───────────────────────────── */}
      <dialog
        ref={visor}
        aria-label={`Fotos ampliadas de ${nombre}`}
        className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-papel-alt p-0 text-tinta backdrop:bg-black/60"
        onClose={() => {
          setAbierto(false)
          document.body.style.overflow = overflowPrevio.current
          origen.current?.focus()
        }}
      >
        <button
          type="button"
          autoFocus
          onClick={() => visor.current?.close()}
          aria-label="Cerrar fotos ampliadas"
          className="fixed top-4 right-4 z-20 grid size-11 place-items-center rounded-full bg-white/90 text-tinta shadow-sm ring-1 ring-borde backdrop-blur-md hover:bg-white"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>

        <div ref={listaVisor} className="h-full overflow-y-auto overscroll-contain">
          {abierto &&
            medios.map((src, i) =>
              src ? (
                <div key={`v-${src}-${i}`} data-medio={i} className="relative w-full">
                  {esVideo(src) ? (
                    <video src={src} autoPlay muted loop playsInline aria-label={`${nombre}, video ${i + 1}`} className="block h-auto w-full" />
                  ) : (
                    <div className="relative mx-auto aspect-[4/5] w-full max-w-[1100px]">
                      <Image src={src} alt={`${nombre}, foto ${i + 1}`} fill sizes="(min-width: 1100px) 1100px, 100vw" loading={i === enVisor ? 'eager' : 'lazy'} className="object-contain p-6 t:p-16" />
                    </div>
                  )}
                </div>
              ) : null,
            )}
        </div>

        {/* Miniaturas: saltan al medio y marcan dónde se está. */}
        {abierto && hayVarios && (
          <ul className="fixed top-1/2 right-4 z-10 hidden -translate-y-1/2 flex-col gap-2 t:flex" aria-label="Ir a una foto">
            {medios.map((src, i) =>
              src ? (
                <li key={`t-${src}-${i}`}>
                  <button
                    type="button"
                    onClick={() => irEnVisor(i)}
                    aria-label={`Ir a la foto ${i + 1}`}
                    aria-current={i === enVisor}
                    className={`relative block size-12 overflow-hidden bg-white ring-1 transition-shadow ${i === enVisor ? 'ring-2 ring-tinta' : 'ring-borde hover:ring-gris'}`}
                  >
                    {esVideo(src) ? (
                      <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="size-full object-cover" />
                    ) : (
                      <Image src={src} alt="" fill sizes="48px" className="object-contain p-1" />
                    )}
                  </button>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </dialog>
    </>
  )
}

/** Una casilla de la galería: la foto o el video, y el botón que abre el visor. */
function Casilla({
  src,
  indice,
  nombre,
  slug,
  total,
  alAbrir,
  sizes,
  relleno,
}: {
  src: string | null
  indice: number
  nombre: string
  /** Solo la galería visible lo recibe: es el nombre de la transición. */
  slug: string | null
  total: number
  alAbrir: (i: number) => void
  sizes: string
  relleno: string
}) {
  if (!src) return <span className="grid size-full place-items-center text-borde"><Estrella size={96} /></span>

  const medio = esVideo(src) ? (
    <video src={src} autoPlay muted loop playsInline preload="metadata" aria-hidden className="absolute inset-0 size-full object-cover" />
  ) : (
    <Image src={src} alt={indice === 0 ? nombre : ''} fill priority={indice === 0} sizes={sizes} className={`object-contain ${relleno}`} />
  )

  return (
    <>
      {/* La primera foto comparte la transición con la card que llevó aquí. */}
      {indice === 0 && slug && !esVideo(src) ? <ViewTransition name={`producto-${slug}`}>{medio}</ViewTransition> : medio}
      <button
        type="button"
        onClick={() => alAbrir(indice)}
        aria-label={`Ampliar ${esVideo(src) ? 'video' : 'foto'} ${indice + 1} de ${total}`}
        className="absolute inset-0 z-[1] cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-black"
      />
    </>
  )
}
