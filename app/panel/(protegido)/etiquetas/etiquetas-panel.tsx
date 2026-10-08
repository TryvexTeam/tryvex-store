'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { useAvisos } from '@/components/avisos'
import { ponerEtiqueta, quitarEtiqueta } from './acciones'

export type ProductoEtiqueta = {
  id: string
  nombre: string
  sku: string
  etiqueta: string | null
  publicado: boolean
  imagen: string | null
  categoria: string | null
}

const campo = 'w-full min-h-11 rounded-[var(--radius-anidado)] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
const SUGERENCIAS = ['Cyber', 'Oferta', 'Nuevo', 'Más vendido']

/**
 * Etiquetas en lote: escribir una etiqueta («Cyber»), marcar productos y
 * ponerla o quitarla de todos a la vez. La tienda la muestra en la card,
 * junto al descuento si lo hay.
 */
export function EtiquetasPanel({ productos }: { productos: ProductoEtiqueta[] }) {
  const avisos = useAvisos()
  const [pendiente, iniciar] = useTransition()
  const [etiqueta, setEtiqueta] = useState('Cyber')
  const [buscar, setBuscar] = useState('')
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())

  const visibles = useMemo(() => {
    const q = buscar.trim().toLocaleLowerCase('es-CL')
    if (!q) return productos
    return productos.filter((p) => `${p.nombre} ${p.sku} ${p.categoria ?? ''} ${p.etiqueta ?? ''}`.toLocaleLowerCase('es-CL').includes(q))
  }, [productos, buscar])

  const etiquetasEnUso = useMemo(() => {
    const cuenta = new Map<string, number>()
    for (const p of productos) if (p.etiqueta) cuenta.set(p.etiqueta, (cuenta.get(p.etiqueta) ?? 0) + 1)
    return [...cuenta.entries()].sort((a, b) => b[1] - a[1])
  }, [productos])

  const todosVisiblesElegidos = visibles.length > 0 && visibles.every((p) => elegidos.has(p.id))

  function alternar(id: string) {
    setElegidos((actual) => {
      const nuevo = new Set(actual)
      if (nuevo.has(id)) nuevo.delete(id)
      else nuevo.add(id)
      return nuevo
    })
  }

  function alternarVisibles() {
    setElegidos((actual) => {
      const nuevo = new Set(actual)
      for (const p of visibles) {
        if (todosVisiblesElegidos) nuevo.delete(p.id)
        else nuevo.add(p.id)
      }
      return nuevo
    })
  }

  function elegirConEtiqueta(texto: string) {
    setElegidos(new Set(productos.filter((p) => p.etiqueta === texto).map((p) => p.id)))
  }

  function ejecutar(accion: 'poner' | 'quitar') {
    const datos = new FormData()
    for (const id of elegidos) datos.append('ids', id)
    datos.set('etiqueta', etiqueta)
    const cuantos = elegidos.size
    iniciar(async () => {
      const r = accion === 'poner' ? await ponerEtiqueta(datos) : await quitarEtiqueta(datos)
      if (!r.ok) return avisos.error(r.error)
      avisos.ok(
        accion === 'poner'
          ? `Etiqueta «${etiqueta.trim()}» puesta en ${cuantos} ${cuantos === 1 ? 'producto' : 'productos'}.`
          : `Etiqueta quitada de ${cuantos} ${cuantos === 1 ? 'producto' : 'productos'}.`,
      )
      setElegidos(new Set())
    })
  }

  const conOtraEtiqueta = productos.filter((p) => elegidos.has(p.id) && p.etiqueta && p.etiqueta !== etiqueta.trim()).length

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.022em] sm:text-[2.2rem]">Etiquetas</h1>
        <p className="mt-1 max-w-[68ch] text-[14px] text-gris sm:text-[15px]">
          Pon o quita una etiqueta («Cyber», «Oferta»…) en varios productos a la vez. Se ve en la tarjeta del producto en la tienda. Cada producto lleva una sola etiqueta.
        </p>
      </header>

      <section className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70 sm:p-6">
        <label htmlFor="etiqueta-texto" className="text-[13px] font-medium text-gris">Etiqueta</label>
        <input id="etiqueta-texto" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} maxLength={24} className={`${campo} mt-1 max-w-[320px]`} />
        <div className="mt-3 flex flex-wrap gap-2">
          {SUGERENCIAS.map((s) => (
            <button key={s} type="button" onClick={() => setEtiqueta(s)} className={`presionable min-h-10 rounded-full px-3.5 text-[12px] font-medium ${etiqueta === s ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta'}`}>
              {s}
            </button>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" disabled={pendiente || elegidos.size === 0 || !etiqueta.trim()} onClick={() => ejecutar('poner')} className="presionable min-h-11 rounded-full bg-spark px-5 text-[13px] font-semibold text-white disabled:opacity-50">
            {pendiente ? 'Guardando…' : `Poner «${etiqueta.trim() || '…'}» en ${elegidos.size}`}
          </button>
          <button type="button" disabled={pendiente || elegidos.size === 0} onClick={() => ejecutar('quitar')} className="presionable min-h-11 rounded-full bg-papel-alt px-5 text-[13px] font-semibold text-tinta disabled:opacity-50">
            Quitar etiqueta de {elegidos.size}
          </button>
        </div>
        {conOtraEtiqueta > 0 && (
          <p className="mt-3 text-[13px] text-ambar">
            {conOtraEtiqueta} {conOtraEtiqueta === 1 ? 'producto elegido ya tiene' : 'productos elegidos ya tienen'} otra etiqueta: se reemplazará.
          </p>
        )}

        {etiquetasEnUso.length > 0 && (
          <div className="mt-5 border-t border-borde/60 pt-4">
            <p className="text-[13px] font-medium text-gris">En uso: toca una para elegir sus productos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {etiquetasEnUso.map(([texto, n]) => (
                <button key={texto} type="button" onClick={() => elegirConEtiqueta(texto)} className="presionable min-h-10 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta">
                  {texto} <span className="text-gris">· {n}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      <section aria-labelledby="etiquetas-lista">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="etiquetas-lista" className="text-[18px] font-semibold">Productos</h2>
          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="etiquetas-buscar" className="sr-only">Buscar producto</label>
            <input id="etiquetas-buscar" type="search" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar por nombre, SKU o categoría" className={`${campo} w-[260px]`} />
            <button type="button" onClick={alternarVisibles} className="presionable min-h-11 rounded-full bg-papel-alt px-4 text-[13px] font-medium text-tinta">
              {todosVisiblesElegidos ? 'Desmarcar todos' : `Marcar todos (${visibles.length})`}
            </button>
          </div>
        </div>

        <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">
          {visibles.map((p) => (
            <li key={p.id}>
              <label className="flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-papel-alt/60">
                <input type="checkbox" checked={elegidos.has(p.id)} onChange={() => alternar(p.id)} className="size-5 shrink-0 accent-[var(--color-spark)]" />
                <span className="relative size-10 shrink-0 overflow-hidden rounded-[10px] bg-papel-alt">
                  {p.imagen && <Image src={p.imagen} alt="" fill sizes="64px" className="object-contain" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium text-tinta">{p.nombre}</span>
                  <span className="block truncate text-[12px] text-gris">{[p.categoria, p.sku, p.publicado ? null : 'Borrador'].filter(Boolean).join(' · ')}</span>
                </span>
                {p.etiqueta && <span className="shrink-0 rounded-full bg-papel-alt px-2.5 py-1 text-[11px] font-semibold text-vino">{p.etiqueta}</span>}
              </label>
            </li>
          ))}
          {visibles.length === 0 && <li className="px-4 py-6 text-[14px] text-gris">No hay productos que coincidan con la búsqueda.</li>}
        </ul>
      </section>
    </div>
  )
}
