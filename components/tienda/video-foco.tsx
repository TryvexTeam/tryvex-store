'use client'

import { useEffect, useRef } from 'react'
import type { ModoFoco } from '@/lib/foco'

/**
 * Video de la escena en foco.
 *
 *  - En bucle: corre solo, en silencio, como fondo vivo.
 *  - Con el scroll: su posición sigue el avance de la página por la escena
 *    (`.foco-tramo`), hacia adelante y hacia atrás, como en las páginas de
 *    producto de Apple. Para que retroceder no dé tirones, el video se
 *    descarga entero y se reproduce desde memoria: buscar un cuadro dentro
 *    de un archivo a medio bajar obliga al navegador a pedir rangos a la red.
 *
 * Con movimiento reducido, el video queda quieto en su primer cuadro.
 */
export function VideoFoco({ src, modo }: { src: string; modo: ModoFoco }) {
  const video = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const el = video.current
    if (!el) return
    const quieto = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (modo === 'bucle') {
      if (!quieto) void el.play().catch(() => {})
      return
    }

    const tramo = el.closest<HTMLElement>('.foco-tramo')
    if (!tramo || quieto) return

    let url: string | null = null
    let cancelado = false
    const control = new AbortController()
    fetch(src, { signal: control.signal })
      .then((r) => (r.ok ? r.blob() : null))
      .then((blob) => {
        if (!blob || cancelado) return
        url = URL.createObjectURL(blob)
        el.src = url
      })
      .catch(() => {})

    let cuadro = 0
    const ubicar = () => {
      cuadro = 0
      if (!el.duration || Number.isNaN(el.duration)) return
      const r = tramo.getBoundingClientRect()
      const recorrido = r.height - innerHeight
      const avance = recorrido > 0 ? Math.min(1, Math.max(0, -r.top / recorrido)) : 0
      // Un pelo antes del final: en algunos navegadores el último cuadro
      // exacto queda en negro.
      el.currentTime = avance * (el.duration - 0.05)
    }
    const alMover = () => {
      if (!cuadro) cuadro = requestAnimationFrame(ubicar)
    }
    addEventListener('scroll', alMover, { passive: true })
    addEventListener('resize', alMover)
    el.addEventListener('loadedmetadata', ubicar)

    return () => {
      cancelado = true
      control.abort()
      cancelAnimationFrame(cuadro)
      removeEventListener('scroll', alMover)
      removeEventListener('resize', alMover)
      el.removeEventListener('loadedmetadata', ubicar)
      if (url) URL.revokeObjectURL(url)
    }
  }, [src, modo])

  return (
    <video
      ref={video}
      // En modo scroll el src definitivo es el blob en memoria; mientras baja,
      // el mismo archivo por red deja ver el primer cuadro.
      src={src}
      muted
      playsInline
      loop={modo === 'bucle'}
      preload={modo === 'scroll' ? 'auto' : 'metadata'}
      aria-hidden
      className="absolute inset-0 size-full object-cover"
    />
  )
}
