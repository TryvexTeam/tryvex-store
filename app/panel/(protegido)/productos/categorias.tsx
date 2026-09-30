'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { urlPublica, TIPOS_ACEPTADOS } from '@/lib/imagenes'
import type { Categoria } from '@/lib/catalogo'
import { useAvisos } from '@/components/avisos'
import { IconoMas } from '@/components/iconos'
import { guardarCategoria, borrarCategoria, alternarCategoria, subirFotoCategoria, quitarFotoCategoria } from './acciones-categorias'

/**
 * Reduce la foto antes de enviarla: el servidor rechaza cuerpos de más de unos
 * pocos MB y una foto de celular pesa el doble o el triple. Para la fila de
 * familias sobran 1200 px. Si el navegador no puede leerla (p. ej. HEIC), se
 * envía tal cual y decide el servidor.
 */
async function reducirFoto(archivo: File, ladoMax = 1200): Promise<File> {
  try {
    const bmp = await createImageBitmap(archivo)
    const escala = Math.min(1, ladoMax / Math.max(bmp.width, bmp.height))
    const lienzo = document.createElement('canvas')
    lienzo.width = Math.round(bmp.width * escala)
    lienzo.height = Math.round(bmp.height * escala)
    lienzo.getContext('2d')?.drawImage(bmp, 0, 0, lienzo.width, lienzo.height)
    bmp.close()
    const blob = await new Promise<Blob | null>((ok) => lienzo.toBlob(ok, 'image/webp', 0.86))
    if (!blob || blob.size >= archivo.size) return archivo
    return new File([blob], archivo.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' })
  } catch {
    return archivo
  }
}

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-tinta focus:outline-none disabled:opacity-60'

/**
 * Gestión de categorías: crear, renombrar, ordenar, ocultar, borrar las
 * vacías y elegir la foto que las representa en la fila de familias de la
 * tienda. Sin foto propia, la tienda usa la del primer producto.
 */
export function Categorias({
  categorias,
  conteo,
}: {
  categorias: Categoria[]
  conteo: Record<string, number>
}) {
  const [editando, setEditando] = useState<string | 'nueva' | null>(categorias.length ? null : 'nueva')
  const [pendiente, empezar] = useTransition()
  const avisos = useAvisos()
  const entradaFoto = useRef<HTMLInputElement>(null)
  const [fotoPara, setFotoPara] = useState<string | null>(null)
  const [subiendoFoto, setSubiendoFoto] = useState<string | null>(null)

  function elegirFoto(id: string) {
    setFotoPara(id)
    entradaFoto.current?.click()
  }

  async function subirFoto(archivo: File | undefined) {
    const id = fotoPara
    if (entradaFoto.current) entradaFoto.current.value = ''
    if (!archivo || !id) return
    setSubiendoFoto(id)
    try {
      const datos = new FormData()
      datos.set('id', id)
      datos.set('archivo', await reducirFoto(archivo))
      const r = await subirFotoCategoria(datos)
      if (r.ok) avisos.ok('Foto de la categoría actualizada.')
      else avisos.error(r.error)
    } catch {
      // Antes, un rechazo del servidor (p. ej. foto demasiado pesada) dejaba el
      // círculo girando para siempre porque este apagado quedaba después del await.
      avisos.error('No se pudo subir la foto. Prueba con una imagen más liviana.')
    } finally {
      setSubiendoFoto(null)
    }
  }

  function quitarFoto(c: Categoria) {
    empezar(async () => {
      const r = await quitarFotoCategoria(c.id)
      if (r.ok) avisos.ok('Foto quitada. La tienda usa la del primer producto.')
      else avisos.error(r.error)
    })
  }

  function enviar(e: React.FormEvent<HTMLFormElement>, esNueva: boolean) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    empezar(async () => {
      const r = await guardarCategoria(datos)
      if (r.ok) {
        avisos.ok(esNueva ? 'Categoría creada.' : 'Categoría guardada.')
        setEditando(null)
      } else avisos.error(r.error)
    })
  }

  function borrar(c: Categoria) {
    if (!confirm(`¿Borrar la categoría «${c.nombre}»?`)) return
    empezar(async () => {
      const r = await borrarCategoria(c.id)
      if (r.ok) avisos.ok('Categoría borrada.')
      else avisos.error(r.error)
    })
  }

  function alternar(c: Categoria) {
    empezar(async () => {
      const r = await alternarCategoria(c.id, !c.activo)
      if (r.ok) avisos.ok(c.activo ? 'Categoría oculta de la tienda.' : 'Categoría visible en la tienda.')
      else avisos.error(r.error)
    })
  }

  const formulario = (c?: Categoria) => (
    <form onSubmit={(e) => enviar(e, !c)} className="space-y-2.5 rounded-[14px] bg-papel p-4 ring-2 ring-tinta/15">
      {c && <input type="hidden" name="id" value={c.id} />}
      <div className="grid grid-cols-[1fr_5rem] gap-2.5">
        <div>
          <label htmlFor={`cn-${c?.id ?? 'nueva'}`} className="mb-1 block text-[12px] font-medium text-gris">Nombre</label>
          <input id={`cn-${c?.id ?? 'nueva'}`} name="nombre" required maxLength={60} defaultValue={c?.nombre ?? ''}
                 placeholder="Relojes" disabled={pendiente} className={campo} autoFocus />
        </div>
        <div>
          <label htmlFor={`co-${c?.id ?? 'nueva'}`} className="mb-1 block text-[12px] font-medium text-gris">Orden</label>
          <input id={`co-${c?.id ?? 'nueva'}`} name="orden" type="number" step="1"
                 defaultValue={c?.orden ?? categorias.length + 1} disabled={pendiente} className={`${campo} cifra`} />
        </div>
      </div>
      <div>
        <label htmlFor={`cd-${c?.id ?? 'nueva'}`} className="mb-1 block text-[12px] font-medium text-gris">
          Descripción <span className="font-normal">(opcional)</span>
        </label>
        <input id={`cd-${c?.id ?? 'nueva'}`} name="descripcion" maxLength={400} defaultValue={c?.descripcion ?? ''}
               disabled={pendiente} className={campo} />
      </div>
      {c && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-gris">
            Dirección en la tienda: <span className="cifra">/tienda?cat={c.slug}</span>
          </p>
          {c.imagen_url && (
            <button type="button" onClick={() => quitarFoto(c)} disabled={pendiente} className="rounded-full px-3 py-1.5 text-[12px] text-gris hover:bg-papel-alt hover:text-tinta">
              Quitar foto
            </button>
          )}
        </div>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pendiente}
                className="presionable rounded-full bg-tinta px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
          {pendiente ? 'Guardando…' : c ? 'Guardar' : 'Crear categoría'}
        </button>
        <button type="button" onClick={() => setEditando(null)} className="rounded-full px-4 py-2.5 text-[13px] text-gris">
          Cancelar
        </button>
      </div>
    </form>
  )

  return (
    <div className="space-y-3">
      <input
        ref={entradaFoto}
        type="file"
        accept={TIPOS_ACEPTADOS.join(',')}
        className="sr-only"
        onChange={(e) => void subirFoto(e.target.files?.[0])}
      />
      <p className="text-[12px] text-gris">Toca el cuadro de cada categoría para elegir su foto en la tienda. Sin foto, se usa la del primer producto.</p>
      <ul className="space-y-2">
        {categorias.map((c) =>
          editando === c.id ? (
            <li key={c.id}>{formulario(c)}</li>
          ) : (
            <li key={c.id} className={`flex items-center gap-3 rounded-[12px] bg-papel-alt px-3.5 py-3 ${c.activo ? '' : 'opacity-60'}`}>
              <span className="cifra w-5 shrink-0 text-center text-[12px] text-gris">{c.orden}</span>
              {/* La foto de la fila de familias: tocarla para cambiarla. */}
              <button
                type="button"
                onClick={() => elegirFoto(c.id)}
                disabled={pendiente || subiendoFoto !== null}
                aria-label={c.imagen_url ? `Cambiar la foto de ${c.nombre}` : `Elegir una foto para ${c.nombre}`}
                title={c.imagen_url ? 'Cambiar foto' : 'Elegir foto'}
                className={`presionable relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-papel ${c.imagen_url ? 'ring-1 ring-borde/70' : 'border border-dashed border-borde text-gris hover:border-gris'}`}
              >
                {subiendoFoto === c.id ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-borde border-t-tinta" />
                ) : c.imagen_url ? (
                  <Image src={urlPublica(c.imagen_url)} alt="" fill sizes="48px" className="object-contain p-1" />
                ) : (
                  <IconoMas size={16} />
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">
                  {c.nombre}
                  {!c.activo && <span className="ml-2 text-[11px] font-normal text-gris">oculta</span>}
                </p>
                <p className="text-[11px] text-gris">
                  {conteo[c.id] ?? 0} {(conteo[c.id] ?? 0) === 1 ? 'producto' : 'productos'}
                </p>
              </div>
              <button type="button" onClick={() => alternar(c)} disabled={pendiente}
                      className="rounded-full px-2.5 py-1.5 text-[12px] text-tinta-suave hover:bg-papel">
                {c.activo ? 'Ocultar' : 'Mostrar'}
              </button>
              <button type="button" onClick={() => setEditando(c.id)} disabled={pendiente}
                      className="rounded-full px-2.5 py-1.5 text-[12px] font-medium text-tinta hover:bg-papel">
                Editar
              </button>
              <button type="button" onClick={() => borrar(c)} disabled={pendiente}
                      aria-label={`Borrar la categoría ${c.nombre}`}
                      className="rounded-full px-2.5 py-1.5 text-[12px] text-gris hover:bg-rojo/10 hover:text-rojo">
                Borrar
              </button>
            </li>
          )
        )}
      </ul>

      {editando === 'nueva' ? (
        formulario()
      ) : (
        <button type="button" onClick={() => setEditando('nueva')}
                className="presionable flex w-full items-center justify-center gap-1.5 rounded-[12px] border border-dashed
                           border-borde py-3 text-[13px] font-medium text-tinta-suave hover:border-gris">
          <IconoMas size={16} />
          Nueva categoría
        </button>
      )}
    </div>
  )
}
