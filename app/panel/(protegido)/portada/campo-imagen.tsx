'use client'

import { useState } from 'react'

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const campo =
  'w-full min-h-[44px] rounded-[var(--radius-anidado)] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'

/**
 * Campo de imagen con vista previa, para subir, cambiar y quitar.
 *
 * Editar una ruta de imagen a ciegas es la forma más fácil de reemplazar la
 * pieza equivocada, así que la imagen actual es la zona de arrastre: se ve
 * qué se va a reemplazar y se suelta el archivo nuevo justo encima.
 *
 * Es un `img` normal y no el componente optimizado a propósito: la ruta es
 * arbitraria mientras se edita y puede apuntar a un origen aún no permitido.
 */
export function CampoImagen({ id, etiqueta, pista, valor, alCambiar, subir, proporcion, nombre, alQuitar }: {
  id: string
  etiqueta: string
  pista: string
  valor: string
  alCambiar: (url: string) => void
  /** Sube el archivo y devuelve su URL, o el motivo si falló. */
  subir: (archivo: File) => Promise<{ ok: true; url: string } | { ok: false; error: string }>
  proporcion: string
  /** Nombre de campo para formularios clásicos (las franjas). */
  nombre?: string
  /** Si se da, aparece «Quitar imagen»: no todas las piezas pueden quedar sin imagen. */
  alQuitar?: () => void
}) {
  const [falla, setFalla] = useState(false)
  const [subiendo, setSubiendo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [encima, setEncima] = useState(false)

  async function elegir(archivo: File | undefined) {
    if (!archivo) return
    setError(null)
    setSubiendo(true)
    const r = await subir(archivo)
    setSubiendo(false)
    if (r.ok) { setFalla(false); alCambiar(r.url) } else setError(r.error)
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={rotulo}>{etiqueta}</label>
        <span className="text-[11px] text-gris">{pista}</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setEncima(true) }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); void elegir(e.dataTransfer.files?.[0]) }}
        className={`relative ${proporcion} w-full overflow-hidden rounded-[var(--radius-anidado)] bg-papel-alt ring-1 transition-colors ${encima ? 'ring-2 ring-spark' : 'ring-borde'}`}
      >
        {valor && !falla ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={valor} alt="" onError={() => setFalla(true)} onLoad={() => setFalla(false)} className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center px-3 text-center text-[12px] text-gris">
            {valor ? 'No pudimos cargar esta imagen' : 'Sin imagen'}
          </span>
        )}
        {subiendo && <span className="absolute inset-0 grid place-items-center bg-papel/80 text-[13px] font-medium text-tinta">Subiendo…</span>}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="presionable inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-papel-alt px-4 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-papel">
          {valor ? 'Cambiar' : 'Subir imagen'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
            onChange={(e) => { void elegir(e.target.files?.[0]); e.target.value = '' }}
            disabled={subiendo}
            className="sr-only"
          />
        </label>
        {alQuitar && valor && (
          <button type="button" onClick={() => { setFalla(false); alQuitar() }} disabled={subiendo} className="presionable inline-flex min-h-[44px] items-center rounded-full px-4 text-[14px] font-medium text-rojo hover:bg-rojo/10 disabled:opacity-60">
            Quitar
          </button>
        )}
        <span className="text-[12px] text-gris">o arrástrala aquí · máx. 5 MB</span>
      </div>

      {error && <p role="alert" className="mt-1.5 text-[12px] text-rojo">{error}</p>}

      {/* La ruta queda a la vista y editable: sirve para reutilizar una imagen ya subida. */}
      <input
        id={id}
        name={nombre}
        value={valor}
        onChange={(e) => { setFalla(false); alCambiar(e.target.value) }}
        placeholder="/tienda/campana/banners/nombre-movil.webp"
        className={`${campo} mt-2 text-[12px]`}
      />
    </div>
  )
}
