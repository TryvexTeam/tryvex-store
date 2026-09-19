'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { urlPublica, MAX_POR_PRODUCTO, PESO_MAXIMO, TIPOS_ACEPTADOS } from '@/lib/imagenes'
import { subirImagen, borrarImagen, fijarPortada, moverImagen } from './acciones-catalogo'
import { useAvisos } from '@/components/avisos'
import {
  IconoCamara,
  IconoEstrella,
  IconoBasura,
  IconoFlecha,
  IconoMas,
} from '@/components/iconos'

type Props = {
  productoId: string
  galeria: string[]
  portada: string | null
}

/**
 * Galería de imágenes de un producto.
 *
 * Una imagen grande manda y las demás son miniaturas: es como se mira un
 * producto, y deja ver de verdad la foto que se está por publicar. Las
 * acciones actúan sobre la imagen seleccionada y viven en su propia barra,
 * no encima de la foto: botones diminutos sobre la miniatura tapaban
 * justamente lo que hay que revisar.
 *
 * Sube de a una y no en lote: desde el teléfono, con datos móviles, un lote
 * entero se pierde por una sola foto que falla.
 */
export function Galeria({ productoId, galeria, portada }: Props) {
  const avisos = useAvisos()
  const entrada = useRef<HTMLInputElement>(null)
  const [pendiente, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(0)
  const [encima, setEncima] = useState(false)
  const [sel, setSel] = useState(0)

  const lleno = galeria.length >= MAX_POR_PRODUCTO
  const ocupado = pendiente || subiendo > 0

  // Si se borra la última imagen, el índice queda apuntando al vacío.
  useEffect(() => {
    if (sel > galeria.length - 1) setSel(Math.max(0, galeria.length - 1))
  }, [galeria.length, sel])

  const actual = galeria[sel] ?? null
  const esPortada = actual !== null && actual === portada

  async function procesar(archivos: FileList | File[]) {
    setError(null)
    const lista = Array.from(archivos)
    const cupo = MAX_POR_PRODUCTO - galeria.length

    if (cupo <= 0) {
      setError(`Ya hay ${MAX_POR_PRODUCTO} imágenes. Borra alguna antes de subir otra.`)
      return
    }
    const aSubir = lista.slice(0, cupo)
    if (lista.length > cupo) setError(`Solo caben ${cupo} más: se subirán las primeras.`)

    for (const archivo of aSubir) {
      // Se valida antes de subir: mandar 5 MB para que el servidor los
      // rechace es tiempo y datos móviles tirados a la basura.
      if (!TIPOS_ACEPTADOS.includes(archivo.type as (typeof TIPOS_ACEPTADOS)[number])) {
        setError(`«${archivo.name}» no es una imagen admitida.`)
        continue
      }
      if (archivo.size > PESO_MAXIMO) {
        setError(
          `«${archivo.name}» pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo son 5 MB.`
        )
        continue
      }
      setSubiendo((n) => n + 1)
      const fd = new FormData()
      fd.set('producto_id', productoId)
      fd.set('archivo', archivo)
      const r = await subirImagen(fd)
      setSubiendo((n) => n - 1)
      if (r.ok) avisos.ok('Imagen añadida.')
      else {
        setError(r.error)
        avisos.error(r.error)
      }
    }
    if (entrada.current) entrada.current.value = ''
  }

  /** Toda acción de galería informa su resultado: sin confirmación, no se
   *  sabe si el toque registró o si la lista tardó en refrescarse. */
  const accion = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    exito: string
  ) =>
    empezar(async () => {
      setError(null)
      const r = await fn()
      if (r.ok) avisos.ok(exito)
      else if (r.error) {
        setError(r.error)
        avisos.error(r.error)
      }
    })

  const abrirSelector = () => entrada.current?.click()

  const soltar = (e: React.DragEvent) => {
    e.preventDefault()
    setEncima(false)
    if (e.dataTransfer.files?.length) void procesar(e.dataTransfer.files)
  }
  const arrastrar = (e: React.DragEvent) => {
    e.preventDefault()
    setEncima(true)
  }

  return (
    <section aria-label="Imágenes del producto">
      <div className="mb-2.5 flex items-baseline justify-between">
        <h3 className="text-[13px] font-semibold tracking-[-0.01em]">Imágenes</h3>
        <span className="text-[12px] text-gris">
          {galeria.length} de {MAX_POR_PRODUCTO}
        </span>
      </div>

      {galeria.length === 0 ? (
        /* ── Vacío: la zona de carga es el protagonista ───────────── */
        <button
          type="button"
          onClick={abrirSelector}
          onDragOver={arrastrar}
          onDragLeave={() => setEncima(false)}
          onDrop={soltar}
          disabled={ocupado}
          className={`presionable flex w-full flex-col items-center justify-center gap-2 rounded-[18px]
                      border-2 border-dashed px-6 py-12 transition-colors
                      ${
                        encima
                          ? 'border-spark bg-spark-suave text-spark'
                          : 'border-borde bg-papel-alt/60 text-gris hover:border-gris hover:text-tinta-suave'
                      }`}
        >
          {subiendo > 0 ? (
            <>
              <span className="size-7 animate-spin rounded-full border-2 border-borde border-t-spark" />
              <span className="text-[14px] font-medium">Subiendo…</span>
            </>
          ) : (
            <>
              <IconoCamara size={30} />
              <span className="text-[15px] font-semibold text-tinta">Añade las fotos</span>
              <span className="max-w-[15rem] text-center text-[12px] leading-snug">
                Arrastra los archivos o toca aquí. La primera será la portada en la tienda.
              </span>
            </>
          )}
        </button>
      ) : (
        <>
          {/* ── Imagen grande ──────────────────────────────────────── */}
          <div
            onDragOver={arrastrar}
            onDragLeave={() => setEncima(false)}
            onDrop={soltar}
            className={`relative overflow-hidden rounded-[18px] bg-papel-alt ring-1 transition-colors
                        ${encima ? 'ring-2 ring-spark' : 'ring-borde/70'}`}
          >
            {actual && (
              <Image
                key={actual}
                src={urlPublica(actual)}
                alt={`Imagen ${sel + 1} de ${galeria.length}`}
                width={720}
                height={720}
                className="cuadro w-full"
                priority
              />
            )}

            {esPortada && (
              <span
                className="absolute top-3 left-3 rounded-full bg-spark px-2.5 py-1 text-[10px]
                           font-semibold tracking-[0.04em] text-white shadow-[var(--shadow-sutil)]"
              >
                PORTADA
              </span>
            )}

            <span
              className="absolute top-3 right-3 rounded-full bg-tinta/55 px-2.5 py-1 text-[11px]
                         font-medium text-white backdrop-blur-sm"
            >
              {sel + 1} / {galeria.length}
            </span>
          </div>

          {/* ── Acciones sobre la imagen seleccionada ──────────────── */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              disabled={ocupado || sel === 0}
              onClick={() => actual && accion(() => moverImagen(productoId, actual, 'izquierda'), 'Orden actualizado.')}
              aria-label="Mover esta imagen hacia atrás"
              className="presionable grid size-10 place-items-center rounded-[10px] bg-papel-alt
                         text-tinta-suave disabled:opacity-35"
            >
              <IconoFlecha size={16} direccion="izquierda" />
            </button>
            <button
              type="button"
              disabled={ocupado || sel === galeria.length - 1}
              onClick={() => actual && accion(() => moverImagen(productoId, actual, 'derecha'), 'Orden actualizado.')}
              aria-label="Mover esta imagen hacia adelante"
              className="presionable grid size-10 place-items-center rounded-[10px] bg-papel-alt
                         text-tinta-suave disabled:opacity-35"
            >
              <IconoFlecha size={16} />
            </button>

            <button
              type="button"
              disabled={ocupado || esPortada}
              onClick={() => actual && accion(() => fijarPortada(productoId, actual), 'Portada actualizada.')}
              className={`presionable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px]
                          text-[13px] font-semibold transition-colors
                          ${
                            esPortada
                              ? 'bg-spark-suave text-spark'
                              : 'bg-papel-alt text-tinta-suave hover:bg-borde/50'
                          }`}
            >
              <IconoEstrella size={15} activo={esPortada} />
              {esPortada ? 'Es la portada' : 'Usar de portada'}
            </button>

            <button
              type="button"
              disabled={ocupado}
              onClick={() => actual && accion(() => borrarImagen(productoId, actual), 'Imagen borrada.')}
              aria-label="Borrar esta imagen"
              className="presionable grid size-10 place-items-center rounded-[10px] bg-papel-alt
                         text-tinta-suave hover:bg-spark-suave hover:text-spark disabled:opacity-35"
            >
              <IconoBasura size={16} />
            </button>
          </div>

          {/* ── Tira de miniaturas ─────────────────────────────────── */}
          <ul className="sin-barra mt-3 flex gap-2 overflow-x-auto pb-1">
            {galeria.map((ruta, i) => (
              <li key={ruta} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setSel(i)}
                  aria-label={`Ver la imagen ${i + 1}`}
                  aria-current={i === sel ? 'true' : undefined}
                  className={`presionable relative block size-16 overflow-hidden rounded-[12px] bg-papel-alt
                              ring-1 transition-all ${
                                i === sel ? 'ring-2 ring-spark' : 'ring-borde/70 hover:ring-gris'
                              }`}
                >
                  <Image
                    src={urlPublica(ruta)}
                    alt=""
                    width={128}
                    height={128}
                    className="cuadro size-full"
                  />
                  {ruta === portada && (
                    <span className="absolute inset-x-0 bottom-0 bg-spark py-[1px] text-center text-[8px] font-bold text-white">
                      PORTADA
                    </span>
                  )}
                </button>
              </li>
            ))}

            {Array.from({ length: subiendo }).map((_, i) => (
              <li key={`subiendo-${i}`} className="shrink-0">
                <span className="grid size-16 place-items-center rounded-[12px] bg-papel-alt ring-1 ring-borde/70">
                  <span className="size-4 animate-spin rounded-full border-2 border-borde border-t-spark" />
                  <span className="sr-only">Subiendo imagen…</span>
                </span>
              </li>
            ))}

            {!lleno && (
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={abrirSelector}
                  disabled={ocupado}
                  aria-label="Añadir más imágenes"
                  className="presionable grid size-16 place-items-center rounded-[12px] border border-dashed
                             border-borde bg-papel-alt/60 text-gris hover:border-gris hover:text-tinta-suave
                             disabled:opacity-50"
                >
                  <IconoMas size={20} />
                </button>
              </li>
            )}
          </ul>
        </>
      )}

      <input
        ref={entrada}
        type="file"
        accept={TIPOS_ACEPTADOS.join(',')}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void procesar(e.target.files)
        }}
      />

      {galeria.length > 0 && (
        <p className="mt-2 text-[12px] text-gris">
          El orden es el que verá la tienda. JPG, PNG, WebP o HEIC, hasta 5 MB.
        </p>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 rounded-[10px] bg-spark-suave px-3 py-2 text-[13px] text-spark"
        >
          {error}
        </p>
      )}
    </section>
  )
}
