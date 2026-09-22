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

      <main className="mx-auto w-full max-w-[1204px] flex-1 px-[22px] py-10 t:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold tracking-etiqueta text-spark uppercase">Seguimiento</p>
            <h1 className="mt-2 text-[36px] leading-[1.04] font-semibold tracking-titulo t:text-[52px]">
              {saludo ? `Hola, ${saludo}.` : 'Tu pedido.'}
            </h1>
          </div>
          <p className="text-[15px] text-tinta-suave">
            Pedido <span className="cifra font-medium text-tinta">#{pedido.numero}</span> ·{' '}
            <span className="cifra font-medium text-tinta">{clp(pedido.total)}</span>
          </p>
        </header>

        {/* El recorrido va a todo el ancho: es lo que la persona vino a ver, y en
            horizontal necesita espacio para que los hitos no se apelotonen. */}
        <section aria-label="Estado del envío" className="mt-8 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-8">
          <LineaEnvio pedido={pedido} />

          {pedido.seguimiento && (
            <a
              href={pedido.seguimiento}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-block text-[13px] text-tinta-suave underline-offset-4 hover:underline"
            >
              Ver en la página del courier ↗
            </a>
          )}
        </section>

        <div className="mt-6 grid gap-6 d:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-label="Productos" className="rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
            {/* El título sigue al estado real: anunciar «viene en camino» un pedido
                que todavía no se paga es prometer algo que no está ocurriendo. */}
            <h2 className="text-[22px] font-semibold tracking-tarjeta">
              {pedido.estado === 'enviado'
                ? 'Lo que viene en camino'
                : pedido.estado === 'entregado'
                  ? 'Lo que recibiste'
                  : 'Tu pedido'}
            </h2>
            <ul className="mt-5 divide-y divide-borde/60">
              {pedido.items.map((i, n) => (
                <li key={`${pedido.id}-${n}`} className="flex items-center gap-4 py-3 first:pt-0 last:pb-0">
                  <span className="relative size-14 shrink-0 overflow-hidden rounded-[14px] bg-papel-alt">
                    {i.imagen && <Image src={i.imagen} alt="" fill sizes="56px" className="object-contain p-1.5" />}
                  </span>
                  <span className="min-w-0 flex-1 text-[15px]">
                    {i.cantidad} × {i.nombre}
                  </span>
                  <span className="cifra text-[15px] font-semibold">{clp(i.subtotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 flex items-baseline justify-between border-t border-borde/60 pt-4 text-[16px] font-semibold">
              <span>Total</span>
              <span className="cifra">{clp(pedido.total)}</span>
            </p>
          </section>

          <section aria-label="Ayuda" className="grid content-start gap-4 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
            <h2 className="text-[22px] font-semibold tracking-tarjeta">¿Necesitas ayuda?</h2>
            <p className="text-[15px] leading-relaxed text-tinta-suave">
              Si algo no calza con tu pedido, escríbenos y lo resolvemos.
            </p>
            <div className="flex flex-wrap gap-2">
              <Link href="/ayuda" className="tienda-boton bg-spark text-white hover:bg-spark-hover">
                Centro de ayuda
              </Link>
              <Link href="/contacto" className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt">
                Contacto
              </Link>
            </div>
            <p className="mt-1 text-[13px] leading-relaxed text-tinta-suave">
              Guarda este enlace: te deja ver el estado de tu pedido sin tener que iniciar sesión.
            </p>
          </section>
        </div>
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
