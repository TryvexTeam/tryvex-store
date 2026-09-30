'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { notificar } from '@/lib/notificar'
import { clp } from '@/lib/formato'
import { ultimaVenta, type UltimaVenta } from '@/app/panel/(protegido)/ventas-en-vivo'

/**
 * Con el panel abierto, cada venta nueva suena a caja registradora.
 *
 * Complementa el push y Telegram: esos llegan con el panel cerrado, pero ahí
 * el sonido lo decide el teléfono. Aquí, con la página abierta, el sonido es el
 * nuestro (`/sonidos/venta.mp3`). Funciona en cualquier dispositivo, tenga o no
 * los avisos push activados.
 *
 * Revisa cada 20 segundos, solo mientras la pestaña está a la vista. La
 * primera lectura fija el punto de partida: abrir el panel no hace sonar la
 * última venta de ayer.
 *
 * Los navegadores bloquean el audio hasta que la persona toca la página, así
 * que el sonido se «desbloquea» con el primer toque. Si igual no puede sonar,
 * el aviso en pantalla aparece de todas formas.
 */
const INTERVALO_MS = 20000

export function CampanaVentas() {
  const router = useRouter()
  const vista = useRef<string | null>(null)
  const audio = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audio.current = new Audio('/sonidos/venta.mp3')
    audio.current.preload = 'auto'

    const desbloquear = () => {
      const a = audio.current
      if (!a) return
      a.muted = true
      a.play()
        .then(() => {
          a.pause()
          a.currentTime = 0
          a.muted = false
        })
        .catch(() => {
          a.muted = false
        })
    }
    window.addEventListener('pointerdown', desbloquear, { once: true })
    return () => window.removeEventListener('pointerdown', desbloquear)
  }, [])

  useEffect(() => {
    let vivo = true

    async function revisar(primera: boolean) {
      if (!primera && document.visibilityState !== 'visible') return
      let venta: UltimaVenta | null
      try {
        venta = await ultimaVenta()
      } catch {
        return
      }
      if (!vivo || !venta) return
      const clave = `${venta.numero}-${venta.pagadoEn}`
      if (primera || vista.current === null) {
        vista.current = clave
        return
      }
      if (clave === vista.current) return
      vista.current = clave

      const a = audio.current
      if (a) {
        a.currentTime = 0
        a.play().catch(() => {})
      }
      void notificar.accion({
        titulo: 'Nuevo pedido pagado',
        descripcion: `#${venta.numero} · ${clp(venta.total)}${venta.cliente ? ` · ${venta.cliente}` : ''}`,
        accion: { titulo: 'Ver pedidos', alPulsar: () => router.push('/panel/pedidos') },
        duracion: 9000,
      })
      router.refresh()
    }

    revisar(true)
    const t = setInterval(() => revisar(false), INTERVALO_MS)
    const alVolver = () => document.visibilityState === 'visible' && revisar(false)
    document.addEventListener('visibilitychange', alVolver)
    return () => {
      vivo = false
      clearInterval(t)
      document.removeEventListener('visibilitychange', alVolver)
    }
  }, [router])

  return null
}
