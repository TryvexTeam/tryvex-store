'use client'

import { useState, useTransition } from 'react'
import { Casilla } from '@/components/casilla'
import { clp } from '@/lib/formato'
import { skuDeVariante, type Variante } from '@/lib/catalogo'
import { useAvisos } from '@/components/avisos'
import { IconoMas } from '@/components/iconos'
import { guardarVariante, quitarVariante, reactivarVariante } from './acciones-variantes'
import { VariantesLote } from './variantes-lote'

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

type Props = {
  productoId: string
  skuProducto: string
  precioProducto: number
  variantes: Variante[]
}

/**
 * Variantes del producto.
 *
 * Opcionales: la mayoría de los productos simples no las necesita. Cuando
 * existen, cada una lleva su propio stock, que se carga desde Stock igual que
 * el de un producto.
 */
export function Variantes({ productoId, skuProducto, precioProducto, variantes }: Props) {
  const [editando, setEditando] = useState<string | 'nueva' | 'lote' | null>(null)
  const [pendiente, empezar] = useTransition()
  const avisos = useAvisos()

  const activas = variantes.filter((v) => v.activo)
  const inactivas = variantes.filter((v) => !v.activo)

  function quitar(v: Variante) {
    if (!confirm(`¿Quitar la variante «${v.nombre}»?`)) return
    empezar(async () => {
      const r = await quitarVariante(v.id)
      if (!r.ok) avisos.error(r.error)
      else
        avisos.ok(
          r.desactivada
            ? 'Tenía historial de stock o pedidos: quedó desactivada, no borrada.'
            : 'Variante eliminada.'
        )
    })
  }

  function reactivar(v: Variante) {
    empezar(async () => {
      const r = await reactivarVariante(v.id)
      if (r.ok) avisos.ok(`«${v.nombre}» vuelve a estar a la venta.`)
      else avisos.error(r.error)
    })
  }

  return (
    <section aria-labelledby={`variantes-${productoId}`}>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 id={`variantes-${productoId}`} className="text-[15px] font-semibold tracking-[-0.01em]">
            Variantes
          </h3>
          <p className="mt-0.5 text-[12px] text-gris">
            Color, talla u otra opción con stock propio. Opcional.
          </p>
        </div>
        {editando !== 'nueva' && editando !== 'lote' && (
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setEditando('lote')}
              className="presionable rounded-full bg-papel-alt px-3 py-2 text-[13px] font-medium"
            >
              Crear varias
            </button>
            <button
              type="button"
              onClick={() => setEditando('nueva')}
              className="presionable flex items-center gap-1 rounded-full bg-papel-alt px-3 py-2 text-[13px] font-medium"
            >
              <IconoMas size={15} />
              Agregar
            </button>
          </div>
        )}
      </div>

      <ul className="space-y-2">
        {activas.map((v) =>
          editando === v.id ? (
            <li key={v.id}>
              <FormularioVariante
                productoId={productoId}
                skuProducto={skuProducto}
                variante={v}
                onListo={() => setEditando(null)}
              />
            </li>
          ) : (
            <li key={v.id} className="flex items-center gap-3 rounded-[12px] bg-papel-alt px-3.5 py-3">
              <span
                aria-hidden
                className="size-6 shrink-0 rounded-full ring-1 ring-borde"
                style={{ background: v.color_hex ?? 'var(--color-papel)' }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium">{v.nombre}</p>
                <p className="truncate text-[11px] text-gris">
                  {v.sku} · {v.precio !== null ? clp(v.precio) : `precio del producto (${clp(precioProducto)})`}
                </p>
              </div>
              <span className={`cifra shrink-0 text-[12px] font-medium ${v.stock > 0 ? 'text-tinta-suave' : 'text-ambar'}`}>
                {v.stock > 0 ? `${v.stock} u.` : 'Sin stock'}
              </span>
              <button type="button" onClick={() => setEditando(v.id)} disabled={pendiente}
                      className="rounded-full px-2.5 py-1.5 text-[12px] font-medium text-spark hover:bg-spark-suave">
                Editar
              </button>
              <button type="button" onClick={() => quitar(v)} disabled={pendiente}
                      aria-label={`Quitar la variante ${v.nombre}`}
                      className="rounded-full px-2.5 py-1.5 text-[12px] text-gris hover:bg-spark-suave hover:text-rojo">
                Quitar
              </button>
            </li>
          )
        )}

        {editando === 'nueva' && (
          <li>
            <FormularioVariante
              productoId={productoId}
              skuProducto={skuProducto}
              orden={activas.length}
              onListo={() => setEditando(null)}
            />
          </li>
        )}
      </ul>

      {editando === 'lote' && (
        <VariantesLote
          productoId={productoId}
          skuProducto={skuProducto}
          desdeOrden={activas.length}
          onCerrar={() => setEditando(null)}
        />
      )}

      {activas.length === 0 && editando !== 'nueva' && editando !== 'lote' && (
        <p className="rounded-[12px] bg-papel-alt px-4 py-5 text-center text-[13px] text-gris">
          Sin variantes: el producto se vende tal cual, con un solo stock.
        </p>
      )}

      {inactivas.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-[12px] text-gris">
            {inactivas.length} desactivada{inactivas.length === 1 ? '' : 's'}
          </summary>
          <ul className="mt-2 space-y-1.5">
            {inactivas.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-[10px] px-3 py-2 opacity-70">
                <span className="size-4 rounded-full ring-1 ring-borde" style={{ background: v.color_hex ?? 'transparent' }} />
                <span className="flex-1 text-[13px]">{v.nombre}</span>
                <button type="button" onClick={() => reactivar(v)} disabled={pendiente}
                        className="text-[12px] font-medium text-spark">
                  Reactivar
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function FormularioVariante({
  productoId,
  skuProducto,
  variante,
  orden = 0,
  onListo,
}: {
  productoId: string
  skuProducto: string
  variante?: Variante
  orden?: number
  onListo: () => void
}) {
  const avisos = useAvisos()
  const [pendiente, empezar] = useTransition()
  const [nombre, setNombre] = useState(variante?.nombre ?? '')
  const [sku, setSku] = useState(variante?.sku ?? '')
  const [tocoSku, setTocoSku] = useState(Boolean(variante))
  const [color, setColor] = useState(variante?.color_hex ?? '#1D1D1F')
  const [conColor, setConColor] = useState(Boolean(variante?.color_hex) || !variante)

  // El SKU se propone solo a partir del nombre hasta que alguien lo escribe a
  // mano: después se respeta lo que puso.
  const skuMostrado = tocoSku ? sku : nombre ? skuDeVariante(skuProducto, nombre) : ''

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    empezar(async () => {
      const r = await guardarVariante(datos)
      if (r.ok) {
        avisos.ok(variante ? 'Variante guardada.' : 'Variante creada. Carga su stock desde Stock.')
        onListo()
      } else avisos.error(r.error)
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-3 rounded-[14px] bg-papel p-4 ring-2 ring-spark/25">
      {variante && <input type="hidden" name="id" value={variante.id} />}
      <input type="hidden" name="producto_id" value={productoId} />
      <input type="hidden" name="orden" value={variante?.orden ?? orden} />
      <input type="hidden" name="sku" value={skuMostrado} />
      <input type="hidden" name="color_hex" value={conColor ? color : ''} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`vn-${variante?.id ?? 'nueva'}`} className={rotulo}>Nombre</label>
          <input id={`vn-${variante?.id ?? 'nueva'}`} name="nombre" required value={nombre}
                 onChange={(e) => setNombre(e.target.value)} placeholder="Negro · Talla M"
                 maxLength={40} disabled={pendiente} className={campo} autoFocus />
        </div>
        <div>
          <label htmlFor={`vs-${variante?.id ?? 'nueva'}`} className={rotulo}>SKU</label>
          <input id={`vs-${variante?.id ?? 'nueva'}`} value={skuMostrado}
                 onChange={(e) => { setTocoSku(true); setSku(e.target.value.toUpperCase()) }}
                 disabled={pendiente} className={`${campo} cifra uppercase`} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <span className={rotulo}>Color</span>
          <div className="flex items-center gap-2.5">
            <input type="color" value={color} onChange={(e) => setColor(e.target.value.toUpperCase())}
                   disabled={pendiente || !conColor} aria-label="Elegir color"
                   className="size-10 shrink-0 cursor-pointer rounded-[10px] border-0 bg-transparent p-0 disabled:opacity-40" />
            <Casilla checked={conColor} onChange={setConColor} className="!text-[13px] text-tinta-suave">
              Mostrar muestra de color
            </Casilla>
          </div>
        </div>
        <div>
          <label htmlFor={`vp-${variante?.id ?? 'nueva'}`} className={rotulo}>
            Precio <span className="font-normal">(vacío = el del producto)</span>
          </label>
          <input id={`vp-${variante?.id ?? 'nueva'}`} name="precio" type="number" min="1"
                 defaultValue={variante?.precio ?? ''} disabled={pendiente} className={`${campo} cifra`} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" disabled={pendiente || !nombre.trim()}
                className="presionable rounded-full bg-spark px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
          {pendiente ? 'Guardando…' : variante ? 'Guardar variante' : 'Crear variante'}
        </button>
        <button type="button" onClick={onListo} className="rounded-full px-4 py-2.5 text-[13px] text-gris">
          Cancelar
        </button>
      </div>
    </form>
  )
}
