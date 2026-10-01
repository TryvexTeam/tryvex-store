'use client'

import { Selector } from '@/components/selector'
import { ACENTOS, TEMAS_TEXTO, esHex, type Acento, type TemaTexto } from '@/lib/temas-escena'

const DEGRADADO = 'conic-gradient(from 180deg, #5ac8fa, #af52de, #ff2d55, #ff9500, #5ac8fa)'

/**
 * Colores del texto de una escena: el color base y el de resalte.
 *
 * El resalte se elige con muestras de color y no con una lista de nombres:
 * «Ámbar» no dice nada hasta que se ve. Cada muestra es un radio real, así
 * que funciona con teclado y lector de pantalla como cualquier formulario.
 */
export function CampoColores({ clave, tema, acento, libre, alCambiar }: {
  clave: string
  tema: TemaTexto
  acento: Acento
  libre: string | null
  alCambiar: (cambio: { tema_texto?: TemaTexto; acento?: Acento; acento_libre?: string | null }) => void
}) {
  const colorLibre = esHex(libre) ? libre : '#ff5a4f'
  return (
    <div className="grid gap-4">
      <Selector
        id={`tema-${clave}`}
        name="tema_texto"
        etiqueta="Color del texto"
        opciones={TEMAS_TEXTO}
        valor={tema}
        alCambiar={(v) => alCambiar({ tema_texto: v as TemaTexto })}
      />
      <div>
        <p id={`acento-${clave}`} className="mb-1 block text-[12px] font-medium text-gris">Resalte: segunda línea del titular y texto chico</p>
        <div role="radiogroup" aria-labelledby={`acento-${clave}`} className="flex flex-wrap items-center gap-1">
          {ACENTOS.map((a) => {
            const fondo = a.valor === 'degradado' ? DEGRADADO : a.valor === 'libre' ? colorLibre : a.color
            return (
              <label key={a.valor} title={a.etiqueta} className="relative grid size-11 cursor-pointer place-items-center">
                <input type="radio" name={`acento-${clave}`} value={a.valor} checked={acento === a.valor} onChange={() => alCambiar({ acento: a.valor })} className="peer sr-only" />
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
        {acento === 'libre' && (
          <label className="mt-2 flex items-center gap-3 text-[13px] text-tinta-suave">
            <input type="color" value={colorLibre} onChange={(e) => alCambiar({ acento_libre: e.target.value })} className="h-11 w-16 cursor-pointer rounded-[var(--radius-anidado)] bg-papel ring-1 ring-borde" />
            Elige el color · <span className="font-mono">{colorLibre}</span>
          </label>
        )}
        <p className="mt-1 text-[12px] text-gris">«Automático» deja el color de fábrica de la escena.</p>
      </div>
    </div>
  )
}
