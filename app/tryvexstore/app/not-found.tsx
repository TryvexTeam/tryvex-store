import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Página no encontrada',
  robots: { index: false, follow: true },
}

/**
 * 404 de la tienda. Antes caía la página por defecto de Next: sin `main`, sin
 * título propio y sin salida hacia el catálogo (auditoría del 13-sep).
 */
export default function NoEncontrada() {
  return (
    <main className="tienda grid min-h-dvh place-items-center bg-papel-alt px-[22px] py-16 text-center">
      <div className="max-w-[46ch]">
        <p className="cifra text-[15px] font-semibold tracking-[0.08em] text-spark uppercase">Error 404</p>
        <h1 className="mt-3 text-[40px] leading-[1.05] font-semibold tracking-[-0.035em] t:text-[56px]">No encontramos esta página.</h1>
        <p className="mt-4 text-[17px] leading-relaxed text-tinta-suave">Puede que el enlace haya cambiado o que el producto ya no esté disponible.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/tienda" className="tienda-boton bg-tinta text-white hover:bg-tinta/90">Ir a la tienda</Link>
          <Link href="/" className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel">Volver al inicio</Link>
        </div>
      </div>
    </main>
  )
}
