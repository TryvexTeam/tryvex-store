'use client'

import { MAX_CAPSULAS, POSICIONES, type Posicion } from '@/lib/destinos-pieza'
import type { CapsulaBorrador } from '@/lib/escena-borrador'
import { CampoDestino, campo, type OpcionesDestino } from './campo-destino'

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const NOMBRE_Y = { 0: 'arriba', 50: 'al centro', 100: 'abajo' } as const
const NOMBRE_X = { 0: 'a la izquierda', 50: 'al centro', 100: 'a la derecha' } as const

const NUEVA: Omit<CapsulaBorrador, 'id'> = {
  texto: '',
  boton: 'Comprar',
  destino: { tipo: 'producto', valor: '' },
  movil: { x: 50, y: 100 },
  escritorio: { x: 100, y: 100 },
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
      <div className={`grid grid-cols-3 grid-rows-3 gap-1 rounded-[var(--radius-anidado)] bg-black/85 p-1.5 ${vertical ? 'aspect-[4/5] w-[112px]' : 'aspect-[21/9] w-[220px] max-w-full'}`}>
        {POSICIONES.map((y) => POSICIONES.map((x) => (
          <label key={`${x}-${y}`} className="relative grid cursor-pointer place-items-center rounded-[6px] hover:bg-white/10">
            <input type="radio" name={nombre} value={`${x},${y}`} checked={valor.x === x && valor.y === y} onChange={() => alCambiar({ x, y })} className="peer sr-only" />
            <span className="sr-only">{NOMBRE_Y[y]} {NOMBRE_X[x]}</span>
            <span aria-hidden className="h-2.5 w-7 rounded-full bg-white/25 peer-checked:bg-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-spark" />
          </label>
        )))}
      </div>
    </fieldset>
  )
}

/**
 * Cápsulas sobre la escena: etiquetas con botón, como «Desde $45.000 · Comprar».
 * La que venía de fábrica en algunas escenas aparece aquí como una más, para
 * poder moverla o quitarla.
 */
export function CampoCapsulas({ clave, capsulas, alCambiar, opciones }: {
  clave: string
  capsulas: CapsulaBorrador[]
  alCambiar: (c: CapsulaBorrador[]) => void
  opciones: OpcionesDestino
}) {
  const poner = (i: number, c: Partial<CapsulaBorrador>) => alCambiar(capsulas.map((x, j) => (j === i ? { ...x, ...c } : x)))
  return (
    <div>
      <p className="text-[12px] leading-snug text-gris">
        Etiquetas con botón. Elige dónde va cada una en teléfono y en escritorio. Hasta {MAX_CAPSULAS}.
      </p>
      {capsulas.length === 0 && <p className="mt-3 rounded-[var(--radius-anidado)] bg-papel p-4 text-[13px] text-tinta-suave ring-1 ring-borde">Esta escena no tiene cápsulas.</p>}
      {capsulas.length > 0 && (
        <ol className="mt-3 grid gap-3">
          {capsulas.map((c, i) => (
            <li key={c.id ?? i} className="rounded-[var(--radius-anidado)] bg-papel p-3 ring-1 ring-borde">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-tinta">Cápsula {i + 1}</p>
                <button type="button" onClick={() => alCambiar(capsulas.filter((_, j) => j !== i))} className="presionable inline-flex min-h-[44px] items-center rounded-full px-4 text-[13px] font-medium text-rojo hover:bg-rojo/10">
                  Quitar cápsula
                </button>
              </div>
              <div className="mt-2 grid gap-3 md:grid-cols-2">
                <div>
                  <label htmlFor={`ct-${clave}-${i}`} className={rotulo}>Texto</label>
                  <input id={`ct-${clave}-${i}`} value={c.texto} onChange={(e) => poner(i, { texto: e.target.value })} maxLength={60} placeholder="Vacío = «Desde $precio»" className={campo} />
                </div>
                <div>
                  <label htmlFor={`cb-${clave}-${i}`} className={rotulo}>Texto del botón</label>
                  <input id={`cb-${clave}-${i}`} value={c.boton} onChange={(e) => poner(i, { boton: e.target.value })} maxLength={30} placeholder="Comprar" className={campo} />
                </div>
                <div className="md:col-span-2">
                  <CampoDestino id={`cd-${clave}-${i}`} etiqueta="El botón lleva a" valor={c.destino} alCambiar={(d) => poner(i, { destino: d })} opciones={opciones} />
                </div>
                <div className="flex flex-wrap items-start gap-6 md:col-span-2">
                  <Rejilla nombre={`cm-${clave}-${i}`} etiqueta="Posición en teléfono" valor={c.movil} alCambiar={(p) => poner(i, { movil: p })} vertical />
                  <Rejilla nombre={`ce-${clave}-${i}`} etiqueta="Posición en escritorio" valor={c.escritorio} alCambiar={(p) => poner(i, { escritorio: p })} vertical={false} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
      {capsulas.length < MAX_CAPSULAS && (
        <button type="button" onClick={() => alCambiar([...capsulas, { ...NUEVA, id: `n${Date.now()}` }])} className="presionable mt-3 inline-flex min-h-[44px] items-center rounded-full bg-papel px-5 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-borde/40">
          Agregar cápsula
        </button>
      )}
    </div>
  )
}
