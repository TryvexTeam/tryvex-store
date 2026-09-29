'use client'

import { useCallback, useEffect, useState, useTransition } from 'react'
import { useAvisos } from '@/components/avisos'
import { activarAvisos, desactivarAvisos, probarAvisos } from '@/app/panel/(protegido)/avisos-push'

/**
 * «Avisarme cada venta en este teléfono».
 *
 * Una tarjeta que se adapta a lo que el dispositivo puede hacer:
 *   · iPhone sin instalar → cómo agregar el panel a la pantalla de inicio
 *     (iOS solo entrega push a apps web instaladas).
 *   · Permiso bloqueado → dónde volver a habilitarlo.
 *   · Apagado → un botón para activar.
 *   · Activo → una línea discreta con «Probar» y «Desactivar».
 */

type Estado = 'cargando' | 'sin-soporte' | 'instalar-ios' | 'bloqueado' | 'apagado' | 'activo'

const CLAVE_PUBLICA = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function claveABytes(base64: string): Uint8Array<ArrayBuffer> {
  const relleno = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const crudo = atob(b64)
  const bytes = new Uint8Array(new ArrayBuffer(crudo.length))
  for (let i = 0; i < crudo.length; i++) bytes[i] = crudo.charCodeAt(i)
  return bytes
}

function esIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function instalada(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true
}

function nombreDispositivo(): string {
  const ua = navigator.userAgent
  const sistema = /iPhone/.test(ua) ? 'iPhone' : /iPad/.test(ua) ? 'iPad' : /Android/.test(ua) ? 'Android' : /Mac/.test(ua) ? 'Mac' : /Windows/.test(ua) ? 'Windows' : 'Navegador'
  return `${sistema}${instalada() ? ' · app' : ''}`
}

/** Si el servicio de push del navegador no responde, no dejar el botón colgado. */
const ESPERA_MAXIMA_MS = 20000

function conLimite<T>(promesa: Promise<T>): Promise<T> {
  return Promise.race([
    promesa,
    new Promise<T>((_, rechazar) => setTimeout(() => rechazar(new Error('tiempo')), ESPERA_MAXIMA_MS)),
  ])
}

async function registro(): Promise<ServiceWorkerRegistration> {
  return navigator.serviceWorker.register('/sw-panel.js', { scope: '/panel/', updateViaCache: 'none' })
}

export function AvisosTelefono() {
  const [estado, setEstado] = useState<Estado>('cargando')
  const [trabajando, iniciar] = useTransition()
  const avisos = useAvisos()

  const revisar = useCallback(async () => {
    const soporta = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
    if (!soporta) {
      setEstado(esIOS() && !instalada() ? 'instalar-ios' : 'sin-soporte')
      return
    }
    if (Notification.permission === 'denied') {
      setEstado('bloqueado')
      return
    }
    const reg = await registro()
    const sub = await reg.pushManager.getSubscription()
    setEstado(sub && Notification.permission === 'granted' ? 'activo' : 'apagado')
  }, [])

  useEffect(() => {
    revisar().catch(() => setEstado('sin-soporte'))
  }, [revisar])

  function activar() {
    iniciar(async () => {
      try {
        const permiso = await Notification.requestPermission()
        if (permiso !== 'granted') {
          setEstado(permiso === 'denied' ? 'bloqueado' : 'apagado')
          return
        }
        const reg = await registro()
        await conLimite(navigator.serviceWorker.ready)
        const sub =
          (await reg.pushManager.getSubscription()) ??
          (await conLimite(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: claveABytes(CLAVE_PUBLICA) })))
        const r = await activarAvisos(JSON.parse(JSON.stringify(sub)), nombreDispositivo())
        if (!r.ok) {
          avisos.error(r.error)
          return
        }
        setEstado('activo')
        avisos.ok('Listo. Cada venta pagada te va a llegar aquí.')
      } catch (e) {
        avisos.error(
          e instanceof Error && e.message === 'tiempo'
            ? 'El servicio de avisos del teléfono no respondió. Revisa tu conexión e intenta de nuevo.'
            : 'Este navegador no permitió activar los avisos.'
        )
      }
    })
  }

  function desactivar() {
    iniciar(async () => {
      const reg = await registro()
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await desactivarAvisos(sub.endpoint)
        await sub.unsubscribe()
      }
      setEstado('apagado')
      avisos.ok('Avisos desactivados en este dispositivo.')
    })
  }

  function probar() {
    iniciar(async () => {
      const r = await probarAvisos()
      if (r.ok) avisos.ok(r.mensaje ?? 'Aviso enviado.')
      else avisos.error(r.error)
    })
  }

  if (estado === 'cargando' || estado === 'sin-soporte' || !CLAVE_PUBLICA) return null

  if (estado === 'activo') {
    return (
      <div className="mb-6 flex items-center gap-3 rounded-full bg-papel py-1.5 pr-1.5 pl-4 ring-1 ring-borde/70">
        <span aria-hidden className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-verde/50 motion-reduce:hidden" />
          <span className="relative inline-flex size-2.5 rounded-full bg-verde" />
        </span>
        <p className="min-w-0 flex-1 truncate text-[13px] text-tinta-suave">Avisos de venta activos en este dispositivo</p>
        <button type="button" onClick={probar} disabled={trabajando} className="presionable min-h-9 rounded-full px-3 text-[13px] font-medium text-tinta hover:bg-papel-alt disabled:opacity-50">
          Probar
        </button>
        <button type="button" onClick={desactivar} disabled={trabajando} className="presionable min-h-9 rounded-full px-3 text-[13px] text-gris hover:bg-papel-alt hover:text-tinta disabled:opacity-50">
          Desactivar
        </button>
      </div>
    )
  }

  return (
    <section aria-labelledby="avisos-titulo" className="entra mb-6 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">
      <div className="flex gap-4 p-5">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-tinta text-white">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
            <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="avisos-titulo" className="text-[15px] font-semibold text-tinta">
            {estado === 'instalar-ios' ? 'Instala el panel para recibir cada venta' : 'Recibe cada venta en este teléfono'}
          </h2>

          {estado === 'apagado' && (
            <>
              <p className="mt-1 text-[13px] leading-snug text-gris">
                Te avisamos apenas entra un pago, con el monto y quién compró, aunque tengas el panel cerrado.
              </p>
              <button
                type="button"
                onClick={activar}
                disabled={trabajando}
                className="presionable mt-3 inline-flex min-h-11 items-center justify-center rounded-full bg-tinta px-5 text-[14px] font-medium text-white hover:bg-tinta/85 disabled:opacity-50"
              >
                {trabajando ? 'Activando…' : 'Activar avisos'}
              </button>
            </>
          )}

          {estado === 'instalar-ios' && (
            <ol className="mt-2 space-y-1.5 text-[13px] leading-snug text-gris">
              <li>
                1. Toca <strong className="font-medium text-tinta">Compartir</strong>{' '}
                <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="inline -translate-y-px">
                  <path d="M12 3v12M8 7l4-4 4 4M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>{' '}
                en la barra de Safari.
              </li>
              <li>
                2. Elige <strong className="font-medium text-tinta">Agregar a inicio</strong>.
              </li>
              <li>3. Abre Tryvex desde la pantalla de inicio y activa los avisos aquí mismo.</li>
            </ol>
          )}

          {estado === 'bloqueado' && (
            <p className="mt-1 text-[13px] leading-snug text-gris">
              Este dispositivo tiene bloqueados los avisos del panel. Habilítalos en los ajustes de notificaciones del navegador o
              del teléfono, y vuelve a esta página.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
