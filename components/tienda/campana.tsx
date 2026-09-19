import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { CAMPANA, ESCENAS_BANNER, escenasConPiezas, type PiezaEscena } from '@/lib/campana'
import { leerPromosHeroe, type CategoriaTienda, type ProductoTienda } from '@/lib/tienda'
import { Carrusel } from './carrusel'
import { CardProducto } from './card-producto'
import { HeroeEscenario, type ProductoHeroe } from './heroe-escenario'

/** Puente servidor→cliente: solo expone los datos de vitrina necesarios. */
export async function HeroeCampana({ productos, piezas }: { productos: ReadonlyArray<ProductoTienda>; piezas?: Map<string, PiezaEscena> }) {
  const datos: ProductoHeroe[] = productos.map(({ slug, href, precio, agotado }) => ({ slug, href, precio, agotado }))
  const promo = await leerPromosHeroe()
  return <HeroeEscenario escenas={escenasConPiezas(ESCENAS_BANNER, piezas)} productos={datos} promo={promo} />
}

const CONFIANZA = [
  { texto: 'Envío a todo Chile', trazo: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z' },
  { texto: 'Garantía de 6 meses', trazo: 'M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3ZM9 12l2 2 4-4' },
  { texto: '10 días para arrepentirte', trazo: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v4h4' },
  { texto: 'Pago seguro', trazo: 'M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5z' },
]

export function FranjaConfianza() {
  return (
    <section aria-label="Por qué comprar aquí" className="border-b border-borde/60 bg-papel">
      <ul className="mx-auto grid max-w-[1204px] grid-cols-2 gap-x-4 gap-y-3 px-[22px] py-5 d:grid-cols-4">
        {CONFIANZA.map((item) => (
          <li key={item.texto} className="flex items-center justify-start gap-2.5 text-[13px] font-medium text-tinta-suave t:text-[14px] d:justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-spark" aria-hidden><path d={item.trazo} /></svg>
            {item.texto}
          </li>
        ))}
      </ul>
    </section>
  )
}

export function CategoriasDestacadas({ categorias }: { categorias: CategoriaTienda[] }) {
  if (categorias.length === 0) return null
  const unica = categorias.length === 1

  return (
    <section aria-labelledby="categorias-titulo" className="mx-auto w-full max-w-[1204px] px-[22px] pt-10 t:pt-16">
      <h2 id="categorias-titulo" className="revela text-[28px] leading-[1.1] font-semibold tracking-seccion t:text-[36px]">Explora por categoría.</h2>
      <p className="mt-2 text-[16px] text-tinta-suave t:text-[17px]">El catálogo se organiza para que encuentre más rápido lo que necesita.</p>
      {/* Una sola categoría: tile ancha (2/3) + «Toda la tienda» (1/3), sin columnas vacías. */}
      <div className={`mt-6 grid gap-3 ${unica ? 'grid-cols-1 t:grid-cols-3' : 'grid-cols-2 t:grid-cols-3 d:grid-cols-4'}`}>
        {categorias.map((categoria, indice) => {
          const foto = categoria.productos.find((producto) => producto.imagen)?.imagen ?? null
          return (
            <Link key={categoria.id} href={`/tienda?cat=${encodeURIComponent(categoria.slug)}`} className={`revela group relative min-h-[172px] overflow-hidden rounded-[18px] bg-papel p-5 ring-1 ring-borde/70 hover:ring-spark t:min-h-[220px] ${unica ? 't:col-span-2' : ''}`} style={{ '--i': `${indice * 4}%` } as CSSProperties}>
              {foto && <Image src={foto} alt="" fill sizes={unica ? '(min-width: 1069px) 50vw, 100vw' : '(min-width: 1069px) 25vw, (min-width: 735px) 33vw, 50vw'} className="object-contain object-right-bottom p-3 opacity-80 transition-transform duration-200 group-hover:scale-[1.03]" />}
              <span className="relative z-10 block max-w-[12ch] text-[19px] leading-tight font-semibold tracking-cuerpo text-tinta t:text-[23px]">{categoria.nombre}</span>
              <span className="relative z-10 mt-2 block text-[13px] text-tinta-suave">{categoria.productos.length} {categoria.productos.length === 1 ? 'producto' : 'productos'}</span>
            </Link>
          )
        })}
        {unica && <Link href="/tienda" className="revela flex min-h-[132px] flex-col justify-between rounded-[18px] bg-tinta p-5 text-white hover:bg-tinta/90" style={{ '--i': `${categorias.length * 4}%` } as CSSProperties}><span className="text-[18px] font-semibold tracking-cuerpo">Toda la tienda</span><span className="text-[14px] text-white/70">Ver catálogo completo →</span></Link>}
      </div>
    </section>
  )
}

export function FranjaCategoria({ categoria }: { categoria: CategoriaTienda }) {
  if (categoria.productos.length < 2) return null
  return (
    <section aria-labelledby={`categoria-${categoria.slug}`} className="pt-10 t:pt-16">
      <div className="mx-auto flex w-full max-w-[1204px] items-end justify-between gap-4 px-[22px]">
        <h2 id={`categoria-${categoria.slug}`} className="revela text-[28px] leading-[1.1] font-semibold tracking-seccion t:text-[36px]">{categoria.nombre}.</h2>
        <Link href={`/tienda?cat=${encodeURIComponent(categoria.slug)}`} className="shrink-0 text-[14px] font-medium text-spark hover:underline">Ver categoría →</Link>
      </div>
      <div className="mt-3 px-[var(--canal)]"><Carrusel etiqueta={categoria.nombre}>{categoria.productos.map((producto, indice) => <div key={producto.id} className="revela-escala" style={{ '--i': `${indice * 4}%` } as CSSProperties}><CardProducto producto={producto} transicion={false} /></div>)}</Carrusel></div>
    </section>
  )
}

export function CierreCampana({ producto }: { producto: ProductoTienda | null }) {
  const { titulo, bajada } = CAMPANA.cierre
  if (!producto) return null
  return (
    <section aria-labelledby="cierre-titulo" className="cierre-revela relative isolate mx-[var(--canal)] mt-16 overflow-hidden rounded-[28px] bg-black px-7 py-16 text-center text-white t:py-20">
      <span aria-hidden className="heroe-luz heroe-luz-cierre pointer-events-none absolute -z-10" />
      <h2 id="cierre-titulo" className="mx-auto max-w-[16ch] text-[36px] leading-[1.04] font-semibold tracking-seccion t:text-[48px] d:text-[56px]">{titulo}</h2>
      <p className="mx-auto mt-4 max-w-[40ch] text-[17px] text-white/70 t:text-[19px]">{bajada}</p>
      <Link href="/tienda" className="tienda-boton mt-8 bg-white text-black hover:bg-white/85">Ver todo el catálogo</Link>
    </section>
  )
}
