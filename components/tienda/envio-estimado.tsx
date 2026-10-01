import { rotuloDeFechas, titularDeLlegada, type Hito } from '@/lib/plazo-envio'

/**
 * Cuándo llega tu compra, contado en fechas y no en «3 a 5 días».
 *
 * Tres hitos —pedido, despacho, llegada— unidos por un trazo que se dibuja al
 * aparecer. Las fechas las calcula el servidor (`hitosDeEnvio`) en días
 * hábiles de Chile, así que un pedido del viernes no promete entregar el
 * domingo ni un feriado. Mismo lenguaje visual que la línea de envío de «Mis
 * compras» (`linea-envio.tsx`) y sus animaciones, que ya respetan
 * `prefers-reduced-motion`.
 *
 * Sin estado ni efectos: se renderiza en el servidor y llega dibujado.
 */

const ROTULOS: Record<Hito['clave'], string> = {
  pedido: 'Tu pedido',
  despacho: 'Despachamos',
  llegada: 'Llega a ti',
}

/** Trazos de 24×24, al estilo de los íconos de beneficios. */
const TRAZOS: Record<Hito['clave'], string> = {
  pedido: 'M6 8h12l-1 12H7L6 8ZM9 8V6.5a3 3 0 0 1 6 0V8',
  despacho: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  llegada: 'M4 11 12 4l8 7M6 10v10h12V10M10 20v-5h4v5',
}

const PASO_MS = 110

export function EnvioEstimado({ hitos }: { hitos: Hito[] }) {
  const llegada = hitos.find((h) => h.clave === 'llegada')
  if (!llegada) return null
  // «Llega entre el 5 y el 7 de octubre»: la fecha va en verde, lo demás en tinta.
  const titular = titularDeLlegada(llegada.desde, llegada.hasta)
  const corte = titular.indexOf(' ', 'Llega '.length)
  const inicio = titular.slice(0, corte === -1 ? titular.length : corte)
  const fechas = corte === -1 ? '' : titular.slice(corte)

  return (
    <section aria-label="Fechas estimadas de entrega" className="mt-5 rounded-[18px] bg-papel p-4 ring-1 ring-borde/70 t:p-5">
      <p className="text-[15px] leading-snug font-semibold tracking-tarjeta text-tinta">
        {inicio}
        <span className="text-verde">{fechas}</span>
      </p>

      <ol className="mt-4 grid grid-cols-3">
        {hitos.map((h, i) => {
          const ultimo = i === hitos.length - 1
          const retraso = i * PASO_MS
          return (
            <li key={h.clave} className="min-w-0">
              <div className="flex h-8 items-center gap-2">
                <span
                  aria-hidden
                  className="envio-hito grid size-8 shrink-0 place-items-center rounded-full bg-verde/10 text-verde"
                  style={{ animationDelay: `${retraso}ms` }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={TRAZOS[h.clave]} />
                  </svg>
                </span>
                {!ultimo && (
                  <span aria-hidden className="relative h-[2px] flex-1 rounded-full bg-borde">
                    <span
                      className="envio-trazo-lleno absolute inset-0 rounded-full bg-verde"
                      style={{ transformOrigin: 'left', animationName: 'envio-trazo-h', animationDelay: `${retraso + 60}ms` }}
                    />
                  </span>
                )}
              </div>
              <div className="envio-texto mt-2.5 pr-2" style={{ animationDelay: `${retraso + 40}ms` }}>
                <p className="cifra text-[14px] leading-tight font-semibold text-tinta">{rotuloDeFechas(h.desde, h.hasta)}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-tinta-suave">{ROTULOS[h.clave]}</p>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
