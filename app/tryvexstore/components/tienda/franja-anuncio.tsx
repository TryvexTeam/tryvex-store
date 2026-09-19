import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { ConfiguracionTienda } from '@/lib/configuracion'

/** Una sola novedad útil; no rota ni depende de JavaScript. */
export function FranjaAnuncio({ configuracion }: { configuracion: ConfiguracionTienda | null }) {
  const mensaje = configuracion?.envio_gratis_desde_clp
    ? `Envío gratis desde ${clp(configuracion.envio_gratis_desde_clp)}.`
    : configuracion?.envio_plazo_texto
      ? `Despachos: ${configuracion.envio_plazo_texto}.`
      : 'Consulta envíos, cambios y devoluciones.'

  return (
    <aside aria-label="Información de envío" className="bg-tinta px-[22px] text-center text-[13px] leading-snug text-white">
      <Link href="/envios" className="inline-flex min-h-11 items-center justify-center font-medium underline decoration-white/70 underline-offset-2 hover:decoration-white">
        {mensaje} <span aria-hidden>Ver información →</span><span className="sr-only"> Ver información de envíos.</span>
      </Link>
    </aside>
  )
}
