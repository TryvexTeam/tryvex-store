'use client'

import { useEffect, useState } from 'react'

const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic']
const PESO_MAXIMO = 5 * 1024 * 1024

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

/**
 * Foto opcional de una reseña, con el mismo aspecto que el campo de imagen de la
 * portada: la zona de vista previa es también la de arrastre, y se puede cambiar
 * o quitar.
 *
 * A diferencia del de la portada, NO sube el archivo al elegirlo: lo entrega al
 * formulario y se sube junto con la reseña al guardarla. Así, si se cancela o la
 * reseña falla, no quedan fotos huérfanas en el almacenamiento.
 */
export function CampoFotoResena({ id, archivo, alCambiar, alError, deshabilitado }: {
  id: string
  archivo: File | null
  alCambiar: (archivo: File | null) => void
  /** Motivo por el que se rechazó el archivo (formato o peso). */
  alError: (mensaje: string) => void
  deshabilitado?: boolean
}) {
  const [encima, setEncima] = useState(false)
  const [vista, setVista] = useState<string | null>(null)

  // La URL de vista previa es un recurso del navegador: se libera al cambiar de foto.
  useEffect(() => {
    if (!archivo) { setVista(null); return }
    const url = URL.createObjectURL(archivo)
    setVista(url)
    return () => URL.revokeObjectURL(url)
  }, [archivo])

  function elegir(nuevo: File | undefined) {
    if (!nuevo) return
    if (!TIPOS.includes(nuevo.type)) return alError('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
    if (nuevo.size > PESO_MAXIMO) return alError(`La foto pesa ${(nuevo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)
    alCambiar(nuevo)
  }

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2">
        <label htmlFor={id} className={rotulo}>Foto de la reseña</label>
        <span className="text-[11px] text-gris">Opcional</span>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); if (!deshabilitado) setEncima(true) }}
        onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); if (!deshabilitado) elegir(e.dataTransfer.files?.[0]) }}
        className={`relative aspect-[16/9] w-full max-w-[420px] overflow-hidden rounded-[12px] bg-papel-alt ring-1 transition-colors ${encima ? 'ring-2 ring-spark' : 'ring-borde'}`}
      >
        {vista ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={vista} alt="Vista previa de la foto elegida" className="size-full object-cover" />
        ) : (
          <span className="grid size-full place-items-center px-3 text-center text-[12px] text-gris">Sin foto</span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <label className="presionable inline-flex min-h-[44px] cursor-pointer items-center rounded-full bg-papel-alt px-4 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-papel has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
          {archivo ? 'Cambiar' : 'Subir foto'}
          <input
            id={id}
            type="file"
            accept={TIPOS.join(',')}
            onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = '' }}
            disabled={deshabilitado}
            className="sr-only"
          />
        </label>
        {archivo && (
          <button type="button" onClick={() => alCambiar(null)} disabled={deshabilitado} className="presionable inline-flex min-h-[44px] items-center rounded-full px-4 text-[14px] font-medium text-rojo hover:bg-rojo/10 disabled:opacity-60">
            Quitar
          </button>
        )}
        <span className="text-[12px] text-gris">o arrástrala aquí · máx. 5 MB</span>
      </div>
    </div>
  )
}
