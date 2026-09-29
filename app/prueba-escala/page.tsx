import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { CardProducto } from '@/components/tienda/card-producto'
import type { CategoriaTienda, ProductoTienda } from '@/lib/tienda'
import { beneficiosDe } from '@/app/page'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { CardsBeneficio } from '@/components/tienda/beneficios'
import { CategoriasDestacadas, CierreCampana, FranjaConfianza, HeroeCampana } from '@/components/tienda/campana'
import { BannerDoble, BannerAncho, MosaicoCampana } from '@/components/tienda/editorial'
import { ListaProductos } from '@/components/tienda/lista-productos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'

export const metadata: Metadata = {
  title: 'Prueba de escala',
  robots: { index: false },
}

/** Muestra de dos tonos, como un diseño subido desde el panel. */
const dosTonos = (a: string, b: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><path d="M0 0h10L0 10z" fill="${a}"/><path d="M10 0v10H0z" fill="${b}"/></svg>`)}`

/** Colores de prueba para los primeros productos: planos, de dos tonos y con foto propia. */
const coloresDePrueba = (indice: number): ProductoTienda['colores'] =>
  indice > 5
    ? []
    : [
        { id: `c-${indice}-1`, nombre: 'Medianoche', hex: '#1d2733', muestra: null, imagen: '/tienda/pods-pro.webp' },
        { id: `c-${indice}-2`, nombre: 'Blanco estelar', hex: '#e8e1d5', muestra: null, imagen: null },
        { id: `c-${indice}-3`, nombre: 'Azul tormenta', hex: null, muestra: dosTonos('#4f6b7f', '#aeb9c2'), imagen: null },
        { id: `c-${indice}-4`, nombre: 'Lila', hex: '#c9c4dd', muestra: null, imagen: null },
        { id: `c-${indice}-5`, nombre: 'Naranja', hex: '#f0a283', muestra: null, imagen: null },
      ].slice(0, indice % 2 === 0 ? 5 : 2)

const productos: ProductoTienda[] = Array.from({ length: 40 }, (_, indice) => ({
  id: `escala-producto-${indice + 1}`,
  sku: `ESCALA-${String(indice + 1).padStart(3, '0')}`,
  slug: `escala-producto-${indice + 1}`,
  nombre: `Producto de prueba ${indice + 1}`,
  frase: null,
  precio: 10000 + indice * 1000,
  precioAntes: null,
  imagen: '/tienda/pods-pro.webp',
  etiqueta: indice < 4 ? 'Nuevo' : null,
  agotado: false,
  categoriaId: `escala-categoria-${Math.floor(indice / 5) + 1}`,
  colores: coloresDePrueba(indice),
  href: '/tienda',
}))

const categorias: CategoriaTienda[] = Array.from({ length: 8 }, (_, indice) => ({
  id: `escala-categoria-${indice + 1}`,
  nombre: `Categoría de prueba ${indice + 1}`,
  slug: `escala-categoria-${indice + 1}`,
  descripcion: null,
  imagen: null,
  productos: productos.filter((producto) => producto.categoriaId === `escala-categoria-${indice + 1}`),
}))

/** Ruta permanente de prueba visual: no lee ni escribe la base de datos. */
export default function PruebaEscala() {
  // Banco de pruebas de la escala visual: 40 productos y 8 categorias FALSOS.
  // Servirla en produccion mostraria catalogo inventado a clientes reales, asi
  // que fuera de desarrollo esta ruta no existe.
  if (process.env.NODE_ENV === 'production') notFound()

  const destacado = productos[0]
  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={null} />
      <Cabecera destinos={destinosMenu(categorias)} ayuda={null} />
      <main className="min-w-0 flex-1">
        <HeroeCampana productos={productos} />
        <FranjaConfianza />
        <CategoriasDestacadas categorias={categorias} />
        <BannerDoble />
        <ListaProductos productos={productos.slice(0, 8)} total={productos.length} />
        {/* Grilla de a dos, como en /tienda: para revisar las cards angostas. */}
        <ul id="grilla-pares" className="grid grid-cols-2 gap-3 px-[var(--canal)] pt-10 t:gap-5">
          {productos.slice(0, 6).map((p) => (
            <li key={p.id} className="min-w-0"><CardProducto producto={p} fluida transicion={false} /></li>
          ))}
        </ul>
        <BannerAncho />
        <MosaicoCampana />
        <section id="beneficios" aria-labelledby="beneficios-titulo" className="mx-auto w-full max-w-[1204px] px-[22px] pt-10 t:pt-16">
          <h2 id="beneficios-titulo" className="revela text-[28px] leading-[1.1] font-semibold tracking-[-0.025em] t:text-[36px]">Tryvex hace la diferencia.</h2>
          <p className="mt-2 text-[16px] text-tinta-suave t:text-[17px]">Comprar aquí tiene sus ventajas.</p>
          <div className="mt-6"><CardsBeneficio beneficios={beneficiosDe(null)} /></div>
        </section>
        <CierreCampana producto={destacado} />
      </main>
      <PieTienda nombre="Tryvex" email={null} whatsapp={null} garantia={null} retracto={null} />
    </div>
  )
}
