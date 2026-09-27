'use client'

import { useRef, useState, useTransition } from 'react'
import { Casilla } from '@/components/casilla'
import { Selector } from '@/components/selector'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { BUCKET, PESO_MAXIMO_VIDEO, TIPOS_VIDEO } from '@/lib/imagenes'
import { LARGO_FRASE, type EscenaFoco } from '@/lib/foco'
import { confirmarVideoFoco, guardarFoco, pedirSubidaVideoFoco, quitarVideoFoco } from './acciones-foco'

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const campo =
  'w-full min-h-[44px] rounded-[10px] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'

const MODOS = [
  { valor: 'bucle', titulo: 'En bucle', ayuda: 'Corre solo, en silencio, detrás de las frases.' },
  { valor: 'scroll', titulo: 'Con el scroll', ayuda: 'Avanza y retrocede a medida que se baja, como en Apple. Ideal para un producto que gira.' },
] as const

interface Props {
  escena: EscenaFoco
  visible: boolean
  productos: { slug: string; nombre: string }[]
}

/**
 * Editor de la escena en foco («Diseñados para acompañarte»).
 *
 * El video se sube apenas se elige, igual que las fotos de la portada: no
 * espera al botón Guardar, porque subir 20 MB y perderlos por olvidar un
 * clic es lo peor que le puede pasar a quien edita desde el teléfono.
 */
