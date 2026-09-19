'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  IconoPortada,
  IconoResumen,
  IconoPedidos,
  IconoProductos,
  IconoStock,
  IconoFinanzas,
} from './iconos'

export type Destino = {
  href: string
  etiqueta: string
  icono: 'resumen' | 'pedidos' | 'productos' | 'stock' | 'finanzas' | 'portada'
}

const ICONOS = {
  portada: IconoPortada,
  resumen: IconoResumen,
  pedidos: IconoPedidos,
  productos: IconoProductos,
  stock: IconoStock,
  finanzas: IconoFinanzas,
}

/**
 * Cuántos destinos caben antes de que la barra deje de ser navegación y pase
 * a ser un menú apretado. Material Design 3 fija el rango en tres a cinco, y
 * la guía de Android lo repite: más de cinco pertenece a otro patrón.
 * Con seis a 390 px cada destino quedaba en 65 px, y «Productos» ya ocupa 47
 * solo de texto.
 */
const MAX_VISIBLES = 4

function Item({ href, etiqueta, icono, activo, alNavegar }: {
  href: string
  etiqueta: string
  icono: Destino['icono']
  activo: boolean
  alNavegar?: () => void
}) {
  const Icono = ICONOS[icono]
  return (
    <Link
      href={href}
      onClick={alNavegar}
      aria-current={activo ? 'page' : undefined}
      className={`presionable flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 ${
        activo ? 'text-spark' : 'text-gris'
      }`}
    >
      {/* Indicador activo: la píldora que M3 pone detrás del icono del destino
          en curso. Sin ella, «dónde estoy» depende solo del color del texto. */}
      <span
        className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
          activo ? 'bg-spark-suave' : 'bg-transparent'
        }`}
      >
        <Icono size={21} activo={activo} />
      </span>
      <span className={`text-[10px] leading-none tracking-apoyo ${activo ? 'font-semibold' : 'font-medium'}`}>
        {etiqueta}
      </span>
    </Link>
  )
}

/**
 * Barra de navegación inferior, solo en móvil.
 *
 * El panel se usa de pie y con una mano: los destinos van abajo, donde llega
 * el pulgar, no arriba. En pantallas grandes desaparece y manda la barra
 * superior, donde el cursor no tiene esa limitación.
 *
 * Los destinos que no caben no se esconden: viven tras «Más», que abre una
 * hoja desde abajo — también al alcance del pulgar.
 */
export function BarraInferior({ destinos }: { destinos: Destino[] }) {
  const ruta = usePathname()
  const [masAbierto, setMasAbierto] = useState(false)

  const activo = (href: string) =>
    href === '/panel' ? ruta === '/panel' : ruta.startsWith(href)

  const visibles = destinos.length > MAX_VISIBLES + 1 ? destinos.slice(0, MAX_VISIBLES) : destinos
  const ocultos = destinos.length > MAX_VISIBLES + 1 ? destinos.slice(MAX_VISIBLES) : []
  const hayActivoOculto = ocultos.some((d) => activo(d.href))

  return (
    <>
      {masAbierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar menú"
            onClick={() => setMasAbierto(false)}
            className="fixed inset-0 z-50 bg-tinta/25 backdrop-blur-sm md:hidden"
          />
          <div
            role="dialog"
            aria-label="Más secciones"
            className="pad-seguro-abajo fixed inset-x-0 bottom-0 z-50 rounded-t-[22px] bg-papel p-4 shadow-2xl md:hidden"
          >
            <span aria-hidden className="mx-auto mb-3 block h-1 w-10 rounded-full bg-borde" />
            <ul className="grid gap-1">
              {ocultos.map((d) => {
                const Icono = ICONOS[d.icono]
                const esActivo = activo(d.href)
                return (
                  <li key={d.href}>
                    <Link
                      href={d.href}
                      onClick={() => setMasAbierto(false)}
                      aria-current={esActivo ? 'page' : undefined}
                      className={`presionable flex min-h-[52px] items-center gap-3 rounded-[14px] px-3 text-[15px] ${
                        esActivo ? 'bg-spark-suave font-semibold text-spark' : 'text-tinta'
                      }`}
                    >
                      <Icono size={21} activo={esActivo} />
                      {d.etiqueta}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        </>
      )}

      <nav
        aria-label="Navegación principal"
        className="alto-barra pad-seguro-abajo fixed inset-x-0 bottom-0 z-50 border-t border-borde/60
                   bg-papel/85 backdrop-blur-xl md:hidden"
      >
        <ul className="flex items-stretch justify-around px-1 pt-1.5">
          {visibles.map((d) => (
            <li key={d.href} className="flex-1">
              <Item href={d.href} etiqueta={d.etiqueta} icono={d.icono} activo={activo(d.href)} />
            </li>
          ))}

          {ocultos.length > 0 && (
            <li className="flex-1">
              <button
                type="button"
                onClick={() => setMasAbierto(true)}
                aria-expanded={masAbierto}
                aria-haspopup="dialog"
                className={`presionable flex min-h-11 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 py-1 ${
                  hayActivoOculto ? 'text-spark' : 'text-gris'
                }`}
              >
                <span
                  className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                    hayActivoOculto ? 'bg-spark-suave' : 'bg-transparent'
                  }`}
                >
                  <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={hayActivoOculto ? 2.6 : 2} strokeLinecap="round" aria-hidden>
                    <circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
                    <circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none" />
                  </svg>
                </span>
                <span className={`text-[10px] leading-none tracking-apoyo ${hayActivoOculto ? 'font-semibold' : 'font-medium'}`}>
                  Más
                </span>
              </button>
            </li>
          )}
        </ul>
      </nav>
    </>
  )
}
