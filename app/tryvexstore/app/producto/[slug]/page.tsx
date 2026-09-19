import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { leerVitrina } from '@/lib/tienda'
import { leerFicha, relacionados } from '@/lib/ficha'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { Carrusel } from '@/components/tienda/carrusel'
import { CardProducto } from '@/components/tienda/card-producto'
import { Ficha } from '@/components/tienda/ficha'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'

/**
 * Ficha de producto.
 *
 * Se genera sola para cada producto publicado: la URL es su slug. Si se
 * archiva, la ficha responde 404 en vez de vender algo que ya no está.
 */
// Por petición: la ficha muestra stock y precio vivos, y así no depende del
// worker de rutas estáticas, que se caía sin dejar mensaje.
export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/producto/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params
  const ficha = await leerFicha(slug)
  if (!ficha) return { title: 'Producto no disponible' }
  return {
    title: ficha.nombre,
    description: ficha.descripcion ?? `${ficha.nombre} en Tryvex Store.`,
    openGraph: { title: ficha.nombre, images: ficha.galeria.slice(0, 1) },
  }
}

export default async function PaginaProducto(props: PageProps<'/producto/[slug]'>) {
  const { slug } = await props.params
  const [ficha, vitrina] = await Promise.all([leerFicha(slug), leerVitrina()])
  if (!ficha) notFound()

  const c = vitrina.configuracion
  const whatsapp = c?.whatsapp ? `https://wa.me/${c.whatsapp.replace(/\D/g, '')}` : null
  const otros = relacionados(ficha, vitrina.productos)

  const envio = {
    plazo: c?.envio_plazo_texto ?? null,
    tarifa: c?.envio_tarifa_clp ?? 0,
    gratisDesde: c?.envio_gratis_desde_clp ?? null,
    politica: c?.envio_politica_texto ?? 'El costo y el plazo del envío se muestran antes de pagar.',
  }

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel">
      <FranjaAnuncio configuracion={c} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp} />

      <main className="min-w-0 flex-1">
        <Ficha
          ficha={ficha}
          envio={envio}
          garantia={c?.garantia_texto ?? 'Garantía legal de 6 meses desde la recepción (Ley 21.398).'}
          retracto={c?.retracto_texto ?? 'Tienes 10 días desde que lo recibes para arrepentirte.'}
          whatsapp={whatsapp}
        />

        {otros.length > 0 && (
          <section aria-labelledby="relacionados-titulo" className="bg-papel-alt pt-12 pb-6 t:pt-16">
            <h2 id="relacionados-titulo" className="mb-1 px-[var(--canal)] text-[24px] font-semibold tracking-tarjeta d:text-[28px]">
              <span className="text-tinta">Completa tu compra</span>
            </h2>
            <Carrusel etiqueta="Productos relacionados">
              {otros.map((p) => (
                <CardProducto key={p.id} producto={p} />
              ))}
            </Carrusel>
          </section>
        )}
      </main>
      <PieTienda
        nombre={c?.nombre_tienda ?? 'Tryvex'}
        email={c?.email_contacto ?? null}
        whatsapp={c?.whatsapp ?? null}
        garantia={c?.garantia_texto ?? null}
        retracto={c?.retracto_texto ?? null}
      />
    </div>
  )
}
