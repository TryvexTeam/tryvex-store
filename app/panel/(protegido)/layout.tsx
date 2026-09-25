import Link from 'next/link'
import { integranteActual } from '@/lib/sesion'
import BotonSalir from './salir'
import { Marca } from '@/app/marca'
import { BarraInferior, type Destino } from '@/components/barra-inferior'
import { ProveedorAvisos } from '@/components/avisos'

export const metadata = {
  title: { default: 'Panel', template: '%s — Panel Tryvex' },
  robots: { index: false, follow: false },
}

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const yo = await integranteActual()

  // Finanzas solo aparece si el permiso existe. Ocultar el enlace no protege
  // nada por sí solo: la página lo comprueba y, por debajo, manda el RLS.
  const destinos: Destino[] = [
    { href: '/panel', etiqueta: 'Resumen', icono: 'resumen' },
    { href: '/panel/pedidos', etiqueta: 'Pedidos', icono: 'pedidos' },
    { href: '/panel/ventas', etiqueta: 'Vender', icono: 'pedidos' },
    { href: '/panel/productos', etiqueta: 'Productos', icono: 'productos' },
    { href: '/panel/resenas', etiqueta: 'Reseñas', icono: 'resenas' },
    { href: '/panel/portada', etiqueta: 'Portada', icono: 'portada' },
    { href: '/panel/stock', etiqueta: 'Stock', icono: 'stock' },
    { href: '/panel/cobranza', etiqueta: 'Cobranza', icono: 'pedidos' },
    { href: '/panel/clientes', etiqueta: 'Clientes', icono: 'productos' },
    { href: '/panel/reportes', etiqueta: 'Reportes', icono: 'resumen' },
    ...(yo.ver_finanzas
      ? [
          {
            href: '/panel/finanzas',
            etiqueta: 'Finanzas',
            icono: 'finanzas' as const,
          },
        ]
      : []),
  ]

  return (
    <ProveedorAvisos>
      <div className="min-h-dvh bg-papel-alt">
        <header className="sticky top-0 z-40 border-b border-borde/60 bg-papel/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-6 px-4 sm:px-5">
            <Link href="/panel" className="shrink-0" aria-label="Tryvex, ir al resumen">
              <Marca size={19} />
            </Link>

            {/* En móvil los destinos viven en la barra inferior, al alcance del
              pulgar. Repetirlos arriba sería ruido y robaría alto útil. */}
            <nav
              aria-label="Secciones del panel"
              className="hidden flex-1 overflow-x-auto md:block"
            >
              <ul className="flex items-center gap-1">
                {destinos.map((d) => (
                  <li key={d.href}>
                    <Link
                      href={d.href}
                      className="block whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] text-tinta-suave
                               transition-colors hover:bg-papel-alt hover:text-tinta"
                    >
                      {d.etiqueta}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>

            <div className="ml-auto flex items-center gap-3 md:ml-0">
              <span className="hidden text-[13px] text-gris sm:inline">{yo.nombre}</span>
              <Link
                href="/panel/ajustes"
                aria-label="Ajustes de la tienda"
                title="Ajustes"
                className="presionable grid size-11 place-items-center rounded-full text-tinta-suave hover:bg-papel-alt hover:text-tinta"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
                </svg>
              </Link>
              <BotonSalir />
            </div>
          </div>
        </header>

        {/* El padding inferior deja sitio a la barra: sin él, la última tarjeta
          queda tapada justo cuando se necesita tocarla. */}
        <main className="mx-auto max-w-[1180px] px-4 pt-6 pb-[calc(76px+env(safe-area-inset-bottom))] sm:px-5 md:pt-10 md:pb-10">
          {children}
        </main>

        <BarraInferior destinos={destinos} />
      </div>
    </ProveedorAvisos>
  )
}
