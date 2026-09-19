import { unstable_cache } from 'next/cache'
import { leerVitrina } from '@/lib/tienda'
import { leerPiezas, type PiezaLanding } from '@/lib/secciones'
import type { ConfiguracionTienda } from '@/lib/configuracion'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { CardsBeneficio, type Beneficio } from '@/components/tienda/beneficios'
import { CierreCampana, FranjaConfianza, HeroeCampana } from '@/components/tienda/campana'
import { BannerDoble, BannerAncho, MosaicoCampana } from '@/components/tienda/editorial'
import { ListaProductos } from '@/components/tienda/lista-productos'
import { FilaCategorias } from '@/components/tienda/fila-categorias'
import { GaleriaGuiada, ProductoFoco, TituloEco } from '@/components/tienda/escenas-scroll'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'

/** Portada de catálogo: categorías y productos se alimentan exclusivamente de la vitrina. */

/**
 * La portada se arma al recibir la visita, no al construir el proyecto.
 *
 * Con `revalidate` a secas, Next la prerenderizaba durante el build, y eso
 * obligaba a tener las credenciales de la base de datos para *compilar*, no
 * solo para *funcionar*: el despliegue fallaba antes de existir. Construir y
 * funcionar son dos momentos distintos y no tienen por qué compartir secretos.
 *
 * El caché no se pierde, se muda: `unstable_cache` guarda el resultado de la
 * consulta los mismos 300 segundos, así que la base se consulta igual de poco.
 */
export const dynamic = 'force-dynamic'

/**
 * El caché guarda el valor serializado a JSON, y un `Map` sobrevive a ese viaje
 * como un objeto vacío: al recuperarlo se pierde `.get()`. Por eso las piezas
 * viajan como lista de pares y el `Map` se rearma de este lado.
 */
const datosDePortada = unstable_cache(
  async () => {
    const [vitrina, piezas] = await Promise.all([leerVitrina(), leerPiezas()])
    return { vitrina, piezas: [...piezas] as [string, PiezaLanding][] }
  },
  ['portada'],
  { revalidate: 300 },
)

const LEGAL_GARANTIA = 'Garantía legal de 6 meses desde la recepción (Ley 21.398).'
const LEGAL_RETRACTO = 'Derecho a retracto de 10 días en compras a distancia; reembolso antes de 45 días.'

export default async function Inicio() {
  // Las franjas editables de la portada. Si la tabla esta vacia, cada franja
  // dibuja lo que trae el codigo: la portada nunca depende de que exista la fila.
  const { vitrina, piezas: paresDePiezas } = await datosDePortada()
  const { productos, categorias, destacado, configuracion } = vitrina
  const piezas = new Map(paresDePiezas)
  const whatsapp = configuracion?.whatsapp ? `https://wa.me/${configuracion.whatsapp.replace(/\D/g, '')}` : null
  const nombre = configuracion?.nombre_tienda ?? 'Tryvex'

  return (
    <div className="tienda flex min-h-dvh w-full min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias)} ayuda={whatsapp} sobreHeroe />
      <main className="min-w-0 flex-1">
        <HeroeCampana productos={productos} piezas={piezas} />
        <FranjaConfianza />
        {/* Navegador de familias: acceso por reconocimiento visual antes del
            catalogo, como la fila de la tienda de Apple. Sustituye al bloque
            <CategoriasDestacadas />, que cumplia la misma funcion ocupando
            381 px con una sola foto. */}
        <FilaCategorias categorias={categorias} activa={null} />
        {/* El catálogo va aquí, no en la posición 7. Medido el 2026-09-17: la
            tienda de Apple pone producto comprable apenas pasadas las familias
            y Dune Dragon apenas pasado el hero; nuestra home hacía scrollear
            ~5.000 px de narrativa antes del primer producto. Primero qué se
            vende, después por qué. */}
        <ListaProductos productos={productos} />
        <BannerDoble piezas={piezas} />
        <ProductoFoco producto={destacado} />
        {/* ConfianzaEnMovimiento sale de la home: sus cuatro datos (garantia,
            envio, retracto, pago) ya los muestra <FranjaConfianza /> arriba en
            62 px. Repetirlos costaba 767 px de scroll. El componente queda para
            reutilizarse donde no exista la franja. */}
        <GaleriaGuiada />
        <TituloEco />
        <BannerAncho piezas={piezas} />
        <MosaicoCampana piezas={piezas} />
        <section id="beneficios" aria-labelledby="beneficios-titulo" className="mx-auto w-full max-w-[1204px] px-[22px] pt-10 t:pt-16">
          <h2 id="beneficios-titulo" className="revela text-[28px] leading-[1.1] font-semibold tracking-seccion t:text-[36px]">Tryvex hace la diferencia.</h2>
          <p className="mt-2 text-[16px] text-tinta-suave t:text-[17px]">Comprar aquí tiene sus ventajas.</p>
          <div className="mt-6"><CardsBeneficio beneficios={beneficiosDe(configuracion)} /></div>
        </section>
        <CierreCampana producto={destacado} />
      </main>
      <PieTienda nombre={nombre} email={configuracion?.email_contacto ?? null} whatsapp={configuracion?.whatsapp ?? null} garantia={configuracion?.garantia_texto ?? null} retracto={configuracion?.retracto_texto ?? null} />
    </div>
  )
}

