'use client'

import { useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { Estrella } from '@/app/marca'

/**
 * Tarjeta virtual de Tryvex.
 *
 * Es un objeto de la interfaz, no un medio de pago: no tiene número real, ni
 * CVV, ni caducidad que engañen a nadie. El número va enmascarado y la tarjeta
 * lleva el nombre de quien la mira. Proporción real de una tarjeta (85,6 × 54 mm
 * = 1,586), chip, contactless y relieve en las cifras.
 *
 * Se inclina con el cursor (tarjeta física bajo una luz) y se da vuelta al
 * tocarla: el reverso trae lo «por cobrar», que es un dato del negocio y no
 * uno inventado. Con `prefers-reduced-motion` no se inclina ni gira: el reverso
 * aparece con un fundido.
 *
 * No copia ninguna marca de red de pagos (Visa, Mastercard): solo la de Tryvex.
 */

const nombreEnTarjeta = (nombre: string) => nombre.trim().toUpperCase().slice(0, 26)

interface TarjetaTryvexProps {
  nombre: string
  /** Lo que se ve en el frente: el dinero vive dentro de la tarjeta. */
  etiquetaMonto: string
  monto: ReactNode
  cambio?: ReactNode
  tendencia?: ReactNode
  /** Lo que muestra el reverso. */
  porCobrar: string
  etiquetaPorCobrar: string
}

export function TarjetaTryvex({ nombre, etiquetaMonto, monto, cambio, tendencia, porCobrar, etiquetaPorCobrar }: TarjetaTryvexProps) {
  const [vuelta, setVuelta] = useState(false)
  const inclinada = useRef<HTMLDivElement>(null)

  function alMover(e: PointerEvent<HTMLButtonElement>) {
    if (e.pointerType !== 'mouse' || !inclinada.current) return
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    const el = inclinada.current
    el.style.setProperty('--ry', `${((x - 0.5) * 14).toFixed(2)}deg`)
    el.style.setProperty('--rx', `${((0.5 - y) * 10).toFixed(2)}deg`)
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`)
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`)
  }
  function alSalir() {
    const el = inclinada.current
    if (!el) return
    for (const v of ['--rx', '--ry']) el.style.setProperty(v, '0deg')
    el.style.setProperty('--gx', '30%')
    el.style.setProperty('--gy', '20%')
  }

  return (
    <button
      type="button"
      onClick={() => setVuelta((v) => !v)}
      onPointerMove={alMover}
      onPointerLeave={alSalir}
      aria-pressed={vuelta}
      aria-label={vuelta ? 'Tarjeta virtual de Tryvex, reverso: lo por cobrar. Tocar para ver las ventas' : `Tarjeta virtual de Tryvex con las ventas de la semana. Tocar para ver lo por cobrar`}
      className="tarjeta-tryvex mx-auto block w-full max-w-[380px] text-left"
    >
      <div ref={inclinada} className="tarjeta-tryvex-inclina">
        <div className="tarjeta-tryvex-giro" data-vuelta={vuelta}>
          {/* ── Frente ── metal cepillado, cifra grabada: el dinero vive en la tarjeta */}
          <div className="tarjeta-cara tarjeta-frente">
            <Estrella size={250} className="pointer-events-none absolute -right-14 -bottom-16 text-white opacity-[0.035]" />
            <span aria-hidden className="tarjeta-brillo" />

            <div className="relative flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-white">
                <Estrella size={20} />
                <span className="tarjeta-grabado text-[15px] font-semibold tracking-[0.2em] uppercase">Tryvex</span>
              </span>
              <span className="inline-flex items-center gap-2 text-white/70">
                <span className="text-[9px] font-semibold tracking-[0.2em] uppercase">Virtual</span>
                <svg aria-hidden width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
                  <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" />
                </svg>
              </span>
            </div>

            <div className="relative mt-[4.5%] flex items-center justify-between gap-3">
              <svg aria-hidden width="40" height="31" viewBox="0 0 46 36" className="shrink-0 drop-shadow-[0_1px_1px_rgb(0_0_0/0.5)]">
                <defs>
                  <linearGradient id="oro-chip" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#f3dfa2" />
                    <stop offset="0.5" stopColor="#c9a24e" />
                    <stop offset="1" stopColor="#a67c2e" />
                  </linearGradient>
                </defs>
                <rect x="0.5" y="0.5" width="45" height="35" rx="6" fill="url(#oro-chip)" stroke="#8d6a26" strokeOpacity="0.6" />
                <path d="M0.5 12h14M0.5 24h14M31.5 12h14M31.5 24h14M15 0.5v35M31 0.5v35M15 18h16" stroke="#7a5a1f" strokeOpacity="0.55" strokeWidth="1" fill="none" />
                <rect x="15" y="10" width="16" height="16" rx="3" fill="none" stroke="#7a5a1f" strokeOpacity="0.55" />
              </svg>
              {cambio}
            </div>

            <div className="relative mt-[3.5%]">
              <p className="tarjeta-grabado truncate text-[9.5px] font-medium tracking-[0.18em] text-white/55 uppercase">{etiquetaMonto}</p>
              {monto}
            </div>

            <div className="absolute inset-x-[7%] bottom-[7%] flex items-end justify-between gap-4">
              <p className="tarjeta-relieve min-w-0 truncate text-[clamp(11px,3.3vw,13px)] tracking-[0.16em]">{nombreEnTarjeta(nombre)}</p>
              {tendencia && <div aria-hidden={false} className="w-[34%] shrink-0 text-[#7be39e] [&_svg]:h-7">{tendencia}</div>}
            </div>
          </div>

          {/* ── Reverso ── */}
          <div className="tarjeta-cara tarjeta-reverso" aria-hidden={!vuelta}>
            <div className="absolute inset-x-0 top-[14%] h-[17%] bg-black shadow-[0_1px_0_rgb(255_255_255/0.06)]" />
            <div className="absolute inset-x-[7%] top-[41%]">
              <p className="text-[9px] font-medium tracking-[0.12em] text-white/50 uppercase">{etiquetaPorCobrar}</p>
              <div className="mt-1.5 rounded-[6px] bg-[#f3ede2] px-3 py-2.5 shadow-[inset_0_1px_3px_rgb(0_0_0/0.25)]">
                <p className="cifra text-[clamp(17px,5.6vw,24px)] leading-none font-semibold text-[#1d1d1f]">{porCobrar}</p>
              </div>
              <p className="mt-2 truncate text-[10.5px] leading-snug text-white/55">Pasa a vendido cuando entra el pago.</p>
            </div>
            <div className="absolute inset-x-[7%] bottom-[8%] flex items-center justify-between text-white/45">
              <span className="inline-flex items-center gap-1.5 text-[11px]">
                <Estrella size={13} /> Tryvex Store
              </span>
              <span className="text-[10px] tracking-[0.06em]">Tocar para volver</span>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}
