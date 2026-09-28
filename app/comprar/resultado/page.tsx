import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { leerSeguimientoPorToken } from '@/lib/seguimiento'
import { conciliarPedido } from '@/lib/conciliar-pago'
import { leerVitrina } from '@/lib/tienda'
import { clp } from '@/lib/formato'
import type { PedidoCuenta } from '@/lib/cuenta'
import { LineaEnvio } from '@/components/tienda/linea-envio'
import { EsperaPago } from '@/components/tienda/espera-pago'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { PieTienda } from '@/components/tienda/pie-tienda'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Tu compra',
  robots: { index: false, follow: false },
}

/**
 * Vuelta desde Mercado Pago: la página de gracias.
 *
 * Qué se muestra lo decide el estado del pedido en nuestra base, no lo que
 * trae la URL: `estado=exito` lo escribe el navegador y se puede editar. Si el
 * pedido sigue pendiente, antes de responder se le pregunta a Mercado Pago por
 * la order (`conciliarPedido`): así el comprador ve su pago confirmado aunque
 * el aviso del webhook no haya llegado, que es justo lo que falló en
 * septiembre de 2026.
 *
 * El pedido se identifica por su token de seguimiento, que viaja en la URL de
 * regreso. Con el número bastaría cambiarlo en la barra para ver compras
 * ajenas; con el token, solo quien compró ve su pedido. Las orders creadas
 * antes de esto solo traen el número, y para ellas se muestra lo mínimo.
 */

type Vista = 'confirmado' | 'confirmando' | 'rechazado' | 'cancelado' | 'desconocido'

const PAGADOS = new Set(['pagado', 'preparando', 'enviado', 'entregado'])
const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface Datos {
  pedido: PedidoCuenta | null
  saludo: string | null
  correo: string | null
  /** Solo número, estado y total: lo que se muestra sin token. */
  resumen: { numero: number; estado: string; total: number } | null
}

function enmascarar(correo: string | null): string | null {
  if (!correo) return null
  const [usuario, dominio] = correo.split('@')
  return dominio ? `${usuario.slice(0, 2)}•••@${dominio}` : null
}

async function leerPorToken(token: string): Promise<Datos | null> {
  let datos = await leerSeguimientoPorToken(token)
  if (!datos) return null
  if (datos.pedido.estado === 'pendiente') {
    const r = await conciliarPedido(datos.pedido.numero)
    if (r === 'pagado') datos = (await leerSeguimientoPorToken(token)) ?? datos
  }
  const { data } = await crearClienteAdministrador()
    .from('pedidos')
    .select('cliente_email')
    .eq('token_seguimiento', token)
    .maybeSingle()
  return { pedido: datos.pedido, saludo: datos.saludo, correo: enmascarar(data?.cliente_email ?? null), resumen: null }
}

async function leerPorNumero(numero: number): Promise<Datos | null> {
  const leer = async () =>
    (
      await crearClienteAdministrador()
        .from('pedidos')
        .select('numero,estado,total_clp')
        .eq('numero', numero)
        .maybeSingle()
    ).data as { numero: number; estado: string; total_clp: number | string } | null
  let p = await leer()
  if (!p) return null
  if (p.estado === 'pendiente' && (await conciliarPedido(numero)) === 'pagado') p = (await leer()) ?? p
  return { pedido: null, saludo: null, correo: null, resumen: { numero: Number(p.numero), estado: p.estado, total: Number(p.total_clp) } }
}

