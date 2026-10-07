'use client'

import Link from 'next/link'
import { useEffect, useRef, useState, useTransition, type FormEvent } from 'react'
import { IconoCamara, IconoEstrella } from '@/components/iconos'
import { enviarResenaCliente } from '@/app/producto/[slug]/acciones'

const TEXTO_MAX = 1200
const TIPOS = 'image/jpeg,image/png,image/webp,image/avif,image/heic'
const NOMBRES_NOTA = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente']

export type EstadoResena = 'puede' | 'sin-sesion' | 'en-revision' | 'publicada'

/** «Juan Pérez Soto» → «Juan P.»: así se firman las reseñas en la tienda. */
function firma(nombre: string | null): string {
  const partes = (nombre ?? '').trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return ''
  return partes.length === 1 ? partes[0] : `${partes[0]} ${partes[1][0].toUpperCase()}.`
}

/**
 * Botón y formulario para que un cliente con sesión deje su reseña.
 * La reseña queda en revisión: el equipo la aprueba en Panel → Reseñas.
 */
export function EscribirResena({ productoId, producto, estado, nombre, volver }: {
  productoId: string
  producto: string
  estado: EstadoResena
  nombre: string | null
  volver: string
}) {
  const ventana = useRef<HTMLDialogElement>(null)
  const [nota, setNota] = useState(0)
  const [largo, setLargo] = useState(0)
  const [foto, setFoto] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enviada, setEnviada] = useState(false)
  const [enviando, iniciar] = useTransition()

  useEffect(() => () => { if (foto) URL.revokeObjectURL(foto) }, [foto])

  const boton = 'presionable inline-flex min-h-[44px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold'

  if (estado === 'sin-sesion') {
    return (
      <Link href={`/cuenta/ingresar?volver=${encodeURIComponent(volver)}`} className={`${boton} bg-tinta text-white hover:bg-tinta/85`}>
        Escribir una reseña
      </Link>
    )
  }
  // Tras enviar, la ficha se actualiza sola y llega como «en revisión»: la ventana de
  // agradecimiento sigue montada (estado `enviada`) hasta que el cliente la cierra.
  const yaResenada = estado === 'en-revision' || estado === 'publicada' || enviada
  const aviso = (
    <p className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-verde/10 px-5 text-[14px] font-semibold text-verde">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
      {estado === 'publicada' ? 'Ya publicaste tu reseña' : 'Tu reseña está en revisión'}
    </p>
  )
  if (yaResenada && !enviada) return aviso

  // onSubmit y no `action`: con `action`, React vacía el formulario después de cada envío,
  // también cuando falla, y el cliente perdía lo que había escrito.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    if (nota === 0) return setError('Elige cuántas estrellas le das.')
    const formulario = new FormData(e.currentTarget)
    formulario.set('calificacion', String(nota))
    iniciar(async () => {
      const r = await enviarResenaCliente(formulario)
      if (r.ok) setEnviada(true)
      else setError(r.error)
    })
  }

  return (
    <>
      {enviada ? aviso : (
        <button type="button" onClick={() => ventana.current?.showModal()} className={`${boton} bg-tinta text-white hover:bg-tinta/85`}>
          Escribir una reseña
        </button>
      )}

      <dialog
        ref={ventana}
        aria-labelledby="escribir-resena-titulo"
        onClick={(e) => { if (e.target === e.currentTarget && !enviando) ventana.current?.close() }}
        className="m-auto max-h-[92dvh] w-[min(94vw,520px)] overflow-y-auto rounded-[24px] bg-papel p-0 text-tinta shadow-2xl backdrop:bg-black/60"
      >
        {enviada ? (
          <div className="p-7 text-center">
            <p className="mx-auto grid size-14 place-items-center rounded-full bg-verde/10 text-verde">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
            </p>
            <h2 id="escribir-resena-titulo" className="mt-4 text-[24px] font-semibold tracking-tarjeta">¡Gracias por tu reseña!</h2>
            <p className="mt-2 text-[16px] text-tinta-suave">La revisamos y la publicamos en esta página en poco tiempo.</p>
            <button type="button" autoFocus onClick={() => ventana.current?.close()} className={`${boton} mt-6 bg-tinta text-white`}>Listo</button>
          </div>
        ) : (
          <form onSubmit={enviar} className="p-6 t:p-7">
            <input type="hidden" name="producto_id" value={productoId} />
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="escribir-resena-titulo" className="text-[24px] leading-tight font-semibold tracking-tarjeta">Tu reseña</h2>
                <p className="mt-1 text-[14px] text-tinta-suave">{producto}</p>
              </div>
              <button type="button" onClick={() => ventana.current?.close()} disabled={enviando} aria-label="Cerrar" className="presionable grid size-10 shrink-0 place-items-center rounded-full bg-papel-alt text-tinta">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>

            <fieldset className="mt-6">
              <legend className="text-[15px] font-semibold">¿Cuántas estrellas le das?</legend>
              <div className="mt-2 flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="cursor-pointer rounded-full p-1 text-tinta has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta/40">
                    <input type="radio" name="estrellas" value={n} checked={nota === n} onChange={() => setNota(n)} className="sr-only" />
                    <IconoEstrella size={34} activo={n <= nota} className="transition-transform duration-150 hover:scale-110" />
                    <span className="sr-only">{n} {n === 1 ? 'estrella' : 'estrellas'}</span>
                  </label>
                ))}
                <span aria-live="polite" className="ml-2 text-[14px] font-medium text-tinta-suave">{NOMBRES_NOTA[nota]}</span>
              </div>
            </fieldset>

            <label className="mt-5 block">
              <span className="text-[15px] font-semibold">Tu opinión</span>
              <textarea
                name="texto"
                required
                minLength={10}
                maxLength={TEXTO_MAX}
                rows={5}
                onChange={(e) => setLargo(e.target.value.length)}
                placeholder="¿Cómo te ha funcionado? ¿Qué es lo que más te gusta?"
                className="mt-2 block w-full resize-y rounded-[14px] bg-papel-alt px-4 py-3 text-[16px] leading-relaxed text-tinta ring-1 ring-borde outline-none focus:ring-2 focus:ring-tinta/40"
              />
              <span className="mt-1 block text-right text-[12px] text-gris tabular-nums">{largo} / {TEXTO_MAX}</span>
            </label>

            <label className="mt-3 block">
              <span className="text-[15px] font-semibold">Tu nombre</span>
              <input
                name="nombre"
                required
                minLength={2}
                maxLength={40}
                defaultValue={firma(nombre)}
                autoComplete="name"
                className="mt-2 block min-h-[48px] w-full rounded-[14px] bg-papel-alt px-4 text-[16px] text-tinta ring-1 ring-borde outline-none focus:ring-2 focus:ring-tinta/40"
              />
              <span className="mt-1 block text-[12px] text-gris">Así aparecerá en la reseña. Te sugerimos nombre e inicial.</span>
            </label>

            <div className="mt-5">
              <span className="text-[15px] font-semibold">Foto <span className="font-normal text-tinta-suave">(opcional)</span></span>
              <label className="presionable mt-2 flex cursor-pointer items-center gap-3 rounded-[14px] bg-papel-alt p-3 ring-1 ring-borde has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-tinta/40">
                {foto ? (
                  // eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:), no pasa por next/image
                  <img src={foto} alt="Vista previa de tu foto" className="size-16 shrink-0 rounded-[10px] object-cover" />
                ) : (
                  <span className="grid size-16 shrink-0 place-items-center rounded-[10px] bg-papel text-tinta-suave"><IconoCamara size={22} /></span>
                )}
                <span className="text-[14px] text-tinta">{foto ? 'Cambiar foto' : 'Sube una foto de tu producto'}<span className="block text-[12px] text-gris">JPG, PNG o WebP · hasta 5 MB</span></span>
                <input
                  type="file"
                  name="foto"
                  accept={TIPOS}
                  className="sr-only"
                  onChange={(e) => {
                    const archivo = e.target.files?.[0]
                    setFoto(archivo ? URL.createObjectURL(archivo) : null)
                  }}
                />
              </label>
            </div>

            {error && <p role="alert" className="mt-4 rounded-[12px] bg-rojo/10 px-4 py-3 text-[14px] font-medium text-rojo">{error}</p>}

            <button type="submit" disabled={enviando} className={`${boton} mt-6 w-full justify-center bg-tinta text-white hover:bg-tinta/85 disabled:opacity-60`}>
              {enviando ? 'Enviando…' : 'Enviar reseña'}
            </button>
            <p className="mt-3 text-center text-[12px] text-gris">Revisamos cada reseña antes de publicarla.</p>
          </form>
        )}
      </dialog>
    </>
  )
}
