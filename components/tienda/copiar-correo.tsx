'use client'

import { useEffect, useRef, useState } from 'react'
import { notificar } from '@/lib/notificar'

type Estado = 'listo' | 'copiado' | 'fallo'

/**
 * Copia el correo al portapapeles y lo dice en voz alta para quien usa lector
 * de pantalla. Si el navegador no deja copiar (contexto no seguro, permiso
 * denegado), lo avisa en vez de fingir que funcionó: el correo sigue visible
 * arriba para copiarlo a mano.
 */
export function CopiarCorreo({ correo, className }: { correo: string; className?: string }) {
  const [estado, setEstado] = useState<Estado>('listo')
  const temporizador = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(temporizador.current), [])

  async function copiar() {
    let siguiente: Estado = 'copiado'
    try {
      await navigator.clipboard.writeText(correo)
    } catch {
      siguiente = 'fallo'
    }
    setEstado(siguiente)
    if (siguiente === 'copiado') void notificar.ok('Correo copiado', correo)
    else void notificar.error('No se pudo copiar', 'Selecciona el correo y cópialo a mano.')
    window.clearTimeout(temporizador.current)
    temporizador.current = window.setTimeout(() => setEstado('listo'), 2400)
  }

  const texto = estado === 'copiado' ? 'Copiado' : estado === 'fallo' ? 'No se pudo copiar' : 'Copiar correo'

  return (
    <>
      <button type="button" onClick={copiar} className={className}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          {estado === 'copiado' ? <path d="m5 12.5 4.5 4.5L19 7.5" /> : <path d="M9 9h10v11H9zM5 15V4h10" />}
        </svg>
        {texto}
      </button>
    </>
  )
}
