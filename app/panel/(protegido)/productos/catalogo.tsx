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
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

const ESTILO_ESTADO: Record<EstadoProducto, string> = {
  publicado: 'bg-verde/12 text-verde',
  borrador: 'bg-papel/90 text-tinta-suave ring-1 ring-borde',
  archivado: 'bg-tinta/80 text-white',
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
      <div className="mb-3 flex items-center gap-2.5">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gris">
            <IconoBuscar size={17} />
          </span>
          <input
            type="search"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar por nombre o SKU"
            aria-label="Buscar en el catálogo"
            className={`${campo} pl-9`}
          />
        </div>
        <button
          type="button"
          onClick={() => setCreando(true)}
          className="presionable flex min-h-11 shrink-0 items-center gap-1.5 rounded-[10px] bg-spark px-4
                     text-[14px] font-semibold text-white hover:bg-spark-hover"
        >
          <IconoMas size={17} />
          <span className="hidden sm:inline">Nuevo producto</span>
          <span className="sr-only sm:hidden">Nuevo producto</span>
        </button>
      </div>

      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Filtrar por estado" className="sin-barra flex gap-1.5 overflow-x-auto">
          {(['todos', ...ESTADOS_PRODUCTO] as Filtro[]).map((f) => (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={filtro === f}
              onClick={() => setFiltro(f)}
              className={`presionable inline-flex min-h-11 shrink-0 items-center rounded-full px-4 text-[14px] font-medium transition-colors ${
                filtro === f ? 'bg-tinta text-white' : 'bg-papel text-tinta-suave ring-1 ring-borde/70'
              }`}
            >
              {f === 'todos' ? 'Todos' : `${ROTULO_ESTADO[f]}s`}
              <span className={`cifra ml-1.5 ${filtro === f ? 'text-white/60' : 'text-gris'}`}>
                {conteo[f]}
              </span>
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="min-w-[190px]">
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
          <button
            type="button"
            onClick={() => setViendoCategorias(true)}
            className="presionable inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-medium text-spark hover:bg-spark-suave"
          >
            Categorías
          </button>
        </div>
      </div>

      {/* ── Grilla ────────────────────────────────────────────── */}
      {filtrados.length === 0 ? (
        <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-14 text-center ring-1 ring-borde/70">
          <p className="text-[15px] font-medium">
            {productos.length === 0
              ? 'El catálogo está vacío.'
              : filtro === 'borrador'
                ? 'No hay borradores pendientes.'
                : 'Ningún producto coincide.'}
          </p>
          <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-gris">
            {productos.length === 0
              ? 'Crea el primer producto y súbele fotos: así es como se ve en la tienda.'
              : 'Prueba con otro filtro, otra categoría u otra búsqueda.'}
          </p>
          {productos.length === 0 && (
            <button
              type="button"
              onClick={() => setCreando(true)}
              className="presionable mt-5 inline-flex items-center gap-1.5 rounded-[10px] bg-spark px-4 py-2.5
                         text-[14px] font-semibold text-white hover:bg-spark-hover"
            >
              <IconoMas size={17} />
              Crear producto
            </button>
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtrados.map((p, i) => (
            <li key={p.id} className="entra" style={{ animationDelay: `${Math.min(i, 8) * 30}ms` }}>
              <button
                type="button"
                onClick={() => setAbierto(p.id)}
                className="presionable group w-full overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel
                           text-left shadow-[var(--shadow-sutil)] ring-1 ring-borde/60 hover:shadow-[var(--shadow-alzado)]"
              >
                <div className="relative bg-papel-alt">
                  {p.imagen_url ? (
                    <Image src={urlPublica(p.imagen_url)} alt="" width={400} height={400} className="cuadro w-full" />
                  ) : (
                    <div className="cuadro flex w-full flex-col items-center justify-center gap-1.5 text-gris">
                      <IconoCamara size={22} />
                      <span className="text-[11px]">Sin foto</span>
                    </div>
                  )}
                  {p.estado !== 'publicado' && (
                    <span
                      className={`absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-semibold
                                  tracking-[0.02em] backdrop-blur-sm ${ESTILO_ESTADO[p.estado]}`}
                    >
                      {ROTULO_ESTADO[p.estado]}
                    </span>
                  )}
                  {p.etiqueta && (
                    <span className="absolute top-2 right-2 rounded-full bg-papel/90 px-2 py-0.5 text-[10px] font-semibold text-ambar">
                      {p.etiqueta}
                    </span>
                  )}
                </div>

                <div className="p-3">
                  <p className="line-clamp-1 text-[14px] leading-snug font-semibold tracking-[-0.01em]">
                    {p.nombre}
                  </p>
                  <p className="mt-0.5 line-clamp-1 text-[11px] text-gris">
                    {[p.categoria_id ? nombreCategoria.get(p.categoria_id) : 'Sin categoría', p.sku]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                  <div className="mt-2 flex items-baseline justify-between gap-2">
                    <span className="cifra text-[15px] font-semibold">{clp(p.precio_base)}</span>
                    <span className={`text-[11px] font-medium ${p.stock > 0 ? 'text-gris' : 'text-ambar'}`}>
                      {p.stock > 0 ? `${p.stock} u.` : 'Sin stock'}
                    </span>
                  </div>
                  {p.variantes.filter((v) => v.activo).length > 0 && (
                    <div className="mt-2 flex items-center gap-1" aria-label={`${p.variantes.length} variantes`}>
                      {p.variantes.filter((v) => v.activo).slice(0, 6).map((v) => (
                        <span
                          key={v.id}
                          title={v.nombre}
                          className="size-3 rounded-full ring-1 ring-borde"
                          style={{ background: v.color_hex ?? 'var(--color-papel-alt)' }}
                        />
                      ))}
                      {p.variantes.filter((v) => v.activo).length > 6 && (
                        <span className="text-[10px] text-gris">+{p.variantes.filter((v) => v.activo).length - 6}</span>
                      )}
                    </div>
                  )}
                </div>
              </button>
            </li>
          ))}
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
      >
        {enDetalle && (
          <div className="space-y-8">
            <Galeria productoId={enDetalle.id} galeria={enDetalle.galeria} portada={enDetalle.imagen_url} />
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
                className="presionable w-full rounded-[10px] bg-spark py-3 text-[15px] font-semibold text-white
                           hover:bg-spark-hover disabled:opacity-60">
          {pendiente ? 'Creando…' : 'Crear y añadir fotos'}
        </button>
      </form>
    </Hoja>
  )
}
