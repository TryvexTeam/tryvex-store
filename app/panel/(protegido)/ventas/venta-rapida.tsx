'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react'
import { crearVentaRapida } from '../pedidos/acciones'
import { precioParaCantidad } from '../stock/acciones'
import { notificar } from '@/lib/notificar'
import { clp } from '@/lib/formato'
import { montoDesdeTexto } from '@/lib/monto'
import { Boton, CLASE_CAMPO, Pildora } from '@/components/panel/ui'

/**
 * Venta rápida (showroom, feria, retiro presencial).
 *
 * Pensada como una caja: buscar el producto, ajustar cantidad, elegir cómo se
 * paga y cobrar. El teléfono, el correo y hasta el nombre son opcionales: en un
 * mostrador no siempre se pide, y pedirlos frena la venta.
 *
 * El precio por cantidad lo sugiere el servidor (tramos de mayorista); acá solo
 * se muestra y se puede cambiar. El stock descuenta por el mismo flujo de
 * siempre (`crearVentaRapida`), así que no hay una segunda lógica de venta.
 */

export interface ProductoVenta {
  id: string
  sku: string
  nombre: string
  precio: number
  costo: number | null
  imagen: string | null
  stock: number
  variantes: { id: string; nombre: string; stock: number }[]
}

const METODOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'mercadopago', etiqueta: 'Mercado Pago' },
  { valor: 'flow', etiqueta: 'Flow' },
] as const

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

interface Cobrada {
  total: number
  producto: string
  cantidad: number
  metodo: string
  vuelto: number | null
}

