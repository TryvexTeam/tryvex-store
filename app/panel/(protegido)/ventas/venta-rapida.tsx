'use client'

import Image from 'next/image'
import { useMemo, useRef, useState, useTransition, type FormEvent } from 'react'
import { crearVentaRapidaCarrito } from '../pedidos/acciones'
import { precioParaCantidad } from '../stock/acciones'
import { notificar } from '@/lib/notificar'
import { clp } from '@/lib/formato'
import { montoDesdeTexto } from '@/lib/monto'
import { MAX_LINEAS_VENTA } from '@/lib/venta'
import { Boton, CLASE_CAMPO, Pildora } from '@/components/panel/ui'

/**
 * Venta rápida (showroom, feria, retiro presencial), como una caja con carrito.
 *
 * Tocar un producto lo agrega a la venta (con variantes, antes se elige una);
 * volver a tocarlo suma una unidad. Cada línea ajusta su cantidad y su precio, y
 * todo se cobra junto en UNA reserva transaccional: o entra la venta completa o
 * no entra nada.
 *
 * El teléfono, el correo y hasta el nombre son opcionales: en un mostrador no
 * siempre se piden, y pedirlos frena la venta. El precio por cantidad lo sugiere
 * el servidor (tramos de mayorista); acá se muestra y se puede cambiar.
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

interface Linea {
  clave: string
  productoId: string
  varianteId: string | null
  nombre: string
  varianteNombre: string | null
  imagen: string | null
  cantidad: number
  max: number
  precio: string
  /** El vendedor cambió el precio a mano: el tramo ya no lo pisa. */
  toco: boolean
  tramo: string | null
}

const METODOS = [
  { valor: 'efectivo', etiqueta: 'Efectivo' },
  { valor: 'transferencia', etiqueta: 'Transferencia' },
  { valor: 'mercadopago', etiqueta: 'Mercado Pago' },
  { valor: 'flow', etiqueta: 'Flow' },
] as const

const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const precioDe = (l: Linea) => montoDesdeTexto(l.precio) ?? 0

interface Cobrada {
  total: number
  unidades: number
  lineas: number
  metodo: string
  vuelto: number | null
}

