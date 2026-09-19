import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { leerVitrina, type ProductoTienda } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { TileProducto } from '@/components/tienda/tile-producto'
import { FiltrosColeccion } from '@/components/tienda/filtros-coleccion'
import { FilaCategorias } from '@/components/tienda/fila-categorias'
import { clp } from '@/lib/formato'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'

/**
 * Colección: todo el catálogo publicado, con filtros.
 *
 * La función de Dune Dragon (filtros, orden, conteo) con la forma de la
 * Tienda de Apple (título enorme, pestañas por familia). El estado vive en
 * la URL: un filtro se comparte copiando el enlace, y el filtrado ocurre en
 * el servidor, así que la página llega armada y sin saltos.
 *
 * Se arma al recibir la visita, no al construir el proyecto: prerenderizarla
 * obligaba a tener las credenciales de la base de datos para *compilar*. El
 * caché se muda al dato, que se guarda los mismos 300 segundos.
 */
export const dynamic = 'force-dynamic'

const catalogo = unstable_cache(leerVitrina, ['vitrina-coleccion'], { revalidate: 300 })

export const metadata: Metadata = {
  title: 'Tienda',
  description: 'Todo el catálogo de Tryvex Store, con envío a todo Chile y garantía de 6 meses.',
}

const ORDENES = {
  recientes: 'Más recientes',
  'menor-precio': 'Menor precio',
  'mayor-precio': 'Mayor precio',
} as const
type Orden = keyof typeof ORDENES

