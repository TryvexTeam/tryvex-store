'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { urlPublica, MAX_POR_PRODUCTO, PESO_MAXIMO, PESO_MAXIMO_VIDEO, TIPOS_ACEPTADOS, TIPOS_VIDEO, BUCKET, esVideo } from '@/lib/imagenes'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { subirImagen, borrarImagen, fijarPortada, pedirSubidaVideo, confirmarVideo, reordenarGaleria } from './acciones-catalogo'
import { useAvisos } from '@/components/avisos'
import { IconoCamara, IconoEstrella, IconoBasura, IconoMas } from '@/components/iconos'

type Props = {
  productoId: string
  galeria: string[]
  portada: string | null
}

type Resultado = { ok: true } | { ok: false; error: string }

/**
 * Fotos y videos de un producto, al estilo del administrador de medios de
 * Shopify: la primera va grande y el resto en grilla, en el orden exacto que
 * verá la tienda.
 *
 *  - Se ordenan arrastrando: con el mouse, con el dedo (manteniendo
 *    presionado, para no pelear con el scroll) o con el teclado (espacio para
 *    tomar, flechas para mover, espacio para soltar).
 *  - Tocar una casilla la selecciona; las acciones (portada, borrar) viven
 *    en una barra aparte, no encima de la foto, donde tapaban lo que hay que
 *    revisar y en el teléfono no había hover para mostrarlas.
 *  - Los videos (MP4 o WebM, hasta 30 MB) no pasan por Vercel, que corta a
 *    los 4,5 MB: el servidor firma la subida y el navegador la hace directo.
 */