export function VentaRapida({ productos }: { productos: ProductoVenta[] }) {
  const [busqueda, setBusqueda] = useState('')
  const [lineas, setLineas] = useState<Linea[]>([])
  const [eligiendo, setEligiendo] = useState<ProductoVenta | null>(null)
  const [metodo, setMetodo] = useState<string>('efectivo')
  const [recibido, setRecibido] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [cobrada, setCobrada] = useState<Cobrada | null>(null)
  const [cobrando, iniciar] = useTransition()
  const buscador = useRef<HTMLInputElement>(null)

  const resultados = useMemo(() => {
    const palabras = sinTildes(busqueda.trim()).split(/\s+/).filter(Boolean)
    return productos
      .filter((p) => palabras.every((w) => sinTildes(`${p.nombre} ${p.sku}`).includes(w)))
      .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0) || a.nombre.localeCompare(b.nombre, 'es'))
  }, [productos, busqueda])

  const enVenta = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of lineas) m.set(l.productoId, (m.get(l.productoId) ?? 0) + l.cantidad)
    return m
  }, [lineas])

  const total = lineas.reduce((suma, l) => suma + l.cantidad * precioDe(l), 0)
  const unidades = lineas.reduce((suma, l) => suma + l.cantidad, 0)
  const ganancia = lineas.reduce((suma, l) => {
    const costo = productos.find((p) => p.id === l.productoId)?.costo
    return costo ? suma + (precioDe(l) - costo) * l.cantidad : suma
  }, 0)
  const recibidoNum = montoDesdeTexto(recibido) ?? 0
  const vuelto = metodo === 'efectivo' && recibidoNum >= total && total > 0 ? recibidoNum - total : null
  const puedeCobrar = lineas.length > 0 && lineas.every((l) => precioDe(l) > 0)

  /** El servidor sugiere el precio del tramo para esa cantidad, salvo que se haya tocado a mano. */
  async function sugerirPrecio(clave: string, productoId: string, cantidad: number) {
    let r: Awaited<ReturnType<typeof precioParaCantidad>> = null
    try {
      r = await precioParaCantidad(productoId, cantidad)
    } catch {
      // Sin respuesta del servidor queda el precio de lista: la venta no se frena por una sugerencia.
    }
    if (!r) return
    setLineas((ls) => ls.map((l) => (l.clave === clave && !l.toco && l.cantidad === cantidad ? { ...l, precio: String(r.precio), tramo: r.etiqueta } : l)))
  }

  function agregar(p: ProductoVenta, varianteId: string | null) {
    const variante = varianteId ? p.variantes.find((v) => v.id === varianteId) : null
    const max = variante ? variante.stock : p.stock
    if (max < 1) return
    const clave = `${p.id}:${varianteId ?? ''}`
    const existente = lineas.find((l) => l.clave === clave)
    setError(null)
    if (existente) {
      if (existente.cantidad >= existente.max) {
        notificar.aviso('No hay más unidades', `${p.nombre}: solo quedan ${existente.max}.`)
        return
      }
      cambiarCantidad(clave, existente.cantidad + 1)
    } else {
      if (lineas.length >= MAX_LINEAS_VENTA) {
        notificar.aviso('Venta muy larga', `Máximo ${MAX_LINEAS_VENTA} productos por venta.`)
        return
      }
      setLineas((ls) => [
        ...ls,
        { clave, productoId: p.id, varianteId, nombre: p.nombre, varianteNombre: variante?.nombre ?? null, imagen: p.imagen, cantidad: 1, max, precio: String(p.precio), toco: false, tramo: null },
      ])
      sugerirPrecio(clave, p.id, 1)
    }
    setEligiendo(null)
    setBusqueda('')
    setTimeout(() => buscador.current?.focus(), 0)
  }

  function elegirProducto(p: ProductoVenta) {
    if (p.stock < 1) return
    if (p.variantes.length === 0) agregar(p, null)
    else if (p.variantes.filter((v) => v.stock > 0).length === 1) agregar(p, p.variantes.find((v) => v.stock > 0)!.id)
    else setEligiendo(p)
  }

  function cambiarCantidad(clave: string, nueva: number) {
    const linea = lineas.find((l) => l.clave === clave)
    if (!linea) return
    const cantidad = Math.max(1, Math.min(linea.max, nueva))
    setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, cantidad } : l)))
    sugerirPrecio(clave, linea.productoId, cantidad)
  }

  const cambiarPrecio = (clave: string, precio: string) => setLineas((ls) => ls.map((l) => (l.clave === clave ? { ...l, precio, toco: true, tramo: null } : l)))
  const quitar = (clave: string) => setLineas((ls) => ls.filter((l) => l.clave !== clave))

  function reiniciar() {
    setLineas([])
    setEligiendo(null)
    setMetodo('efectivo')
    setRecibido('')
    setBusqueda('')
    setError(null)
    setCobrada(null)
  }

  function cobrar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!puedeCobrar) return
    setError(null)
    const datos = new FormData(e.currentTarget)
    datos.set('metodo_pago', metodo)
    datos.set(
      'lineas',
      JSON.stringify(lineas.map((l) => ({ producto_id: l.productoId, variante_id: l.varianteId, cantidad: l.cantidad, precio_unitario: precioDe(l) })))
    )
    iniciar(async () => {
      const r = await crearVentaRapidaCarrito(datos)
      if (r.ok) {
        setCobrada({ total, unidades, lineas: lineas.length, metodo, vuelto })
        notificar.ok('Venta cobrada', `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'} · ${clp(total)}`)
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
          {cobrada.unidades} {cobrada.unidades === 1 ? 'unidad' : 'unidades'} en {cobrada.lineas} {cobrada.lineas === 1 ? 'producto' : 'productos'} · {METODOS.find((m) => m.valor === cobrada.metodo)?.etiqueta}
        </p>
        {cobrada.vuelto !== null && cobrada.vuelto > 0 && (
          <p className="mt-4 rounded-[var(--radius-anidado)] bg-papel-alt px-4 py-3 text-[15px]">
            Vuelto: <strong className="cifra">{clp(cobrada.vuelto)}</strong>
          </p>
        )}
        <Boton tamano="lg" className="mt-6" onClick={reiniciar}>Nueva venta</Boton>
      </div>
    )
  }

  return (
    <form id="venta-rapida" onSubmit={cobrar} className="grid items-start gap-6 pb-24 lg:grid-cols-[minmax(0,1fr)_400px] lg:pb-0">
      {/* ── Productos ────────────────────────────────────────── */}
      <section aria-label="Agregar productos" className="min-w-0 rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
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
              if (primero) elegirProducto(primero)
            }
          }}
          placeholder="Buscar por nombre o SKU"
          aria-label="Buscar producto"
          autoFocus
          className={`${CLASE_CAMPO} mt-3`}
        />
        <p className="sr-only" role="status">{resultados.length} productos</p>

        {eligiendo && (
          <div role="group" aria-label={`Variante de ${eligiendo.nombre}`} className="mt-4 rounded-[var(--radius-anidado)] bg-papel-alt p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold">{eligiendo.nombre}: elige la variante</p>
              <button type="button" onClick={() => setEligiendo(null)} className="text-[13px] text-gris hover:text-tinta">Cancelar</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {eligiendo.variantes.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  disabled={v.stock < 1}
                  onClick={() => agregar(eligiendo, v.id)}
                  className="min-h-10 rounded-full bg-papel px-4 text-[13.5px] font-medium ring-1 ring-borde transition-colors hover:ring-tinta disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {v.nombre} <span className="cifra opacity-60">· {v.stock}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {resultados.length === 0 ? (
          <p className="mt-6 text-center text-[14px] text-gris">Nada coincide con «{busqueda}».</p>
        ) : (
          <ul className="mt-4 grid max-h-[620px] grid-cols-1 gap-2.5 overflow-y-auto sm:grid-cols-2">
            {resultados.slice(0, 40).map((p) => {
              const agotado = p.stock < 1
              const yaEn = enVenta.get(p.id) ?? 0
              return (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => elegirProducto(p)}
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
                      {yaEn > 0 ? (
                        <Pildora tono="verde" className="mt-1">En la venta × {yaEn}</Pildora>
                      ) : (
                        <span className={`cifra block text-[12px] ${agotado ? 'text-rojo' : 'text-gris'}`}>{agotado ? 'Sin stock' : `${p.stock} u.`}</span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* ── Venta y cobro ─────────────────────────────────────── */}
      <aside aria-label="Venta" className="space-y-4 rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60 lg:sticky lg:top-20">
        <div>
          <p className="text-[13px] font-medium text-gris">Total a cobrar</p>
          <p className="cifra mt-1 text-[44px] leading-none font-semibold tracking-[-0.03em]">{clp(total)}</p>
          {lineas.length > 0 && (
            <p className="mt-2 text-[12.5px] text-gris">
              {unidades} {unidades === 1 ? 'unidad' : 'unidades'}
              {ganancia > 0 ? <> · ganancia <span className="cifra">{clp(ganancia)}</span></> : null}
            </p>
          )}
        </div>

        <div>
          <h2 className="mb-2 text-[13px] font-medium text-tinta-suave">En esta venta</h2>
          {lineas.length === 0 ? (
            <p className="rounded-[var(--radius-anidado)] bg-papel-alt px-4 py-5 text-center text-[13.5px] text-gris">Toca un producto para agregarlo. Puedes sumar todos los que quieras.</p>
          ) : (
            <ul className="divide-y divide-borde/50 rounded-[var(--radius-anidado)] bg-papel-alt">
              {lineas.map((l) => (
                <li key={l.clave} className="p-3">
                  <div className="flex items-start gap-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-[14px] leading-snug font-medium">{l.nombre}</p>
                      {l.varianteNombre && <p className="text-[12px] text-gris">{l.varianteNombre}</p>}
                    </div>
                    <button type="button" onClick={() => quitar(l.clave)} aria-label={`Quitar ${l.nombre}${l.varianteNombre ? ` ${l.varianteNombre}` : ''} de la venta`} className="presionable grid size-9 shrink-0 place-items-center rounded-full text-gris hover:bg-borde/50 hover:text-rojo">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <div role="group" aria-label={`Cantidad de ${l.nombre}`} className="flex items-center rounded-full bg-papel ring-1 ring-borde">
                      <button type="button" aria-label="Quitar una unidad" disabled={l.cantidad <= 1} onClick={() => cambiarCantidad(l.clave, l.cantidad - 1)} className="presionable grid size-9 place-items-center text-[18px] disabled:opacity-30">−</button>
                      <output aria-live="polite" className="cifra w-8 text-center text-[15px] font-semibold">{l.cantidad}</output>
                      <button type="button" aria-label="Agregar una unidad" disabled={l.cantidad >= l.max} onClick={() => cambiarCantidad(l.clave, l.cantidad + 1)} className="presionable grid size-9 place-items-center text-[18px] disabled:opacity-30">+</button>
                    </div>
                    <div className="text-right">
                      <label className="sr-only" htmlFor={`precio-${l.clave}`}>Precio unitario de {l.nombre}</label>
                      <input id={`precio-${l.clave}`} inputMode="numeric" value={l.precio} onChange={(e) => cambiarPrecio(l.clave, e.target.value)} className="cifra h-9 w-24 rounded-[10px] bg-papel px-2.5 text-right text-[14px] ring-1 ring-borde focus-visible:outline-2 focus-visible:outline-tinta" />
                      <p className="cifra mt-1 text-[12.5px] font-semibold">{clp(l.cantidad * precioDe(l))}</p>
                    </div>
                  </div>
                  {l.tramo && !l.toco && <p className="mt-1.5 text-[11.5px] text-gris">{l.tramo}</p>}
                </li>
              ))}
            </ul>
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
                className={`min-h-11 rounded-[var(--radius-anidado)] text-[14px] font-medium transition-colors ${metodo === m.valor ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta hover:bg-borde/40'}`}
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

        <Boton type="submit" tamano="lg" disabled={!puedeCobrar || cobrando} className="max-lg:hidden">
          {cobrando ? 'Cobrando…' : total > 0 ? `Cobrar ${clp(total)}` : 'Cobrar'}
        </Boton>
        <p className="hidden text-center text-[12px] text-gris lg:block">Descuenta el stock y registra el ingreso al instante.</p>
      </aside>

      {/* En el teléfono el botón de cobrar queda siempre a la vista, sobre la barra de navegación. */}
      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-30 border-t border-borde/60 bg-papel/90 px-4 py-3 backdrop-blur-xl lg:hidden">
        <Boton type="submit" form="venta-rapida" tamano="lg" disabled={!puedeCobrar || cobrando}>
          {cobrando ? 'Cobrando…' : total > 0 ? `Cobrar ${clp(total)} · ${unidades} u.` : 'Agrega productos'}
        </Boton>
      </div>
    </form>
  )
}
