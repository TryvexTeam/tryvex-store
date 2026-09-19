'use client'

import Link from 'next/link'
import type { DestinoMenu } from './cabecera'

/**
 * Megamenú: tres columnas de texto, sin imágenes.
 *
 * La tentación es llenarlo con fotos de producto, y es un error: el panel no
 * es una vitrina, es un índice. Quien lo abre ya sabe que quiere navegar, no
 * mirar. Una foto grande dentro obliga a decidir dos veces —primero mirar,
 * después leer— y encima desbalancea el panel cuando hay pocas familias.
 * Medido contra la tienda de Apple el 2026-09-17: su panel es puro texto en
 * tres columnas, y por eso se lee de un vistazo.
 *
 * La jerarquía la carga la escala, no el color: encabezado de columna chico y
 * gris, destinos primarios grandes, secundarios pequeños. El fondo de la
 * página se atenúa detrás para que quede claro que el sitio está esperando
 * una elección.
 */

const ENLACES_CUENTA = [
  { nombre: 'Mi cuenta', href: '/cuenta' },
  { nombre: 'Mis pedidos', href: '/cuenta' },
  { nombre: 'Envíos y plazos', href: '/envios' },
] as const

const ENLACES_AYUDA = [
  { nombre: 'Centro de ayuda', href: '/ayuda' },
  { nombre: 'Preguntas frecuentes', href: '/ayuda/preguntas-frecuentes' },
  { nombre: 'Cambios y devoluciones', href: '/cambios-y-devoluciones' },
  { nombre: 'Contacto', href: '/contacto' },
] as const

function Columna({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-3 text-[12px] tracking-apoyo text-gris">{titulo}</p>
      {children}
    </div>
  )
}

export function Megamenu({ categorias, cerrar }: { categorias: DestinoMenu[]; activa: DestinoMenu; seleccionar: (categoria: DestinoMenu) => void; cerrar: () => void }) {
  return (
    <div
      id="megamenu-tienda"
      role="region"
      aria-label="Explorar la tienda"
      className="tienda-megamenu absolute inset-x-0 top-full hidden max-h-[calc(100dvh-48px)] overflow-y-auto bg-papel text-tinta n:block"
    >
      <div className="mx-auto grid max-w-[1024px] grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)] gap-10 px-[22px] pt-8 pb-14">
        <Columna titulo="Comprar">
          <ul className="space-y-1.5">
            {categorias.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  onClick={cerrar}
                  className="block text-[24px] leading-[1.25] font-semibold tracking-tarjeta hover:text-spark"
                >
                  {c.nombre}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/tienda" onClick={cerrar} className="block text-[24px] leading-[1.25] font-semibold tracking-tarjeta hover:text-spark">
                Ver toda la tienda
              </Link>
            </li>
          </ul>
        </Columna>

        <Columna titulo="Tu cuenta">
          <ul className="space-y-2.5">
            {ENLACES_CUENTA.map((e) => (
              <li key={e.nombre}>
                <Link href={e.href} onClick={cerrar} className="block text-[14px] tracking-apoyo hover:text-spark">
                  {e.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </Columna>

        <Columna titulo="Ayuda">
          <ul className="space-y-2.5">
            {ENLACES_AYUDA.map((e) => (
              <li key={e.nombre}>
                <Link href={e.href} onClick={cerrar} className="block text-[14px] tracking-apoyo hover:text-spark">
                  {e.nombre}
                </Link>
              </li>
            ))}
          </ul>
        </Columna>
      </div>
    </div>
  )
}
