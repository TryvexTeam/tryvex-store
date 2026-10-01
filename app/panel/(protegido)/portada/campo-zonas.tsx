'use client'

import { Selector } from '@/components/selector'
import { DIVISIONES, NOMBRES_DIVISION, esDivision, type Division } from '@/lib/destinos-pieza'
import type { ZonaBorrador } from '@/lib/escena-borrador'
import { CampoDestino, campo, type OpcionesDestino } from './campo-destino'

const VACIA: ZonaBorrador = { destino: { tipo: 'ninguno', valor: '' }, etiqueta: '' }

/**
 * Partir la imagen en zonas que llevan a lugares distintos.
 *
 * Las divisiones son fijas (mitades, tercios) en vez de un recuadro dibujado
 * a mano: se eligen bien con el pulgar y valen igual para la foto vertical
 * del teléfono y la panorámica del escritorio. La vista previa de arriba
 * pinta estas mismas zonas sobre la imagen.
 */
export function CampoZonas({ clave, division, zonas, alCambiar, opciones }: {
  clave: string
  division: Division
  zonas: ZonaBorrador[]
  alCambiar: (division: Division, zonas: ZonaBorrador[]) => void
  opciones: OpcionesDestino
}) {
  const areas = DIVISIONES[division]
  const zona = (i: number): ZonaBorrador => zonas[i] ?? VACIA
  const poner = (i: number, z: ZonaBorrador) => alCambiar(division, areas.map((_, j) => (j === i ? z : zona(j))))

  return (
    <div className="grid gap-4">
      <Selector
        id={`div-${clave}`}
        name="division"
        etiqueta="Cómo se reparte la imagen"
        opciones={(Object.keys(DIVISIONES) as Division[]).map((d) => ({ valor: d, etiqueta: NOMBRES_DIVISION[d] }))}
        valor={division}
        alCambiar={(v) => esDivision(v) && alCambiar(v, v === 'completa' ? [] : DIVISIONES[v].map((_, i) => (v === division ? zona(i) : VACIA)))}
      />

      {division === 'completa' ? (
        <p className="text-[13px] leading-snug text-tinta-suave">
          Toda la imagen lleva al mismo destino que el botón. Si el botón no lleva a ninguna parte, la imagen no se puede tocar.
        </p>
      ) : (
        <ol className="grid gap-3">
          {areas.map((a, i) => (
            // La clave cambia con la división: al pasar de mitades a tercios, cada zona arranca limpia.
            <li key={`${division}-${i}`} className="rounded-[var(--radius-anidado)] bg-papel p-3 ring-1 ring-borde">
              <p className="text-[13px] font-semibold text-tinta">{i + 1}. {a.nombre}</p>
              <div className="mt-2 grid gap-3">
                <CampoDestino id={`zona-${clave}-${i}`} etiqueta="Lleva a" valor={zona(i).destino} alCambiar={(d) => poner(i, { ...zona(i), destino: d })} opciones={opciones} />
                <div>
                  <label htmlFor={`ze-${clave}-${i}`} className="mb-1 block text-[12px] font-medium text-gris">Nombre del enlace</label>
                  <input id={`ze-${clave}-${i}`} value={zona(i).etiqueta} onChange={(e) => poner(i, { ...zona(i), etiqueta: e.target.value })} maxLength={80} placeholder="Por ejemplo: TikTok de Tryvex Store" className={campo} />
                  {/* Quien navega con lector de pantalla no ve la imagen: escucha este nombre. */}
                  <p className="mt-1 text-[12px] text-gris">Lo que escucha quien usa lector de pantalla.</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
