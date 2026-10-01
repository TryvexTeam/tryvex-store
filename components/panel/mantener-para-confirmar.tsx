'use client'

import { useEffect, useRef, type KeyboardEvent } from 'react'

/*
 * Inspirado en HoldButton de React Bits (https://reactbits.dev), de David Haz.
 * Copyright (c) 2026 David Haz. Licencia MIT + Commons Clause: se puede usar
 * dentro de un sitio o producto, no revender el componente. Aviso conservado.
 *
 * Reemplaza al `confirm()` nativo del navegador en acciones que no se deshacen:
 * el relleno sube mientras se mantiene presionado y, al completarse, se ejecuta.
 * Soltar antes cancela y el relleno vuelve a cero.
 *
 * Diferencias con el original:
 *  - El relleno es una variable CSS registrada (@property --p) animada por el
 *    navegador: sin rAF ni estado por cuadro.
 *  - Accesible por teclado: Enter o Espacio mantenidos hacen lo mismo que el
 *    puntero. Quien use lector de pantalla recibe la instrucción en la
 *    descripción del botón.
 *  - Sin movimiento reducido, el relleno no se anima pero mantener sigue siendo
 *    necesario: la espera es parte de la confirmación, no de la decoración.
 */

export function MantenerParaConfirmar({
  etiqueta,
  ayuda,
  onConfirmar,
  disabled = false,
  duracion = 900,
  className = '',
}: {
  etiqueta: string
  /** Qué pasa al confirmar; se lee en voz alta antes de tocar. */
  ayuda?: string
  onConfirmar: () => void
  disabled?: boolean
  /** Milisegundos que hay que mantener. */
  duracion?: number
  className?: string
}) {
  const boton = useRef<HTMLButtonElement>(null)
  const reloj = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const enCurso = useRef(false)

  useEffect(() => () => clearTimeout(reloj.current), [])

  function empezar() {
    if (disabled || enCurso.current) return
    enCurso.current = true
    boton.current?.setAttribute('data-manteniendo', 'true')
    reloj.current = setTimeout(() => {
      enCurso.current = false
      boton.current?.removeAttribute('data-manteniendo')
      navigator.vibrate?.(14)
      onConfirmar()
    }, duracion)
  }

  function soltar() {
    if (!enCurso.current) return
    enCurso.current = false
    clearTimeout(reloj.current)
    boton.current?.removeAttribute('data-manteniendo')
  }

  const alTeclear = (e: KeyboardEvent<HTMLButtonElement>) => {
    if ((e.key === 'Enter' || e.key === ' ') && !e.repeat) {
      e.preventDefault()
      empezar()
    }
  }
  const alSoltarTecla = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') soltar()
  }

  return (
    <button
      ref={boton}
      type="button"
      disabled={disabled}
      style={{ ['--duracion' as string]: `${duracion}ms` }}
      aria-description={`Mantén presionado para confirmar.${ayuda ? ` ${ayuda}` : ''}`}
      onPointerDown={(e) => e.button === 0 && empezar()}
      onPointerUp={soltar}
      onPointerLeave={soltar}
      onPointerCancel={soltar}
      onKeyDown={alTeclear}
      onKeyUp={alSoltarTecla}
      onBlur={soltar}
      onContextMenu={(e) => e.preventDefault()}
      className={`mantener ${className}`}
    >
      {etiqueta}
      <span aria-hidden className="mantener-capa">{etiqueta}</span>
    </button>
  )
}
