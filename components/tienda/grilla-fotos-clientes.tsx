'use client'

import Image from 'next/image'
import { useEffect, useRef, type ReactNode } from 'react'

/*
 * Grilla de fotos de clientes en movimiento, a partir de Grid Motion de React Bits
 * (https://www.reactbits.dev/backgrounds/grid-motion · Copyright (c) 2026 David Haz,
 * MIT + Commons Clause v1.0). Mismo efecto: filas giradas que se deslizan en sentidos
 * opuestos. Reescrita para la tienda:
 * - en el teléfono se mueve con el scroll (el original solo escuchaba el mouse);
 * - anima solo mientras está en pantalla y se queda quieta con «reducir movimiento»;
 * - sin gsap y sin leer `window` al renderizar (el original rompía el render del servidor).
 */

const FILAS = 4
const COLUMNAS = 7
const RECORRIDO = 260
/** Cuánto se acerca cada fila a su destino por cuadro: filas distintas, inercias distintas. */
const SUAVIDAD = [0.07, 0.05, 0.06, 0.045]

export type FotoCliente = { id: string; src: string; alt: string }

export function GrillaFotosClientes({ fotos, alAbrir, children }: { fotos: FotoCliente[]; alAbrir: (id: string) => void; children?: ReactNode }) {
  const marco = useRef<HTMLDivElement>(null)
  const filas = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const el = marco.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const conMouse = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    let progreso = 0.5
    const actual = Array<number>(FILAS).fill(0)
    let cuadro = 0
    let visible = false

    const alMover = (e: PointerEvent) => { progreso = e.clientX / window.innerWidth }
    // En el teléfono, el avance por la pantalla (0 al entrar por abajo, 1 al salir por arriba).
    const alDesplazar = () => {
      const r = el.getBoundingClientRect()
      progreso = Math.min(Math.max((window.innerHeight - r.top) / (window.innerHeight + r.height), 0), 1)
    }

    const pintar = () => {
      cuadro = 0
      let quieto = true
      filas.current.forEach((fila, i) => {
        if (!fila) return
        const destino = (progreso - 0.5) * RECORRIDO * (i % 2 === 0 ? 1 : -1)
        actual[i] += (destino - actual[i]) * SUAVIDAD[i % SUAVIDAD.length]
        if (Math.abs(destino - actual[i]) > 0.3) quieto = false
        fila.style.transform = `translate3d(${actual[i].toFixed(2)}px,0,0)`
      })
      // Solo sigue pidiendo cuadros mientras haya movimiento pendiente y esté a la vista.
      if (visible && !quieto) cuadro = requestAnimationFrame(pintar)
    }
    const despertar = () => { if (visible && !cuadro) cuadro = requestAnimationFrame(pintar) }

    const observador = new IntersectionObserver(([entrada]) => {
      visible = entrada.isIntersecting
      if (visible) { if (!conMouse) alDesplazar(); despertar() }
    })
    observador.observe(el)

    const alEvento = conMouse ? (e: PointerEvent) => { alMover(e); despertar() } : null
    const alScroll = conMouse ? null : () => { alDesplazar(); despertar() }
    if (alEvento) window.addEventListener('pointermove', alEvento, { passive: true })
    if (alScroll) window.addEventListener('scroll', alScroll, { passive: true })

    return () => {
      observador.disconnect()
      if (alEvento) window.removeEventListener('pointermove', alEvento)
      if (alScroll) window.removeEventListener('scroll', alScroll)
      cancelAnimationFrame(cuadro)
    }
  }, [])

  // Se repiten las fotos hasta llenar la grilla; desplazadas por fila para que no se alineen iguales.
  const celdas = Array.from({ length: FILAS * COLUMNAS }, (_, i) => fotos[(i + Math.floor(i / COLUMNAS) * 3) % fotos.length])

  return (
    <div ref={marco} className="relative isolate h-[480px] overflow-hidden bg-[#0b0b0d] t:h-[560px] d:h-[640px]">
      {/* Las fotos se tocan con el puntero; con teclado se recorren en la lista de reseñas (no se duplican 28 tabulaciones). */}
      {/* Fotos cuadradas de 140 px como mínimo: con un ancho relativo, en el teléfono quedaban como tiras. */}
      <div aria-hidden className="absolute top-1/2 left-1/2 grid w-[max(150%,1080px)] -translate-x-1/2 -translate-y-1/2 -rotate-[15deg] gap-3">
        {Array.from({ length: FILAS }, (_, f) => (
          <div key={f} ref={(n) => { filas.current[f] = n }} className="grid grid-cols-7 gap-3 will-change-transform">
            {celdas.slice(f * COLUMNAS, (f + 1) * COLUMNAS).map((foto, c) => (
              <button key={`${f}-${c}`} type="button" tabIndex={-1} onClick={() => alAbrir(foto.id)} className="group relative aspect-square overflow-hidden rounded-[14px] bg-white/5">
                <Image src={foto.src} alt="" fill sizes="(min-width: 1069px) 240px, 160px" className="object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
              </button>
            ))}
          </div>
        ))}
      </div>
      {/* Velo para que el texto se lea sobre cualquier foto; no bloquea los clics fuera del texto. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_55%_at_50%_50%,rgb(0_0_0/0.72),rgb(0_0_0/0.25)_70%,transparent)]" />
      {children && <div className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-white [&_a]:pointer-events-auto [&_button]:pointer-events-auto">{children}</div>}
    </div>
  )
}
