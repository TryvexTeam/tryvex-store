'use client'

import Image from 'next/image'
import { useMemo, useState, useTransition } from 'react'
import { Boton, Pildora } from '@/components/panel/ui'
import { Hoja } from '@/components/hoja'
import { ContarStock } from '@/components/panel/contar-stock'
import { ConfigurarMinimo } from '@/app/panel/(protegido)/stock/configurar-minimo'
import FormularioStock from '@/app/panel/(protegido)/stock/formulario'
import { cambiarEstadoProducto } from '@/app/panel/(protegido)/productos/acciones'
import { notificar } from '@/lib/notificar'
import { clp } from '@/lib/formato'
import type { ProductoConVariantes } from '@/lib/variantes-cliente'

/**
 * Inventario del panel, ordenado por categoría.
 *
 * Con un catálogo grande la pregunta no es «¿qué tarjeta tiene este producto?»,
 * sino «¿qué tengo y cuánto vale?». Por eso: primero el resumen (unidades y su
 * valor a costo y a precio de lista), después filtros y búsqueda, y el detalle
 * agrupado por categoría, cada una con sus propios totales.
 *
 * Estados (el texto lo dice; el color solo acompaña):
 *   · Sin stock      — a la venta y en cero: no se puede vender;
 *   · Bajo           — con unidades, en o bajo su mínimo;
 *   · Al día         — sobre su mínimo;
 *   · Fuera de venta — en cero y sin publicar: no se ofrece, no es una urgencia.
 *
 * `stock` es lo DISPONIBLE (ya descuenta lo reservado por pedidos sin pagar);
 * `reservadas` son las unidades apartadas, que siguen en bodega.
 */

export interface FilaInventario {
  producto_id: string
  sku: string
  nombre: string
  stock: number
  minimo: number
  reservadas: number
  imagen: string | null
  categoria: string
  costo: number
  precio: number
  publicado: boolean
  variantes: { id: string; nombre: string; stock: number }[]
}

export type FiltroInventario = 'bodega' | 'bajo' | 'sin' | 'fuera' | 'todos'
type Estado = 'sin' | 'bajo' | 'aldia' | 'fuera'

const estadoDe = (f: FilaInventario): Estado => {
  if (f.stock <= 0) return f.publicado ? 'sin' : 'fuera'
  return f.stock <= f.minimo ? 'bajo' : 'aldia'
}
const sinTildes = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

const ROTULO: Record<Estado, { texto: string; tono: 'rojo' | 'ambar' | 'verde' | 'neutro' }> = {
  sin: { texto: 'Sin stock', tono: 'rojo' },
  bajo: { texto: 'Bajo', tono: 'ambar' },
  aldia: { texto: 'Al día', tono: 'verde' },
  fuera: { texto: 'Fuera de venta', tono: 'neutro' },
}

