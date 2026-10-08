import Link from 'next/link'
import { cookies } from 'next/headers'
import { Inter } from 'next/font/google'
import { integranteActual } from '@/lib/sesion'
import BotonSalir from './salir'
import { Marca } from '@/app/marca'
import { BarraInferior, type Destino } from '@/components/barra-inferior'
import { ProveedorAvisos } from '@/components/avisos'
import { CampanaVentas } from '@/components/panel/campana-ventas'
import { BotonTema, TemaPanel } from '@/components/panel/tema-panel'
import { NavPanel } from '@/components/panel/nav-panel'
import { COOKIE_TEMA_PANEL, leerTema } from '@/lib/tema-panel'

// Inter se descarga solo en el panel (la tienda sigue con Geist, la tipografía de marca).
// Es la que usa Revolut en producto: cifras tabulares nítidas a tamaños chicos.
const inter = Inter({ variable: '--font-inter-panel', subsets: ['latin'], display: 'swap' })

export const metadata = {
  title: { default: 'Panel', template: '%s — Panel Tryvex' },
  robots: { index: false, follow: false },
}

/** Lo de uso diario va a la vista en la cabecera; el resto, bajo «Más». */
const PRINCIPALES = ['/panel', '/panel/pedidos', '/panel/ventas', '/panel/productos', '/panel/stock', '/panel/finanzas']

export default async function LayoutPanel({ children }: { children: React.ReactNode }) {
  const yo = await integranteActual()
  const tema = leerTema((await cookies()).get(COOKIE_TEMA_PANEL)?.value)

  // Finanzas solo aparece si el permiso existe. Ocultar el enlace no protege
  // nada por sí solo: la página lo comprueba y, por debajo, manda el RLS.
  const destinos: Destino[] = [
    { href: '/panel', etiqueta: 'Resumen', icono: 'resumen' },
    { href: '/panel/pedidos', etiqueta: 'Pedidos', icono: 'pedidos' },
    { href: '/panel/ventas', etiqueta: 'Vender', icono: 'pedidos' },
    { href: '/panel/productos', etiqueta: 'Productos', icono: 'productos' },
    { href: '/panel/etiquetas', etiqueta: 'Etiquetas', icono: 'productos' },
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
      {/* Con el panel abierto, cada venta nueva suena a caja registradora. */}
      <CampanaVentas />
      <TemaPanel inicial={tema} className={inter.variable}>
        <header className="sticky top-0 z-40 border-b border-borde/60 bg-papel/80 backdrop-blur-xl">
          <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-4 px-4 sm:px-5 md:gap-6">
            <Link href="/panel" className="shrink-0" aria-label="Tryvex, ir al resumen">
              <Marca size={19} />
            </Link>

            {/* En móvil los destinos viven en la barra inferior, al alcance del
              pulgar. Repetirlos arriba sería ruido y robaría alto útil. */}
            <div className="hidden flex-1 md:block">
              <NavPanel
                principales={destinos.filter((d) => PRINCIPALES.includes(d.href))}
                mas={destinos.filter((d) => !PRINCIPALES.includes(d.href))}
              />
            </div>

            {/* Cuenta y ajustes, separados de la navegación: el nombre dice quién
              está dentro; Ajustes y Tema son íconos distintos a propósito. */}
            <div className="ml-auto flex items-center gap-1 md:ml-0">
              <span className="mr-1 hidden items-center gap-2.5 sm:flex">
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-tinta text-[12px] font-semibold text-white">
                  {yo.nombre.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="text-[13.5px] font-medium">{yo.nombre.split(' ')[0]}</span>
              </span>
              <span aria-hidden className="mx-1.5 hidden h-5 w-px bg-borde sm:block" />
              <Link
                href="/panel/ajustes"
                aria-label="Ajustes de la tienda"
                title="Ajustes"
                className="presionable grid size-10 place-items-center rounded-full text-tinta-suave hover:bg-papel-alt hover:text-tinta"
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </Link>
              <BotonTema />
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
      </TemaPanel>
    </ProveedorAvisos>
  )
}
