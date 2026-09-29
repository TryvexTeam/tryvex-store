'use client'

import { useMemo, useState, useTransition } from 'react'
import Image from 'next/image'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAvisos } from '@/components/avisos'
import { MAX_LO_NUEVO } from '@/lib/orden-coleccion'
import { guardarLoNuevo, guardarOrdenTienda } from './acciones'

export interface ProductoOrden {
  id: string
  nombre: string
  imagen: string | null
  agotado: boolean
}

type Pestana = 'nuevo' | 'tienda'
type Resultado = { ok: true } | { ok: false; error: string }

/**
 * Dos listas que se ordenan arrastrando, como el orden de la galería:
 *  - «Todo lo nuevo»: los productos elegidos para la portada. Se agregan
 *    desde la lista de abajo y se quitan con la ×.
 *  - «Tienda»: el catálogo completo, en el orden de /tienda.
 *
 * Se arrastra desde el asa (⋮⋮): el resto de la fila deja hacer scroll con el
 * dedo, que en una lista de 50 productos es lo que más se hace. En el teléfono
 * hay que mantener presionada el asa un instante; con el teclado, espacio
 * para tomar, flechas para mover y espacio para soltar.
 */
export function Ordenar({ productos, loNuevo }: { productos: ProductoOrden[]; loNuevo: string[] }) {
  const avisos = useAvisos()
  const [pestana, setPestana] = useState<Pestana>('nuevo')
  const [nuevo, setNuevo] = useState(loNuevo)
  const [tienda, setTienda] = useState(productos.map((p) => p.id))
  const [guardando, empezar] = useTransition()
  const [busqueda, setBusqueda] = useState('')

  const porId = useMemo(() => new Map(productos.map((p) => [p.id, p])), [productos])

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  /** Aplica el cambio al tiro y lo guarda; si falla, vuelve a como estaba. */
  function guardar(
    previo: string[],
    siguiente: string[],
    fijar: (l: string[]) => void,
    accion: (l: string[]) => Promise<Resultado>,
    mensaje: string
  ) {
    fijar(siguiente)
    empezar(async () => {
      const r = await accion(siguiente)
      if (r.ok) avisos.ok(mensaje)
      else {
        fijar(previo)
        avisos.error(r.error)
      }
    })
  }

  const soltarEn = (lista: string[], fijar: (l: string[]) => void, accion: (l: string[]) => Promise<Resultado>) =>
    ({ active, over }: DragEndEvent) => {
      if (!over || active.id === over.id) return
      const siguiente = arrayMove(lista, lista.indexOf(String(active.id)), lista.indexOf(String(over.id)))
      guardar(lista, siguiente, fijar, accion, 'Orden guardado.')
    }

  const quitar = (id: string) =>
    guardar(nuevo, nuevo.filter((x) => x !== id), setNuevo, guardarLoNuevo, 'Quitado de «Todo lo nuevo».')
  const agregar = (id: string) => {
    if (nuevo.length >= MAX_LO_NUEVO) return avisos.error(`«Todo lo nuevo» admite hasta ${MAX_LO_NUEVO} productos.`)
    guardar(nuevo, [...nuevo, id], setNuevo, guardarLoNuevo, 'Agregado a «Todo lo nuevo».')
  }

  const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  const disponibles = productos.filter(
    (p) => !nuevo.includes(p.id) && (!busqueda || normal(p.nombre).includes(normal(busqueda)))
  )

  const pestanas: { id: Pestana; rotulo: string; cuenta: number }[] = [
    { id: 'nuevo', rotulo: 'Todo lo nuevo', cuenta: nuevo.length },
    { id: 'tienda', rotulo: 'Tienda', cuenta: tienda.length },
  ]

  return (
    <div>
      <div role="tablist" aria-label="Qué ordenar" className="mb-5 grid grid-cols-2 gap-1 rounded-[14px] bg-papel-alt p-1 ring-1 ring-borde/60">
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={pestana === p.id}
            onClick={() => setPestana(p.id)}
            className={`presionable min-h-11 rounded-[10px] text-[14px] font-semibold transition-colors ${
              pestana === p.id ? 'bg-papel text-tinta shadow-[0_1px_4px_rgb(0_0_0/10%)]' : 'text-tinta-suave hover:text-tinta'
            }`}
          >
            {p.rotulo} <span className="cifra font-normal text-gris">{p.cuenta}</span>
          </button>
        ))}
      </div>

      {pestana === 'nuevo' ? (
        <section aria-label="Todo lo nuevo">
          <p className="mb-3 text-[13px] leading-relaxed text-tinta-suave">
            Es la fila «Todo lo nuevo» de la portada, en este orden. Hasta {MAX_LO_NUEVO} productos.
          </p>
          {nuevo.length === 0 ? (
            <p className="rounded-[14px] bg-papel px-4 py-8 text-center text-[14px] text-tinta-suave ring-1 ring-borde/70">
              No hay productos elegidos: la portada muestra los 8 publicados más recientes. Agrega abajo los que quieras destacar.
            </p>
          ) : (
            <Lista
              ids={nuevo}
              porId={porId}
              sensores={sensores}
              alSoltar={soltarEn(nuevo, setNuevo, guardarLoNuevo)}
              ocupado={guardando}
              alQuitar={quitar}
            />
          )}

          <div className="mt-8">
            <h2 className="text-[17px] font-semibold">Agregar a «Todo lo nuevo»</h2>
            <label htmlFor="orden-buscar" className="sr-only">Buscar producto</label>
            <input
              id="orden-buscar"
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar producto…"
              className="mt-3 w-full rounded-[12px] bg-papel px-4 py-3 text-[15px] ring-1 ring-borde placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none"
            />
            <ul className="mt-3 divide-y divide-borde/60 overflow-hidden rounded-[14px] bg-papel ring-1 ring-borde/70">
              {disponibles.length === 0 && <li className="px-4 py-5 text-center text-[14px] text-tinta-suave">Nada que agregar.</li>}
              {disponibles.map((p) => (
                <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                  <Miniatura producto={p} />
                  <span className="min-w-0 flex-1 truncate text-[14px]">{p.nombre}</span>
                  <button
                    type="button"
                    onClick={() => agregar(p.id)}
                    disabled={guardando}
                    aria-label={`Agregar ${p.nombre} a Todo lo nuevo`}
                    className="presionable inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[13px] font-semibold text-spark hover:bg-spark-suave disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : (
        <section aria-label="Orden de la tienda">
          <p className="mb-3 text-[13px] leading-relaxed text-tinta-suave">
            Es el orden de /tienda («Destacados»). Lo que publiques después aparece al final hasta que lo muevas.
          </p>
          <Lista
            ids={tienda}
            porId={porId}
            sensores={sensores}
            alSoltar={soltarEn(tienda, setTienda, guardarOrdenTienda)}
            ocupado={guardando}
          />
        </section>
      )}
    </div>
  )
}

function Lista({
  ids,
  porId,
  sensores,
  alSoltar,
  ocupado,
  alQuitar,
}: {
  ids: string[]
  porId: Map<string, ProductoOrden>
  sensores: ReturnType<typeof useSensors>
  alSoltar: (e: DragEndEvent) => void
  ocupado: boolean
  alQuitar?: (id: string) => void
}) {
  const visibles = ids.filter((id) => porId.has(id))
  return (
    <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
      <SortableContext items={visibles} strategy={verticalListSortingStrategy}>
        <ol className="space-y-2">
          {visibles.map((id, i) => (
            <Fila key={id} producto={porId.get(id)!} posicion={i + 1} total={visibles.length} ocupado={ocupado} alQuitar={alQuitar} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function Fila({
  producto,
  posicion,
  total,
  ocupado,
  alQuitar,
}: {
  producto: ProductoOrden
  posicion: number
  total: number
  ocupado: boolean
  alQuitar?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: producto.id })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative flex items-center gap-2 rounded-[14px] bg-papel py-2 pr-2 pl-1 ring-1 ${
        isDragging ? 'z-10 shadow-[0_12px_32px_rgb(0_0_0/18%)] ring-2 ring-tinta' : 'ring-borde/70'
      }`}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`${producto.nombre}, posición ${posicion} de ${total}. Mantén presionado o usa espacio y flechas para mover.`}
        className="grid min-h-11 w-10 shrink-0 cursor-grab touch-none place-items-center rounded-[10px] text-gris hover:bg-papel-alt hover:text-tinta active:cursor-grabbing"
      >
        <svg aria-hidden width="14" height="20" viewBox="0 0 14 20" fill="currentColor">
          <circle cx="4" cy="4" r="1.6" /><circle cx="10" cy="4" r="1.6" />
          <circle cx="4" cy="10" r="1.6" /><circle cx="10" cy="10" r="1.6" />
          <circle cx="4" cy="16" r="1.6" /><circle cx="10" cy="16" r="1.6" />
        </svg>
      </button>
      <span className="cifra w-6 shrink-0 text-center text-[13px] font-semibold text-gris">{posicion}</span>
      <Miniatura producto={producto} />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium">{producto.nombre}</span>
        {producto.agotado && <span className="text-[12px] text-ambar">Sin stock</span>}
      </span>
      {alQuitar && (
        <button
          type="button"
          onClick={() => alQuitar(producto.id)}
          disabled={ocupado}
          aria-label={`Quitar ${producto.nombre} de Todo lo nuevo`}
          className="presionable grid size-11 shrink-0 place-items-center rounded-full text-gris hover:bg-rojo/10 hover:text-rojo disabled:opacity-50"
        >
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <path d="M3 3l8 8M11 3l-8 8" />
          </svg>
        </button>
      )}
    </li>
  )
}

function Miniatura({ producto }: { producto: ProductoOrden }) {
  return (
    <span className="relative size-11 shrink-0 overflow-hidden rounded-[10px] bg-papel-alt">
      {producto.imagen && <Image src={producto.imagen} alt="" fill sizes="44px" className="object-contain p-1" />}
    </span>
  )
}
