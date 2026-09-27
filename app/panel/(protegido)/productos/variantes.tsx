'use client'

import { useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import { urlPublica, TIPOS_ACEPTADOS } from '@/lib/imagenes'
import { Casilla } from '@/components/casilla'
import { clp } from '@/lib/formato'
import { skuDeVariante, type Variante } from '@/lib/catalogo'
import { useAvisos } from '@/components/avisos'
import { IconoMas } from '@/components/iconos'
import { guardarVariante, quitarVariante, reactivarVariante, subirArchivoVariante, quitarArchivoVariante } from './acciones-variantes'

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-tinta focus:outline-none disabled:opacity-60'
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
 *
 * Cada variante tiene su círculo (el color, o una muestra: una imagen chica
 * para diseños de dos tonos o texturas, como los de dunedragon.cl) y su foto,
 * que la card de la tienda muestra al tocar ese círculo.
 */
export function Variantes({ productoId, skuProducto, precioProducto, variantes }: Props) {
  const [editando, setEditando] = useState<string | 'nueva' | null>(null)
  const [pendiente, empezar] = useTransition()
  const avisos = useAvisos()

  const activas = variantes.filter((v) => v.activo)
  const inactivas = variantes.filter((v) => !v.activo)

  // Un solo selector de archivos para todas las filas: se anota para qué
  // variante y qué imagen se abrió.
  const entrada = useRef<HTMLInputElement>(null)
  const [destino, setDestino] = useState<{ id: string; tipo: 'muestra' | 'foto' } | null>(null)
  const [subiendo, setSubiendo] = useState<string | null>(null)

  function elegir(id: string, tipo: 'muestra' | 'foto') {
    setDestino({ id, tipo })
    entrada.current?.click()
  }

  async function subir(archivo: File | undefined) {
    const d = destino
    if (entrada.current) entrada.current.value = ''
    if (!archivo || !d) return
    setSubiendo(`${d.id}-${d.tipo}`)
    const datos = new FormData()
    datos.set('id', d.id)
    datos.set('tipo', d.tipo)
    datos.set('archivo', archivo)
    const r = await subirArchivoVariante(datos)
    setSubiendo(null)
    if (r.ok) avisos.ok(d.tipo === 'muestra' ? 'Círculo actualizado.' : 'Foto de la variante actualizada.')
    else avisos.error(r.error)
  }

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
      <input ref={entrada} type="file" accept={TIPOS_ACEPTADOS.join(',')} className="sr-only" onChange={(e) => void subir(e.target.files?.[0])} />
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <div>
          <h3 id={`variantes-${productoId}`} className="text-[15px] font-semibold tracking-[-0.01em]">
            Variantes
          </h3>
          <p className="mt-0.5 text-[12px] text-gris">
            Color, talla u otra opción con stock propio. Opcional.
          </p>
        </div>
        {editando !== 'nueva' && (
          <button
            type="button"
            onClick={() => setEditando('nueva')}
            className="presionable flex shrink-0 items-center gap-1 rounded-full bg-papel-alt px-3.5 py-2 text-[13px] font-medium"
          >
            <IconoMas size={15} />
            Agregar
          </button>
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
              {/* El círculo que ve el cliente: tocarlo para subir una muestra. */}
              <button
                type="button"
                onClick={() => elegir(v.id, 'muestra')}
                disabled={pendiente || subiendo !== null}
                aria-label={`Cambiar el círculo de ${v.nombre}`}
                title="Círculo: toca para subir un diseño"
                className="presionable relative size-8 shrink-0 rounded-full ring-1 ring-borde hover:ring-gris"
                style={
                  v.muestra_url
                    ? { backgroundImage: `url("${urlPublica(v.muestra_url)}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : { background: v.color_hex ?? 'var(--color-papel)' }
                }
              >
                {subiendo === `${v.id}-muestra` && <span className="absolute inset-0 m-auto size-4 animate-spin rounded-full border-2 border-borde border-t-tinta" />}
              </button>
              {/* La foto de la variante: la que muestra la card al elegir el círculo. */}
              <button
                type="button"
                onClick={() => elegir(v.id, 'foto')}
                disabled={pendiente || subiendo !== null}
                aria-label={v.imagen_url ? `Cambiar la foto de ${v.nombre}` : `Subir la foto de ${v.nombre}`}
                title="Foto de la variante"
                className={`presionable relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-[10px] bg-papel ${v.imagen_url ? 'ring-1 ring-borde/70' : 'border border-dashed border-borde text-gris hover:border-gris'}`}
              >
                {subiendo === `${v.id}-foto` ? (
                  <span className="size-4 animate-spin rounded-full border-2 border-borde border-t-tinta" />
                ) : v.imagen_url ? (
                  <Image src={urlPublica(v.imagen_url)} alt="" fill sizes="40px" className="object-contain p-0.5" />
                ) : (
                  <IconoMas size={14} />
                )}
              </button>
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
                      className="rounded-full px-2.5 py-1.5 text-[12px] font-medium text-tinta hover:bg-papel">
                Editar
              </button>
              <button type="button" onClick={() => quitar(v)} disabled={pendiente}
                      aria-label={`Quitar la variante ${v.nombre}`}
                      className="rounded-full px-2.5 py-1.5 text-[12px] text-gris hover:bg-rojo/10 hover:text-rojo">
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

      {activas.length === 0 && editando !== 'nueva' && (
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
                        className="text-[12px] font-medium text-tinta underline-offset-2 hover:underline">
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

  function quitarImagen(tipo: 'muestra' | 'foto') {
    if (!variante) return
    empezar(async () => {
      const r = await quitarArchivoVariante(variante.id, tipo)
      if (r.ok) avisos.ok(tipo === 'muestra' ? 'El círculo vuelve a su color.' : 'Foto de la variante quitada.')
      else avisos.error(r.error)
    })
  }

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
                className="presionable rounded-full bg-tinta px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-50">
          {pendiente ? 'Guardando…' : variante ? 'Guardar variante' : 'Crear variante'}
        </button>
        <button type="button" onClick={onListo} className="rounded-full px-4 py-2.5 text-[13px] text-gris">
          Cancelar
        </button>
        {variante?.muestra_url && (
          <button type="button" disabled={pendiente} onClick={() => quitarImagen('muestra')} className="ml-auto rounded-full px-3 py-2.5 text-[12px] text-gris hover:text-tinta">
            Quitar diseño del círculo
          </button>
        )}
        {variante?.imagen_url && (
          <button type="button" disabled={pendiente} onClick={() => quitarImagen('foto')} className={`${variante.muestra_url ? '' : 'ml-auto '}rounded-full px-3 py-2.5 text-[12px] text-gris hover:text-tinta`}>
            Quitar foto
          </button>
        )}
      </div>
    </form>
  )
}
