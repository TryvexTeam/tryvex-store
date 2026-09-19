'use client'

import { useRef, useState } from 'react'
import { Selector } from '@/components/selector'

/**
 * Selector de orden de la colección: aplica al elegir.
 *
 * Envía el formulario GET que lo contiene, así la URL sigue siendo la única
 * fuente del estado. Sin JavaScript, el botón «Aplicar» del formulario (en
 * <noscript>) cumple la misma función.
 *
 * Usa el selector de la casa en vez del desplegable del navegador: el nativo
 * no se puede diseñar y en el teléfono abre una rueda del sistema que no se
 * parece a nada del resto de la tienda.
 */
export function OrdenSelect({ orden, opciones }: { orden: string; opciones: Record<string, string> }) {
  const caja = useRef<HTMLDivElement>(null)
  const [valor, setValor] = useState(orden)

  return (
    <div ref={caja} className="min-w-[190px]">
      <Selector
        id="orden"
        name="orden"
        etiqueta="Ordenar"
        opciones={Object.entries(opciones).map(([valor, etiqueta]) => ({ valor, etiqueta }))}
        valor={valor}
        alCambiar={(v) => {
          setValor(v)
          // El campo oculto ya tiene el valor nuevo cuando esto corre, así que
          // el envío lleva la selección recién hecha.
          requestAnimationFrame(() => caja.current?.closest('form')?.requestSubmit())
        }}
      />
    </div>
  )
}
