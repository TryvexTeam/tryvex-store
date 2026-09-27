'use client'

import { useMemo, useState, useTransition } from 'react'
import { Selector } from '@/components/selector'
import Image from 'next/image'
import { clp } from '@/lib/formato'
import { urlPublica } from '@/lib/imagenes'
import {
  ESTADOS_PRODUCTO,
  ROTULO_ESTADO,
  type Categoria,
  type EstadoProducto,
  type Variante,
} from '@/lib/catalogo'
import { Hoja } from '@/components/hoja'
import { useAvisos } from '@/components/avisos'
import { IconoMas, IconoBuscar, IconoCamara } from '@/components/iconos'
import EditorProducto, { type Producto, type Tramo } from './editor'
import { Galeria } from './galeria'
import { Variantes } from './variantes'
import { Categorias } from './categorias'
import { crearProducto } from './acciones-catalogo'

export type ProductoCatalogo = Producto & {
  imagen_url: string | null
  galeria: string[]
  stock: number
  variantes: Variante[]
}

type Props = {
  productos: ProductoCatalogo[]
  categorias: Categoria[]
  conteoPorCategoria: Record<string, number>
  tramos: ({ producto_id: string } & Tramo)[]
}

type Filtro = 'todos' | EstadoProducto

const campo =
  'w-full min-h-11 rounded-[10px] bg-papel px-3.5 py-2.5 text-[15px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-tinta focus:outline-none disabled:opacity-60'

const ESTILO_ESTADO: Record<EstadoProducto, string> = {
  publicado: 'bg-papel/85 text-tinta ring-1 ring-black/5',
  borrador: 'bg-papel/85 text-tinta-suave ring-1 ring-black/5',
  archivado: 'bg-tinta/80 text-white',
}

/** Plurales escritos: agregar una «s» daba «Borradors». */
const PLURAL_ESTADO: Record<EstadoProducto, string> = {
  borrador: 'Borradores',
  publicado: 'Publicados',
  archivado: 'Archivados',
}

const PUNTO_ESTADO: Record<EstadoProducto, string> = {
  publicado: 'bg-verde',
  borrador: 'bg-ambar',
  archivado: 'bg-white/70',
}

/** Pocas unidades se avisan antes de que se agoten: con 5 o menos, ámbar. */
const POCAS_UNIDADES = 5

/** El stock dicho como se lee de un vistazo: color y una frase corta. */
function semaforoStock(stock: number): { rotulo: string; texto: string; punto: string } {
  if (stock <= 0) return { rotulo: 'Sin stock', texto: 'text-rojo', punto: 'bg-rojo' }
  if (stock <= POCAS_UNIDADES) return { rotulo: `Quedan ${stock}`, texto: 'text-ambar', punto: 'bg-ambar' }
  return { rotulo: `${stock} en stock`, texto: 'text-tinta-suave', punto: 'bg-verde' }
}

/**
 * Catálogo del panel.
 *
 * Una grilla de portadas y el detalle en una hoja: se ve el catálogo completo
 * de un vistazo y se entra solo a lo que se va a tocar. Los filtros por estado
 * responden a la pregunta que más se hace el equipo: qué falta publicar.
 */
