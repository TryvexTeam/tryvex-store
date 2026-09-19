'use client'

import { useState, useTransition } from 'react'
import { Selector } from '@/components/selector'
import { guardarProducto, guardarTramo, borrarTramo, cambiarEstadoProducto } from './acciones'
import { clp } from '@/lib/formato'
import { useAvisos } from '@/components/avisos'
import {
  AYUDA_ESTADO,
  CONDICIONES,
  ESTADOS_PRODUCTO,
  ROTULO_CONDICION,
  ROTULO_ESTADO,
  type Categoria,
  type Condicion,
  type EstadoProducto,
} from '@/lib/catalogo'

export type Producto = {
  id: string
  sku: string
  nombre: string
  descripcion: string | null
  precio_base: string | number
  costo_unitario: string | number | null
  activo: boolean
  estado: EstadoProducto
  categoria_id: string | null
  marca: string | null
  condicion: Condicion
  etiqueta: string | null
  precio_antes: string | number | null
  peso_gramos: number | null
  largo_cm: string | number | null
  ancho_cm: string | number | null
  alto_cm: string | number | null
  gtin: string | null
}

export type Tramo = {
  id: string
  min_unidades: number
  max_unidades: number | null
  precio_unitario: string | number
  etiqueta: string
}

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

const n = (v: string | number | null | undefined) => Number(v) || 0
const opcional = (v: string | number | null | undefined) => (v === null || v === undefined ? '' : String(v))

