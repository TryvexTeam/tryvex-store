'use client'

import { useState, useTransition } from 'react'
import type { Categoria } from '@/lib/catalogo'
import { useAvisos } from '@/components/avisos'
import { IconoMas } from '@/components/iconos'
import { guardarCategoria, borrarCategoria, alternarCategoria } from './acciones-categorias'

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

/** Gestión de categorías: crear, renombrar, ordenar, ocultar y borrar las vacías. */
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
    <form onSubmit={(e) => enviar(e, !c)} className="space-y-2.5 rounded-[14px] bg-papel p-4 ring-2 ring-spark/25">
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
        <p className="text-[11px] text-gris">
          Dirección en la tienda: <span className="cifra">/tienda/{c.slug}</span>
        </p>
      )}
      <div className="flex gap-2">
        <button type="submit" disabled={pendiente}
                className="presionable rounded-full bg-spark px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
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
      <ul className="space-y-2">
        {categorias.map((c) =>
          editando === c.id ? (
            <li key={c.id}>{formulario(c)}</li>
          ) : (
            <li key={c.id} className={`flex items-center gap-3 rounded-[12px] bg-papel-alt px-3.5 py-3 ${c.activo ? '' : 'opacity-60'}`}>
              <span className="cifra w-6 shrink-0 text-center text-[12px] text-gris">{c.orden}</span>
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
                      className="rounded-full px-2.5 py-1.5 text-[12px] font-medium text-spark hover:bg-spark-suave">
                Editar
              </button>
              <button type="button" onClick={() => borrar(c)} disabled={pendiente}
                      aria-label={`Borrar la categoría ${c.nombre}`}
                      className="rounded-full px-2.5 py-1.5 text-[12px] text-gris hover:bg-spark-suave hover:text-rojo">
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
