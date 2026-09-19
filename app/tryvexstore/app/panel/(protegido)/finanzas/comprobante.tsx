'use client'

import { useState, useTransition } from 'react'
import { urlComprobante } from './acciones'

/**
 * El bucket es privado, así que no hay una URL fija que poner en un href.
 * Se pide una URL firmada al momento del clic y se abre en otra pestaña.
 * Dura 5 minutos: si alguien la reenvía, expira sola.
 */
export default function Comprobante({
  ruta,
  nombre,
}: {
  ruta: string
  nombre: string | null
}) {
  const [error, setError] = useState(false)
  const [abriendo, iniciar] = useTransition()

  function abrir() {
    setError(false)
    iniciar(async () => {
      const url = await urlComprobante(ruta)
      if (url) window.open(url, '_blank', 'noopener,noreferrer')
      else setError(true)
    })
  }

  return (
    <button
      onClick={abrir}
      disabled={abriendo}
      title={nombre ?? 'Ver comprobante'}
      aria-label={`Ver comprobante${nombre ? `: ${nombre}` : ''}`}
      className={`inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-[13px] transition-colors ${
        error
          ? 'bg-spark-suave text-rojo'
          : 'bg-papel-alt text-gris hover:bg-borde/50 hover:text-tinta'
      } disabled:opacity-50`}
    >
      {error ? 'No disponible' : abriendo ? '…' : 'Comprobante'}
    </button>
  )
}