export default function EditorProducto({
  producto,
  categorias,
  tramos,
  /**
   * Dentro de una hoja el editor no dibuja sus propias tarjetas: la hoja ya
   * es la superficie elevada, y una tarjeta dentro de otra se lee como ruido.
   */
  enHoja = false,
}: {
  producto: Producto
  categorias: Categoria[]
  tramos: Tramo[]
  enHoja?: boolean
}) {
  const bloque = enHoja ? 'pt-1' : 'rounded-[var(--radius-tarjeta)] bg-papel p-6 ring-1 ring-borde/70'
  const titulo = enHoja
    ? 'text-[15px] font-semibold tracking-[-0.01em]'
    : 'text-[1.35rem] font-semibold tracking-[-0.015em]'

  const avisos = useAvisos()
  const [guardando, iniciar] = useTransition()
  const [categoriaId, setCategoriaId] = useState(producto.categoria_id ?? '')
  const [condicion, setCondicion] = useState(producto.condicion)
  const [nuevo, setNuevo] = useState(false)
  const [estado, setEstado] = useState<EstadoProducto>(producto.estado)
  const [precio, setPrecio] = useState(n(producto.precio_base))
  const [costo, setCosto] = useState(n(producto.costo_unitario))

  function enviar(accion: (d: FormData) => Promise<{ ok: boolean; error?: string }>, exito: string) {
    return (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const datos = new FormData(e.currentTarget)
      const form = e.currentTarget
      iniciar(async () => {
        const r = await accion(datos)
        if (r.ok) {
          avisos.ok(exito)
          if (form.dataset.reset === 'si') form.reset()
          setNuevo(false)
        } else {
          avisos.error(r.error ?? 'No se pudo guardar.')
        }
      })
    }
  }

  /** Publicar o archivar es una decisión en sí misma: se aplica al tocar, sin «Guardar». */
  function elegirEstado(e: EstadoProducto) {
    if (e === estado) return
    const anterior = estado
    setEstado(e)
    iniciar(async () => {
      const r = await cambiarEstadoProducto(producto.id, e)
      if (r.ok) {
        avisos.ok(
          e === 'publicado' ? 'Publicado: ya se ve en la tienda.' : e === 'archivado' ? 'Archivado.' : 'Pasó a borrador.'
        )
      } else {
        setEstado(anterior)
        avisos.error(r.error)
      }
    })
  }

  function eliminar(id: string, etiqueta: string) {
    if (!confirm(`¿Eliminar el tramo "${etiqueta}"? Deja de ofrecerse en la tienda.`)) return
    iniciar(async () => {
      const r = await borrarTramo(id)
      if (r.ok) avisos.ok('Tramo eliminado.')
      else avisos.error(r.error)
    })
  }

  const margen = costo > 0 && precio > costo ? precio - costo : 0

  return (
    <div className="space-y-8">
      {/* ── Estado de publicación ─────────────────────────────── */}
      <section aria-labelledby={`estado-${producto.id}`}>
        <h3 id={`estado-${producto.id}`} className={`${titulo} mb-2.5`}>Estado</h3>
        <div role="radiogroup" aria-label="Estado de publicación" className="grid grid-cols-3 gap-1 rounded-[12px] bg-papel-alt p-1">
          {ESTADOS_PRODUCTO.map((e) => (
            <button
              key={e}
              type="button"
              role="radio"
              aria-checked={estado === e}
              disabled={guardando}
              onClick={() => elegirEstado(e)}
              className={`presionable rounded-[9px] py-2 text-[13px] font-semibold transition-colors disabled:opacity-60 ${
                estado === e
                  ? e === 'publicado'
                    ? 'bg-verde text-white shadow-[var(--shadow-sutil)]'
                    : 'bg-papel text-tinta shadow-[var(--shadow-sutil)]'
                  : 'text-tinta-suave'
              }`}
            >
              {ROTULO_ESTADO[e]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-gris">{AYUDA_ESTADO[estado]}</p>
      </section>

      {/* ── Datos del producto ─────────────────────────────────── */}
      <form onSubmit={enviar(guardarProducto, 'Producto guardado.')} className={bloque}>
        <input type="hidden" name="id" value={producto.id} />
        <input type="hidden" name="estado" value={estado} />

        <h3 className={`${titulo} mb-4`}>Producto</h3>

        <div className="space-y-3">
          <div>
            <label htmlFor={`nombre-${producto.id}`} className={rotulo}>Nombre</label>
            <input id={`nombre-${producto.id}`} name="nombre" required defaultValue={producto.nombre}
                   disabled={guardando} className={campo} />
          </div>

          <div>
            <label htmlFor={`desc-${producto.id}`} className={rotulo}>Descripción</label>
            <textarea id={`desc-${producto.id}`} name="descripcion" rows={3}
                      defaultValue={producto.descripcion ?? ''} disabled={guardando}
                      className={`${campo} resize-y`} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Selector
              id={`cat-${producto.id}`}
              name="categoria_id"
              etiqueta="Categoría"
              placeholder="Sin categoría"
              opciones={[{ valor: '', etiqueta: 'Sin categoría' }, ...categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
              valor={categoriaId}
              alCambiar={setCategoriaId}
              disabled={guardando}
            />
            <div>
              <label htmlFor={`marca-${producto.id}`} className={rotulo}>Marca</label>
              <input id={`marca-${producto.id}`} name="marca" defaultValue={producto.marca ?? ''}
                     placeholder="Tryvex" disabled={guardando} className={campo} />
            </div>
            <Selector
              id={`cond-${producto.id}`}
              name="condicion"
              etiqueta="Condición"
              opciones={CONDICIONES.map((c) => ({ valor: c, etiqueta: ROTULO_CONDICION[c] }))}
              valor={condicion}
              // Las opciones salen de CONDICIONES, así que el valor siempre es
              // uno de los tres válidos; el selector entrega texto genérico.
              alCambiar={(v) => setCondicion(v as typeof condicion)}
              disabled={guardando}
            />
            <div>
              <label htmlFor={`etq-${producto.id}`} className={rotulo}>
                Etiqueta <span className="font-normal">(opcional)</span>
              </label>
              <input id={`etq-${producto.id}`} name="etiqueta" maxLength={24} defaultValue={producto.etiqueta ?? ''}
                     placeholder="Nuevo · Últimas unidades" disabled={guardando} className={campo} />
            </div>
          </div>
        </div>

        {/* Precios */}
        <h4 className="mt-6 mb-3 text-[13px] font-semibold tracking-[-0.01em]">Precio</h4>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label htmlFor={`precio-${producto.id}`} className={rotulo}>Precio de venta</label>
            <input id={`precio-${producto.id}`} name="precio_base" type="number" min="1" required
                   defaultValue={n(producto.precio_base)} onChange={(e) => setPrecio(Number(e.target.value) || 0)}
                   disabled={guardando} className={`${campo} cifra`} />
          </div>
          <div>
            <label htmlFor={`antes-${producto.id}`} className={rotulo}>
              Precio anterior <span className="font-normal">(tachado)</span>
            </label>
            <input id={`antes-${producto.id}`} name="precio_antes" type="number" min="1"
                   defaultValue={opcional(producto.precio_antes)} placeholder="Sin oferta"
                   disabled={guardando} className={`${campo} cifra`} />
          </div>
          <div>
            <label htmlFor={`costo-${producto.id}`} className={rotulo}>Costo por unidad</label>
            {/* Sin required: el alta lo deja opcional, así que exigirlo aquí dejaba
                 productos creados sin costo imposibles de volver a guardar. El
                 servidor ya valida que el costo no supere al precio. */}
            <input id={`costo-${producto.id}`} name="costo_unitario" type="number" min="0"
                   defaultValue={n(producto.costo_unitario)} onChange={(e) => setCosto(Number(e.target.value) || 0)}
                   disabled={guardando} className={`${campo} cifra`} />
          </div>
        </div>
        {margen > 0 && (
          <p className="mt-2 text-[13px] text-gris">
            Margen por unidad: <strong className="cifra text-tinta">{clp(margen)}</strong> (
            {Math.round((margen / precio) * 100)}% del precio)
          </p>
        )}

        {/* Envío */}
        <h4 className="mt-6 mb-1 text-[13px] font-semibold tracking-[-0.01em]">Envío</h4>
        <p className="mb-3 text-[12px] text-gris">
          Con el paquete ya armado. Sin peso ni medidas no se puede cotizar el despacho.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label htmlFor={`peso-${producto.id}`} className={rotulo}>Peso (g)</label>
            <input id={`peso-${producto.id}`} name="peso_gramos" type="number" min="1" step="1"
                   defaultValue={opcional(producto.peso_gramos)} disabled={guardando} className={`${campo} cifra`} />
          </div>
          <div>
            <label htmlFor={`largo-${producto.id}`} className={rotulo}>Largo (cm)</label>
            <input id={`largo-${producto.id}`} name="largo_cm" type="number" min="0.1" step="0.1"
                   defaultValue={opcional(producto.largo_cm)} disabled={guardando} className={`${campo} cifra`} />
          </div>
          <div>
            <label htmlFor={`ancho-${producto.id}`} className={rotulo}>Ancho (cm)</label>
            <input id={`ancho-${producto.id}`} name="ancho_cm" type="number" min="0.1" step="0.1"
                   defaultValue={opcional(producto.ancho_cm)} disabled={guardando} className={`${campo} cifra`} />
          </div>
          <div>
            <label htmlFor={`alto-${producto.id}`} className={rotulo}>Alto (cm)</label>
            <input id={`alto-${producto.id}`} name="alto_cm" type="number" min="0.1" step="0.1"
                   defaultValue={opcional(producto.alto_cm)} disabled={guardando} className={`${campo} cifra`} />
          </div>
        </div>
        <div className="mt-3 max-w-[16rem]">
          <label htmlFor={`gtin-${producto.id}`} className={rotulo}>
            Código de barras <span className="font-normal">(GTIN, opcional)</span>
          </label>
          <input id={`gtin-${producto.id}`} name="gtin" inputMode="numeric" maxLength={14}
                 defaultValue={producto.gtin ?? ''} disabled={guardando} className={`${campo} cifra`} />
        </div>

        <button type="submit" disabled={guardando}
                className="presionable mt-6 w-full rounded-[10px] bg-spark py-3 text-[15px] font-semibold text-white
                           hover:bg-spark-hover disabled:opacity-60 sm:w-auto sm:px-8">
          {guardando ? 'Guardando…' : 'Guardar producto'}
        </button>
      </form>

      {/* ── Tramos por volumen ─────────────────────────────────── */}
      <section className={bloque}>
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <div>
            <h3 className={titulo}>Precio por volumen</h3>
            <p className="mt-0.5 text-[12px] text-gris">Lo que ve el cliente al comprar varias unidades.</p>
          </div>
          {!nuevo && (
            <button onClick={() => setNuevo(true)}
                    className="presionable shrink-0 rounded-full bg-papel-alt px-4 py-2 text-[13px] font-medium text-tinta">
              Agregar tramo
            </button>
          )}
        </div>

        <ul className="space-y-2.5">
          {tramos.map((t) => (
            <li key={t.id}>
              <form onSubmit={enviar(guardarTramo, 'Tramo guardado.')}
                    className="grid grid-cols-2 items-end gap-2.5 rounded-[12px] bg-papel-alt p-3 sm:grid-cols-[1.4fr_.8fr_.8fr_1fr_auto]">
                <input type="hidden" name="id" value={t.id} />
                <input type="hidden" name="producto_id" value={producto.id} />
                <input name="etiqueta" defaultValue={t.etiqueta} required aria-label="Etiqueta" disabled={guardando} className={campo} />
                <input name="min_unidades" type="number" min="1" defaultValue={t.min_unidades} required aria-label="Desde" disabled={guardando} className={`${campo} cifra`} />
                <input name="max_unidades" type="number" min="1" defaultValue={t.max_unidades ?? ''} placeholder="∞" aria-label="Hasta" disabled={guardando} className={`${campo} cifra`} />
                <input name="precio_unitario" type="number" min="1" defaultValue={n(t.precio_unitario)} required aria-label="Precio unitario" disabled={guardando} className={`${campo} cifra`} />
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <button type="submit" disabled={guardando}
                          className="presionable rounded-full bg-tinta px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40">
                    Guardar
                  </button>
                  <button type="button" onClick={() => eliminar(t.id, t.etiqueta)} disabled={guardando}
                          aria-label={`Eliminar tramo ${t.etiqueta}`}
                          className="rounded-full px-3 py-2.5 text-[13px] text-gris hover:bg-spark-suave hover:text-rojo disabled:opacity-40">
                    Eliminar
                  </button>
                </div>
              </form>
            </li>
          ))}

          {nuevo && (
            <li>
              <form onSubmit={enviar(guardarTramo, 'Tramo creado.')} data-reset="si"
                    className="grid grid-cols-2 items-end gap-2.5 rounded-[12px] bg-papel-alt p-3 ring-2 ring-spark/30 sm:grid-cols-[1.4fr_.8fr_.8fr_1fr_auto]">
                <input type="hidden" name="producto_id" value={producto.id} />
                <input name="etiqueta" placeholder="Etiqueta" required aria-label="Etiqueta" disabled={guardando} className={campo} />
                <input name="min_unidades" type="number" min="1" placeholder="Desde" required aria-label="Desde" disabled={guardando} className={`${campo} cifra`} />
                <input name="max_unidades" type="number" min="1" placeholder="∞" aria-label="Hasta" disabled={guardando} className={`${campo} cifra`} />
                <input name="precio_unitario" type="number" min="1" placeholder="Precio" required aria-label="Precio unitario" disabled={guardando} className={`${campo} cifra`} />
                <div className="col-span-2 flex gap-2 sm:col-span-1">
                  <button type="submit" disabled={guardando}
                          className="presionable rounded-full bg-spark px-4 py-2.5 text-[13px] font-medium text-white disabled:opacity-40">
                    Crear
                  </button>
                  <button type="button" onClick={() => setNuevo(false)} className="rounded-full px-3 py-2.5 text-[13px] text-gris">
                    Cancelar
                  </button>
                </div>
              </form>
            </li>
          )}
        </ul>

        {tramos.length === 0 && !nuevo && (
          <p className="py-6 text-center text-[13px] text-gris">
            Sin tramos: la tienda cobra el precio de venta a cualquier cantidad.
          </p>
        )}
      </section>
    </div>
  )
}
