'use client'

import { useRef, useState, useTransition } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { BUCKET, PESO_MAXIMO_VIDEO, TIPOS_VIDEO } from '@/lib/imagenes'
import { confirmarVideoEscena, pedirSubidaVideoEscena, quitarVideoEscena } from './acciones'

/**
 * Video de una escena del banner principal.
 *
 * Se aplica apenas termina de subir, sin esperar a «Guardar»: perder 20 MB
 * subidos por olvidar un clic es lo peor que le puede pasar a quien edita
 * desde el teléfono. Sube directo al bucket con URL firmada (Vercel corta los
 * envíos de más de 4,5 MB). Con video, la escena lo muestra en bucle y la foto
 * queda de imagen de espera.
 */
export function CampoVideo({ clave, valor }: { clave: string; valor: string | null }) {
  const [video, setVideo] = useState<string | null>(valor)
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [quitando, empezar] = useTransition()
  const entrada = useRef<HTMLInputElement>(null)

  async function subir(archivo: File | undefined) {
    if (entrada.current) entrada.current.value = ''
    if (!archivo) return
    setAviso(null)
    if (!TIPOS_VIDEO.includes(archivo.type as (typeof TIPOS_VIDEO)[number])) {
      setAviso({ ok: false, texto: 'El video tiene que ser MP4 o WebM.' })
      return
    }
    if (archivo.size > PESO_MAXIMO_VIDEO) {
      setAviso({ ok: false, texto: `El video pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo son 30 MB.` })
      return
    }
    setSubiendo(true)
    try {
      const firma = await pedirSubidaVideoEscena(clave, archivo.type, archivo.size)
      if (!firma.ok) return setAviso({ ok: false, texto: firma.error })
      const { error } = await crearClienteNavegador()
        .storage.from(BUCKET)
        .uploadToSignedUrl(firma.ruta, firma.token, archivo, { contentType: archivo.type, cacheControl: '31536000' })
      if (error) return setAviso({ ok: false, texto: `No se pudo subir el video: ${error.message}` })
      const r = await confirmarVideoEscena(clave, firma.ruta)
      if (!r.ok) return setAviso({ ok: false, texto: r.error })
      setVideo(r.url)
      setAviso({ ok: true, texto: 'Video subido. Ya se ve en el banner.' })
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div className="md:col-span-2">
      <span className="mb-1 block text-[12px] font-medium text-gris">Video (opcional)</span>
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        <div className="relative aspect-video w-full max-w-[320px] overflow-hidden rounded-[14px] bg-black ring-1 ring-borde">
          {video ? (
            <video key={video} src={video} muted loop playsInline autoPlay controls className="size-full object-cover" />
          ) : (
            <span className="grid size-full place-items-center px-6 text-center text-[13px] text-white/60">Sin video: la escena muestra sus fotos.</span>
          )}
          {subiendo && <span className="absolute inset-0 grid place-items-center bg-black/60 text-[14px] font-medium text-white">Subiendo…</span>}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={subiendo || quitando}
            onClick={() => entrada.current?.click()}
            className="presionable inline-flex min-h-[44px] items-center justify-center rounded-full bg-papel-alt px-5 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-borde/40 disabled:opacity-60"
          >
            {video ? 'Cambiar video' : 'Subir video'}
          </button>
          {video && (
            <button
              type="button"
              disabled={subiendo || quitando}
              onClick={() =>
                empezar(async () => {
                  const r = await quitarVideoEscena(clave)
                  if (r.ok) setVideo(null)
                  setAviso(r.ok ? { ok: true, texto: 'Video quitado: vuelven las fotos.' } : { ok: false, texto: r.error })
                })
              }
              className="presionable inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[14px] font-medium text-rojo hover:bg-rojo/10 disabled:opacity-60"
            >
              Quitar video
            </button>
          )}
          <p className="max-w-[30ch] text-[12px] leading-snug text-gris">MP4 o WebM, hasta 30 MB. Horizontal y corto se ve mejor: 4 a 10 segundos, sin texto encima.</p>
          {aviso && <p role="status" className={`text-[13px] ${aviso.ok ? 'text-verde' : 'text-rojo'}`}>{aviso.texto}</p>}
        </div>
      </div>
      <input ref={entrada} type="file" accept={TIPOS_VIDEO.join(',')} className="sr-only" onChange={(e) => void subir(e.target.files?.[0])} />
    </div>
  )
}
