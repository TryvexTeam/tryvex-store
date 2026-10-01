'use client'

import Image from 'next/image'
import { useMemo, useState } from 'react'
import { Pildora } from '@/components/panel/ui'
import { ConfigurarMinimo } from '@/app/panel/(protegido)/stock/configurar-minimo'

/**
 * Inventario del panel: resumen, filtros, búsqueda y filas compactas.
 *
 * Antes la alerta de stock bajo concatenaba TODOS los productos en un párrafo
 * (con 47 productos, un muro de texto) y debajo iban 48 tarjetas enormes.
 * Con un catálogo grande lo que hace falta es lo de Revolut: primero cuántos
 * hay en cada situación, después filtrar y buscar, y recién entonces el detalle.
 *
 * Estados: «sin stock» (0), «bajo» (por debajo del mínimo) y «al día». El texto
 * lo dice; el color solo acompaña.
 */

export interface FilaInventario {
  producto_id: string
  sku: string
  nombre: string
  stock: number
  minimo: number
  imagen: string | null
  variantes: { id: string; nombre: string; stock: number }[]
}

type Filtro = 'todos' | 'reponer' | 'sin' | 'bajo' | 'aldia'
type Estado = 'sin' | 'bajo' | 'aldia'

const estadoDe = (f: FilaInventario): Estado => (f.stock <= 0 ? 'sin' : f.stock <= f.minimo ? 'bajo' : 'aldia')
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const POR_PAGINA = 24

