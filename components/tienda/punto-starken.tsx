'use client'

import { useEffect, useMemo, useState } from 'react'
import { buscarPuntosStarken, type PuntosStarken } from '@/app/comprar/acciones'
import type { PuntoStarken } from '@/lib/sucursales-starken'

/**
 * Elección del punto Starken donde el comprador retira.
 *
 * Sigue a la región y la comuna elegidas arriba: muestra los puntos de esa
 * comuna y, si no hay, los de la región. Lo que viaja al servidor es el id del
 * punto (`sucursal_id`); el texto que queda en el pedido lo arma el servidor.
 */

const MOSTRAR_BUSCADOR_DESDE = 6

function enlaceMapa(p: PuntoStarken): string {
  const q = p.lat && p.lng ? `${p.lat},${p.lng}` : `Starken ${p.nombre}, ${p.direccion}, ${p.comuna}`
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
}

const sinTildes = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export function SelectorPuntoStarken({
  region,
  comuna,
  inicial,
  disabled,
}: {
  region: string
  comuna: string
  inicial: PuntoStarken | null
  disabled?: boolean
}) {
  const [puntos, setPuntos] = useState<PuntosStarken | null>(null)
  const [cargando, setCargando] = useState(false)
  const [elegido, setElegido] = useState<number | null>(inicial?.id ?? null)
  const [filtro, setFiltro] = useState('')

  useEffect(() => {
    if (!region || !comuna) {
      setPuntos(null)
      return
    }
    let vigente = true
    setCargando(true)
    setFiltro('')
    buscarPuntosStarken(region, comuna)
      .then((r) => {
        if (!vigente) return
        setPuntos(r)
        // Si el punto guardado no es de esta búsqueda, no queda elegido a ciegas.
        const lista = [...r.enComuna, ...r.enRegion]
        setElegido((actual) => (actual && lista.some((p) => p.id === actual) ? actual : lista.length === 1 ? lista[0].id : null))
      })
      .finally(() => vigente && setCargando(false))
    return () => {
      vigente = false
    }
  }, [region, comuna])

  const lista = useMemo(() => (puntos ? [...puntos.enComuna, ...puntos.enRegion] : []), [puntos])
  const visibles = useMemo(() => {
    const f = sinTildes(filtro.trim())
    if (!f) return lista
    return lista.filter((p) => sinTildes(`${p.nombre} ${p.direccion} ${p.comuna} ${p.tipo}`).includes(f))
  }, [lista, filtro])

  if (!region || !comuna) {
    return (
      <p className="rounded-[14px] bg-papel-alt p-4 text-[14px] text-tinta-suave">
        Elige tu región y comuna y te mostramos los puntos Starken donde puedes retirar.
      </p>
    )
  }

  if (cargando && !puntos) {
    return <div className="h-28 animate-pulse rounded-[14px] bg-papel-alt" aria-label="Buscando puntos Starken" />
  }

  return (
    <div className="grid gap-3">
      <input type="hidden" name="sucursal_id" value={elegido ?? ''} />

      {puntos && puntos.enComuna.length === 0 && (
        <p className="text-[14px] text-tinta-suave">
          En {comuna} no hay puntos Starken. Estos son los de tu región: elige el que te quede más cerca.
        </p>
      )}
      {puntos && puntos.enComuna.length > 0 && (
        <p className="text-[14px] text-tinta-suave">
          {puntos.enComuna.length === 1 ? 'Hay 1 punto Starken' : `Hay ${puntos.enComuna.length} puntos Starken`} en {comuna}. Elige dónde retiras.
        </p>
      )}

      {lista.length >= MOSTRAR_BUSCADOR_DESDE && (
        <label className="relative block">
          <span className="sr-only">Buscar punto Starken</span>
          <svg aria-hidden viewBox="0 0 24 24" className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gris" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            placeholder="Busca por calle, nombre o comercio"
            disabled={disabled}
            className="w-full rounded-[12px] bg-papel py-3 pr-4 pl-10 text-[15px] ring-1 ring-borde focus:ring-2 focus:ring-[#009d4e] focus:outline-none"
          />
        </label>
      )}

      {lista.length === 0 ? (
        <p className="rounded-[14px] bg-papel-alt p-4 text-[14px] text-tinta-suave">
          No encontramos puntos Starken en tu región. Elige despacho a domicilio y te lo llevamos.
        </p>
      ) : (
        <div role="radiogroup" aria-label="Punto Starken donde retiras" className="grid max-h-[420px] gap-2 overflow-y-auto overscroll-contain pr-1">
          {visibles.map((p) => {
            const activo = elegido === p.id
            return (
              <div
                key={p.id}
                className={`rounded-[14px] p-3.5 transition-all duration-200 ${
                  activo ? 'bg-[#009d4e]/[0.06] ring-2 ring-[#009d4e]' : 'bg-papel ring-1 ring-borde hover:ring-[#009d4e]/50'
                }`}
              >
                <button
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  disabled={disabled}
                  onClick={() => setElegido(p.id)}
                  className="flex w-full items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#009d4e]"
                >
                  <span
                    aria-hidden
                    className={`mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full ring-1 transition-colors ${activo ? 'bg-[#009d4e] ring-[#009d4e]' : 'ring-borde'}`}
                  >
                    <span className={`size-[7px] rounded-full bg-white transition-opacity ${activo ? 'opacity-100' : 'opacity-0'}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="text-[15px] font-semibold text-tinta">{p.nombre}</span>
                      <span className="rounded-full bg-[#009d4e]/10 px-2 py-0.5 text-[11px] font-semibold text-[#007a3b]">{p.tipo}</span>
                    </span>
                    <span className="mt-0.5 block text-[13px] text-tinta-suave">
                      {p.direccion}
                      {p.comuna !== comuna ? ` · ${p.comuna}` : ''}
                    </span>
                    {p.horario && <span className="mt-0.5 block text-[12px] text-gris">{p.horario}</span>}
                  </span>
                </button>
                <a
                  href={enlaceMapa(p)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 ml-[30px] inline-block text-[12px] font-medium text-[#007a3b] hover:underline"
                >
                  Ver en el mapa<span className="sr-only"> (se abre en otra pestaña)</span>
                </a>
              </div>
            )
          })}
          {visibles.length === 0 && <p className="p-2 text-[14px] text-tinta-suave">Ningún punto coincide con «{filtro}».</p>}
        </div>
      )}
    </div>
  )
}
