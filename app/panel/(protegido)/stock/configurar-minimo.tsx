'use client'

import { useState, useTransition } from 'react'
import { guardarStockMinimo } from './acciones'

export function ConfigurarMinimo({ productoId, minimo }: { productoId: string; minimo: number }) {
  const [valor, setValor] = useState(String(minimo))
  const [mensaje, setMensaje] = useState<string | null>(null)
  const [guardando, iniciar] = useTransition()

  function guardar() {
    setMensaje(null)
    const datos = new FormData()
    datos.set('producto_id', productoId)
    datos.set('stock_minimo', valor)
    iniciar(async () => {
      const resultado = await guardarStockMinimo(datos)
      setMensaje(resultado.ok ? 'Mínimo actualizado.' : resultado.error)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="text-[12.5px] text-tinta-suave" htmlFor={`minimo-${productoId}`}>Avisarme cuando queden</label>
      <input
        id={`minimo-${productoId}`}
        type="number"
        min="0"
        max="1000000"
        inputMode="numeric"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        disabled={guardando}
        className="cifra h-10 w-16 rounded-[10px] bg-papel px-2 text-center text-[14px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none"
      />
      <button type="button" onClick={guardar} disabled={guardando} className="text-[12px] font-medium text-spark hover:underline disabled:opacity-40">
        {guardando ? 'Guardando…' : 'Guardar alerta'}
      </button>
      {mensaje && <span role={mensaje === 'Mínimo actualizado.' ? 'status' : 'alert'} className="sr-only">{mensaje}</span>}
    </div>
  )
}