export function InventarioStock({ filas, productos, filtroInicial }: { filas: FilaInventario[]; productos: ProductoConVariantes[]; filtroInicial?: FiltroInventario }) {
  const [filtro, setFiltro] = useState<FiltroInventario>(filtroInicial ?? 'bodega')
  const [busqueda, setBusqueda] = useState('')
  // Hoja de «registrar movimiento»: con el producto ya elegido si se abre desde su tarjeta.
  const [hoja, setHoja] = useState<{ productoId?: string; tipo?: string; n: number } | null>(null)
  const abrirHoja = (productoId?: string, tipo?: string) => setHoja((h) => ({ productoId, tipo, n: (h?.n ?? 0) + 1 }))

  const resumen = useMemo(() => {
    const r = { unidades: 0, aCosto: 0, aPrecio: 0, reservadas: 0, productos: 0, bajo: 0, sin: 0, fuera: 0 }
    for (const f of filas) {
      const e = estadoDe(f)
      if (f.stock > 0) {
        r.unidades += f.stock
        r.aCosto += f.stock * f.costo
        r.aPrecio += f.stock * f.precio
        r.productos++
      }
      r.reservadas += f.reservadas
      if (e === 'bajo') r.bajo++
      if (e === 'sin') r.sin++
      if (e === 'fuera') r.fuera++
    }
    return r
  }, [filas])

  const grupos = useMemo(() => {
    const q = sinTildes(busqueda.trim())
    const visibles = filas.filter((f) => {
      const e = estadoDe(f)
      if (filtro === 'bodega' && f.stock <= 0) return false
      if (filtro === 'bajo' && e !== 'bajo') return false
      if (filtro === 'sin' && e !== 'sin') return false
      if (filtro === 'fuera' && e !== 'fuera') return false
      return !q || sinTildes(`${f.nombre} ${f.sku} ${f.categoria}`).includes(q)
    })
    const porCategoria = new Map<string, FilaInventario[]>()
    for (const f of visibles) porCategoria.set(f.categoria, [...(porCategoria.get(f.categoria) ?? []), f])
    return [...porCategoria.entries()]
      .map(([nombre, items]) => ({
        nombre,
        items: items.sort((a, b) => b.stock - a.stock || a.nombre.localeCompare(b.nombre, 'es')),
        unidades: items.reduce((a, f) => a + Math.max(0, f.stock), 0),
        aCosto: items.reduce((a, f) => a + Math.max(0, f.stock) * f.costo, 0),
      }))
      .sort((a, b) => b.unidades - a.unidades || a.nombre.localeCompare(b.nombre, 'es'))
  }, [filas, filtro, busqueda])

  const chips: { id: FiltroInventario; etiqueta: string; n: number }[] = [
    { id: 'bodega', etiqueta: 'En bodega', n: resumen.productos },
    { id: 'bajo', etiqueta: 'Stock bajo', n: resumen.bajo },
    { id: 'sin', etiqueta: 'Sin stock', n: resumen.sin },
    { id: 'fuera', etiqueta: 'Fuera de venta', n: resumen.fuera },
    { id: 'todos', etiqueta: 'Todos', n: filas.length },
  ]
  const reponer = resumen.bajo + resumen.sin

  return (
    <section aria-label="Inventario" className="mb-10">
      {/* ── Resumen: qué hay y cuánto vale ─────────────────────────── */}
      <dl className="mb-5 grid grid-cols-[repeat(2,minmax(0,1fr))] gap-3 lg:grid-cols-[repeat(4,minmax(0,1fr))]">
        <Dato rotulo="Unidades en bodega" valor={String(resumen.unidades)} nota={`${resumen.productos} ${resumen.productos === 1 ? 'producto' : 'productos'}`} />
        <Dato rotulo="Valor a costo" valor={clp(resumen.aCosto)} nota="lo que costó" />
        <Dato rotulo="Valor a precio de lista" valor={clp(resumen.aPrecio)} nota="si se vendiera todo" />
        <Dato rotulo="Reservadas" valor={String(resumen.reservadas)} nota={resumen.reservadas === 1 ? 'unidad por cobrar' : 'unidades por cobrar'} />
      </dl>

      {reponer > 0 && (
        <div role="status" className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 rounded-[var(--radius-widget)] bg-ambar/10 px-4 py-3 text-[14px] text-ambar">
          <p className="min-w-0 flex-1">
            <strong className="cifra font-semibold">{reponer}</strong> {reponer === 1 ? 'producto' : 'productos'} para reponer
            {resumen.sin > 0 && <> · <strong className="cifra font-semibold">{resumen.sin}</strong> sin stock a la venta</>}
          </p>
          <button type="button" onClick={() => setFiltro(resumen.sin > 0 ? 'sin' : 'bajo')} className="font-semibold underline underline-offset-2">Ver cuáles</button>
        </div>
      )}

      {/* ── Filtros y búsqueda ─────────────────────────────────────── */}
      <div className="mb-5 space-y-3">
        <nav aria-label="Filtrar inventario" className="sin-barra -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {chips.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={filtro === c.id}
              onClick={() => setFiltro(c.id)}
              className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-[13px] font-medium transition-colors ${
                filtro === c.id ? 'bg-tinta text-white' : 'bg-papel text-tinta-suave ring-1 ring-borde/80 hover:ring-gris'
              }`}
            >
              {c.etiqueta}
              <span className={`cifra ${filtro === c.id ? 'text-white/65' : 'text-gris'}`}>{c.n}</span>
            </button>
          ))}
        </nav>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, SKU o categoría"
            aria-label="Buscar en el inventario"
            className="min-h-11 w-full rounded-[var(--radius-anidado)] bg-papel px-4 text-[15px] text-tinta ring-1 ring-borde placeholder:text-gris focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta sm:max-w-sm"
          />
          <Boton variante="secundario" onClick={() => abrirHoja()} className="sm:ml-auto">
            Registrar movimiento
          </Boton>
        </div>
      </div>

      {/* ── Por categoría ──────────────────────────────────────────── */}
      {grupos.length === 0 ? (
        <div className="rounded-[var(--radius-widget)] bg-papel px-6 py-12 text-center ring-1 ring-borde/60">
          <p className="text-[15px] text-gris">{busqueda ? `Nada coincide con «${busqueda}».` : 'No hay productos en este filtro.'}</p>
        </div>
      ) : (
        <div className="space-y-7">
          {grupos.map((g) => (
            <section key={g.nombre} aria-label={`Categoría ${g.nombre}`}>
              <header className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{g.nombre}</h3>
                <p className="cifra text-[13px] text-gris">
                  {g.items.length} {g.items.length === 1 ? 'producto' : 'productos'} · {g.unidades} u. · {clp(g.aCosto)} a costo
                </p>
              </header>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {g.items.map((f) => (
                  <Tarjeta key={f.producto_id} f={f} onMovimiento={(tipo) => abrirHoja(f.producto_id, tipo)} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <Hoja abierta={hoja !== null} onCerrar={() => setHoja(null)} titulo="Registrar movimiento" bajada="Ingresos, ventas, mermas y ajustes. Para poner el número que contó, use «Guardar stock» en la tarjeta del producto.">
        {hoja && <FormularioStock key={hoja.n} plano productos={productos} productoInicial={hoja.productoId} tipoInicial={hoja.tipo} alTerminar={() => setHoja(null)} />}
      </Hoja>
    </section>
  )
}

function Dato({ rotulo, valor, nota }: { rotulo: string; valor: string; nota: string }) {
  return (
    <div className="rounded-[var(--radius-widget)] bg-papel p-4 ring-1 ring-borde/60">
      <dt className="text-[12.5px] font-medium text-gris">{rotulo}</dt>
      <dd className="cifra mt-1.5 text-[clamp(1.2rem,4.6vw,1.6rem)] leading-none font-semibold tracking-[-0.02em]">{valor}</dd>
      <dd className="mt-1.5 text-[12px] text-gris">{nota}</dd>
    </div>
  )
}

function Tarjeta({ f, onMovimiento }: { f: FilaInventario; onMovimiento: (tipo: string) => void }) {
  const e = estadoDe(f)
  const r = ROTULO[e]
  return (
    <li className={`flex flex-col rounded-[var(--radius-widget)] bg-papel p-4 ring-1 ${e === 'sin' ? 'ring-rojo/35' : e === 'bajo' ? 'ring-ambar/35' : 'ring-borde/60'}`}>
      <div className="flex items-start gap-3.5">
        <span className="relative size-16 shrink-0 overflow-hidden rounded-[12px] bg-papel-alt">
          {f.imagen ? (
            <Image src={f.imagen} alt="" fill sizes="64px" className={`object-contain p-1.5 ${f.stock <= 0 ? 'opacity-55' : ''}`} />
          ) : (
            <span aria-hidden className="grid size-full place-items-center px-1 text-center text-[10.5px] leading-tight text-gris">Sin foto</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="line-clamp-2 text-[14.5px] leading-snug font-medium">{f.nombre}</p>
            <Pildora tono={r.tono} className="shrink-0">{r.texto}</Pildora>
          </div>
          <p className="mt-0.5 truncate text-[12px] text-gris">{f.sku}</p>
          <p className="cifra mt-1.5 text-[12.5px] text-tinta-suave">
            Costo {clp(f.costo)} · Precio {clp(f.precio)}
          </p>
          {(f.stock > 0 || f.reservadas > 0) && (
            <p className="cifra mt-0.5 text-[12px] text-gris">
              {f.stock > 0 && <>Vale {clp(f.stock * f.costo)}</>}
              {f.reservadas > 0 && <>{f.stock > 0 ? ' · ' : ''}+{f.reservadas} reservada{f.reservadas === 1 ? '' : 's'} por cobrar</>}
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 border-t border-borde/50 pt-4">
        <ContarStock productoId={f.producto_id} nombreProducto={f.nombre} stock={f.stock} variantes={f.variantes} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Boton variante="secundario" tamano="sm" onClick={() => onMovimiento('ingreso')}>Ingreso</Boton>
        <Boton variante="secundario" tamano="sm" onClick={() => onMovimiento('venta')} disabled={f.stock <= 0}>Venta</Boton>
        <Boton variante="suave" tamano="sm" onClick={() => onMovimiento('merma')} disabled={f.stock <= 0}>Merma</Boton>
        <AlternarVenta productoId={f.producto_id} nombre={f.nombre} publicado={f.publicado} />
      </div>

      <details className="group mt-3 rounded-[var(--radius-anidado)] bg-papel-alt px-3.5 py-2.5">
        <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between text-[13px] font-medium text-tinta-suave">
          Alerta de stock bajo <span className="cifra text-gris">mínimo {f.minimo}</span>
        </summary>
        <div className="mt-2 pb-1">
          <p className="mb-2 text-[12px] leading-snug text-gris">Solo configura cuándo avisar. No cambia cuántas unidades hay.</p>
          <ConfigurarMinimo productoId={f.producto_id} minimo={f.minimo} />
        </div>
      </details>
    </li>
  )
}

/** Mostrar u ocultar el producto en la tienda. Para publicar exige foto, categoría y precio. */
function AlternarVenta({ productoId, nombre, publicado }: { productoId: string; nombre: string; publicado: boolean }) {
  const [trabajando, iniciar] = useTransition()
  function alternar() {
    iniciar(async () => {
      const r = await cambiarEstadoProducto(productoId, publicado ? 'borrador' : 'publicado')
      if (r.ok) notificar.ok(publicado ? 'Producto oculto de la tienda' : 'Producto a la venta', nombre)
      else notificar.error('No se pudo cambiar', r.error)
    })
  }
  return (
    <Boton variante="suave" tamano="sm" onClick={alternar} disabled={trabajando} aria-pressed={publicado} className="ml-auto">
      {trabajando ? '…' : publicado ? 'Ocultar de la tienda' : 'Publicar en la tienda'}
    </Boton>
  )
}