export default async function ResultadoPago({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; pedido?: string; external_reference?: string }>
}) {
  const params = await searchParams
  const sugerido = params.estado ?? ''
  const numero = Number(params.external_reference)

  const [datos, { categorias, configuracion }] = await Promise.all([
    params.pedido && FORMATO_UUID.test(params.pedido)
      ? leerPorToken(params.pedido)
      : Number.isSafeInteger(numero) && numero > 0
        ? leerPorNumero(numero)
        : Promise.resolve(null),
    leerVitrina(),
  ])

  const estado = datos?.pedido?.estado ?? datos?.resumen?.estado ?? null
  const vista: Vista =
    estado && PAGADOS.has(estado)
      ? 'confirmado'
      : estado === 'cancelado'
        ? 'cancelado'
        : sugerido === 'error'
          ? 'rechazado'
          : estado === 'pendiente' || sugerido === 'exito' || sugerido === 'pendiente'
            ? 'confirmando'
            : 'desconocido'

  const numeroPedido = datos?.pedido?.numero ?? datos?.resumen?.numero ?? null
  const total = datos?.pedido?.total ?? datos?.resumen?.total ?? null

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={null} />

      <main className="mx-auto w-full max-w-[980px] flex-1 px-[22px] pt-12 pb-16 t:pt-20">
        <Encabezado vista={vista} saludo={datos?.saludo ?? null} numero={numeroPedido} total={total} correo={datos?.correo ?? null} />

        {vista === 'confirmado' && datos?.pedido && <Detalle pedido={datos.pedido} />}

        {vista === 'confirmado' && !datos?.pedido && (
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link href="/cuenta" className="tienda-boton bg-tinta text-white hover:bg-tinta/85">Ver mis pedidos</Link>
            <Link href="/tienda" className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel">Seguir comprando</Link>
          </div>
        )}

        {vista === 'confirmando' && datos?.pedido && <Productos pedido={datos.pedido} className="mx-auto mt-12 max-w-[560px]" />}

        {(vista === 'rechazado' || vista === 'cancelado' || vista === 'desconocido') && (
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            {vista === 'rechazado' && (
              <Link href="/bolsa" className="tienda-boton bg-tinta text-white hover:bg-tinta/85">Intentar de nuevo</Link>
            )}
            <Link href="/tienda" className={`tienda-boton ${vista === 'rechazado' ? 'text-tinta ring-1 ring-borde ring-inset hover:bg-papel' : 'bg-tinta text-white hover:bg-tinta/85'}`}>
              Volver a la tienda
            </Link>
            <Link href="/contacto" className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel">Escríbenos</Link>
          </div>
        )}
      </main>

      <PieTienda
        nombre={configuracion?.nombre_tienda ?? 'Tryvex'}
        email={configuracion?.email_contacto ?? null}
        emailVisible={configuracion?.email_visible ?? null}
        whatsapp={configuracion?.whatsapp ?? null}
        garantia={configuracion?.garantia_texto ?? null}
        retracto={configuracion?.retracto_texto ?? null}
      />
    </div>
  )
}

function Encabezado({
  vista,
  saludo,
  numero,
  total,
  correo,
}: {
  vista: Vista
  saludo: string | null
  numero: number | null
  total: number | null
  correo: string | null
}) {
  const titulo = {
    confirmado: saludo ? `Gracias, ${saludo}.` : 'Gracias por tu compra.',
    confirmando: 'Estamos confirmando tu pago.',
    rechazado: 'El pago no se completó.',
    cancelado: 'Este pedido fue cancelado.',
    desconocido: 'No encontramos tu pedido.',
  }[vista]

  const bajada = {
    confirmado: 'Tu pago está confirmado y ya estamos preparando tu pedido. Te escribimos apenas salga, con el código para seguirlo.',
    confirmando: 'Mercado Pago nos está enviando la confirmación.',
    rechazado: 'No se te cobró nada. Tu pedido quedó guardado: puedes intentarlo de nuevo con otra tarjeta o medio de pago.',
    cancelado: 'Si pagaste y ves este mensaje, escríbenos con tu número de pedido y lo revisamos contigo.',
    desconocido: 'Si pagaste, revisa tu correo o entra a tu cuenta: ahí está tu pedido. Si no aparece, escríbenos.',
  }[vista]

  return (
    <header className="flex flex-col items-center text-center">
      <Sello vista={vista} />

      {numero && (
        <p className="entra mt-7 text-[14px] font-semibold tracking-etiqueta text-tinta-suave uppercase [animation-delay:120ms]">
          Pedido <span className="cifra">#{numero}</span>
          {total !== null && (
            <>
              {' '}· <span className="cifra">{clp(total)}</span>
            </>
          )}
        </p>
      )}
      <h1 className="entra mt-3 max-w-[16ch] text-[40px] leading-[1.05] font-semibold tracking-titulo [animation-delay:180ms] t:text-[56px]">
        {titulo}
      </h1>
      <p className="entra mt-4 max-w-[46ch] text-[17px] leading-relaxed text-tinta-suave [animation-delay:240ms] t:text-[19px]">{bajada}</p>

      {vista === 'confirmado' && correo && (
        <p className="entra mt-5 inline-flex items-center gap-2 rounded-full bg-papel px-4 py-2 text-[14px] text-tinta-suave ring-1 ring-borde/70 [animation-delay:300ms]">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
          {/* Un solo trozo de texto: así corta como una frase y la dirección no
              queda suelta en una columna aparte en el teléfono. */}
          <span className="text-left">
            Te enviamos la confirmación a <span className="font-medium whitespace-nowrap text-tinta">{correo}</span>
          </span>
        </p>
      )}

      {vista === 'confirmando' && <EsperaPago />}
    </header>
  )
}

/**
 * El sello de arriba. Confirmado: un círculo que se dibuja y un visto que lo
 * sigue, en verde. Confirmando: un anillo que respira. Rechazado o cancelado:
 * un signo sobrio, sin rojo alarmista: no se cobró nada.
 */
