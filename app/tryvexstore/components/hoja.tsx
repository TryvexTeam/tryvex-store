'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { IconoCerrar } from './iconos'

type Props = {
  abierta: boolean
  onCerrar: () => void
  titulo: string
  /** Texto bajo el título; contexto, no decoración. */
  bajada?: string
  children: React.ReactNode
  /** Barra fija al pie, fuera del área que hace scroll. */
  pie?: React.ReactNode
}

/** A partir de aquí se entiende que el gesto quiso cerrar, no ojear. */
const UMBRAL_CIERRE = 110
/** Un gesto rápido cierra aunque haya recorrido poco: lo que importa es la intención. */
const UMBRAL_VELOCIDAD = 0.55

export function Hoja({ abierta, onCerrar, titulo, bajada, children, pie }: Props) {
  const caja = useRef<HTMLDivElement>(null)
  const cuerpo = useRef<HTMLDivElement>(null)
  const devolverFoco = useRef<HTMLElement | null>(null)

  const [arrastre, setArrastre] = useState(0)
  const [soltando, setSoltando] = useState(false)
  const gesto = useRef<{ y0: number; t0: number; activo: boolean } | null>(null)

  /* ── Foco y teclado ─────────────────────────────────────────── */
  useEffect(() => {
    if (!abierta) return

    devolverFoco.current = document.activeElement as HTMLElement
    const previo = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const enfocables = () =>
      Array.from(
        caja.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'
        ) ?? []
      ).filter((el) => el.offsetParent !== null)

    enfocables()[0]?.focus()

    const alTeclado = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onCerrar()
        return
      }
      if (e.key !== 'Tab') return
      const lista = enfocables()
      if (lista.length === 0) return
      const primero = lista[0]
      const ultimo = lista[lista.length - 1]
      if (e.shiftKey && document.activeElement === primero) {
        e.preventDefault()
        ultimo.focus()
      } else if (!e.shiftKey && document.activeElement === ultimo) {
        e.preventDefault()
        primero.focus()
      }
    }

    document.addEventListener('keydown', alTeclado)
    return () => {
      document.removeEventListener('keydown', alTeclado)
      document.body.style.overflow = previo
      devolverFoco.current?.focus()
    }
  }, [abierta, onCerrar])

  useEffect(() => {
    if (!abierta) setArrastre(0)
  }, [abierta])

  /* ── Gesto de arrastre ──────────────────────────────────────── */
  const iniciar = useCallback((e: React.PointerEvent) => {
    // Solo se arrastra desde arriba si el contenido ya está en su tope:
    // si no, el gesto de leer hacia abajo cerraría la hoja sin querer.
    const desplazado = (cuerpo.current?.scrollTop ?? 0) > 0
    if (desplazado) return
    gesto.current = { y0: e.clientY, t0: performance.now(), activo: true }
    setSoltando(false)
  }, [])

  const mover = useCallback((e: React.PointerEvent) => {
    const g = gesto.current
    if (!g?.activo) return
    const dy = e.clientY - g.y0
    // Hacia arriba se resiste: la hoja no sube más de su sitio, y esa
    // resistencia es justamente lo que comunica que llegó al tope.
    setArrastre(dy > 0 ? dy : dy / 4)
  }, [])

  const terminar = useCallback(
    (e: React.PointerEvent) => {
      const g = gesto.current
      if (!g?.activo) return
      gesto.current = null

      const dy = e.clientY - g.y0
      const velocidad = dy / Math.max(1, performance.now() - g.t0)

      setSoltando(true)
      if (dy > UMBRAL_CIERRE || velocidad > UMBRAL_VELOCIDAD) {
        // Termina de salir y recién entonces se desmonta, para que no
        // desaparezca de golpe a media animación.
        setArrastre(window.innerHeight)
        setTimeout(onCerrar, 180)
      } else {
        setArrastre(0)
      }
    },
    [onCerrar]
  )

  if (!abierta) return null

  const desplazada = Math.max(0, arrastre)
  // El velo se aclara a medida que la hoja baja: el fondo «vuelve» con el
  // gesto en vez de saltar al soltar.
  const opacidadVelo = Math.max(0, 1 - desplazada / 420)

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        style={{ opacity: opacidadVelo }}
        className="anim-velo absolute inset-0 bg-tinta/35 backdrop-blur-[2px]"
      />

      <div
        ref={caja}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-titulo"
        aria-describedby={bajada ? 'hoja-bajada' : undefined}
        style={{
          transform: desplazada ? `translate3d(0, ${desplazada}px, 0)` : undefined,
          transition: soltando
            ? 'transform var(--t-hoja) var(--ease-salida)'
            : undefined,
        }}
        className="anim-hoja relative flex max-h-[92dvh] w-full flex-col rounded-t-[22px] bg-papel
                   shadow-[var(--shadow-hoja)] md:max-w-[560px] md:rounded-[22px]"
      >
        {/* Zona de agarre. `touch-none` evita que el navegador interprete el
            gesto como scroll y se pelee con el arrastre. */}
        <div
          onPointerDown={iniciar}
          onPointerMove={mover}
          onPointerUp={terminar}
          onPointerCancel={terminar}
          className="shrink-0 cursor-grab touch-none active:cursor-grabbing md:cursor-default"
        >
          <div className="flex justify-center pt-2.5 md:hidden">
            <span className="h-1 w-9 rounded-full bg-borde" />
          </div>

          <header className="flex items-start justify-between gap-4 px-5 pt-3 pb-4 md:pt-5">
            <div className="min-w-0">
              <h2
                id="hoja-titulo"
                className="text-[19px] leading-tight font-semibold tracking-[-0.02em]"
              >
                {titulo}
              </h2>
              {bajada && (
                <p id="hoja-bajada" className="mt-1 text-[13px] text-gris">
                  {bajada}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onCerrar}
              aria-label="Cerrar"
              className="presionable -mr-1 -mt-1 grid size-11 shrink-0 place-items-center rounded-full
                         bg-papel-alt text-tinta-suave"
            >
              <IconoCerrar size={18} />
            </button>
          </header>
        </div>

        <div ref={cuerpo} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          {children}
        </div>

        {pie && (
          <div className="pad-seguro-abajo shrink-0 border-t border-borde/60 bg-papel px-5 pt-3">
            {pie}
          </div>
        )}
      </div>
    </div>
  )
}
