'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { conectarContenedor } from '@/lib/notificar'

// `ssr: false`: es solo interfaz de eventos; y así no entra al paquete inicial.
const Toaster = dynamic(() => import('./notificaciones-toaster'), { ssr: false })

/**
 * Se monta una vez en el layout y pesa casi nada: una región viva para lectores
 * de pantalla. El toaster real (Sileo, ~47 KB) solo se descarga la primera vez
 * que algo llama a `notificar.*`.
 */
export function ContenedorNotificaciones() {
  const [montado, setMontado] = useState(false)
  const [anuncio, setAnuncio] = useState('')

  useEffect(() => {
    conectarContenedor({
      montar: () => setMontado(true),
      // Cambiar el texto a «vacío» y luego al aviso hace que el lector repita
      // un mensaje idéntico al anterior.
      anunciar: (texto) => {
        setAnuncio('')
        requestAnimationFrame(() => setAnuncio(texto))
      },
    })
    return () => conectarContenedor(null)
  }, [])

  return (
    <>
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {anuncio}
      </div>
      {montado && <Toaster />}
    </>
  )
}