export function Galeria({ productoId, galeria, portada }: Props) {
  const avisos = useAvisos()
  const entrada = useRef<HTMLInputElement>(null)
  const [pendiente, empezar] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(0)
  const [encima, setEncima] = useState(false)
  const [orden, setOrden] = useState(galeria)
  const [sel, setSel] = useState<string | null>(null)

  // La lista del servidor manda: tras subir, borrar u ordenar, se resincroniza.
  useEffect(() => setOrden(galeria), [galeria])
  useEffect(() => {
    if (sel && !galeria.includes(sel)) setSel(null)
  }, [galeria, sel])

  const lleno = orden.length >= MAX_POR_PRODUCTO
  const ocupado = pendiente || subiendo > 0

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // En el teléfono hay que mantener apretado: un toque corto sigue siendo
    // scroll o selección, no arrastre.
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function alSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return
    const previo = orden
    const nuevo = arrayMove(orden, orden.indexOf(String(active.id)), orden.indexOf(String(over.id)))
    setOrden(nuevo)
    empezar(async () => {
      const r = await reordenarGaleria(productoId, nuevo)
      if (r.ok) avisos.ok('Orden guardado.')
      else {
        setOrden(previo)
        setError(r.error)
        avisos.error(r.error)
      }
    })
  }

  /** Sube un video en tres pasos: firma, subida directa y confirmación. */
  async function subirVideo(archivo: File): Promise<Resultado> {
    const firma = await pedirSubidaVideo(productoId, archivo.name, archivo.type, archivo.size)
    if (!firma.ok) return firma
    const { error: e } = await crearClienteNavegador()
      .storage.from(BUCKET)
      .uploadToSignedUrl(firma.ruta, firma.token, archivo, { contentType: archivo.type, cacheControl: '31536000' })
    if (e) return { ok: false, error: `No se pudo subir el video: ${e.message}` }
    return confirmarVideo(productoId, firma.ruta)
  }

  async function procesar(archivos: FileList | File[]) {
    setError(null)
    const lista = Array.from(archivos)
    const cupo = MAX_POR_PRODUCTO - orden.length
    if (cupo <= 0) {
      setError(`Ya hay ${MAX_POR_PRODUCTO} archivos. Borra alguno antes de subir otro.`)
      return
    }
    if (lista.length > cupo) setError(`Solo caben ${cupo} más: se subirán los primeros.`)

    for (const archivo of lista.slice(0, cupo)) {
      // Se valida antes de subir: mandar un archivo para que el servidor lo
      // rechace es tiempo y datos móviles tirados a la basura.
      const video = TIPOS_VIDEO.includes(archivo.type as (typeof TIPOS_VIDEO)[number])
      const imagen = TIPOS_ACEPTADOS.includes(archivo.type as (typeof TIPOS_ACEPTADOS)[number])
      if (!video && !imagen) {
        setError(`«${archivo.name}» no es una foto ni un video admitido.`)
        continue
      }
      const maximo = video ? PESO_MAXIMO_VIDEO : PESO_MAXIMO
      if (archivo.size > maximo) {
        setError(`«${archivo.name}» pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB; el máximo son ${maximo / 1024 / 1024} MB.`)
        continue
      }
      setSubiendo((n) => n + 1)
      let r: Resultado
      if (video) r = await subirVideo(archivo)
      else {
        const fd = new FormData()
        fd.set('producto_id', productoId)
        fd.set('archivo', archivo)
        r = await subirImagen(fd)
      }
      setSubiendo((n) => n - 1)
      if (r.ok) avisos.ok(video ? 'Video añadido.' : 'Foto añadida.')
      else {
        setError(r.error)
        avisos.error(r.error)
      }
    }
    if (entrada.current) entrada.current.value = ''
  }

  /** Toda acción informa su resultado: sin confirmación no se sabe si el toque registró. */
  const accion = (fn: () => Promise<{ ok: boolean; error?: string }>, exito: string) =>
    empezar(async () => {
      setError(null)
      const r = await fn()
      if (r.ok) avisos.ok(exito)
      else if (r.error) {
        setError(r.error)
        avisos.error(r.error)
      }
    })

  const soltarArchivos = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setEncima(false)
    if (e.dataTransfer.files?.length) void procesar(e.dataTransfer.files)
  }
  const arrastrarArchivos = (e: React.DragEvent) => {
    if (!e.dataTransfer.types.includes('Files')) return
    e.preventDefault()
    setEncima(true)
  }

  const selEsVideo = esVideo(sel)
  const selEsPortada = sel !== null && sel === portada

  return (
    <section aria-label="Fotos y videos del producto">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-[15px] font-semibold tracking-[-0.01em]">Fotos y videos</h3>
        <span className="cifra text-[12px] text-gris">{orden.length} de {MAX_POR_PRODUCTO}</span>
      </div>

      {orden.length === 0 && subiendo === 0 ? (
        <button
          type="button"
          onClick={() => entrada.current?.click()}
          onDragOver={arrastrarArchivos}
          onDragLeave={() => setEncima(false)}
          onDrop={soltarArchivos}
          className={`presionable flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed px-6 transition-colors ${
            encima ? 'border-tinta bg-papel-alt' : 'border-borde bg-papel-alt/60 text-gris hover:border-gris'
          }`}
        >
          <IconoCamara size={30} />
          <span className="text-[15px] font-semibold text-tinta">Añade fotos o videos</span>
          <span className="max-w-[16rem] text-center text-[12px] leading-snug">Arrástralos aquí o toca para elegir. La primera foto será la portada.</span>
        </button>
      ) : (
        <div
          onDragOver={arrastrarArchivos}
          onDragLeave={() => setEncima(false)}
          onDrop={soltarArchivos}
          className={`rounded-[18px] transition-shadow ${encima ? 'ring-2 ring-tinta ring-offset-4' : ''}`}
        >
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
            <SortableContext items={orden} strategy={rectSortingStrategy}>
              <ul className="grid grid-cols-3 gap-2.5" aria-label="Orden de las fotos y videos">
                {orden.map((ruta, i) => (
                  <Casilla
                    key={ruta}
                    ruta={ruta}
                    indice={i}
                    total={orden.length}
                    esPortada={ruta === portada}
                    seleccionada={ruta === sel}
                    deshabilitada={ocupado}
                    alElegir={() => setSel((s) => (s === ruta ? null : ruta))}
                  />
                ))}
                {Array.from({ length: subiendo }).map((_, i) => (
                  <li key={`subiendo-${i}`} className="grid aspect-square place-items-center rounded-[14px] bg-papel-alt ring-1 ring-borde/70">
                    <span className="size-5 animate-spin rounded-full border-2 border-borde border-t-tinta" />
                    <span className="sr-only">Subiendo…</span>
                  </li>
                ))}
                {!lleno && (
                  <li>
                    <button
                      type="button"
                      onClick={() => entrada.current?.click()}
                      disabled={ocupado}
                      aria-label="Añadir fotos o videos"
                      className="presionable grid aspect-square w-full place-items-center rounded-[14px] border border-dashed border-borde bg-papel-alt/60 text-gris hover:border-gris hover:text-tinta disabled:opacity-50"
                    >
                      <IconoMas size={22} />
                    </button>
                  </li>
                )}
              </ul>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* ── Acciones sobre la casilla elegida ─────────────────────── */}
      {sel && (
        <div className="mt-3 flex items-center gap-2 rounded-[14px] bg-papel-alt p-2" role="toolbar" aria-label="Acciones de la foto elegida">
          <button
            type="button"
            disabled={ocupado || selEsPortada || selEsVideo}
            title={selEsVideo ? 'La portada tiene que ser una foto' : undefined}
            onClick={() => accion(() => fijarPortada(productoId, sel), 'Portada actualizada.')}
            className="presionable flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-papel text-[13px] font-semibold text-tinta ring-1 ring-borde/70 disabled:opacity-50"
          >
            <IconoEstrella size={15} activo={selEsPortada} />
            {selEsPortada ? 'Es la portada' : selEsVideo ? 'Un video no es portada' : 'Usar de portada'}
          </button>
          <button
            type="button"
            disabled={ocupado}
            onClick={() => accion(() => borrarImagen(productoId, sel), selEsVideo ? 'Video borrado.' : 'Foto borrada.')}
            className="presionable flex h-10 items-center gap-1.5 rounded-[10px] bg-papel px-3.5 text-[13px] font-semibold text-tinta-suave ring-1 ring-borde/70 hover:text-rojo disabled:opacity-50"
          >
            <IconoBasura size={15} />
            Borrar
          </button>
        </div>
      )}

      <input
        ref={entrada}
        type="file"
        accept={[...TIPOS_ACEPTADOS, ...TIPOS_VIDEO].join(',')}
        multiple
        className="sr-only"
        onChange={(e) => {
          if (e.target.files?.length) void procesar(e.target.files)
        }}
      />

      {orden.length > 0 && (
        <p className="mt-2.5 text-[12px] leading-relaxed text-gris">
          Arrastra para ordenar (en el teléfono, mantén presionado). Toca una para elegirla. Fotos hasta 5 MB; videos MP4 o WebM hasta 30 MB.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 rounded-[10px] bg-rojo/10 px-3 py-2 text-[13px] text-rojo">
          {error}
        </p>
      )}
    </section>
  )
}