export function Catalogo({ productos, categorias, conteoPorCategoria, tramos }: Props) {
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [categoria, setCategoria] = useState<string>('')
  const [abierto, setAbierto] = useState<string | null>(null)
  const [creando, setCreando] = useState(false)
  const [viendoCategorias, setViendoCategorias] = useState(false)

  const conteo = useMemo(() => {
    const c: Record<Filtro, number> = { todos: productos.length, borrador: 0, publicado: 0, archivado: 0 }
    for (const p of productos) c[p.estado] += 1
    return c
  }, [productos])

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return productos.filter(
      (p) =>
        (filtro === 'todos' || p.estado === filtro) &&
        (!categoria || p.categoria_id === categoria) &&
        (!q || p.nombre.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    )
  }, [busca, filtro, categoria, productos])

  const nombreCategoria = useMemo(
    () => new Map(categorias.map((c) => [c.id, c.nombre])),
    [categorias]
  )

  const enDetalle = productos.find((p) => p.id === abierto) ?? null

  return (
    <>
      {/* ── Barra de acciones ─────────────────────────────────── */}
      <div className="mb-3 flex flex-wrap items-center gap-2.5">
        <div className="relative basis-full sm:min-w-[200px] sm:flex-1 sm:basis-auto">
          <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-gris">
            <IconoBuscar size={17} />
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            aria-label="Buscar en el catálogo"
            className="h-11 w-full rounded-full bg-papel pr-4 pl-11 text-[15px] text-tinta ring-1 ring-borde/80 placeholder:text-gris focus:ring-2 focus:ring-tinta focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setViendoCategorias(true)}
          className="presionable inline-flex h-11 flex-1 items-center justify-center rounded-full bg-papel px-5 text-[14px] font-medium text-tinta ring-1 ring-borde/80 hover:ring-gris sm:flex-none"
        >
          Categorías
        </button>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="presionable inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-full bg-tinta px-4 text-[14px] font-semibold whitespace-nowrap text-white hover:bg-tinta/85 sm:flex-none sm:px-5"
        >
          <IconoMas size={17} />
          Nuevo producto
        </button>
      </div>

      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filtrar por estado" className="sin-barra flex gap-1.5 overflow-x-auto">
          {(['todos', ...ESTADOS_PRODUCTO] as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filtro === f}
              onClick={() => setFiltro(f)}
              className={`presionable inline-flex h-9 shrink-0 items-center rounded-full px-4 text-[14px] font-medium transition-colors ${
                filtro === f ? 'bg-tinta text-white' : 'bg-papel text-tinta-suave ring-1 ring-borde/80 hover:ring-gris'
              }`}
            >
              {f === 'todos' ? 'Todos' : PLURAL_ESTADO[f]}
              <span className={`cifra ml-1.5 ${filtro === f ? 'text-white/60' : 'text-gris'}`}>{conteo[f]}</span>
            </button>
          ))}
        </div>

        <div className="w-full sm:ml-auto sm:w-auto sm:min-w-[200px]">
          <Selector
            id="filtro-categoria"
            name="filtro_categoria"
            etiqueta="Categoría"
            placeholder="Todas las categorías"
            opciones={[{ valor: '', etiqueta: 'Todas las categorías' }, ...categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
            valor={categoria}
            alCambiar={setCategoria}
          />
        </div>
      </div>

      {/* ── Grilla ────────────────────────────────────────────── */}
      {filtrados.length === 0 ? (
        <div className="rounded-[22px] bg-papel px-6 py-16 text-center shadow-[0_2px_12px_rgb(0_0_0/5%)] ring-1 ring-borde/60">
          <p className="text-[19px] font-semibold tracking-[-0.02em]">
            {productos.length === 0 ? 'El catálogo está vacío.' : filtro === 'borrador' ? 'No hay borradores pendientes.' : 'Ningún producto coincide.'}
          </p>
          <p className="mx-auto mt-2 max-w-xs text-[14px] text-gris">
            {productos.length === 0
              ? 'Crea el primer producto y súbele fotos: así es como se ve en la tienda.'
              : 'Prueba con otro filtro, otra categoría u otra búsqueda.'}
          </p>
          {productos.length === 0 && (
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="presionable mt-6 inline-flex h-11 items-center gap-1.5 rounded-full bg-tinta px-5 text-[14px] font-semibold text-white hover:bg-tinta/85"
            >
              <IconoMas size={17} />
              Crear producto
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {filtrados.map((p, i) => {
            const activas = p.variantes.filter((v) => v.activo)
            const antes = p.precio_antes !== null && p.precio_antes !== '' ? Number(p.precio_antes) : null
            const stock = semaforoStock(p.stock)
            return (
              <li key={p.id} className="entra" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
                <button
                  type="button"
                  onClick={() => setAbierto(p.id)}
                  className="presionable panel-card group flex h-full w-full flex-col overflow-hidden rounded-[18px] bg-papel text-left ring-1 ring-borde/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
                >
                  <div className="relative aspect-square bg-papel">
                    {p.imagen_url ? (
                      <Image
                        src={urlPublica(p.imagen_url)}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 240px, (min-width: 640px) 30vw, 45vw"
                        className="panel-card-foto object-contain p-5"
                      />
                    ) : (
                      <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-papel-alt text-gris">
                        <IconoCamara size={24} />
                        <span className="text-[12px]">Sin foto</span>
                      </div>
                    )}
                    <span className={`absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold backdrop-blur-md ${ESTILO_ESTADO[p.estado]}`}>
                      <span aria-hidden className={`size-1.5 rounded-full ${PUNTO_ESTADO[p.estado]}`} />
                      {ROTULO_ESTADO[p.estado]}
                    </span>
                  </div>

                  <div className="flex flex-1 flex-col px-4 pt-1 pb-4">
                    {p.etiqueta && <p className="text-[11px] font-semibold text-vino">{p.etiqueta}</p>}
                    <p className="mt-0.5 line-clamp-2 text-[15px] leading-snug font-semibold tracking-[-0.015em]">{p.nombre}</p>
                    <p className="mt-1 line-clamp-1 text-[12px] text-gris">
                      {[p.categoria_id ? nombreCategoria.get(p.categoria_id) : 'Sin categoría', p.sku].filter(Boolean).join(' · ')}
                    </p>
                    {activas.length > 0 && (
                      <div className="mt-2 flex items-center gap-1" aria-label={`${activas.length} variantes`}>
                        {activas.slice(0, 6).map((v) => (
                          <span key={v.id} title={v.nombre} className="size-3 rounded-full ring-1 ring-black/10" style={{ background: v.color_hex ?? 'var(--color-papel-alt)' }} />
                        ))}
                        {activas.length > 6 && <span className="text-[10px] text-gris">+{activas.length - 6}</span>}
                      </div>
                    )}
                    <div className="mt-auto flex flex-wrap items-end justify-between gap-x-2 gap-y-1 pt-3">
                      <span className="flex items-baseline gap-1.5">
                        <span className="cifra text-[16px] font-semibold">{clp(p.precio_base)}</span>
                        {antes !== null && antes > Number(p.precio_base) && <span className="cifra text-[12px] text-gris line-through">{clp(antes)}</span>}
                      </span>
                      <span className={`inline-flex items-center gap-1 text-[12px] font-medium ${stock.texto}`}>
                        <span aria-hidden className={`size-1.5 rounded-full ${stock.punto}`} />
                        {stock.rotulo}
                      </span>
                    </div>
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {/* ── Detalle ───────────────────────────────────────────── */}
      <Hoja
        abierta={enDetalle !== null}
        onCerrar={() => setAbierto(null)}
        titulo={enDetalle?.nombre ?? ''}
        bajada={
          enDetalle
            ? `${ROTULO_ESTADO[enDetalle.estado]} · SKU ${enDetalle.sku} · ${enDetalle.stock} en stock`
            : undefined
        }
        ancho="amplio"
      >
        {enDetalle && (
          // Escritorio: fotos a la izquierda, fijas mientras se edita a la
          // derecha. Teléfono: todo en una columna.
          <div className="grid gap-8 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] md:gap-10">
            <div className="md:sticky md:top-0 md:self-start">
              <Galeria productoId={enDetalle.id} galeria={enDetalle.galeria} portada={enDetalle.imagen_url} />
            </div>
            <div className="min-w-0 space-y-8">
              <EditorProducto
                producto={enDetalle}
                categorias={categorias}
                tramos={tramos.filter((t) => t.producto_id === enDetalle.id)}
                enHoja
              />
              <Variantes
                productoId={enDetalle.id}
                skuProducto={enDetalle.sku}
                precioProducto={Number(enDetalle.precio_base)}
                variantes={enDetalle.variantes}
              />
            </div>
          </div>
        )}
      </Hoja>

      {/* ── Categorías ────────────────────────────────────────── */}
      <Hoja
        abierta={viendoCategorias}
        onCerrar={() => setViendoCategorias(false)}
        titulo="Categorías"
        bajada="Ordenan la tienda y sus carruseles. Una categoría con productos no se puede borrar."
      >
        <Categorias categorias={categorias} conteo={conteoPorCategoria} />
      </Hoja>

      {/* ── Crear ─────────────────────────────────────────────── */}
      <HojaCrear
        abierta={creando}
        categorias={categorias}
        onCerrar={() => setCreando(false)}
        onCreado={(id) => {
          setCreando(false)
          // Se entra directo al producto recién creado: lo siguiente que se
          // quiere hacer, siempre, es ponerle las fotos.
          setAbierto(id)
        }}
      />
    </>
  )
}

function HojaCrear({
  abierta,
  categorias,
  onCerrar,
  onCreado,
}: {
  abierta: boolean
  categorias: Categoria[]
  onCerrar: () => void
  onCreado: (id: string) => void
}) {
  const [error, setError] = useState<string | null>(null)
  const [pendiente, empezar] = useTransition()
  const [categoriaNueva, setCategoriaNueva] = useState<string>(categorias[0]?.id ?? '')
  const avisos = useAvisos()

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    setError(null)
    empezar(async () => {
      const r = await crearProducto(datos)
      if (r.ok) {
        avisos.ok('Producto creado como borrador.')
        onCreado(r.id)
      } else setError(r.error)
    })
  }

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Nuevo producto"
      bajada="Nace como borrador: nadie lo ve hasta que lo publiques, ya con fotos."
    >
      <form onSubmit={enviar} className="space-y-3.5">
        <div>
          <label htmlFor="c-nombre" className="mb-1 block text-[12px] font-medium text-gris">Nombre</label>
          <input id="c-nombre" name="nombre" required autoComplete="off" placeholder="Correa deportiva"
                 disabled={pendiente} className={campo} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="c-sku" className="mb-1 block text-[12px] font-medium text-gris">SKU</label>
            <input id="c-sku" name="sku" required autoComplete="off" placeholder="TVX-CORREA"
                   disabled={pendiente} className={`${campo} uppercase`} />
          </div>
          <div>
            <label htmlFor="c-marca" className="mb-1 block text-[12px] font-medium text-gris">Marca</label>
            <input id="c-marca" name="marca" defaultValue="Tryvex" autoComplete="off"
                   disabled={pendiente} className={campo} />
          </div>
        </div>

        <div>
          <label htmlFor="c-categoria" className="mb-1 block text-[12px] font-medium text-gris">Categoría</label>
          <Selector
            id="c-categoria"
            name="categoria_id"
            etiqueta="Categoría"
            placeholder="Sin categoría por ahora"
            opciones={[{ valor: '', etiqueta: 'Sin categoría por ahora' }, ...categorias.map((c) => ({ valor: c.id, etiqueta: c.nombre }))]}
            valor={categoriaNueva}
            alCambiar={setCategoriaNueva}
            disabled={pendiente}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="c-precio" className="mb-1 block text-[12px] font-medium text-gris">Precio de venta</label>
            <input id="c-precio" name="precio_base" type="text" inputMode="numeric"
                   required placeholder="En pesos, sin puntos" disabled={pendiente} className={`${campo} cifra`} />
          </div>
          <div>
            <label htmlFor="c-costo" className="mb-1 block text-[12px] font-medium text-gris">Costo unitario</label>
            <input id="c-costo" name="costo_unitario" type="number" inputMode="numeric" min={0} step={1}
                   placeholder="10000" disabled={pendiente} className={`${campo} cifra`} />
          </div>
        </div>

        <div>
          <label htmlFor="c-desc" className="mb-1 block text-[12px] font-medium text-gris">
            Descripción <span className="font-normal">(opcional)</span>
          </label>
          <textarea id="c-desc" name="descripcion" rows={3} disabled={pendiente} className={`${campo} resize-none`} />
        </div>

        {error && (
          <p role="alert" className="rounded-[10px] bg-spark-suave px-3 py-2 text-[13px] text-spark">{error}</p>
        )}

        <button type="submit" disabled={pendiente}
                className="presionable w-full rounded-[10px] bg-tinta py-3 text-[15px] font-semibold text-white
                           hover:bg-tinta/85 disabled:opacity-60">
          {pendiente ? 'Creando…' : 'Crear y añadir fotos'}
        </button>
      </form>
    </Hoja>
  )
}