export function VentaRapida({ productos }: { productos: ProductoVenta[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [productoId, setProductoId] = useState<string | null>(null)
  const [varianteId, setVarianteId] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [precio, setPrecio] = useState('')
  const [tramo, setTramo] = useState<string | null>(null)
  const [tocoPrecio, setTocoPrecio] = useState(false)
  const [metodo, setMetodo] = useState<string>('efectivo')
  const [recibido, setRecibido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cobrada, setCobrada] = useState<Cobrada | null>(null)
  const [cobrando, iniciar] = useTransition()
  const buscador = useRef<HTMLInputElement>(null)

  const producto = productos.find((p) => p.id === productoId) ?? null
  const variante = producto?.variantes.find((v) => v.id === varianteId) ?? null
  const disponible = producto ? (producto.variantes.length > 0 ? (variante?.stock ?? 0) : producto.stock) : 0

  const resultados = useMemo(() => {
    const palabras = sinTildes(busqueda.trim()).split(/\s+/).filter(Boolean)
    return productos
      .filter((p) => palabras.every((w) => sinTildes(`${p.nombre} ${p.sku}`).includes(w)))
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.nombre.localeCompare(b.nombre, 'es'))
  }, [productos, busqueda])

  const precioNum = montoDesdeTexto(precio) ?? 0
  const total = cantidad * precioNum
  const recibidoNum = montoDesdeTexto(recibido) ?? 0
  const vuelto = metodo === 'efectivo' && recibidoNum >= total && total > 0 ? recibidoNum - total : null
  const puedeCobrar = !!producto && cantidad >= 1 && cantidad <= disponible && precioNum > 0 && (producto.variantes.length === 0 || !!variante)

  // Cantidad nueva → el servidor sugiere el precio del tramo, salvo que se haya tocado a mano.
  useEffect(() => {
    if (!productoId || tocoPrecio) return
    let vigente = true
    precioParaCantidad(productoId, cantidad).then((r) => {
      if (vigente && r) {
        setPrecio(String(r.precio))
        setTramo(r.etiqueta)
      }
    })
    return () => {
      vigente = false
    }
  }, [productoId, cantidad, tocoPrecio])

  function elegir(p: ProductoVenta) {
    if (p.stock < 1) return
    setProductoId(p.id)
    setVarianteId(p.variantes.length === 1 && p.variantes[0].stock > 0 ? p.variantes[0].id : '')
    setCantidad(1)
    setPrecio(String(p.precio))
    setTramo(null)
    setTocoPrecio(false)
    setError(null)
  }

  function cambiarProducto() {
    setProductoId(null)
    setBusqueda('')
    setTimeout(() => buscador.current?.focus(), 0)
  }

  function reiniciar() {
    setProductoId(null)
    setVarianteId('')
    setCantidad(1)
    setPrecio('')
    setTramo(null)
    setTocoPrecio(false)
    setMetodo('efectivo')
    setRecibido('')
    setBusqueda('')
    setError(null)
    setCobrada(null)
  }

  function cobrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!producto || !puedeCobrar) return
    setError(null)
    const datos = new FormData(e.currentTarget)
    datos.set('producto_id', producto.id)
    datos.set('variante_id', varianteId)
    datos.set('cantidad', String(cantidad))
    datos.set('precio_unitario', String(precioNum))
    datos.set('metodo_pago', metodo)
    iniciar(async () => {
      const r = await crearVentaRapida(datos)
      if (r.ok) {
        const resumen = { total, producto: producto.nombre, cantidad, metodo, vuelto }
        setCobrada(resumen)
        notificar.ok('Venta cobrada', `${producto.nombre} × ${cantidad} · ${clp(total)}`)
      } else {
        setError(r.error)
        notificar.error('No se pudo cobrar', r.error)
      }
    })
  }

  if (cobrada) {
    return (
      <div className="mx-auto max-w-[520px] rounded-[var(--radius-popup)] bg-papel p-8 text-center ring-1 ring-borde/60">
        <span aria-hidden className="mx-auto grid size-14 place-items-center rounded-full bg-verde/15 text-verde">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
        </span>
        <h2 className="mt-4 text-[22px] font-semibold">Venta cobrada</h2>
        <p className="cifra mt-2 text-[40px] leading-none font-semibold">{clp(cobrada.total)}</p>
        <p className="mt-3 text-[14px] text-gris">
          {cobrada.producto} × {cobrada.cantidad} · {METODOS.find((m) => m.valor === cobrada.metodo)?.etiqueta}
        </p>
        {cobrada.vuelto !== null && cobrada.vuelto > 0 && (
          <p className="mt-4 rounded-[var(--radius-anidado)] bg-papel-alt px-4 py-3 text-[15px]">
            Vuelto: <strong className="cifra">{clp(cobrada.vuelto)}</strong>
          </p>
        )}
        <Boton tamano="lg" className="mt-6" onClick={reiniciar}>
          Nueva venta
        </Boton>
      </div>
    )
  }

  return (
    <form id="venta-rapida" onSubmit={cobrar} className="grid items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_380px] lg:pb-0">
      {/* ── Producto ─────────────────────────────────────────── */}
      <div className="min-w-0 space-y-5">
        {!producto ? (
          <section aria-label="Elegir producto" className="rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
            <h2 className="text-[15px] font-semibold">¿Qué se vende?</h2>
            <input
              ref={buscador}
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const primero = resultados.find((p) => p.stock > 0)
                  if (primero) elegir(primero)
                }
              }}
              placeholder="Buscar por nombre o SKU"
              aria-label="Buscar producto"
              autoFocus
              className={`${CLASE_CAMPO} mt-3`}
            />
            <p className="sr-only" role="status">{resultados.length} productos</p>
            {resultados.length === 0 ? (
              <p className="mt-6 text-center text-[14px] text-gris">Nada coincide con «{busqueda}».</p>
            ) : (
              <ul className="mt-4 grid max-h-[560px] grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
                {resultados.slice(0, 40).map((p) => {
                  const agotado = p.stock < 1
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => elegir(p)}
                        disabled={agotado}
                        className="presionable flex w-full items-center gap-3 rounded-[var(--radius-anidado)] bg-papel-alt p-2.5 text-left transition-colors hover:bg-borde/40 disabled:cursor-not-allowed disabled:opacity-45"
                      >
                        <span className="relative size-14 shrink-0 overflow-hidden rounded-[10px] bg-papel">
                          {p.imagen && <Image src={p.imagen} alt="" fill sizes="56px" className="object-contain p-1" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="line-clamp-2 block text-[14px] leading-snug font-medium">{p.nombre}</span>
                          <span className="mt-0.5 block text-[12px] text-gris">{p.sku}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="cifra block text-[14px] font-semibold">{clp(p.precio)}</span>
                          <span className={`cifra block text-[12px] ${agotado ? 'text-rojo' : 'text-gris'}`}>{agotado ? 'Sin stock' : `${p.stock} u.`}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        ) : (
          <section aria-label="Producto elegido" className="rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
            <div className="flex items-center gap-3.5">
              <span className="relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-papel-alt">
                {producto.imagen && <Image src={producto.imagen} alt="" fill sizes="64px" className="object-contain p-1.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[16px] leading-snug font-semibold">{producto.nombre}</p>
                <p className="mt-0.5 text-[12.5px] text-gris">{producto.sku} · {disponible} u. disponibles</p>
              </div>
              <Boton variante="suave" tamano="sm" onClick={cambiarProducto}>Cambiar</Boton>
            </div>

            {producto.variantes.length > 0 && (
              <fieldset className="mt-5">
                <legend className="mb-2 text-[13px] font-medium text-tinta-suave">Variante</legend>
                <div className="flex flex-wrap gap-2">
                  {producto.variantes.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      aria-pressed={varianteId === v.id}
                      disabled={v.stock < 1}
                      onClick={() => { setVarianteId(v.id); setCantidad(1) }}
                      className={`min-h-10 rounded-full px-4 text-[13.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        varianteId === v.id ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta hover:bg-borde/40'
                      }`}
                    >
                      {v.nombre} <span className="cifra opacity-60">· {v.stock}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
            )}

            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div>
                <p className="mb-2 text-[13px] font-medium text-tinta-suave" id="etq-cantidad">Cantidad</p>
                <div role="group" aria-labelledby="etq-cantidad" className="flex w-fit items-center rounded-full bg-papel-alt">
                  <button type="button" aria-label="Quitar una unidad" disabled={cantidad <= 1} onClick={() => setCantidad((c) => Math.max(1, c - 1))} className="presionable grid size-12 place-items-center text-[22px] disabled:opacity-30">−</button>
                  <output aria-live="polite" className="cifra w-12 text-center text-[20px] font-semibold">{cantidad}</output>
                  <button type="button" aria-label="Agregar una unidad" disabled={cantidad >= disponible} onClick={() => setCantidad((c) => Math.min(disponible, c + 1))} className="presionable grid size-12 place-items-center text-[22px] disabled:opacity-30">+</button>
                </div>
              </div>
              <div>
                <label htmlFor="precio-venta" className="mb-2 block text-[13px] font-medium text-tinta-suave">Precio unitario</label>
                <input
                  id="precio-venta"
                  inputMode="numeric"
                  value={precio}
                  onChange={(e) => { setPrecio(e.target.value); setTocoPrecio(true) }}
                  className={`${CLASE_CAMPO} cifra`}
                />
                {tramo && !tocoPrecio && <p className="mt-1.5 text-[12px] text-gris">{tramo}. Puedes cambiarlo.</p>}
              </div>
            </div>
          </section>
        )}
      </div>

      {/* ── Cobro ─────────────────────────────────────────────── */}
      <aside aria-label="Cobro" className="space-y-4 rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60 lg:sticky lg:top-20">
        <div>
          <p className="text-[13px] font-medium text-gris">Total a cobrar</p>
          <p className="cifra mt-1 text-[44px] leading-none font-semibold tracking-[-0.03em]">{clp(total)}</p>
          {producto && (
            <p className="mt-2 text-[12.5px] text-gris">
              {cantidad} × {clp(precioNum)}
              {producto.costo ? <> · ganancia <span className="cifra">{clp((precioNum - producto.costo) * cantidad)}</span></> : null}
            </p>
          )}
        </div>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-tinta-suave">Cómo paga</legend>
          <div className="grid grid-cols-2 gap-2">
            {METODOS.map((m) => (
              <button
                key={m.valor}
                type="button"
                aria-pressed={metodo === m.valor}
                onClick={() => setMetodo(m.valor)}
                className={`min-h-11 rounded-[var(--radius-anidado)] text-[14px] font-medium transition-colors ${
                  metodo === m.valor ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta hover:bg-borde/40'
                }`}
              >
                {m.etiqueta}
              </button>
            ))}
          </div>
        </fieldset>

        {metodo === 'efectivo' && total > 0 && (
          <div>
            <label htmlFor="recibido" className="mb-2 block text-[13px] font-medium text-tinta-suave">Recibido (opcional)</label>
            <input id="recibido" inputMode="numeric" value={recibido} onChange={(e) => setRecibido(e.target.value)} placeholder={clp(total)} className={`${CLASE_CAMPO} cifra`} />
            {vuelto !== null && (
              <p className="mt-2 flex items-center gap-2 text-[14px]">
                <Pildora tono="verde">Vuelto</Pildora>
                <strong className="cifra">{clp(vuelto)}</strong>
              </p>
            )}
          </div>
        )}

        <details className="group rounded-[var(--radius-anidado)] bg-papel-alt px-4 py-3">
          <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[14px] font-medium">
            Datos del cliente <span className="text-[12px] font-normal text-gris">opcional</span>
          </summary>
          <div className="mt-3 space-y-2.5">
            <input name="cliente_nombre" placeholder="Nombre (opcional)" autoComplete="off" aria-label="Nombre del cliente, opcional" className={CLASE_CAMPO} />
            <input name="cliente_fono" placeholder="Teléfono (opcional)" inputMode="tel" autoComplete="off" aria-label="Teléfono, opcional" className={CLASE_CAMPO} />
            <input name="cliente_email" type="email" placeholder="Correo (opcional)" autoComplete="off" aria-label="Correo, opcional" className={CLASE_CAMPO} />
            <input name="notas" maxLength={200} placeholder="Nota (opcional)" aria-label="Nota, opcional" className={CLASE_CAMPO} />
          </div>
        </details>

        {error && <p role="alert" className="rounded-[var(--radius-anidado)] bg-rojo/10 px-3.5 py-2.5 text-[13px] text-rojo">{error}</p>}

        <Boton type="submit" tamano="lg" disabled={!puedeCobrar || cobrando} className="hidden lg:inline-flex">
          {cobrando ? 'Cobrando…' : total > 0 ? `Cobrar ${clp(total)}` : 'Cobrar'}
        </Boton>
        <p className="hidden text-center text-[12px] text-gris lg:block">Descuenta el stock y registra el ingreso al instante.</p>
      </aside>

      {/* En el teléfono el botón de cobrar queda siempre a la vista, sobre la barra de navegación. */}
      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t border-borde/60 bg-papel/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Boton type="submit" form="venta-rapida" tamano="lg" disabled={!puedeCobrar || cobrando}>
          {cobrando ? 'Cobrando…' : total > 0 ? `Cobrar ${clp(total)}` : 'Elige un producto'}
        </Boton>
      </div>
    </form>
  )
}
