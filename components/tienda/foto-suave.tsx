'use client'

import { useState } from 'react'
import Image from 'next/image'

/**
 * Una foto que, al cambiar, se funde con la anterior en vez de saltar.
 *
 * Pensada para el cambio de color: las fotos de cada variante tienen el mismo
 * ángulo, así que al fundirlas lo único que se percibe es el color que cambia,
 * como en la tienda de Apple.
 *
 * La foto nueva entra transparente y recién empieza a aparecer cuando terminó
 * de cargar: nunca queda un hueco en blanco a mitad del cambio. Mientras
 * aparece, la anterior se desvanece; al terminar se retira.
 */
interface Capa {
  src: string
  estado: 'cargando' | 'visible' | 'saliendo'
}

const DURACION_MS = 350

export function FotoSuave({
  src,
  alt,
  sizes,
  className,
  priority,
}: {
  src: string
  alt: string
  sizes: string
  className: string
  priority?: boolean
}) {
  const [capas, setCapas] = useState<Capa[]>([{ src, estado: 'visible' }])
  const [anterior, setAnterior] = useState(src)

  // Cambio de foto: se agrega una capa nueva sobre la que está a la vista.
  if (src !== anterior) {
    setAnterior(src)
    setCapas((c) => [...c.filter((x) => x.estado === 'visible').slice(-1), { src, estado: 'cargando' }])
  }

  function cargada(cual: string) {
    setCapas((c) =>
      c.some((x) => x.src === cual && x.estado === 'cargando')
        ? c.map((x) => (x.src === cual ? { ...x, estado: 'visible' } : { ...x, estado: 'saliendo' }))
        : c
    )
    // La que sale se retira cuando termina de desvanecerse.
    setTimeout(() => setCapas((c) => c.filter((x) => x.estado !== 'saliendo')), DURACION_MS + 50)
  }

  return (
    <>
      {capas.map((c) => (
        <Image
          key={c.src}
          src={c.src}
          alt={c.src === src ? alt : ''}
          aria-hidden={c.src !== src || undefined}
          fill
          sizes={sizes}
          priority={priority && c.src === src}
          onLoad={() => cargada(c.src)}
          className={`${className} transition-opacity ease-out motion-reduce:transition-none ${c.estado === 'visible' ? 'opacity-100' : 'opacity-0'}`}
          style={{ transitionDuration: `${DURACION_MS}ms` }}
        />
      ))}
    </>
  )
}
