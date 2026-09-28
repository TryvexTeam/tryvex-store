'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Mientras el pago se confirma, la página se vuelve a pedir sola cada pocos
 * segundos. Cada vuelta, el servidor le pregunta a Mercado Pago por la order
 * (no espera el aviso), así que lo normal es que en uno o dos intentos el
 * comprador vea su pedido confirmado sin tocar nada.
 *
 * Con tope: si Mercado Pago tarda más, se deja de insistir y se le explica al
 * comprador que no pague de nuevo.
 */
const INTERVALO_MS = 3000
const INTENTOS = 12

export function EsperaPago() {
  const router = useRouter()
  const [intento, setIntento] = useState(0)
  const agotado = intento >= INTENTOS

  useEffect(() => {
    if (agotado) return
    const t = setTimeout(() => {
      router.refresh()
      setIntento((n) => n + 1)
    }, INTERVALO_MS)
    return () => clearTimeout(t)
  }, [intento, agotado, router])

  return (
    <div className="mt-8 w-full max-w-[420px]">
      <div className="h-1 overflow-hidden rounded-full bg-black/[0.06]">
        <div
          className="h-full rounded-full bg-tinta transition-[width] duration-[3000ms] ease-linear motion-reduce:transition-none"
          style={{ width: `${Math.min(100, ((intento + 1) / INTENTOS) * 100)}%` }}
        />
      </div>
      <p role="status" className="mt-4 text-[15px] leading-relaxed text-tinta-suave">
        {agotado
          ? 'Mercado Pago está tardando más de lo normal. Si el cobro salió bien, tu pedido se confirma solo en unos minutos y te llega un correo. No vuelvas a pagar.'
          : 'Esto suele tardar unos segundos. No cierres esta página ni vuelvas a pagar.'}
      </p>
      {agotado && (
        <button
          type="button"
          onClick={() => setIntento(0)}
          className="tienda-boton mt-4 text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt"
        >
          Revisar de nuevo
        </button>
      )}
    </div>
  )
}
