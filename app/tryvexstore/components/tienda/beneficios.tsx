'use client'

import { useState, type CSSProperties } from 'react'
import { Hoja } from '@/components/hoja'
import { Carrusel } from './carrusel'

export type Tono = 'verde' | 'spark' | 'ambar' | 'azul'

export interface Beneficio {
  id: string
  /** La parte importante, la única que va en color. */
  destacado: string
  resto: string
  tono: Tono
  icono: 'envio' | 'garantia' | 'retracto' | 'pago' | 'retiro'
  detalle: { titulo: string; parrafos: string[]; filas?: [string, string][] }
}

const COLOR: Record<Tono, string> = {
  verde: 'text-verde',
  spark: 'text-spark',
  ambar: 'text-ambar',
  azul: 'text-azul',
}

const TRAZOS: Record<Beneficio['icono'], string> = {
  envio: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  garantia: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3ZM9 12l2 2 4-4',
  retracto: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4',
  pago: 'M3 6h18v12H3zM3 10h18M7 15h3',
  retiro: 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
}

/**
 * Cards de beneficio: el único lugar de la tienda donde la interfaz usa
 * color, y solo en la frase que importa. Abren una hoja encima del catálogo
 * sin cambiar de dirección: el cliente vuelve al mismo punto de la fila.
 */
export function CardsBeneficio({ beneficios }: { beneficios: Beneficio[] }) {
  const [abierto, setAbierto] = useState<Beneficio | null>(null)

  return (
    <>
      <Carrusel etiqueta="Beneficios">
      {beneficios.map((b, indice) => (
        <div key={b.id} className="revela-escala" style={{ '--i': `${indice * 4}%` } as CSSProperties}>
        <button
          type="button"
          onClick={() => setAbierto(b)}
          aria-haspopup="dialog"
          className="tienda-card tienda-beneficio flex h-[240px] w-[313px] flex-col justify-between rounded-[18px] bg-papel p-7 text-left"
        >
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
               strokeLinecap="round" strokeLinejoin="round" className={COLOR[b.tono]} aria-hidden>
            <path d={TRAZOS[b.icono]} />
          </svg>
          <p className="text-[21px] leading-[1.19] font-semibold tracking-tarjeta text-tinta">
            <span className={COLOR[b.tono]}>{b.destacado}</span> {b.resto}
          </p>
        </button>
        </div>
      ))}
      </Carrusel>

      <Hoja abierta={abierto !== null} onCerrar={() => setAbierto(null)} titulo={abierto?.detalle.titulo ?? ''}>
        {abierto && (
          <div className="space-y-4 pb-2 text-[15px] leading-relaxed text-tinta-suave">
            {abierto.detalle.parrafos.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
            {abierto.detalle.filas && (
              <dl className="divide-y divide-borde/60 rounded-[14px] bg-papel-alt">
                {abierto.detalle.filas.map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 px-4 py-3 text-[14px]">
                    <dt className="text-gris">{k}</dt>
                    <dd className="cifra text-right font-medium text-tinta">{v}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </Hoja>
    </>
  )
}
