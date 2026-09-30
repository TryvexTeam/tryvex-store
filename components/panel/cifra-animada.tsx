'use client'

import { useEffect, useRef } from 'react'

/*
 * Adaptado de CountUp de React Bits (https://reactbits.dev), de David Haz.
 * Copyright (c) 2026 David Haz. Licencia MIT + Commons Clause: se puede usar
 * dentro de un sitio o producto, no revender el componente. Aviso conservado.
 *
 * Cambios respecto del original:
 *  - Sin `motion`: el original usa el resorte de esa librería (~35 KB comprimidos
 *    en el panel solo para animar un número). Acá, requestAnimationFrame con una
 *    curva de salida exponencial.
 *  - El texto final ya viene escrito desde el servidor (`valor` formateado) y se
 *    anuncia a lectores de pantalla tal cual: lo que se anima es solo lo visual,
 *    y un número que «sube» no se lee cien veces.
 *  - Sin movimiento (prefers-reduced-motion) queda el número final, quieto.
 *  - Formato chileno (punto de miles) y sin decimales: es CLP.
 */

const formato = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 })
const salida = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t))

export function CifraAnimada({
  valor,
  desde = 0,
  duracion = 1100,
  retraso = 0,
  className = '',
}: {
  /** Valor final, sin signo: el signo lo escribe quien la usa. */
  valor: number
  desde?: number
  /** Milisegundos. */
  duracion?: number
  retraso?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const texto = formato.format(Math.round(valor))

  useEffect(() => {
    const el = ref.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || valor === desde) return

    let cuadro = 0
    let pendiente: ReturnType<typeof setTimeout> | undefined
    let inicio = 0

    const correr = (ahora: number) => {
      if (!inicio) inicio = ahora
      const t = (ahora - inicio) / duracion
      el.textContent = formato.format(Math.round(desde + (valor - desde) * salida(t)))
      if (t < 1) cuadro = requestAnimationFrame(correr)
    }
    const empezar = () => {
      el.textContent = formato.format(Math.round(desde))
      pendiente = setTimeout(() => (cuadro = requestAnimationFrame(correr)), retraso)
    }

    // Solo cuando la cifra se ve, y una sola vez: como en el original (`once`).
    const vigia = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          vigia.disconnect()
          empezar()
        }
      },
      { threshold: 0.2 }
    )
    vigia.observe(el)

    return () => {
      vigia.disconnect()
      clearTimeout(pendiente)
      cancelAnimationFrame(cuadro)
      el.textContent = texto
    }
  }, [valor, desde, duracion, retraso, texto])

  return (
    <span className={className}>
      <span className="sr-only">{texto}</span>
      <span aria-hidden ref={ref}>
        {texto}
      </span>
    </span>
  )
}
