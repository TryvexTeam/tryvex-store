'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import Link from 'next/link'
import type { DestinoMenu } from './cabecera'

export type EstadoMenu = 'cerrado' | 'entrando' | 'abierto' | 'cerrando'

/** Lo que tarda en recogerse todo: ítems (≤240 ms) y cortina (120 + 422 ms). Medido en apple.com/cl el 2026-09-30. */
export const DURACION_CIERRE = 560

/**
 * Botón del menú, trazado igual que el de apple.com: dos líneas que se juntan
 * al centro y se cruzan en X (240 ms, primero acelerando y luego frenando).
 * Es SMIL y no CSS a propósito: Safari no transiciona `d` ni `points` con
 * CSS, y el teléfono es justo donde vive este botón.
 */
export function BotonMenu({ abierto, alTocar }: { abierto: boolean; alTocar: () => void }) {
  const svg = useRef<SVGSVGElement>(null)
  const primera = useRef(true)

  useEffect(() => {
    // Al montar no se anima: el botón ya nace en su forma.
    if (primera.current) { primera.current = false; return }
    const cual = abierto ? 'abre' : 'cierra'
    svg.current?.querySelectorAll<SVGAnimateElement>(`animate[data-anim="${cual}"]`).forEach((a) => a.beginElement())
  }, [abierto])

  const spline = { keyTimes: '0;0.5;1', dur: '0.24s', begin: 'indefinite', fill: 'freeze', calcMode: 'spline', keySplines: '0.42, 0, 1, 1;0, 0, 0.58, 1' } as const
  return (
    <button
      type="button"
      onClick={alTocar}
      aria-expanded={abierto}
      aria-controls="menu-tienda"
      aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
      className="menu-movil-boton order-4 -mr-3 grid size-12 shrink-0 place-items-center n:hidden"
    >
      <svg ref={svg} width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="2 12, 16 12">
          <animate data-anim="abre" attributeName="points" values="2 12, 16 12; 2 9, 16 9; 3.5 15, 15 3.5" {...spline} />
          <animate data-anim="cierra" attributeName="points" values="3.5 15, 15 3.5; 2 9, 16 9; 2 12, 16 12" {...spline} />
        </polyline>
        <polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="2 5, 16 5">
          <animate data-anim="abre" attributeName="points" values="2 5, 16 5; 2 9, 16 9; 3.5 3.5, 15 15" {...spline} />
          <animate data-anim="cierra" attributeName="points" values="3.5 3.5, 15 15; 2 9, 16 9; 2 5, 16 5" {...spline} />
        </polyline>
      </svg>
    </button>
  )
}

/** Posición del ítem en la cascada: cada uno entra 20 ms después del anterior. */
const orden = (n: number, total: number) => ({ '--n': n, '--total': total }) as CSSProperties

/**
 * Menú del teléfono, calcado del de apple.com/cl (medido cuadro a cuadro):
 * una cortina que nace de la barra y baja hasta cubrir la pantalla, y los
 * ítems que caen 8 px mientras aparecen, uno tras otro. Al cerrar, todo
 * vuelve en orden inverso y la cortina se recoge al final.
 */
export function MenuMovil({ estado, destinos, nivel, alElegirNivel, alVolver, alCerrar }: {
  estado: EstadoMenu
  destinos: DestinoMenu[]
  nivel: DestinoMenu | null
  alElegirNivel: (d: DestinoMenu) => void
  alVolver: () => void
  alCerrar: () => void
}) {
  if (estado === 'cerrado') return null
  const items = nivel ? (nivel.enlaces ?? nivel.categorias ?? []) : null

  return (
    <nav id="menu-tienda" aria-label="Menú" data-estado={estado} inert={estado === 'cerrando' ? true : undefined} className="menu-movil n:hidden">
      {nivel && items ? (
        <div key={nivel.href} className="menu-movil-nivel">
          <button type="button" onClick={alVolver} aria-label="Volver al menú principal" className="menu-movil-volver">
            <svg width="9" height="18" viewBox="0 0 9 18" aria-hidden><polyline fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" points="7 2, 2 9, 7 16" /></svg>
          </button>
          <p className="menu-movil-item menu-movil-rotulo" style={orden(0, items.length + 2)}>Explorar {nivel.nombre}</p>
          <ul>
            {items.map((p, i) => (
              <li key={p.href} className="menu-movil-item" style={orden(i + 1, items.length + 2)}>
                <Link href={p.href} onClick={alCerrar} className="menu-movil-enlace-nivel">{p.nombre}</Link>
              </li>
            ))}
            <li className="menu-movil-item" style={orden(items.length + 1, items.length + 2)}>
              <a href={nivel.href} onClick={alCerrar} className="menu-movil-ver-todo">Ver todo en {nivel.nombre}</a>
            </li>
          </ul>
        </div>
      ) : (
        <ul key="raiz" className="menu-movil-raiz">
          {destinos.map((d, i) => (
            <li key={d.nombre} className="menu-movil-item" style={orden(i, destinos.length)}>
              {d.categorias || d.enlaces ? (
                <button type="button" onClick={() => alElegirNivel(d)} className="menu-movil-enlace">{d.nombre}</button>
              ) : (
                <a href={d.href} onClick={alCerrar} className="menu-movil-enlace">{d.nombre}</a>
              )}
            </li>
          ))}
        </ul>
      )}
    </nav>
  )
}
