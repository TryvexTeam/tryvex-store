'use client'

import { useEffect, useId, useRef, useState } from 'react'

export interface OpcionSelector {
  valor: string
  etiqueta: string
}

/**
 * Selector propio, en vez del desplegable del navegador.
 *
 * El nativo no se puede diseñar: cada sistema lo dibuja a su manera y en el
 * teléfono abre una rueda que no se parece a nada del resto de la tienda. Este
 * se ve como la casa y, en pantallas chicas, abre como hoja desde abajo — al
 * alcance del pulgar y con opciones grandes.
 *
 * Reemplazar un control nativo obliga a devolver lo que traía de fábrica, que
 * es lo que se pierde en la mayoría de estos componentes:
 *   · teclado completo (flechas, Inicio/Fin, Enter, Escape, escribir para ir)
 *   · anuncio correcto a lectores de pantalla (combobox + listbox + option)
 *   · un campo real que el formulario envía, con `required` si hace falta
 *
 * Si algo de eso falla, el nativo era mejor.
 */
export function Selector({
  id,
  name,
  etiqueta,
  opciones,
  valor,
  alCambiar,
  placeholder = 'Elige una opción',
  required,
  disabled,
  className = '',
}: {
  id?: string
  name: string
  etiqueta: string
  opciones: readonly OpcionSelector[]
  valor: string
  alCambiar: (v: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
  className?: string
}) {
  const auto = useId()
  const idBoton = id ?? `sel-${auto}`
  const idLista = `${idBoton}-lista`

  const [abierto, setAbierto] = useState(false)
  const [activo, setActivo] = useState(0)
  const caja = useRef<HTMLDivElement>(null)
  const lista = useRef<HTMLUListElement>(null)
  const busqueda = useRef({ texto: '', hasta: 0 })

  const elegida = opciones.find((o) => o.valor === valor) ?? null

  // Al abrir, el foco arranca en la opción elegida, no en la primera: el
  // usuario ve dónde está parado en vez de perder su selección de vista.
  useEffect(() => {
    if (!abierto) return
    const i = opciones.findIndex((o) => o.valor === valor)
    setActivo(i >= 0 ? i : 0)
  }, [abierto, valor, opciones])

  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener('mousedown', fuera)
    return () => document.removeEventListener('mousedown', fuera)
  }, [abierto])

  useEffect(() => {
    if (!abierto || !lista.current) return
    lista.current.querySelector<HTMLElement>('[data-activo="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [abierto, activo])

  function elegir(i: number) {
    const o = opciones[i]
    if (!o) return
    alCambiar(o.valor)
    setAbierto(false)
  }

  function teclas(e: React.KeyboardEvent) {
    if (disabled) return

    if (!abierto) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        setAbierto(true)
      }
      return
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        setAbierto(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setActivo((i) => Math.min(opciones.length - 1, i + 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActivo((i) => Math.max(0, i - 1))
        break
      case 'Home':
        e.preventDefault()
        setActivo(0)
        break
      case 'End':
        e.preventDefault()
        setActivo(opciones.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        elegir(activo)
        break
      case 'Tab':
        setAbierto(false)
        break
      default: {
        // Escribir salta a la opción que empieza así, como el control nativo.
        if (e.key.length !== 1) return
        const ahora = Date.now()
        const texto = ahora - busqueda.current.hasta > 700 ? e.key : busqueda.current.texto + e.key
        busqueda.current = { texto, hasta: ahora }
        const i = opciones.findIndex((o) => o.etiqueta.toLowerCase().startsWith(texto.toLowerCase()))
        if (i >= 0) setActivo(i)
      }
    }
  }

  return (
    <div ref={caja} className={`relative ${className}`}>
      {/* El valor viaja en un campo real: el formulario lo envía igual que
          antes y la validación del navegador sigue funcionando. */}
      <input type="hidden" name={name} value={valor} required={required} />

      <button
        type="button"
        id={idBoton}
        role="combobox"
        aria-expanded={abierto}
        aria-controls={abierto ? idLista : undefined}
        aria-haspopup="listbox"
        aria-label={etiqueta}
        disabled={disabled}
        onClick={() => setAbierto((v) => !v)}
        onKeyDown={teclas}
        className="flex min-h-[56px] w-full items-center justify-between gap-3 rounded-[12px] bg-papel px-4 pt-5 pb-1.5 text-left ring-1 ring-borde transition-shadow focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60"
      >
        <span className="min-w-0 flex-1">
          <span className="pointer-events-none absolute top-2 left-4 text-[12px] text-gris">{etiqueta}</span>
          <span className={`block truncate text-[16px] ${elegida ? 'text-tinta' : 'text-gris'}`}>
            {elegida ? elegida.etiqueta : placeholder}
          </span>
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden className={`shrink-0 text-gris transition-transform ${abierto ? 'rotate-180' : ''}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {abierto && (
        <>
          {/* En teléfono la lista sube desde abajo; el velo permite cerrarla
              tocando fuera, que es el gesto que la gente intenta primero. */}
          <button
            type="button"
            aria-label="Cerrar lista"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 bg-tinta/20 t:hidden"
          />
          <ul
            ref={lista}
            id={idLista}
            role="listbox"
            aria-label={etiqueta}
            tabIndex={-1}
            className="pad-seguro-abajo fixed inset-x-0 bottom-0 z-50 max-h-[62vh] overflow-y-auto rounded-t-[22px] bg-papel p-2 shadow-2xl
                       t:absolute t:inset-x-auto t:top-full t:bottom-auto t:z-50 t:mt-1 t:max-h-[300px] t:w-full t:rounded-[14px] t:p-1.5 t:ring-1 t:ring-borde"
          >
            <li aria-hidden className="mx-auto mb-2 h-1 w-10 rounded-full bg-borde t:hidden" />
            {opciones.map((o, i) => {
              const seleccionada = o.valor === valor
              return (
                <li key={o.valor} role="option" aria-selected={seleccionada} data-activo={i === activo}>
                  <button
                    type="button"
                    onClick={() => elegir(i)}
                    onMouseEnter={() => setActivo(i)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-[10px] px-3 text-left text-[15px] ${
                      i === activo ? 'bg-papel-alt' : ''
                    } ${seleccionada ? 'font-semibold text-tinta' : 'text-tinta-suave'}`}
                  >
                    {o.etiqueta}
                    {seleccionada && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0 text-spark">
                        <path d="m5 12 5 5 9-10" />
                      </svg>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}
    </div>
  )
}
