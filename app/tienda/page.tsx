import type { Metadata } from 'next'
import Link from 'next/link'
import { unstable_cache } from 'next/cache'
import { leerVitrina, type ProductoTienda } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { CardProducto } from '@/components/tienda/card-producto'
import { FiltrosColeccion, type Vista } from '@/components/tienda/filtros-coleccion'
import { ORDENES, ORDEN_POR_DEFECTO, type Orden } from '@/lib/orden-coleccion'
import { FilaCategorias } from '@/components/tienda/fila-categorias'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'

/**
 * Colección: todo el catálogo publicado, con filtros.
 *
 * Compuesta como la tienda de Apple (apple.com/cl/store y sus listados de
 * accesorios): título enorme, la fila de familias con foto, la barra de
 * filtros en píldoras con «Ordenar por» a la derecha (flota al bajar) y la
 * grilla con las mismas cards de producto de la portada.
 *
 * El estado vive en la URL: un filtro se comparte copiando el enlace, y el
 * filtrado ocurre en el servidor, así que la página llega armada.
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

const uno = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)
const precioValido = (v: string | string[] | undefined) => {
  const s = uno(v)
  if (!s || !/^\d+$/.test(s)) return undefined
  const n = Number(s)
  return Number.isSafeInteger(n) && n >= 0 ? n : undefined
}
/** Búsqueda sin tildes ni mayúsculas: «audifonos» encuentra «Audífonos». */
const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

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
  const orden: Orden = ordenQ && ordenQ in ORDENES ? (ordenQ as Orden) : ORDEN_POR_DEFECTO
  const vista: Vista = uno(q.vista) === 'amplia' ? 'amplia' : 'pares'

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
  if (orden === 'recientes') lista = [...lista].sort((a, b) => (b.publicado ?? '').localeCompare(a.publicado ?? ''))
  if (orden === 'menor-precio') lista = [...lista].sort((a, b) => a.precio - b.precio)
  if (orden === 'mayor-precio') lista = [...lista].sort((a, b) => b.precio - a.precio)
  // «Destacados» respeta al pie de la letra el orden del panel, agotados
  // incluidos: si el equipo puso algo arriba, es a propósito. En los demás
  // órdenes lo que no se puede comprar baja al final.
  if (orden !== 'destacados') lista = [...lista.filter((p) => !p.agotado), ...lista.filter((p) => p.agotado)]

  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={whatsapp} />
      <main className="min-w-0 flex-1 pb-20">
        {/* Encabezado como el de Apple: título enorme a la izquierda y, a la
            derecha, la promesa y la ayuda. */}
        <header className="flex flex-col gap-3 px-[var(--canal)] pt-10 t:pt-14 d:flex-row d:items-end d:justify-between d:pt-20">
          <h1 className="text-[40px] leading-[1.04] font-semibold tracking-titulo t:text-[56px] d:text-[80px] d:tracking-display">
            {categoria ? categoria.nombre : 'Tienda'}
          </h1>
          <div className="d:pb-3 d:text-right">
            <p className="text-[21px] leading-tight font-semibold tracking-tarjeta t:text-[24px]">Envío gratis a todo Chile.</p>
            {whatsapp && (
              <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-[15px] text-tinta-suave underline-offset-4 hover:text-tinta hover:underline">
                ¿Dudas? Habla con nosotros ↗
              </a>
            )}
          </div>
        </header>

        <div className="mt-8 t:mt-12">
          <FilaCategorias categorias={categorias} activa={categoria?.slug ?? null} conTodo />
        </div>

        {/* Hijo directo de <main>: un sticky solo flota dentro de su contenedor,
            y envuelto en un div terminaba apenas empezaba la grilla. */}
        <FiltrosColeccion
          key={`${categoria?.slug}-${busqueda}-${soloDisponibles}-${soloOfertas}-${min}-${max}-${orden}-${vista}`}
          estado={{ cat: categoria?.slug, busqueda, disponibles: soloDisponibles, ofertas: soloOfertas, min, max, orden, vista }}
          resultados={lista.length}
        />

        {lista.length === 0 ? (
          <div className="px-[var(--canal)] py-24 text-center">
            <p className="text-[24px] font-semibold tracking-tarjeta">No encontramos productos con esos filtros.</p>
            <Link href="/tienda" className="tienda-boton mt-6 bg-tinta text-white hover:bg-tinta/85">Ver todo el catálogo</Link>
          </div>
        ) : (
          // «Más por fila»: la card compacta de la portada, 2 en el teléfono,
          // 3 en tablet y en escritorio tantas como quepan, con un mínimo de
          // 200 px y un máximo de seis por fila.
          // «Tarjetas grandes»: exactamente la card de la portada (309 × 450 y
          // 313 × 500 desde 1069 px), una por fila en el teléfono.
          <ul
            className={`grid gap-3 px-[var(--canal)] pt-6 t:gap-5 ${
              vista === 'pares'
                ? 'grid-cols-2 t:grid-cols-3 d:grid-cols-[repeat(auto-fill,minmax(max(200px,calc((100%-100px)/6)),1fr))]'
                : 'grid-cols-1 t:grid-cols-[repeat(auto-fill,309px)] d:grid-cols-[repeat(auto-fill,313px)]'
            }`}
          >
            {lista.map((p) => (
              <li key={p.id} className="min-w-0">
                <CardProducto producto={p} fluida={vista === 'pares'} />
              </li>
            ))}
          </ul>
        )}
      </main>
      <PieTienda
        nombre={configuracion?.nombre_tienda ?? 'Tryvex'}
        email={configuracion?.email_contacto ?? null} emailVisible={configuracion?.email_visible ?? null}
        whatsapp={configuracion?.whatsapp ?? null}
        garantia={configuracion?.garantia_texto ?? null}
        retracto={configuracion?.retracto_texto ?? null}
      />
    </div>
  )
}