/** Una foto o video de la grilla, arrastrable. La primera ocupa 2 × 2. */
function Casilla({
  ruta,
  indice,
  total,
  esPortada,
  seleccionada,
  deshabilitada,
  alElegir,
}: {
  ruta: string
  indice: number
  total: number
  esPortada: boolean
  seleccionada: boolean
  deshabilitada: boolean
  alElegir: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ruta, disabled: deshabilitada })
  const video = esVideo(ruta)
  const src = urlPublica(ruta)

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`relative ${indice === 0 ? 'col-span-2 row-span-2' : ''} ${isDragging ? 'z-10' : ''}`}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onClick={alElegir}
        aria-pressed={seleccionada}
        aria-label={`${video ? 'Video' : 'Foto'} ${indice + 1} de ${total}${esPortada ? ', portada' : ''}. Toca para elegir; mantén presionado para mover.`}
        className={`presionable relative block aspect-square w-full touch-manipulation overflow-hidden rounded-[14px] bg-papel-alt transition-shadow select-none ${
          isDragging ? 'cursor-grabbing shadow-[0_12px_32px_rgb(0_0_0/22%)] ring-2 ring-tinta' : seleccionada ? 'cursor-grab ring-2 ring-tinta' : 'cursor-grab ring-1 ring-borde/70 hover:ring-gris'
        }`}
      >
        {video ? (
          <>
            <video src={`${src}#t=0.1`} muted playsInline preload="metadata" className="pointer-events-none size-full object-cover" />
            <span aria-hidden className="absolute right-2 bottom-2 grid size-7 place-items-center rounded-full bg-tinta/70 text-white backdrop-blur-sm">
              <svg viewBox="0 0 10 10" className="ml-px size-2.5" fill="currentColor"><path d="M2 1.2v7.6L8.6 5z" /></svg>
            </span>
          </>
        ) : (
          <Image src={src} alt="" fill sizes={indice === 0 ? '360px' : '160px'} draggable={false} className="pointer-events-none object-contain p-2" />
        )}
        {/* En la casilla grande cabe la palabra; en las chicas, una estrella
            para no tapar el número. */}
        {esPortada &&
          (indice === 0 ? (
            <span className="absolute top-2 left-2 rounded-full bg-tinta px-2 py-0.5 text-[10px] font-semibold tracking-[0.04em] text-white">PORTADA</span>
          ) : (
            <span aria-hidden className="absolute top-2 left-2 grid size-5 place-items-center rounded-full bg-tinta text-white">
              <IconoEstrella size={11} activo />
            </span>
          ))}
        <span aria-hidden className="cifra absolute top-2 right-2 grid min-w-5 place-items-center rounded-full bg-papel/85 px-1.5 text-[11px] font-semibold text-tinta-suave backdrop-blur-sm">
          {indice + 1}
        </span>
      </button>
    </li>
  )
}