export function beneficiosDe(c: ConfiguracionTienda | null): Beneficio[] {
  const tarifa = c?.envio_tarifa_clp ?? 0
  const gratis = c?.envio_gratis_desde_clp ?? null
  const plazo = c?.envio_plazo_texto ?? null
  const lista: Beneficio[] = [
    {
      id: 'envio', destacado: gratis ? `Envío gratis desde $${gratis.toLocaleString('es-CL')}.` : 'Envío a todo Chile.', resto: plazo ? `${plazo} en recibirlo.` : 'Sabes el costo antes de pagar.', tono: 'verde', icono: 'envio',
      detalle: { titulo: 'Envío', parrafos: [c?.envio_politica_texto ?? 'El costo y el plazo del envío se muestran antes de pagar.'], filas: [['Tarifa', tarifa > 0 ? `$${tarifa.toLocaleString('es-CL')}` : 'Sin costo'], ...(gratis ? ([['Gratis desde', `$${gratis.toLocaleString('es-CL')}`]] as [string, string][]) : []), ...(plazo ? ([['Plazo', plazo]] as [string, string][]) : [])] },
    },
    { id: 'garantia', destacado: 'Garantía de 6 meses.', resto: 'Reparar, cambiar o devolver: tú eliges.', tono: 'spark', icono: 'garantia', detalle: { titulo: 'Garantía', parrafos: [c?.garantia_texto ?? LEGAL_GARANTIA] } },
    { id: 'retracto', destacado: '10 días para arrepentirte.', resto: 'Sin dar explicaciones.', tono: 'ambar', icono: 'retracto', detalle: { titulo: 'Derecho a retracto', parrafos: [c?.retracto_texto ?? LEGAL_RETRACTO] } },
    { id: 'pago', destacado: 'Paga como prefieras.', resto: 'Transferencia o Mercado Pago.', tono: 'azul', icono: 'pago', detalle: { titulo: 'Formas de pago', parrafos: ['Al confirmar el pedido reservamos tus unidades y te mostramos los datos para pagar.'] } },
  ]
  if (c?.retiro_habilitado && c.retiro_direccion) lista.push({ id: 'retiro', destacado: 'Retira sin costo.', resto: 'Coordina el día por WhatsApp.', tono: 'verde', icono: 'retiro', detalle: { titulo: 'Retiro en persona', parrafos: [c.retiro_direccion] } })
  return lista
}
