'use client'

import { useMemo, useState, useTransition } from 'react'
import { skuDeVariante } from '@/lib/catalogo'
import { useAvisos } from '@/components/avisos'
import { crearVariantesEnLote } from './acciones-variantes'

const campo =
  'w-full rounded-[10px] bg-papel px-3 py-2 text-[13px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

type Fila = { nombre: string; color_hex: string; usarColor: boolean; precio: string }

export function VariantesLote({ productoId, skuProducto, desdeOrden, onCerrar }: {
  productoId: string
  skuProducto: string
  desdeOrden: number
  onCerrar: () => void
}) {
  const [texto, setTexto] = useState('Negro\nBlanco\nAzul')
  const [precio, setPrecio] = useState('')
  const [vista, setVista] = useState<Fila[]>([])
  const [pendiente, iniciar] = useTransition()
  const avisos = useAvisos()

  const nombres = useMemo(
    () => texto.split(/\n|,/).map((nombre) => nombre.trim()).filter(Boolean).slice(0, 30),
    [texto]
  )

  function preparar() {
    setVista(nombres.map((nombre) => ({ nombre, color_hex: '#1D1D1F', usarColor: true, precio })))
  }

  function guardar() {
    if (vista.length === 0) return preparar()
    const datos = new FormData()
    datos.set('producto_id', productoId)
    datos.set(
      'variantes',
      JSON.stringify(vista.map((fila, i) => ({
        nombre: fila.nombre,
        sku: skuDeVariante(skuProducto, fila.nombre),
        color_hex: fila.usarColor ? fila.color_hex : null,
        precio: fila.precio || null,
        orden: desdeOrden + i,
      })))
    )
    iniciar(async () => {
      const resultado = await crearVariantesEnLote(datos)
      if (!resultado.ok) return avisos.error(resultado.error)
      avisos.ok(`${resultado.creadas} variantes creadas. Carga el stock individual desde Stock.`)
      onCerrar()
    })
  }

  return (
    <section className="mt-3 rounded-[14px] bg-papel p-4 ring-2 ring-spark/25">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-[14px] font-semibold">Crear varias opciones</h4>
          <p className="mt-0.5 text-[12px] text-gris">Una por línea o separadas por coma. Revisa antes de guardar.</p>
        </div>
        <button type="button" onClick={onCerrar} className="text-[12px] text-gris">Cerrar</button>
      </div>
      {vista.length === 0 ? (
        <>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={5} maxLength={1200}
            placeholder="Negro&#10;Blanco&#10;Talla M" disabled={pendiente} className={`${campo} resize-y`} />
          <label className="mt-3 block text-[12px] font-medium text-gris">
            Precio opcional para todas
            <input value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^0-9]/g, ''))} inputMode="numeric"
              placeholder="Vacío = precio del producto" disabled={pendiente} className={`${campo} mt-1`} />
          </label>
          <button type="button" onClick={preparar} disabled={pendiente || nombres.length === 0}
            className="presionable mt-3 rounded-full bg-papel-alt px-4 py-2.5 text-[13px] font-medium disabled:opacity-50">
            Revisar {nombres.length || ''} variantes
          </button>
        </>
      ) : (
        <>
          <ul className="space-y-2">
            {vista.map((fila, i) => (
              <li key={`${fila.nombre}-${i}`} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 rounded-[10px] bg-papel-alt p-2">
                <div className="min-w-0"><p className="truncate text-[13px] font-medium">{fila.nombre}</p><p className="truncate text-[11px] text-gris">{skuDeVariante(skuProducto, fila.nombre)}</p></div>
                <input type="color" aria-label={`Color de ${fila.nombre}`} value={fila.color_hex} disabled={!fila.usarColor || pendiente}
                  onChange={(e) => setVista((actual) => actual.map((f, n) => n === i ? { ...f, color_hex: e.target.value.toUpperCase() } : f))}
                  className="size-9 rounded-[8px] border-0 bg-transparent p-0" />
                <button type="button" aria-label={`Quitar ${fila.nombre}`} disabled={pendiente}
                  onClick={() => setVista((actual) => actual.filter((_, n) => n !== i))} className="px-2 text-[12px] text-rojo">Quitar</button>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={guardar} disabled={pendiente || vista.length === 0}
              className="presionable rounded-full bg-spark px-4 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
              {pendiente ? 'Creando…' : `Crear ${vista.length} variantes`}
            </button>
            <button type="button" onClick={() => setVista([])} disabled={pendiente} className="px-3 text-[13px] text-gris">Volver</button>
          </div>
        </>
      )}
    </section>
  )
}
