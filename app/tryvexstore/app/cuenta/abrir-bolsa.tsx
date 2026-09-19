'use client'

import Link from 'next/link'
import { useBolsa } from '@/components/tienda/bolsa'
import { clp } from '@/lib/formato'

/** La bolsa vive en este navegador; aquí se resume y se abre la hoja existente. */
export function AbrirBolsa() {
  const { unidades, subtotal, abrir } = useBolsa()

  if (unidades === 0) {
    return (
      <div className="mt-4 text-[15px] text-tinta-suave">
        <p>Tu bolsa está vacía.</p>
        <Link href="/tienda" className="mt-4 inline-block font-semibold text-spark hover:underline">Ir a la tienda →</Link>
      </div>
    )
  }

  return (
    <div className="mt-4">
      <p className="text-[15px] text-tinta-suave">{unidades} {unidades === 1 ? 'producto' : 'productos'} · <span className="cifra font-semibold text-tinta">{clp(subtotal)}</span></p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={abrir} className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt">Ver bolsa</button>
        <Link href="/comprar" className="tienda-boton bg-tinta text-white hover:bg-tinta/90">Pagar</Link>
      </div>
    </div>
  )
}
