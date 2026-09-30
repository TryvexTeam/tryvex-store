'use client'

import { useState } from 'react'
import { MAX_CAPSULAS, POSICIONES, leerPosicion, type Posicion } from '@/lib/destinos-pieza'
import { CampoDestino, type OpcionesDestino } from './campo-destino'

const campo =
  'w-full min-h-[44px] rounded-[10px] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'
const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

const NOMBRE_Y = { 0: 'arriba', 50: 'al centro', 100: 'abajo' } as const
const NOMBRE_X = { 0: 'a la izquierda', 50: 'al centro', 100: 'a la derecha' } as const

interface CapsulaGuardada {
  texto?: string
  boton?: string
  destino?: { tipo?: string; valor?: string }
  movil?: unknown
  escritorio?: unknown
}

/**
 * Dónde va la cápsula, en una rejilla de 3 × 3 que imita la forma de la
 * pantalla: vertical para teléfono, panorámica para escritorio. Nueve radios
 * reales, así que se elige con el pulgar, con el teclado o por voz.
 */
function Rejilla({ nombre, etiqueta, valor, alCambiar, vertical }: {
  nombre: string
  etiqueta: string
  valor: Posicion
  alCambiar: (p: Posicion) => void
  vertical: boolean
}) {
  return (
    <fieldset>
      <legend className={rotulo}>{etiqueta}</legend>
      <div className={`grid grid-cols-3 grid-rows-3 gap-1 rounded-[10px] bg-black/85 p-1.5 ${vertical ? 'aspect-[4/5] w-[112px]' : 'aspect-[21/9] w-[220px]'}`}>
        {POSICIONES.map((y) => POSICIONES.map((x) => {
          const elegida = valor.x === x && valor.y === y
          return (
            <label key={`${x}-${y}`} className="relative grid cursor-pointer place-items-center rounded-[6px] hover:bg-white/10">
              <input
                type="radio"
                name={nombre}
                value={`${x},${y}`}
                checked={elegida}
                onChange={() => alCambiar({ x, y })}
                className="peer sr-only"
              />
              <span className="sr-only">{NOMBRE_Y[y]} {NOMBRE_X[x]}</span>
              <span aria-hidden className="h-2.5 w-7 rounded-full bg-white/25 peer-checked:bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-spark" />
            </label>
          )
        }))}
      </div>
    </fieldset>
  )
}

function EditorCapsula({ indice, inicial, opciones, alQuitar }: {
  indice: number
  inicial: CapsulaGuardada
  opciones: OpcionesDestino
  alQuitar: () => void
}) {
  const [movil, setMovil] = useState(leerPosicion(inicial.movil, { x: 50, y: 100 }))
  const [escritorio, setEscritorio] = useState(leerPosicion(inicial.escritorio, { x: 100, y: 100 }))
  const p = `capsula_${indice}`

  return (
    <li className="rounded-[12px] bg-papel p-3 ring-1 ring-borde">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[13px] font-semibold text-tinta">Cápsula {indice + 1}</p>
        <button type="button" onClick={alQuitar} className="presionable inline-flex min-h-[44px] items-center rounded-full px-4 text-[13px] font-medium text-rojo hover:bg-rojo/10">
          Quitar
        </button>
      </div>
      <div className="mt-2 grid gap-3 md:grid-cols-2">
        <div>
          <label htmlFor={`${p}-texto`} className={rotulo}>Texto</label>
          <input id={`${p}-texto`} name={`${p}_texto`} defaultValue={inicial.texto ?? ''} maxLength={60} placeholder="Si lleva a un producto: «Desde $precio»" className={campo} />
        </div>
        <div>
          <label htmlFor={`${p}-boton`} className={rotulo}>Texto del botón</label>
          <input id={`${p}-boton`} name={`${p}_boton`} defaultValue={inicial.boton ?? ''} maxLength={30} placeholder="Comprar" className={campo} />
        </div>
        <div className="md:col-span-2">
          <CampoDestino prefijo={p} etiqueta="El botón lleva a" inicial={inicial.destino ?? {}} opciones={opciones} />
        </div>
        <div className="md:col-span-2 flex flex-wrap items-start gap-6">
          <Rejilla nombre={`${p}_movil`} etiqueta="Posición en teléfono" valor={movil} alCambiar={setMovil} vertical />
          <Rejilla nombre={`${p}_escritorio`} etiqueta="Posición en escritorio" valor={escritorio} alCambiar={setEscritorio} vertical={false} />
        </div>
      </div>
    </li>
  )
}

/**
 * Cápsulas sobre la escena: etiquetas con botón, como la de «Desde $45.000 ·
 * Comprar». Si la escena tiene alguna, reemplaza a la cápsula de compra que
 * trae de fábrica.
 */
export function CampoCapsulas({ iniciales, opciones }: { iniciales: unknown; opciones: OpcionesDestino }) {
  // Cada cápsula lleva una llave propia: al quitar la del medio, las demás
  // conservan lo escrito en vez de heredar los campos de su vecina.
  const [lista, setLista] = useState(() =>
    (Array.isArray(iniciales) ? (iniciales as CapsulaGuardada[]) : []).slice(0, MAX_CAPSULAS).map((c, i) => ({ id: i, c })),
  )
  const [siguiente, setSiguiente] = useState(lista.length)

  return (
    <fieldset className="md:col-span-2 rounded-[14px] bg-papel-alt/60 p-4 ring-1 ring-borde">
      <legend className="px-1 text-[13px] font-semibold text-tinta">Cápsulas sobre la escena</legend>
      <p className="text-[12px] leading-snug text-gris">
        Etiquetas con botón, como «Desde $45.000 · Comprar». Elige dónde va cada una en teléfono y en escritorio. Hasta {MAX_CAPSULAS}.
      </p>
      <input type="hidden" name="capsulas_n" value={lista.length} />
      {lista.length > 0 && (
        <ol className="mt-3 grid gap-3">
          {lista.map((item, i) => (
            <EditorCapsula key={item.id} indice={i} inicial={item.c} opciones={opciones} alQuitar={() => setLista((l) => l.filter((x) => x.id !== item.id))} />
          ))}
        </ol>
      )}
      {lista.length < MAX_CAPSULAS && (
        <button
          type="button"
          onClick={() => { setLista((l) => [...l, { id: siguiente, c: {} }]); setSiguiente((n) => n + 1) }}
          className="presionable mt-3 inline-flex min-h-[44px] items-center rounded-full bg-papel px-5 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-borde/40"
        >
          Agregar cápsula
        </button>
      )}
    </fieldset>
  )
}