function Sello({ vista }: { vista: Vista }) {
  if (vista === 'confirmado') {
    return (
      <span className="sello-ok grid size-[88px] place-items-center rounded-full bg-verde/10 text-verde t:size-[104px]" aria-hidden>
        <svg viewBox="0 0 52 52" className="size-[60%]" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="26" cy="26" r="23" className="sello-ok-circulo" />
          <path d="M15 27.5 22.5 35 37.5 18.5" className="sello-ok-visto" />
        </svg>
      </span>
    )
  }
  if (vista === 'confirmando') {
    return (
      <span className="relative grid size-[88px] place-items-center t:size-[104px]" aria-hidden>
        {/* El halo respira dentro de su propio espacio: uno que crece hacia
            afuera pisaría el titular. */}
        <span className="absolute -inset-2 animate-pulse rounded-full bg-tinta/[0.06] [animation-duration:2s] motion-reduce:hidden" />
        <span className="relative grid size-full place-items-center rounded-full bg-papel ring-1 ring-borde">
          <svg viewBox="0 0 24 24" className="size-9 animate-spin text-tinta [animation-duration:1.4s] motion-reduce:animate-none" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".15" strokeWidth="2.4" />
            <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        </span>
      </span>
    )
  }
  return (
    <span className="entra grid size-[88px] place-items-center rounded-full bg-papel text-tinta-suave ring-1 ring-borde t:size-[104px]" aria-hidden>
      <svg viewBox="0 0 24 24" className="size-9" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7.5v5.5M12 16.5v.01" />
      </svg>
    </span>
  )
}

function Detalle({ pedido }: { pedido: PedidoCuenta }) {
  return (
    <>
      <section aria-label="Estado de tu pedido" className="entra mt-12 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 [animation-delay:360ms] t:p-8">
        <h2 className="text-[22px] font-semibold tracking-tarjeta">Qué sigue</h2>
        <LineaEnvio pedido={pedido} />
      </section>

      <div className="mt-6 grid gap-6 d:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Productos pedido={pedido} className="entra [animation-delay:420ms]" />

        <section aria-label="Tu pedido en todo momento" className="entra grid content-start gap-4 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 [animation-delay:480ms] t:p-7">
          <h2 className="text-[22px] font-semibold tracking-tarjeta">Síguelo cuando quieras</h2>
          <p className="text-[15px] leading-relaxed text-tinta-suave">
            Tu pedido tiene su propia página, sin iniciar sesión. Guárdala: ahí verás cuándo sale y dónde va.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link href={`/seguimiento/${pedido.token}`} className="tienda-boton bg-tinta text-white hover:bg-tinta/85">
              Seguir mi pedido
            </Link>
            <Link href="/tienda" className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt">
              Seguir comprando
            </Link>
          </div>
          <p className="border-t border-borde/60 pt-4 text-[13px] leading-relaxed text-tinta-suave">
            ¿Algo no calza? <Link href="/contacto" className="font-medium text-tinta underline underline-offset-2">Escríbenos</Link> con tu número de pedido.
          </p>
        </section>
      </div>
    </>
  )
}

function Productos({ pedido, className = '' }: { pedido: PedidoCuenta; className?: string }) {
  // El pedido guarda el total con el envío incluido; el envío es la diferencia.
  const envio = Math.max(0, pedido.total - pedido.items.reduce((a, i) => a + i.subtotal, 0))
  return (
    <section aria-label="Productos" className={`rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7 ${className}`}>
      <h2 className="text-[22px] font-semibold tracking-tarjeta">Tu pedido</h2>
      <ul className="mt-5 divide-y divide-borde/60">
        {pedido.items.map((i, n) => (
          <li key={`${pedido.id}-${n}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-[14px] bg-papel-alt">
              {i.imagen && <Image src={i.imagen} alt="" fill sizes="64px" className="object-contain p-1.5" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-medium">{i.nombre}</span>
              <span className="block text-[13px] text-tinta-suave">Cantidad: {i.cantidad}</span>
            </span>
            <span className="cifra text-[15px] font-semibold">{clp(i.subtotal)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-5 grid gap-1.5 border-t border-borde/60 pt-4 text-[15px]">
        <div className="flex justify-between text-tinta-suave">
          <dt>Envío</dt>
          <dd className="cifra">{envio === 0 ? 'Gratis' : clp(envio)}</dd>
        </div>
        <div className="flex items-baseline justify-between text-[17px] font-semibold">
          <dt>Total</dt>
          <dd className="cifra">{clp(pedido.total)}</dd>
        </div>
      </dl>
    </section>
  )
}
