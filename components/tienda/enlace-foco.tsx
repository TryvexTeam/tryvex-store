'use client'

import Link from 'next/link'
import type { CSSProperties, PointerEvent, ReactNode } from 'react'

/*
 * Inspirado en SpotlightCard de React Bits (https://reactbits.dev), de David Haz.
 * Copyright (c) 2026 David Haz. Licencia MIT + Commons Clause: se puede usar
 * dentro de un sitio o producto, no revender el componente. Aviso conservado.
 *
 * Un enlace con un foco de luz que sigue al cursor. La posición va en variables
 * CSS, sin estado ni renders (ver `.foco-tarjeta` en globals.css). Solo con mouse.
 */
export function EnlaceFoco({ href, className = '', foco = 'rgb(0 0 0 / 0.06)', children }: { href: string; className?: string; foco?: string; children: ReactNode }) {
  function mover(e: PointerEvent<HTMLAnchorElement>) {
    if (e.pointerType !== 'mouse') return
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--x', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--y', `${e.clientY - r.top}px`)
  }
  return (
    <Link href={href} onPointerMove={mover} className={`foco-tarjeta ${className}`} style={{ '--foco': foco } as CSSProperties}>
      {children}
    </Link>
  )
}
