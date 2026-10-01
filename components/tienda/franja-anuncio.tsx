import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { ConfiguracionTienda } from '@/lib/configuracion'
import { fraseDeLlegada, hitosDeEnvio } from '@/lib/plazo-envio'

/**
 * Una sola novedad útil; no rota ni depende de JavaScript.
 *
 * El mensaje de todos los días es la fecha de llegada, calculada para hoy en
 * días hábiles (`lib/plazo-envio.ts`): «Pídelo hoy y llega entre el 5 y el 7 de
 * octubre». Es la misma promesa que muestra la ficha, así que no hay dos plazos
 * distintos en la misma tienda. Si hay un umbral de envío gratis configurado,
 * ese aviso manda, porque cambia lo que el cliente paga.
 */
export function FranjaAnuncio({ configuracion }: { configuracion: ConfiguracionTienda | null }) {
  const llegada = fraseDeLlegada(hitosDeEnvio(new Date()))
  // Sin configuración (la base no respondió) no se sabe la tarifa: no se promete envío gratis.
  const gratisTodoChile = configuracion !== null && configuracion.envio_tarifa_clp === 0 && !configuracion.envio_gratis_desde_clp

  const mensaje = configuracion?.envio_gratis_desde_clp
    ? `Envío gratis desde ${clp(configuracion.envio_gratis_desde_clp)}.`
    : llegada
      ? `${gratisTodoChile ? 'Envío gratis a todo Chile. ' : ''}Pídelo hoy y llega ${llegada}.`
      : configuracion?.envio_plazo_texto
        ? `Despachos: ${configuracion.envio_plazo_texto}.`
        : 'Consulta envíos, cambios y devoluciones.'

  return (
    <aside data-franja-anuncio aria-label="Información de envío" className="bg-tinta px-[22px] text-center text-[13px] leading-snug text-white">
      <Link href="/envios" className="inline-flex min-h-11 flex-wrap items-center justify-center gap-x-1.5 font-medium underline decoration-white/70 underline-offset-2 hover:decoration-white">
        {mensaje} <span aria-hidden className="hidden t:inline">Ver información →</span><span className="sr-only"> Ver información de envíos.</span>
      </Link>
    </aside>
  )
}
