'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { clp } from '@/lib/formato'

export const ORDENES = {
  recientes: 'Más recientes',
  'menor-precio': 'Menor precio',
  'mayor-precio': 'Mayor precio',
} as const
export type Orden = keyof typeof ORDENES

export interface EstadoFiltros {
  cat?: string
  busqueda: string
  disponibles: boolean
  ofertas: boolean
  min?: number
  max?: number
  orden: Orden
}

/** Tramos de precio listos para tocar: casi nadie escribe un rango a mano. */
const TRAMOS: { etiqueta: string; min?: number; max?: number }[] = [
  { etiqueta: 'Hasta $20.000', max: 20000 },
  { etiqueta: '$20.000 a $50.000', min: 20000, max: 50000 },
  { etiqueta: 'Más de $50.000', min: 50000 },
]

/** Dirección de /tienda con los filtros actuales y un cambio aplicado. */
function hrefCon(e: EstadoFiltros, cambio: Partial<Record<'cat' | 'q' | 'disponibles' | 'ofertas' | 'orden' | 'min' | 'max', string | null>>): string {
  const actual: Record<string, string | undefined> = {
    cat: e.cat,
    q: e.busqueda || undefined,
    disponibles: e.disponibles ? '1' : undefined,
    ofertas: e.ofertas ? '1' : undefined,
    orden: e.orden !== 'recientes' ? e.orden : undefined,
    min: e.min?.toString(),
    max: e.max?.toString(),
  }
  const u = new URLSearchParams()
  for (const [k, v] of Object.entries({ ...actual, ...cambio })) if (v) u.set(k, v)
  const s = u.toString()
  return s ? `/tienda?${s}` : '/tienda'
}

const pildora = (activa: boolean) =>
  `inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-4 text-[14px] whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${
    activa ? 'bg-tinta text-white' : 'bg-papel text-tinta ring-1 ring-borde hover:ring-gris'
  }`

function Flecha() {
  return (
    <svg aria-hidden width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="m2 3.5 3 3 3-3" />
    </svg>
  )
}

const opcion = (activa: boolean) =>
  `flex min-h-10 w-full items-center justify-between gap-4 rounded-[10px] px-3 text-left text-[15px] ${activa ? 'font-semibold text-tinta' : 'text-tinta-suave hover:bg-papel-alt hover:text-tinta'}`

const panel =
  'absolute top-[calc(100%+8px)] z-40 max-w-[calc(100vw-32px)] rounded-[18px] bg-papel p-2 shadow-[0_12px_40px_rgb(0_0_0/14%)] ring-1 ring-black/5'

/** Campos ocultos que conservan los filtros al enviar un formulario GET. */
function Conservar({ estado, sin }: { estado: EstadoFiltros; sin: ('q' | 'precio')[] }) {
  return (
    <>
      {estado.cat && <input type="hidden" name="cat" value={estado.cat} />}
      {!sin.includes('q') && estado.busqueda && <input type="hidden" name="q" value={estado.busqueda} />}
      {estado.disponibles && <input type="hidden" name="disponibles" value="1" />}
      {estado.ofertas && <input type="hidden" name="ofertas" value="1" />}
      {estado.orden !== 'recientes' && <input type="hidden" name="orden" value={estado.orden} />}
      {!sin.includes('precio') && estado.min !== undefined && <input type="hidden" name="min" value={estado.min} />}
      {!sin.includes('precio') && estado.max !== undefined && <input type="hidden" name="max" value={estado.max} />}
    </>
  )
}

/**
 * Barra de filtros de la tienda, como la del listado de accesorios de
 * apple.com/cl: píldoras a la izquierda y «Ordenar por» a la derecha. Al
 * bajar queda flotando bajo la cabecera, como una cápsula translúcida.
 *
 * Las píldoras van en una sola fila que se desliza (en el teléfono se
 * apilaban en tres líneas y, al flotar, tapaban media pantalla). Por eso los
 * desplegables no cuelgan de su píldora sino de la barra: dentro de una fila
 * con desplazamiento quedarían recortados.
 *
 * Todo vive en la URL: un filtro se comparte copiando el enlace, funciona con
 * atrás/adelante y el servidor entrega la lista ya filtrada.
 */