export function InventarioStock({ filas, filtroInicial }: { filas: FilaInventario[]; filtroInicial?: Filtro }) {
  const [filtro, setFiltro] = useState<Filtro>(filtroInicial ?? 'reponer')
  const [busqueda, setBusqueda] = useState('')
  const [visibles, setVisibles] = useState(POR_PAGINA)

  const conteo = useMemo(() => {
    const c = { sin: 0, bajo: 0, aldia: 0 }
    for (const f of filas) c[estadoDe(f)]++
    return c
  }, [filas])
  const porReponer = conteo.sin + conteo.bajo

  const lista = useMemo(() => {
    const q = sinTildes(busqueda.trim())
    return filas
      .filter((f) => {
        const e = estadoDe(f)
        if (filtro === 'reponer' && e === 'aldia') return false
        if (filtro === 'sin' && e !== 'sin') return false
        if (filtro === 'bajo' && e !== 'bajo') return false
        if (filtro === 'aldia' && e !== 'aldia') return false
        return !q || sinTildes(`${f.nombre} ${f.sku}`).includes(q)
      })
      // Lo más urgente primero: sin stock, luego lo más lejos de su mínimo.
      .sort((a, b) => a.stock - a.minimo - (b.stock - b.minimo) || a.nombre.localeCompare(b.nombre, 'es'))
  }, [filas, filtro, busqueda])

  function elegir(f: Filtro) {
    setFiltro(f)
    setVisibles(POR_PAGINA)
  }

  const chips: { id: Filtro; etiqueta: string; n: number }[] = [
    { id: 'reponer', etiqueta: 'Por reponer', n: porReponer },
    { id: 'sin', etiqueta: 'Sin stock', n: conteo.sin },
    { id: 'bajo', etiqueta: 'Stock bajo', n: conteo.bajo },
    { id: 'aldia', etiqueta: 'Al día', n: conteo.aldia },
    { id: 'todos', etiqueta: 'Todos', n: filas.length },
  ]

  return (
    <section aria-label="Inventario" className="mb-10">
      {/* Resumen: la alerta de antes, en una línea que se puede leer. */}
      {porReponer > 0 ? (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--radius-widget)] bg-spark-suave px-4 py-3.5">
          <p className="min-w-0 flex-1 text-[14.5px] text-rojo">
            <strong className="cifra font-semibold">{porReponer}</strong> {porReponer === 1 ? 'producto necesita' : 'productos necesitan'} reposición
            {conteo.sin > 0 && (
              <>
                {' '}
                · <strong className="cifra font-semibold">{conteo.sin}</strong> sin stock
              </>
            )}
          </p>
          {filtro !== 'reponer' && (
            <button type="button" onClick={() => elegir('reponer')} className="text-[13px] font-semibold text-rojo underline underline-offset-2">
              Ver cuáles
            </button>
          )}
        </div>
      ) : (
        <p role="status" className="mb-5 rounded-[var(--radius-widget)] bg-verde/10 px-4 py-3.5 text-[14.5px] text-verde">
          Todo el inventario está sobre su mínimo.
        </p>
      )}

      <div className="mb-4 space-y-3">
        <nav aria-label="Filtrar inventario" className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filtro === c.id}
              onClick={() => elegir(c.id)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${
                filtro === c.id ? 'bg-tinta text-white' : 'bg-papel text-tinta-suave ring-1 ring-borde/80 hover:ring-gris'
              }`}
            >
              {c.etiqueta}
              <span className={`cifra ${filtro === c.id ? 'text-white/65' : 'text-gris'}`}>{c.n}</span>
            </button>
          ))}
        </nav>
        <input
          type="search"
          value={busqueda}
          onChange={(e) => {
            setBusqueda(e.target.value)
            setVisibles(POR_PAGINA)
          }}
          placeholder="Buscar por nombre o SKU"
          aria-label="Buscar en el inventario"
          className="min-h-11 w-full rounded-[var(--radius-anidado)] bg-papel px-4 text-[15px] text-tinta ring-1 ring-borde placeholder:text-gris focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta sm:max-w-sm"
        />
      </div>

      {lista.length === 0 ? (
        <div className="rounded-[var(--radius-widget)] bg-papel px-6 py-12 text-center ring-1 ring-borde/60">
          <p className="text-[15px] text-gris">{busqueda ? `Nada coincide con «${busqueda}».` : 'No hay productos en este filtro.'}</p>
        </div>
      ) : (
        <>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.slice(0, visibles).map((f) => {
              const e = estadoDe(f)
              return (
                <li
                  key={f.producto_id}
                  className={`rounded-[var(--radius-widget)] bg-papel p-4 ring-1 ${e === 'sin' ? 'ring-rojo/35' : e === 'bajo' ? 'ring-ambar/35' : 'ring-borde/60'}`}
                >
                  <div className="flex items-start gap-3.5">
                    <span className="relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-papel-alt">
                      {f.imagen ? (
                        <Image src={f.imagen} alt="" fill sizes="64px" className={`object-contain p-1.5 ${e === 'sin' ? 'opacity-60' : ''}`} />
                      ) : (
                        <span aria-hidden className="grid size-full place-items-center text-[11px] text-gris">Sin foto</span>
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-[14.5px] leading-snug font-medium">{f.nombre}</p>
                        <Pildora tono={e === 'sin' ? 'rojo' : e === 'bajo' ? 'ambar' : 'verde'} className="shrink-0">
                          {e === 'sin' ? 'Sin stock' : e === 'bajo' ? 'Bajo' : 'Al día'}
                        </Pildora>
                      </div>
                      <p className="mt-0.5 truncate text-[12px] text-gris">{f.sku}</p>
                      <p className="cifra mt-2 flex items-baseline gap-1.5">
                        <span className="text-[1.7rem] leading-none font-semibold" aria-label={`${f.stock} unidades`}>{f.stock}</span>
                        <span className="text-[12px] text-gris">{f.stock === 1 ? 'unidad' : 'unidades'} · mínimo {f.minimo}</span>
                      </p>
                    </div>
                  </div>
                  {f.variantes.length > 0 && (
                    <ul className="mt-3 flex flex-wrap gap-1.5 text-[12px] text-tinta-suave">
                      {f.variantes.map((v) => (
                        <li key={v.id} className="rounded-full bg-papel-alt px-2.5 py-1">
                          {v.nombre} <span className="cifra font-semibold">{v.stock}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <ConfigurarMinimo productoId={f.producto_id} minimo={f.minimo} />
                </li>
              )
            })}
          </ul>
          {lista.length > visibles && (
            <button
              type="button"
              onClick={() => setVisibles((v) => v + POR_PAGINA)}
              className="mx-auto mt-5 flex min-h-11 items-center rounded-full bg-papel px-6 text-[14px] font-medium ring-1 ring-borde hover:ring-gris"
            >
              Ver más ({lista.length - visibles} restantes)
            </button>
          )}
        </>
      )}
    </section>
  )
}