const uno = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)
const precioValido = (v: string | string[] | undefined) => {
  const s = uno(v)
  if (!s || !/^\d+$/.test(s)) return undefined
  const n = Number(s)
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined
}
/** Búsqueda sin tildes ni mayúsculas: «audifonos» encuentra «Audífonos». */
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export default async function Tienda(props: PageProps<'/tienda'>) {
  const q = await props.searchParams
  let min = precioValido(q.min)
  let max = precioValido(q.max)
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
  const { productos, categorias, configuracion } = await catalogo()

  const cat = uno(q.cat)
  const busqueda = (uno(q.q) ?? '').trim().slice(0, 60)
  const soloDisponibles = uno(q.disponibles) === '1'
  const soloOfertas = uno(q.ofertas) === '1'
  const ordenQ = uno(q.orden)
  const orden: Orden = ordenQ && ordenQ in ORDENES ? (ordenQ as Orden) : 'recientes'

  const categoria = categorias.find((c) => c.slug === cat) ?? null
  const termino = normal(busqueda)

  let lista: ProductoTienda[] = productos.filter(
    (p) =>
      (!categoria || p.categoriaId === categoria.id) &&
      (!soloDisponibles || !p.agotado) &&
      (!soloOfertas || p.precioAntes !== null) &&
      (min === undefined || p.precio >= min) &&
      (max === undefined || p.precio <= max) &&
      (!termino || normal(`${p.nombre} ${p.frase ?? ''}`).includes(termino))
  )
  if (orden === 'menor-precio') lista = [...lista].sort((a, b) => a.precio - b.precio)
  if (orden === 'mayor-precio') lista = [...lista].sort((a, b) => b.precio - a.precio)
  // Lo agotado siempre al final: primero lo que se puede comprar hoy.
  lista = [...lista.filter((p) => !p.agotado), ...lista.filter((p) => p.agotado)]

  /** Enlace que conserva los filtros actuales y cambia solo uno. */
  const con = (cambio: Record<string, string | null>) => {
    const u = new URLSearchParams()
    const actual: Record<string, string | undefined> = {
      cat: categoria?.slug,
      q: busqueda || undefined,
      disponibles: soloDisponibles ? '1' : undefined,
      ofertas: soloOfertas ? '1' : undefined,
      orden: orden !== 'recientes' ? orden : undefined,
      min: min?.toString(),
      max: max?.toString(),
    }
    for (const [k, v] of Object.entries({ ...actual, ...cambio })) if (v) u.set(k, v)
    const s = u.toString()
    return s ? `/tienda?${s}` : '/tienda'
  }

  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null
  const chip = (activo: boolean) =>
    `inline-flex h-9 items-center gap-1.5 rounded-full px-4 text-[14px] transition-colors ${
      activo ? 'bg-tinta text-white' : 'bg-papel text-tinta ring-1 ring-borde hover:ring-gris'
    }`

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={whatsapp} />

      <main className="min-w-0 flex-1 pb-20">
        <header className="flex flex-col gap-4 px-[var(--canal)] pt-10 t:pt-14 d:flex-row d:items-end d:justify-between d:pt-20">
          <h1 className="text-[40px] leading-[1.04] font-semibold tracking-titulo t:text-[56px] d:text-[80px] d:tracking-display">
            {categoria ? categoria.nombre : 'Compra en Tryvex.'}
          </h1>
          {whatsapp && (
            <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-[14px] text-spark hover:underline t:text-[17px] d:pb-4">
              ¿Dudas? Habla con nosotros ↗
            </a>
          )}
        </header>

        <FilaCategorias categorias={categorias} activa={categoria?.slug ?? null} />

        {/* Pestañas por categoría, como la tienda de Apple. */}
        <nav aria-label="Categorías" className="sin-barra mt-6 flex gap-7 overflow-x-auto border-b border-borde/70 px-[var(--canal)] t:mt-10">
          {[{ slug: null as string | null, nombre: 'Todo' }, ...categorias.map((c) => ({ slug: c.slug as string | null, nombre: c.nombre }))].map((c) => {
            const activa = (categoria?.slug ?? null) === c.slug
            return (
              <Link
                key={c.nombre}
                href={con({ cat: c.slug })}
                aria-current={activa ? 'page' : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center border-b-2 pb-3 text-[15px] t:text-[17px] ${activa ? 'border-tinta font-semibold text-tinta' : 'border-transparent text-tinta-suave hover:text-tinta'}`}
              >
                {c.nombre}
              </Link>
            )
          })}
        </nav>

        {/* Búsqueda, filtros y orden. Formularios GET: funcionan sin JavaScript. */}
        <div className="flex flex-col gap-4 px-[var(--canal)] pt-6 d:flex-row d:items-center d:justify-between">
          <div className="flex flex-wrap items-center gap-2.5">
            <form action="/tienda" role="search" className="relative">
              {categoria && <input type="hidden" name="cat" value={categoria.slug} />}
              {soloDisponibles && <input type="hidden" name="disponibles" value="1" />}
              {soloOfertas && <input type="hidden" name="ofertas" value="1" />}
              <input type="hidden" name="orden" value={orden} />
              {min !== undefined && <input type="hidden" name="min" value={min} />}
              {max !== undefined && <input type="hidden" name="max" value={max} />}
              <label htmlFor="buscar" className="sr-only">Buscar productos</label>
              <input
                id="buscar"
                name="q"
                defaultValue={busqueda}
                placeholder="Buscar"
                maxLength={60}
                // Desde la lupa de la cabecera se llega con el cursor listo para escribir.
                autoFocus={uno(q.buscar) === '1'}
                className="h-11 w-[180px] rounded-full bg-papel pr-4 pl-9 text-[15px] ring-1 ring-borde placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none t:w-[220px]"
              />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gris" aria-hidden>
                <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
              </svg>
            </form>
            {(min !== undefined || max !== undefined) && <Link href={con({ min: null, max: null })} className={chip(true)} aria-label="Quitar filtro de precio">{clp(min ?? 0)} – {max === undefined ? 'Sin límite' : clp(max)} ✕</Link>}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 d:justify-end">
            <p className="cifra text-[14px] text-gris" aria-live="polite">
              {lista.length} {lista.length === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
        </div>

        <div className="px-[var(--canal)] pt-4">
          <FiltrosColeccion key={con({})} cat={categoria?.slug} busqueda={busqueda} disponibles={soloDisponibles} ofertas={soloOfertas} min={min} max={max} orden={orden} resultados={lista.length} />
        </div>

        {lista.length === 0 ? (
          <div className="px-[var(--canal)] py-24 text-center">
            <p className="text-[24px] font-semibold tracking-tarjeta">No encontramos productos con esos filtros.</p>
            <Link href="/tienda" className="mt-3 inline-block text-[17px] text-spark hover:underline">Ver todo el catálogo</Link>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-x-4 gap-y-9 px-[var(--canal)] pt-8 lg:grid-cols-3 d:grid-cols-4 d:gap-x-5">
            {lista.map((p, i) => (
              <li key={p.id} className="min-w-0">
                <TileProducto producto={p} prioridad={i < 4} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <PieTienda
        nombre={configuracion?.nombre_tienda ?? 'Tryvex'}
        email={configuracion?.email_contacto ?? null}
        whatsapp={configuracion?.whatsapp ?? null}
        garantia={configuracion?.garantia_texto ?? null}
        retracto={configuracion?.retracto_texto ?? null}
      />
    </div>
  )
}
