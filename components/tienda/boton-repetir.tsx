'use client'

import { useState, useTransition } from 'react'
import { useBolsa } from '@/components/tienda/bolsa'
import { repetirPedido } from '@/app/cuenta/acciones'

/**
 * Volver a comprar lo mismo.
 *
 * Lo que se agrega a la bolsa sale de una cotización nueva contra el catálogo
 * de hoy, no de los precios del pedido viejo: entre una compra y otra un
 * producto puede haber cambiado de precio, agotarse o dejar de publicarse.
 *
 * Si algo quedó fuera se dice antes de abrir la bolsa. Enterarse en el
 * checkout de que falta la mitad del pedido es la peor forma de descubrirlo.
 */
export function BotonRepetir({ pedidoId }: { pedidoId: string }) {
  const bolsa = useBolsa()
  const [pendiente, iniciar] = useTransition()
  const [aviso, setAviso] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  function repetir() {
    setAviso(null)
    setError(null)
    iniciar(async () => {
      const r = await repetirPedido(pedidoId)
      if (!r.ok) {
        setError(r.error)
        return
      }
      for (const l of r.lineas) bolsa.agregar(l)
      if (r.avisos.length > 0) {
        setAviso(
          r.avisos.length === 1
            ? `Agregamos el resto. Quedó fuera ${r.avisos[0]}`
            : `Agregamos el resto. Quedaron fuera ${r.avisos.length} productos.`
        )
      }
      bolsa.abrir()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={repetir}
        disabled={pendiente}
        className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-[14px] font-semibold ring-1 ring-borde ring-inset transition-colors hover:bg-papel disabled:opacity-60"
      >
        <svg viewBox="0 0 14 14" aria-hidden className="size-3.5">
          <path
            d="M12 7a5 5 0 1 1-1.46-3.54M12 1.5V4.5H9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {pendiente ? 'Agregando…' : 'Volver a comprar'}
      </button>

      {(aviso || error) && (
        <p role="status" className={`mt-2 w-full text-[13px] ${error ? 'text-ambar' : 'text-tinta-suave'}`}>
          {error ?? aviso}
        </p>
      )}
    </>
  )
}
