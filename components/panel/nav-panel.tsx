'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

/**
 * Navegación superior del panel en escritorio.
 *
 * Antes eran once enlaces en fila, con scroll horizontal escondido y sin marcar
 * dónde se estaba. Ahora: los seis de uso diario a la vista, el resto bajo
 * «Más», y la sección actual marcada (también para lectores de pantalla, con
 * `aria-current`). Es el patrón de Revolut Business: pocos destinos fijos y lo
 * demás un paso más atrás.
 */
export interface DestinoNav {
  href: string
  etiqueta: string
}

const esActivo = (ruta: string, href: string) => (href === '/panel' ? ruta === '/panel' : ruta === href || ruta.startsWith(`${href}/`))

export function NavPanel({ principales, mas }: { principales: DestinoNav[]; mas: DestinoNav[] }) {
  const ruta = usePathname()
  const [abierto, setAbierto] = useState(false)
  const caja = useRef<HTMLLIElement>(null)

  // Al navegar, el menú se cierra; también con Escape o un clic fuera.
  useEffect(() => setAbierto(false), [ruta])
  useEffect(() => {
    if (!abierto) return
    const fuera = (e: MouseEvent) => {
      if (!caja.current?.contains(e.target as Node)) setAbierto(false)
    }
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && setAbierto(false)
    document.addEventListener('mousedown', fuera)
    document.addEventListener('keydown', tecla)
    return () => {
      document.removeEventListener('mousedown', fuera)
      document.removeEventListener('keydown', tecla)
    }
  }, [abierto])

  const masActivo = mas.some((d) => esActivo(ruta, d.href))
  const base = 'inline-flex min-h-9 items-center whitespace-nowrap rounded-full px-3.5 text-[13.5px] font-medium transition-colors'

  return (
    <nav aria-label="Secciones del panel" className="hidden md:block">
      <ul className="flex items-center gap-0.5">
        {principales.map((d) => {
          const activo = esActivo(ruta, d.href)
          return (
            <li key={d.href}>
              <Link href={d.href} aria-current={activo ? 'page' : undefined} className={`${base} ${activo ? 'bg-tinta text-white' : 'text-tinta-suave hover:bg-papel-alt hover:text-tinta'}`}>
                {d.etiqueta}
              </Link>
            </li>
          )
        })}
        {mas.length > 0 && (
          <li ref={caja} className="relative">
            <button
              type="button"
              aria-expanded={abierto}
              aria-haspopup="true"
              onClick={() => setAbierto((v) => !v)}
              className={`${base} gap-1 ${masActivo ? 'bg-tinta text-white' : 'text-tinta-suave hover:bg-papel-alt hover:text-tinta'}`}
            >
              Más
              <svg aria-hidden width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${abierto ? 'rotate-180' : ''}`}>
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {abierto && (
              <ul className="absolute top-[calc(100%+8px)] right-0 z-50 w-52 overflow-hidden rounded-[var(--radius-widget)] bg-papel p-1.5 shadow-[var(--shadow-alzado)] ring-1 ring-borde/70">
                {mas.map((d) => {
                  const activo = esActivo(ruta, d.href)
                  return (
                    <li key={d.href}>
                      <Link href={d.href} aria-current={activo ? 'page' : undefined} className={`flex min-h-10 items-center rounded-[var(--radius-anidado)] px-3 text-[14px] transition-colors ${activo ? 'bg-papel-alt font-semibold text-tinta' : 'text-tinta-suave hover:bg-papel-alt hover:text-tinta'}`}>
                        {d.etiqueta}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            )}
          </li>
        )}
      </ul>
    </nav>
  )
}