export function FiltrosColeccion({ estado, resultados }: { estado: EstadoFiltros; resultados: number }) {
  const centinela = useRef<HTMLDivElement>(null)
  const barra = useRef<HTMLDivElement>(null)
  const [flotando, setFlotando] = useState(false)
  const [buscando, setBuscando] = useState(Boolean(estado.busqueda))
  const [abierto, setAbierto] = useState<'precio' | 'orden' | null>(null)
  const cerrar = () => setAbierto(null)

  useEffect(() => {
    const el = centinela.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => setFlotando(!e.isIntersecting), { rootMargin: '-60px 0px 0px 0px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // Un desplegable abierto se cierra al tocar fuera de la barra o con Escape.
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: PointerEvent) => {
      if (!barra.current?.contains(e.target as Node)) setAbierto(null)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(null)
    addEventListener('pointerdown', fuera)
    addEventListener('keydown', tecla)
    return () => {
      removeEventListener('pointerdown', fuera)
      removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const conPrecio = estado.min !== undefined || estado.max !== undefined
  const etiquetaPrecio = conPrecio
    ? estado.min !== undefined && estado.max !== undefined
      ? `${clp(estado.min)} – ${clp(estado.max)}`
      : estado.max !== undefined
        ? `Hasta ${clp(estado.max)}`
        : `Desde ${clp(estado.min ?? 0)}`
    : 'Precio'
  const hayFiltros = estado.disponibles || estado.ofertas || conPrecio || Boolean(estado.busqueda)
  const alternar = (cual: 'precio' | 'orden') => setAbierto((a) => (a === cual ? null : cual))

  return (
    <>
      <div ref={centinela} aria-hidden className="mt-6 h-px t:mt-10" />
      <div className="sticky top-[calc(var(--alto-cabecera)+10px)] z-30 px-[var(--canal)]">
        <div
          ref={barra}
          className={`relative flex items-center gap-2 transition-[background-color,box-shadow,padding] duration-300 ${
            flotando ? 'rounded-full bg-papel/80 px-2 py-2 shadow-[0_8px_30px_rgb(0_0_0/10%)] ring-1 ring-black/5 backdrop-blur-xl' : 'py-2'
          }`}
        >
          <div className="sin-barra -my-1 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto py-1">
            {/* Buscar: una píldora que se abre en campo. */}
            {buscando ? (
              <form action="/tienda" role="search" className="relative shrink-0">
                <Conservar estado={estado} sin={['q']} />
                <label htmlFor="buscar" className="sr-only">Buscar productos</label>
                <input
                  id="buscar"
                  name="q"
                  defaultValue={estado.busqueda}
                  placeholder="Buscar"
                  maxLength={60}
                  autoFocus={!estado.busqueda}
                  className="h-9 w-[150px] rounded-full bg-papel pr-3 pl-9 text-[14px] ring-1 ring-tinta placeholder:text-gris focus:outline-none t:w-[220px]"
                />
                <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-gris">
                  <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
                </svg>
              </form>
            ) : (
              <button type="button" onClick={() => setBuscando(true)} className={pildora(false)} aria-label="Buscar productos">
                <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                <span className="hidden t:inline">Buscar</span>
              </button>
            )}

            <Link href={hrefCon(estado, { disponibles: estado.disponibles ? null : '1' })} className={pildora(estado.disponibles)} aria-pressed={estado.disponibles}>
              Disponibles
            </Link>
            <Link href={hrefCon(estado, { ofertas: estado.ofertas ? null : '1' })} className={pildora(estado.ofertas)} aria-pressed={estado.ofertas}>
              Ofertas
            </Link>
            <button type="button" aria-expanded={abierto === 'precio'} aria-haspopup="true" onClick={() => alternar('precio')} className={pildora(conPrecio)}>
              {etiquetaPrecio}
              <Flecha />
            </button>
            {hayFiltros && (
              <Link href={hrefCon(estado, { q: null, disponibles: null, ofertas: null, min: null, max: null })} className="shrink-0 px-2 text-[14px] whitespace-nowrap text-gris hover:text-tinta">
                Borrar filtros
              </Link>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span className="cifra hidden text-[14px] text-gris d:inline" aria-live="polite">
              {resultados} {resultados === 1 ? 'artículo' : 'artículos'}
            </span>
            <button
              type="button"
              aria-expanded={abierto === 'orden'}
              aria-haspopup="true"
              onClick={() => alternar('orden')}
              className={pildora(false)}
              aria-label={`Ordenar por: ${ORDENES[estado.orden]}`}
            >
              <span className="hidden text-gris t:inline">Ordenar por:</span>
              <span className="hidden t:inline">{ORDENES[estado.orden]}</span>
              {/* En el teléfono basta el ícono: la fila no da para el texto. */}
              <svg aria-hidden className="t:hidden" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
              </svg>
              <span className="hidden t:inline"><Flecha /></span>
            </button>
          </div>

          {abierto === 'precio' && (
            <div className={`${panel} left-0 w-[280px]`}>
              <ul>
                {TRAMOS.map((t) => {
                  const activo = estado.min === t.min && estado.max === t.max
                  return (
                    <li key={t.etiqueta}>
                      <Link href={hrefCon(estado, { min: t.min?.toString() ?? null, max: t.max?.toString() ?? null })} onClick={cerrar} className={opcion(activo)}>
                        {t.etiqueta}
                        {activo && <span aria-hidden>✓</span>}
                      </Link>
                    </li>
                  )
                })}
              </ul>
              {/* Rango propio, para quien sí quiere escribirlo. */}
              <form action="/tienda" className="mt-1 grid grid-cols-2 gap-2 border-t border-borde/70 px-1 pt-3 pb-1">
                <Conservar estado={estado} sin={['precio']} />
                <label className="text-[12px] text-gris">
                  Desde
                  <input name="min" inputMode="numeric" pattern="[0-9]*" defaultValue={estado.min ?? ''} placeholder="$0" className="mt-1 h-10 w-full rounded-[10px] bg-papel-alt px-3 text-[15px] text-tinta focus:ring-2 focus:ring-tinta focus:outline-none" />
                </label>
                <label className="text-[12px] text-gris">
                  Hasta
                  <input name="max" inputMode="numeric" pattern="[0-9]*" defaultValue={estado.max ?? ''} placeholder="Sin límite" className="mt-1 h-10 w-full rounded-[10px] bg-papel-alt px-3 text-[15px] text-tinta focus:ring-2 focus:ring-tinta focus:outline-none" />
                </label>
                <button type="submit" className="col-span-2 mt-1 h-10 rounded-full bg-tinta text-[14px] font-medium text-white hover:bg-tinta/85">Aplicar</button>
              </form>
              {conPrecio && (
                <Link href={hrefCon(estado, { min: null, max: null })} onClick={cerrar} className="mt-1 block px-3 py-2 text-center text-[13px] text-gris hover:text-tinta">
                  Quitar filtro de precio
                </Link>
              )}
            </div>
          )}

          {abierto === 'orden' && (
            <ul className={`${panel} right-0 w-[240px]`}>
              {(Object.keys(ORDENES) as Orden[]).map((o) => (
                <li key={o}>
                  <Link href={hrefCon(estado, { orden: o === 'recientes' ? null : o })} onClick={cerrar} className={opcion(estado.orden === o)}>
                    {ORDENES[o]}
                    {estado.orden === o && <span aria-hidden>✓</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}
