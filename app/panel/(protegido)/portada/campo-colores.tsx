'use client'

import { useState } from 'react'
import { Selector } from '@/components/selector'
import { ACENTOS, TEMAS_TEXTO, esHex, type Acento } from '@/lib/temas-escena'

const DEGRADADO = 'conic-gradient(from 180deg, #5ac8fa, #af52de, #ff2d55, #ff9500, #5ac8fa)'

/**
 * Colores del texto de una escena: el color base y el de resalte.
 *
 * El resalte se elige con muestras de color y no con una lista de nombres:
 * «Ámbar» no dice nada hasta que se ve. Cada muestra es un radio real, así
 * que funciona con teclado y lector de pantalla como cualquier formulario.
 */
export function CampoColores({ clave, tema, acento, libre }: {
  clave: string
  tema: unknown
  acento: unknown
  libre: unknown
}) {
  const [temaTexto, setTemaTexto] = useState(TEMAS_TEXTO.find((t) => t.valor === tema)?.valor ?? 'auto')
  const [elegido, setElegido] = useState<Acento>(ACENTOS.find((a) => a.valor === acento)?.valor ?? 'auto')
  const [colorLibre, setColorLibre] = useState(esHex(libre) ? libre : '#ff5a4f')

  return (
    <fieldset className="md:col-span-2 grid gap-4 rounded-[14px] bg-papel-alt/60 p-4 ring-1 ring-borde md:grid-cols-2">
      <legend className="px-1 text-[13px] font-semibold text-tinta">Colores del texto</legend>

      <Selector
        id={`tema-${clave}`}
        name="tema_texto"
        etiqueta="Color del texto"
        opciones={TEMAS_TEXTO}
        valor={temaTexto}
        alCambiar={(v) => setTemaTexto(v as typeof temaTexto)}
      />

      <div>
        <p id={`acento-${clave}`} className="mb-1 block text-[12px] font-medium text-gris">
          Resalte: segunda línea del titular y texto chico
        </p>
        <div role="radiogroup" aria-labelledby={`acento-${clave}`} className="flex flex-wrap items-center gap-2">
          {ACENTOS.map((a) => {
            const fondo = a.valor === 'degradado' ? DEGRADADO : a.valor === 'libre' ? colorLibre : a.color
            return (
              <label key={a.valor} title={a.etiqueta} className="relative grid size-11 cursor-pointer place-items-center">
                <input
                  type="radio"
                  name="acento"
                  value={a.valor}
                  checked={elegido === a.valor}
                  onChange={() => setElegido(a.valor)}
                  className="peer sr-only"
                />
                <span className="sr-only">{a.etiqueta}</span>
                <span
                  aria-hidden
                  className="grid size-8 place-items-center rounded-full ring-1 ring-borde peer-checked:ring-2 peer-checked:ring-tinta peer-checked:ring-offset-2 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-spark"
                  style={{ background: fondo ?? 'var(--color-papel)' }}
                >
                  {a.valor === 'auto' && <span className="text-[11px] font-semibold text-gris">A</span>}
                  {a.valor === 'libre' && <span className="text-[15px] font-semibold text-white mix-blend-difference">+</span>}
                </span>
              </label>
            )
          })}
        </div>
        {elegido === 'libre' && (
          <label className="mt-2 flex items-center gap-3 text-[13px] text-tinta-suave">
            <input
              type="color"
              name="acento_libre"
              value={colorLibre}
              onChange={(e) => setColorLibre(e.target.value)}
              className="h-11 w-16 cursor-pointer rounded-[10px] bg-papel ring-1 ring-borde"
            />
            Elige el color · <span className="font-mono">{colorLibre}</span>
          </label>
        )}
        <p className="mt-1 text-[12px] text-gris">«Automático» deja el color que trae la escena.</p>
      </div>
    </fieldset>
  )
}
