import type { Metadata } from 'next'
import { leerConfiguracion, datosDePago } from '@/lib/configuracion'
import { leerVitrina } from '@/lib/tienda'
import { MAX_UNIDADES_LINEA } from '@/lib/carrito'
import type { LineaPedida } from '@/lib/cotizacion'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import Checkout, { type PerfilCompra } from './formulario'
import { puntoStarken } from '@/lib/sucursales-starken'
import { hitosDeEnvio } from '@/lib/plazo-envio'

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

  const [configuracion, vitrina, sesion] = await Promise.all([
    leerConfiguracion(),
    leerVitrina(),
    crearClienteServidor().then((db) => db.auth.getUser()),
  ])
  const usuario = sesion.data.user
  // Sin compras previas, el nombre sale de la cuenta (Google lo trae completo).
  const nombreCuenta = (usuario?.user_metadata?.full_name ?? usuario?.user_metadata?.nombre ?? usuario?.user_metadata?.name) as string | undefined
  const perfil =
    (await leerPerfil(usuario?.id ?? null)) ??
    (usuario && nombreCuenta
      ? { nombre: nombreCuenta.slice(0, 90), telefono: null, region: null, comuna: null, direccion: null, entrega: null, punto: null }
      : null)
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
          emailCuenta={sesion.data.user?.email ?? null}
          perfil={perfil}
          hitosEnvio={hitosDeEnvio(new Date())}
        />
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

/**
 * Lo que quien tiene sesión dejó guardado en su compra anterior: el checkout
 * viene llenado. Se lee con su propia sesión (RLS: solo su fila).
 */
async function leerPerfil(usuario: string | null): Promise<PerfilCompra | null> {
  if (!usuario) return null
  const { data } = await (await crearClienteServidor())
    .from('clientes_tienda')
    .select('nombre,telefono,region,comuna,direccion,sucursal,entrega_preferida')
    .eq('auth_user_id', usuario)
    .maybeSingle()
  if (!data) return null
  const entrega = data.entrega_preferida
  return {
    nombre: data.nombre ?? null,
    telefono: data.telefono ?? null,
    region: data.region ?? null,
    comuna: data.comuna ?? null,
    direccion: data.direccion ?? null,
    entrega: entrega === 'envio' || entrega === 'sucursal' || entrega === 'retiro' ? entrega : null,
    punto: data.sucursal ? puntoStarken(Number(data.sucursal)) : null,
  }
}
