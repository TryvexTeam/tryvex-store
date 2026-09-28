import type { Metadata, Viewport } from 'next'

/**
 * Todo /panel (incluido el login) se puede instalar como app: así el equipo
 * lo abre desde la pantalla de inicio y recibe el aviso de cada venta. En
 * iPhone es la única forma: iOS solo entrega push a apps web instaladas.
 *
 * El manifest y los íconos viven fuera de /panel a propósito: lo que está bajo
 * /panel pasa por el proxy de sesión, y a quien no ha entrado lo mandaría al
 * login en vez de entregarle el ícono.
 */
export const metadata: Metadata = {
  manifest: '/panel.webmanifest',
  appleWebApp: { capable: true, title: 'Tryvex', statusBarStyle: 'default' },
  icons: { apple: '/app-panel/apple-touch-icon.png' },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
}

export default function LayoutApp({ children }: { children: React.ReactNode }) {
  return children
}
