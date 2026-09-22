import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { exigirCuenta, leerMisFavoritos, leerMisPedidos } from '@/lib/cuenta'
import { leerVitrina } from '@/lib/tienda'
import { clp } from '@/lib/formato'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { salir } from './acciones'
import { FormularioPerfil } from './perfil'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { AbrirBolsa } from './abrir-bolsa'
import { PedidoEnCuenta, indiceDestacado, enCurso } from '@/components/tienda/pedido-cuenta'
import { LineaEnvio } from '@/components/tienda/linea-envio'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Mi cuenta',
  robots: { index: false, follow: false },
}

export default async function MiCuenta() {
  const cuenta = await exigirCuenta()
  const [pedidos, favoritos, { categorias, configuracion }] = await Promise.all([leerMisPedidos(), leerMisFavoritos(), leerVitrina()])
  const saludo = cuenta.nombre?.split(' ')[0] ?? 'Hola'
  const destacado = indiceDestacado(pedidos)
  const pedidoActivo = destacado === -1 ? null : pedidos[destacado]
  const cantidadEnCurso = pedidos.filter((p) => enCurso(p.estado)).length
  const entregados = pedidos.filter((p) => p.estado === 'entregado').length
  // Lo cancelado no se compró: sumarlo inflaría la cifra.
  const totalComprado = pedidos.filter((p) => p.estado !== 'cancelado').reduce((a, p) => a + p.total, 0)

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

        {/* Las cifras primero: quien abre su cuenta quiere saber en qué está
            antes de ponerse a leer el historial. */}
        {pedidos.length > 0 && (
          <dl className="mt-8 grid grid-cols-2 gap-3 t:grid-cols-4">
            {[
              { rotulo: 'Pedidos', valor: String(pedidos.length) },
              { rotulo: 'En curso', valor: String(cantidadEnCurso), destacar: cantidadEnCurso > 0 },
              { rotulo: 'Entregados', valor: String(entregados) },
              { rotulo: 'Total comprado', valor: clp(totalComprado) },
            ].map((m) => (
              <div key={m.rotulo} className="rounded-[18px] bg-papel p-4 ring-1 ring-borde/60">
                <dt className="text-[13px] text-tinta-suave">{m.rotulo}</dt>
                <dd className={`cifra mt-1 text-[24px] leading-none font-semibold ${m.destacar ? 'text-spark' : ''}`}>
                  {m.valor}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {/* El pedido en curso, arriba y desplegado: es a lo que se entra. */}
        {pedidoActivo && (
          <section aria-label="Pedido en curso" className="mt-6 rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-[20px] font-semibold tracking-tarjeta">Tu pedido en curso</h2>
              <Link
                href={`/seguimiento/${pedidoActivo.token}`}
                className="text-[14px] font-semibold text-spark hover:underline"
              >
                Ver seguimiento completo →
              </Link>
            </div>
            <div className="mt-5">
              <LineaEnvio pedido={pedidoActivo} />
            </div>
          </section>
        )}

        <div className="mt-10 grid gap-6 d:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section aria-labelledby="compras-titulo" className="rounded-[24px] bg-papel p-5 ring-1 ring-borde/60 t:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="compras-titulo" className="text-[24px] font-semibold tracking-tarjeta">Mis compras</h2>
              {pedidos.length > 0 && (
                <p className="text-[13px] text-tinta-suave">Toca un pedido para ver su detalle</p>
              )}
            </div>

            {pedidos.length === 0 ? (
              <div className="mt-4 text-[15px] text-tinta-suave">
                <p>Todavía no tienes compras.</p>
                <Link href="/tienda" className="mt-4 inline-block font-semibold text-spark hover:underline">Explorar la tienda →</Link>
              </div>
            ) : (
              <ul className="mt-5 grid gap-3">
                {pedidos.map((p) => (
                  <li key={p.id}>
                    {/* Todos plegados: el pedido en curso ya está desplegado
                        arriba, y repetirlo abierto obligaría a bajar dos veces
                        por lo mismo. Con uno solo, se abre porque no hay nada
                        más que recorrer. */}
                    <PedidoEnCuenta pedido={p} abierto={pedidos.length === 1} />
                  </li>
                ))}
              </ul>
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
