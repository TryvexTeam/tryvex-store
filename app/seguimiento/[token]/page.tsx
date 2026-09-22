import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { leerSeguimientoPorToken } from '@/lib/seguimiento'
import { leerVitrina } from '@/lib/tienda'
import { clp } from '@/lib/formato'
import { LineaEnvio } from '@/components/tienda/linea-envio'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { PieTienda } from '@/components/tienda/pie-tienda'

export const dynamic = 'force-dynamic'

/**
 * Seguimiento sin cuenta: quien tiene el enlace ve su pedido.
 *
 * `noindex` no es decorativo. Un enlace con token que llegue a Google deja de
 * ser privado, así que la página pide expresamente no ser indexada, igual que
 * «Mi cuenta».
 */
export const metadata: Metadata = {
  title: 'Seguimiento de tu pedido',
  robots: { index: false, follow: false },
}

export default async function Seguimiento({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const [datos, { categorias, configuracion }] = await Promise.all([
    leerSeguimientoPorToken(token),
    leerVitrina(),
  ])

  // Un token que no existe y uno mal escrito dan lo mismo: no se confirma ni se
  // desmiente que un pedido exista.
  if (!datos) notFound()

  const { pedido, saludo } = datos

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={null} />

      <main className="mx-auto w-full max-w-[680px] flex-1 px-[22px] py-10 t:py-16">
        <p className="text-[14px] font-semibold tracking-etiqueta text-spark uppercase">Seguimiento</p>
        <h1 className="mt-2 text-[34px] leading-[1.06] font-semibold tracking-titulo t:text-[44px]">
          {saludo ? `Hola, ${saludo}.` : 'Tu pedido.'}
        </h1>
        <p className="mt-2 text-[15px] text-tinta-suave">
          Pedido <span className="cifra font-medium text-tinta">#{pedido.numero}</span> · {clp(pedido.total)}
        </p>

        <section aria-label="Estado del envío" className="mt-8 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
          <LineaEnvio pedido={pedido} />

          {pedido.seguimiento && (
            <a
              href={pedido.seguimiento}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block text-[13px] text-tinta-suave underline-offset-4 hover:underline"
            >
              Ver en la página del courier ↗
            </a>
          )}
        </section>

        <section aria-label="Productos" className="mt-6 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
          <h2 className="text-[20px] font-semibold tracking-tarjeta">Lo que viene en camino</h2>
          <ul className="mt-4 grid gap-3">
            {pedido.items.map((i, n) => (
              <li key={`${pedido.id}-${n}`} className="flex items-center gap-3">
                <span className="relative size-12 shrink-0 overflow-hidden rounded-[12px] bg-papel-alt">
                  {i.imagen && <Image src={i.imagen} alt="" fill sizes="48px" className="object-contain p-1" />}
                </span>
                <span className="min-w-0 flex-1 text-[15px]">
                  {i.cantidad} × {i.nombre}
                </span>
                <span className="cifra text-[15px] font-semibold">{clp(i.subtotal)}</span>
              </li>
            ))}
          </ul>
        </section>

        <p className="mt-6 text-[14px] text-tinta-suave">
          ¿Algo no calza? Escríbenos y lo resolvemos.{' '}
          <Link href="/ayuda" className="font-semibold text-spark hover:underline">
            Ir a ayuda
          </Link>
        </p>
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
