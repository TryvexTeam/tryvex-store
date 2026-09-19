import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
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
  colores: [],
  href: '/tienda',
}))

const categorias: CategoriaTienda[] = Array.from({ length: 8 }, (_, indice) => ({
  id: `escala-categoria-${indice + 1}`,
  nombre: `Categoría de prueba ${indice + 1}`,
  slug: `escala-categoria-${indice + 1}`,
  descripcion: null,
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
        <ListaProductos productos={productos} />
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
