import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { exigirCuenta, leerMisFavoritos, leerMisPedidos, type PedidoCuenta } from '@/lib/cuenta'
import { leerVitrina } from '@/lib/tienda'
import { clp } from '@/lib/formato'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { salir } from './acciones'
import { FormularioPerfil } from './perfil'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { AbrirBolsa } from './abrir-bolsa'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Mi cuenta',
  robots: { index: false, follow: false },
}

const ESTADOS: Record<string, string> = {
  pendiente: 'Esperando pago',
  pagado: 'Pagado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

export default async function MiCuenta() {
  const cuenta = await exigirCuenta()
  const [pedidos, favoritos, { categorias, configuracion }] = await Promise.all([leerMisPedidos(), leerMisFavoritos(), leerVitrina()])
  const saludo = cuenta.nombre?.split(' ')[0] ?? 'Hola'

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={null} />
      <main className="mx-auto w-full max-w-[1204px] flex-1 px-[22px] py-10 t:py-14">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[14px] font-semibold tracking-etiqueta text-spark uppercase">Mi cuenta</p>
            <h1 className="mt-2 text-[40px] leading-[1.04] font-semibold tracking-titulo t:text-[52px]">{saludo === 'Hola' ? 'Hola.' : `Hola, ${saludo}.`}</h1>
            <p className="mt-2 text-[15px] text-tinta-suave">{cuenta.email}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {cuenta.esIntegrante && <Link href="/panel" className="tienda-boton bg-spark text-white hover:bg-spark-hover">Ir al Panel</Link>}
            <form action={salir}><button type="submit" className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel">Cerrar sesión</button></form>
          </div>
        </header>

        {!cuenta.emailConfirmado && (
          <p role="status" className="mt-6 rounded-[14px] bg-papel px-4 py-3 text-[14px] text-ambar ring-1 ring-borde">Confirma tu correo para ver compras hechas antes de crear la cuenta.</p>
        )}

        <div className="mt-10 grid gap-6 d:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-labelledby="compras-titulo" className="rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
            <h2 id="compras-titulo" className="text-[24px] font-semibold tracking-tarjeta">Mis compras</h2>
            {pedidos.length === 0 ? (
              <div className="mt-4 text-[15px] text-tinta-suave">
                <p>Todavía no tienes compras.</p>
                <Link href="/tienda" className="mt-4 inline-block font-semibold text-spark hover:underline">Explorar la tienda →</Link>
              </div>
            ) : (
              <ul className="mt-5 divide-y divide-borde/60">{pedidos.map((p) => <FilaPedido key={p.id} pedido={p} />)}</ul>
            )}
          </section>

          <div className="grid content-start gap-6">
            <section aria-labelledby="bolsa-titulo" className="rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
              <h2 id="bolsa-titulo" className="text-[24px] font-semibold tracking-tarjeta">Mi bolsa</h2>
              <AbrirBolsa />
            </section>
            <section aria-labelledby="datos-titulo" className="rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
              <h2 id="datos-titulo" className="text-[24px] font-semibold tracking-tarjeta">Mis datos</h2>
              <FormularioPerfil nombre={cuenta.nombre ?? ''} telefono={cuenta.telefono ?? ''} />
            </section>
          </div>
        </div>

        <section aria-labelledby="favoritos-titulo" className="mt-6 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
          <h2 id="favoritos-titulo" className="text-[24px] font-semibold tracking-tarjeta">Favoritos</h2>
          {favoritos.length === 0 ? (
            <p className="mt-4 text-[15px] text-tinta-suave">Toca el corazón en un producto para guardarlo aquí.</p>
          ) : (
            <ul className="mt-5 grid grid-cols-2 gap-4 t:grid-cols-3 d:grid-cols-5">
              {favoritos.map((f) => (
                <li key={f.productoId} className="min-w-0">
                  <Link href={f.href} className="group block">
                    <span className="relative block aspect-square overflow-hidden rounded-[18px] bg-papel-alt">
                      {f.imagen && <Image src={f.imagen} alt="" fill sizes="(min-width: 1069px) 200px, 45vw" className="object-contain p-[12%] transition-transform duration-300 group-hover:scale-[1.03]" />}
                    </span>
                    <span className="mt-2 block truncate text-[15px] font-semibold">{f.nombre}</span>
                    <span className="cifra block text-[14px] text-tinta-suave">{clp(f.precio)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
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

function FilaPedido({ pedido }: { pedido: PedidoCuenta }) {
  return (
    <li className="py-4 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[16px] font-semibold">Pedido <span className="cifra">#{pedido.numero}</span></p>
        <p className="cifra text-[16px] font-semibold">{clp(pedido.total)}</p>
      </div>
      <p className="mt-1 text-[14px] text-tinta-suave">
        {fechaCorta.format(new Date(pedido.fecha))} · <span className="font-medium text-tinta">{ESTADOS[pedido.estado] ?? pedido.estado}</span>
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {pedido.items.map((i, n) => (
          <li key={`${pedido.id}-${n}`} className="flex items-center gap-2 rounded-full bg-papel-alt py-1 pr-3 pl-1 text-[13px]">
            <span className="relative size-7 overflow-hidden rounded-full bg-papel">{i.imagen && <Image src={i.imagen} alt="" fill sizes="28px" className="object-contain p-0.5" />}</span>
            {i.cantidad} × {i.nombre}
          </li>
        ))}
      </ul>
      {pedido.seguimiento && <a href={pedido.seguimiento} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-[14px] font-semibold text-spark hover:underline">Seguir envío ↗</a>}
    </li>
  )
}
