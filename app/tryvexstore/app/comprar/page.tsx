import type { Metadata } from 'next'
import { leerConfiguracion, datosDePago } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { MAX_UNIDADES_LINEA } from '@/lib/carrito'
import type { LineaPedida } from '@/lib/cotizacion'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import Checkout from './formulario'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Finalizar compra',
  robots: { index: false },
}

/** Los parámetros de URL son entrada no confiable: se validan antes de usarlos. */
const FORMATO_SKU = /^[A-Z0-9][A-Z0-9-]{1,39}$/i
const FORMATO_UUID = /^[0-9a-f-]{36}$/i
const uno = (v: string | string[] | undefined) => (typeof v === 'string' ? v : undefined)

/**
 * Checkout.
 *
 * Sin parámetros cobra la bolsa. Con `?sku=` es «Comprar ahora» desde una
 * ficha: una sola línea que no toca la bolsa. En ambos casos el precio lo
 * cotiza el servidor (`lib/cotizacion.ts`).
 */
export default async function Comprar(props: PageProps<'/comprar'>) {
  const q = await props.searchParams
  const sku = uno(q.sku)
  const v = uno(q.v)
  const n = Number(uno(q.n) ?? 1)

  const lineaDirecta: LineaPedida | null =
    sku && FORMATO_SKU.test(sku)
      ? {
          sku,
          varianteId: v && FORMATO_UUID.test(v) ? v : null,
          cantidad: Number.isInteger(n) && n >= 1 && n <= MAX_UNIDADES_LINEA ? n : 1,
        }
      : null

  const [configuracion, vitrina] = await Promise.all([leerConfiguracion(), leerVitrina()])
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(vitrina.categorias, '/')} ayuda={whatsapp} />
      {/* Altura mínima: el checkout lee la bolsa en el navegador y crecía después de
          pintar, empujando el pie (CLS 0,37 medido en teléfono). */}
      <main className="mx-auto min-h-[100svh] w-full max-w-[1144px] min-w-0 flex-1 px-[22px] pt-8 pb-20 t:pt-12">
        <h1 className="mb-8 text-[32px] leading-tight font-semibold tracking-seccion t:text-[40px]">Finaliza tu compra.</h1>
        <Checkout
          lineaDirecta={lineaDirecta}
          envio={{
            tarifa: configuracion?.envio_tarifa_clp ?? 0,
            gratisDesde: configuracion?.envio_gratis_desde_clp ?? null,
            plazo: configuracion?.envio_plazo_texto ?? null,
            retiro: Boolean(configuracion?.retiro_habilitado && configuracion.retiro_direccion),
            retiroDireccion: configuracion?.retiro_direccion ?? null,
          }}
          datosPago={datosDePago(configuracion)}
        />
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
