'use client'

import type { PointerEvent, ReactNode } from 'react'

/**
 * Una fila del acordeón: `<details>` nativo, con la fila que se vuelve negra al
 * pasar el cursor.
 *
 * El relleno entra desde el borde más cercano al cursor y sale por el más
 * cercano también (la mecánica del Flowing Menu de React Bits, sin GSAP: solo
 * `transform` en CSS). Este componente únicamente le dice al CSS de qué lado
 * entró el cursor (`--origen`); todo lo demás es `.fila-tech` en globals.css.
 *
 * Solo con mouse: en táctil no hay «pasar el cursor», y ahí se invierte la fila
 * abierta (mismo CSS). `name` compartido = un solo panel abierto a la vez.
 */
export function FilaAcordeon({ grupo, abierta = false, children }: { grupo: string; abierta?: boolean; children: ReactNode }) {
  function marcarBorde(e: PointerEvent<HTMLDetailsElement>) {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--origen', e.clientY < r.top + r.height / 2 ? 'top' : 'bottom')
  }

  return (
    <details name={grupo} open={abierta} onPointerEnter={marcarBorde} onPointerLeave={marcarBorde} className="fila-tech">
      {children}
    </details>
  )
}
