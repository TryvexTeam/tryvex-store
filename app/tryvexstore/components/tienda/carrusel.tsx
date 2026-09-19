'use client'

import { Children, useCallback, useEffect, useRef, useState } from 'react'

/** Separación entre cards: la misma en toda la tienda. */
const SEPARACION = 20

/**
 * Fila deslizable de la vitrina.
 *
 * Comportamiento medido en la Tienda de Apple:
 *  - encaje obligatorio al soltar: la fila nunca queda con una card a medias;
 *  - la siguiente card siempre se asoma por el borde (esa media card es la
 *    instrucción; no hace falta escribir «desliza»);
 *  - flechas solo desde 735 px, que avanzan exactamente una card y se
 *    ocultan en cada extremo.
 */
export function Carrusel({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  const pista = useRef<HTMLUListElement>(null)
  const [enInicio, setEnInicio] = useState(true)
  const [enFinal, setEnFinal] = useState(true)

  const medir = useCallback(() => {
    const el = pista.current
    if (!el) return
    // Un píxel de tolerancia: el encaje puede dejar la posición en fracciones.
    setEnInicio(el.scrollLeft <= 1)
    setEnFinal(el.scrollLeft + el.clientWidth >= el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = pista.current
    if (!el) return
    medir()
    let cuadro = 0
    const alDesplazar = () => {
      cancelAnimationFrame(cuadro)
      cuadro = requestAnimationFrame(medir)
    }
    el.addEventListener('scroll', alDesplazar, { passive: true })
    const observador = new ResizeObserver(medir)
    observador.observe(el)
    return () => {
      el.removeEventListener('scroll', alDesplazar)
      observador.disconnect()
      cancelAnimationFrame(cuadro)
    }
  }, [medir])

  function avanzar(sentido: 1 | -1) {
    const el = pista.current
    const card = el?.querySelector('li')
    if (!el || !card) return
    const quieto = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    el.scrollBy({ left: sentido * (card.getBoundingClientRect().width + SEPARACION), behavior: quieto ? 'auto' : 'smooth' })
  }

  const flecha =
    // Centrada sobre la card: la pista suma 8 px arriba y 40 abajo para la sombra.
    'tienda-flecha absolute top-[calc(50%-16px)] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full ' +
    'bg-[#d2d2d7]/70 text-tinta backdrop-blur-md t:grid'

  return (
    <div className="relative">
      <ul
        ref={pista}
        aria-label={etiqueta}
        className="tienda-pista sin-barra flex snap-x snap-mandatory gap-5 overflow-x-auto overscroll-x-contain pt-2 pb-10"
      >
        {Children.map(children, (hijo) => (
          <li className="relative shrink-0 snap-start">{hijo}</li>
        ))}
      </ul>

      {!enInicio && (
        <button type="button" onClick={() => avanzar(-1)} aria-label="Ver anteriores" className={`${flecha} left-[max(12px,calc(var(--canal)-56px))]`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m15 18-6-6 6-6" />
          </svg>
        </button>
      )}
      {!enFinal && (
        <button type="button" onClick={() => avanzar(1)} aria-label="Ver siguientes" className={`${flecha} right-[max(12px,calc(var(--canal)-56px))]`}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      )}
    </div>
  )
}
