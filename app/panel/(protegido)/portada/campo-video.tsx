'use client'

import { useRef, useState } from 'react'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { BUCKET, PESO_MAXIMO_VIDEO, TIPOS_VIDEO } from '@/lib/imagenes'
import { confirmarVideoEscena, pedirSubidaVideoEscena } from './acciones'

/**
 * Video de una escena del banner.
 *
 * Sube directo al bucket con URL firmada (Vercel corta los envíos de más de
 * 4,5 MB) y solo deja el video en el borrador: la tienda no cambia hasta que
 * se publica la escena. Quitarlo tampoco borra nada todavía, así que cancelar
 * nunca deja a la tienda apuntando a un archivo que ya no existe.
 */
export function CampoVideo({ clave, valor, alCambiar, etiqueta = 'Video', ayuda = 'MP4 o WebM, hasta 30 MB. Horizontal y sin texto encima se ve mejor. La escena avanza cuando el video termina.', vertical = false }: { clave: string; valor: string; alCambiar: (url: string) => void; etiqueta?: string; ayuda?: string; vertical?: boolean }) {
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState<string | null>(null)
  const entrada = useRef<HTMLInputElement>(null)

  async function subir(archivo: File | undefined) {
    if (entrada.current) entrada.current.value = ''
    if (!archivo) return
    setAviso(null)
    if (!TIPOS_VIDEO.includes(archivo.type as (typeof TIPOS_VIDEO)[number])) return setAviso('El video tiene que ser MP4 o WebM.')
    if (archivo.size > PESO_MAXIMO_VIDEO) return setAviso(`El video pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo son 30 MB.`)
    setSubiendo(true)
    try {
      const firma = await pedirSubidaVideoEscena(clave, archivo.type, archivo.size)
      if (!firma.ok) return setAviso(firma.error)
      const { error } = await crearClienteNavegador()
        .storage.from(BUCKET)
        .uploadToSignedUrl(firma.ruta, firma.token, archivo, { contentType: archivo.type, cacheControl: '31536000' })
      if (error) return setAviso(`No se pudo subir el video: ${error.message}`)
      const r = await confirmarVideoEscena(clave, firma.ruta)
      if (!r.ok) return setAviso(r.error)
      alCambiar(r.url)
    } finally {
      setSubiendo(false)
    }
  }

  return (
    <div>
      <span className="mb-1 block text-[12px] font-medium text-gris">{etiqueta}</span>
      <div className={`relative w-full overflow-hidden rounded-[var(--radius-anidado)] bg-black ring-1 ring-borde ${vertical ? 'aspect-[9/16] max-w-[168px]' : 'aspect-video max-w-[360px]'}`}>
        {valor ? (
          <video key={valor} src={valor} muted loop playsInline autoPlay controls className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center px-6 text-center text-[13px] text-white/60">Sin video: la escena muestra sus imágenes.</span>
        )}
        {subiendo && <span className="absolute inset-0 grid place-items-center bg-black/60 text-[14px] font-medium text-white">Subiendo…</span>}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button type="button" disabled={subiendo} onClick={() => entrada.current?.click()} className="presionable inline-flex min-h-[44px] items-center rounded-full bg-papel-alt px-4 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-papel disabled:opacity-60">
          {valor ? 'Cambiar' : 'Subir video'}
        </button>
        {valor && (
          <button type="button" disabled={subiendo} onClick={() => alCambiar('')} className="presionable inline-flex min-h-[44px] items-center rounded-full px-4 text-[14px] font-medium text-rojo hover:bg-rojo/10 disabled:opacity-60">
            Quitar
          </button>
        )}
      </div>
      <p className="mt-1 max-w-[46ch] text-[12px] leading-snug text-gris">{ayuda}</p>
      {aviso && <p role="alert" className="mt-1 text-[12px] text-rojo">{aviso}</p>}
      <input ref={entrada} type="file" accept={TIPOS_VIDEO.join(',')} className="sr-only" onChange={(e) => void subir(e.target.files?.[0])} />
    </div>
  )
}
