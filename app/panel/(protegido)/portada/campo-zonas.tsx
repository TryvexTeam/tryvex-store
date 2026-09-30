'use client'

import { useState } from 'react'
import { Selector } from '@/components/selector'
import { DIVISIONES, NOMBRES_DIVISION, esDivision, type Division } from '@/lib/destinos-pieza'
import { CampoDestino, type OpcionesDestino } from './campo-destino'

const campo =
  'w-full min-h-[44px] rounded-[10px] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'

interface ZonaGuardada {
  destino?: { tipo?: string; valor?: string }
  etiqueta?: string
}

/**
 * Partir la imagen en zonas que llevan a lugares distintos.
 *
 * Las divisiones son fijas (mitades, tercios) en vez de un recuadro dibujado
 * a mano: se eligen bien con el pulgar y valen igual para la foto vertical
 * del teléfono y la panorámica del escritorio. La vista previa pinta las
 * zonas sobre la imagen real para que se vea qué parte lleva a dónde.
 */
export function CampoZonas({ clave, divisionInicial, zonasIniciales, foto, opciones }: {
  clave: string
  divisionInicial: unknown
  zonasIniciales: unknown
  foto: string
  opciones: OpcionesDestino
}) {
  const inicial: Division = esDivision(divisionInicial) ? divisionInicial : 'completa'
  const [division, setDivision] = useState<Division>(inicial)
  // Las zonas guardadas solo valen para la división con que se guardaron.
  const guardadas = (division === inicial && Array.isArray(zonasIniciales) ? zonasIniciales : []) as ZonaGuardada[]
  const areas = DIVISIONES[division]

  return (
    <fieldset className="md:col-span-2 rounded-[14px] bg-papel-alt/60 p-4 ring-1 ring-borde">
      <legend className="px-1 text-[13px] font-semibold text-tinta">Zonas de la imagen</legend>
      <p className="text-[12px] leading-snug text-gris">
        Parte la imagen para que cada parte lleve a un lugar distinto. Por ejemplo, la mitad izquierda a TikTok y la derecha a Instagram.
      </p>

      <div className="mt-3 grid gap-4 md:grid-cols-[minmax(0,320px)_1fr] md:items-start">
        <div>
          <Selector
            id={`div-${clave}`}
            name="division"
            etiqueta="Cómo se reparte"
            opciones={(Object.keys(DIVISIONES) as Division[]).map((d) => ({ valor: d, etiqueta: NOMBRES_DIVISION[d] }))}
            valor={division}
            alCambiar={(v) => esDivision(v) && setDivision(v)}
          />
          {/* Vista previa: la imagen real con las zonas numeradas encima. */}
          <div aria-hidden className="relative mt-3 aspect-[21/9] w-full overflow-hidden rounded-[10px] bg-black">
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={foto} alt="" className="size-full object-cover opacity-80" />
            )}
            {areas.map((a, i) => (
              <span
                key={i}
                className="absolute grid place-items-center border border-dashed border-white/90 bg-spark/15 text-[15px] font-semibold text-white [text-shadow:0_1px_3px_rgb(0_0_0/60%)]"
                style={{ left: `${a.x}%`, top: `${a.y}%`, width: `${a.ancho}%`, height: `${a.alto}%` }}
              >
                {areas.length > 1 ? i + 1 : ''}
              </span>
            ))}
          </div>
        </div>

        {division === 'completa' ? (
          <p className="text-[13px] leading-snug text-tinta-suave">
            Toda la imagen lleva al destino que elijas arriba en «Al tocarla, lleva a». Si no eliges ninguno, la imagen no se puede tocar y solo funciona el botón.
          </p>
        ) : (
          <ol className="grid gap-4">
            {areas.map((a, i) => {
              const g = guardadas[i] ?? {}
              return (
                // La clave cambia con la división: al cambiar de mitades a tercios, cada zona arranca limpia.
                <li key={`${division}-${i}`} className="rounded-[12px] bg-papel p-3 ring-1 ring-borde">
                  <p className="text-[13px] font-semibold text-tinta">{i + 1}. {a.nombre}</p>
                  <div className="mt-2 grid gap-3">
                    <CampoDestino prefijo={`zona_${i}`} etiqueta="Lleva a" inicial={g.destino ?? {}} opciones={opciones} />
                    <div>
                      <label htmlFor={`ze-${clave}-${i}`} className="mb-1 block text-[12px] font-medium text-gris">Nombre del enlace</label>
                      <input id={`ze-${clave}-${i}`} name={`zona_${i}_etiqueta`} defaultValue={g.etiqueta ?? ''} maxLength={80} placeholder="Por ejemplo: TikTok de Tryvex Store" className={campo} />
                      {/* Quien navega con lector de pantalla no ve la imagen: escucha este nombre. */}
                      <p className="mt-1 text-[12px] text-gris">Lo que escucha quien usa lector de pantalla.</p>
                    </div>
                  </div>
                </li>
              )
            })}
          </ol>
        )}
      </div>
    </fieldset>
  )
}