export function EditorFoco({ escena, visible, productos }: Props) {
  const [producto, setProducto] = useState(escena.producto ?? '')
  const [modo, setModo] = useState<string>(escena.modo)
  const [video, setVideo] = useState<string | null>(escena.video)
  const [subiendo, setSubiendo] = useState(false)
  const [aviso, setAviso] = useState<{ ok: boolean; texto: string } | null>(null)
  const [guardando, empezar] = useTransition()
  const entrada = useRef<HTMLInputElement>(null)

  async function subir(archivo: File | undefined) {
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
      const firma = await pedirSubidaVideoFoco(archivo.name, archivo.type, archivo.size)
      if (!firma.ok) return setAviso({ ok: false, texto: firma.error })
      const { error } = await crearClienteNavegador()
        .storage.from(BUCKET)
        .uploadToSignedUrl(firma.ruta, firma.token, archivo, { contentType: archivo.type, cacheControl: '31536000' })
      if (error) return setAviso({ ok: false, texto: `No se pudo subir el video: ${error.message}` })
      const r = await confirmarVideoFoco(firma.ruta)
      if (!r.ok) return setAviso({ ok: false, texto: r.error })
      setVideo(r.url)
      setAviso({ ok: true, texto: 'Video subido. Ya se ve en la portada.' })
    } finally {
      setSubiendo(false)
      if (entrada.current) entrada.current.value = ''
    }
  }

  return (
    <form
      action={(datos) =>
        empezar(async () => {
          const r = await guardarFoco(datos)
          setAviso(r.ok ? { ok: true, texto: 'Guardado. Ya se ve en la portada.' } : { ok: false, texto: r.error })
        })
      }
      className="rounded-[18px] bg-papel p-4 ring-1 ring-borde md:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-cuerpo text-tinta">Escena en foco</h2>
          <p className="mt-0.5 text-[12px] text-gris">La escena grande con frases que se relevan al bajar.</p>
        </div>
        <Casilla name="visible" defaultChecked={visible} className="!text-[14px] text-tinta-suave">
          Mostrar en la portada
        </Casilla>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {/* ── Video ─────────────────────────────────────────────── */}
        <div className="md:col-span-2">
          <span className={rotulo}>Video</span>
          <div className="flex flex-col gap-3 md:flex-row md:items-start">
            <div className="relative aspect-video w-full max-w-[360px] overflow-hidden rounded-[14px] bg-black ring-1 ring-borde">
              {video ? (
                <video key={video} src={video} muted loop playsInline autoPlay controls className="size-full object-cover" />
              ) : (
                <span className="grid size-full place-items-center px-6 text-center text-[13px] text-white/60">
                  Sin video: la escena muestra la foto del producto.
                </span>
              )}
              {subiendo && (
                <span className="absolute inset-0 grid place-items-center bg-black/60 text-[14px] font-medium text-white">Subiendo…</span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                disabled={subiendo}
                onClick={() => entrada.current?.click()}
                className="presionable inline-flex min-h-[44px] items-center justify-center rounded-full bg-papel-alt px-5 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-borde/40 disabled:opacity-60"
              >
                {video ? 'Cambiar video' : 'Subir video'}
              </button>
              {video && (
                <button
                  type="button"
                  disabled={subiendo || guardando}
                  onClick={() =>
                    empezar(async () => {
                      const r = await quitarVideoFoco()
                      if (r.ok) setVideo(null)
                      setAviso(r.ok ? { ok: true, texto: 'Video quitado.' } : { ok: false, texto: r.error })
                    })
                  }
                  className="presionable inline-flex min-h-[44px] items-center justify-center rounded-full px-5 text-[14px] font-medium text-rojo hover:bg-spark-suave disabled:opacity-60"
                >
                  Quitar video
                </button>
              )}
              <p className="max-w-[28ch] text-[12px] leading-snug text-gris">MP4 o WebM, hasta 30 MB. Horizontal y corto se ve mejor: 4 a 10 segundos.</p>
            </div>
          </div>
          <input
            ref={entrada}
            type="file"
            accept={TIPOS_VIDEO.join(',')}
            className="sr-only"
            onChange={(e) => void subir(e.target.files?.[0])}
          />
        </div>

        {/* ── Modo ──────────────────────────────────────────────── */}
        <fieldset className="md:col-span-2">
          <legend className={rotulo}>Cómo se mueve el video</legend>
          <div className="grid gap-2 md:grid-cols-2">
            {MODOS.map((m) => (
              <label
                key={m.valor}
                className={`cursor-pointer rounded-[14px] p-3.5 ring-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-spark ${modo === m.valor ? 'bg-papel-alt ring-2 ring-tinta' : 'ring-borde'}`}
              >
                <input type="radio" name="modo" value={m.valor} checked={modo === m.valor} onChange={() => setModo(m.valor)} className="sr-only" />
                <span className="block text-[15px] font-semibold text-tinta">{m.titulo}</span>
                <span className="mt-0.5 block text-[13px] text-tinta-suave">{m.ayuda}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Producto ──────────────────────────────────────────── */}
        <div className="md:col-span-2">
          <Selector
            id="foco-producto"
            name="producto"
            etiqueta="Producto del botón «Comprar»"
            placeholder="El primero disponible de la tienda"
            opciones={[{ valor: '', etiqueta: 'El primero disponible de la tienda' }, ...productos.map((p) => ({ valor: p.slug, etiqueta: p.nombre }))]}
            valor={producto}
            alCambiar={setProducto}
          />
          <p className="mt-1 text-[12px] text-gris">Su nombre aparece arriba de las frases y el botón lleva a su ficha.</p>
        </div>

        {/* ── Frases ────────────────────────────────────────────── */}
        {escena.frases.map((f, i) => (
          <fieldset key={i} className="md:col-span-2">
            <legend className={rotulo}>Frase {i + 1}</legend>
            <div className="grid gap-2 md:grid-cols-2">
              <input name={`frase_${i}_antes`} defaultValue={f.antes} maxLength={LARGO_FRASE} aria-label={`Frase ${i + 1}, inicio`} placeholder="Inicio, en blanco" className={campo} />
              <input name={`frase_${i}_resaltado`} defaultValue={f.resaltado} maxLength={LARGO_FRASE} aria-label={`Frase ${i + 1}, final destacado`} placeholder="Final, con degradado" className={campo} />
            </div>
          </fieldset>
        ))}
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={guardando || subiendo}
          className="presionable inline-flex min-h-[44px] items-center rounded-full bg-tinta px-6 text-[15px] font-medium text-papel hover:bg-tinta/90 disabled:opacity-60"
        >
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {aviso && (
          <p role="alert" className={`text-[14px] ${aviso.ok ? 'text-verde' : 'text-rojo'}`}>
            {aviso.texto}
          </p>
        )}
      </div>
    </form>
  )
}
