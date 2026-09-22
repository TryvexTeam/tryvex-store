import Image from 'next/image'
import Link from 'next/link'
import type { PedidoCuenta } from '@/lib/cuenta'
import { clp } from '@/lib/formato'
import { enlaceDeSeguimiento } from '@/lib/couriers'
import { LineaEnvio } from '@/components/tienda/linea-envio'
import { BotonCourier } from '@/components/tienda/boton-courier'
import { BotonRepetir } from '@/components/tienda/boton-repetir'

/**
 * Un pedido en «Mis compras», plegado por defecto.
 *
 * El historial se lee de arriba abajo: quien entra quiere ubicar un pedido, no
 * leer seis recorridos completos. Cada fila muestra lo que identifica la compra
 * y el detalle se abre a pedido.
 *
 * Se usa `<details>` nativo: funciona sin JavaScript, el teclado lo abre y
 * cierra solo, y el lector de pantalla anuncia si está expandido. Un acordeón
 * hecho a mano habría que dotarlo de todo eso.
 */

const ESTADOS: Record<string, { texto: string; clase: string }> = {
  pendiente: { texto: 'Esperando pago', clase: 'bg-ambar/10 text-ambar ring-ambar/25' },
  pagado: { texto: 'Pagado', clase: 'bg-spark/10 text-spark ring-spark/25' },
  preparando: { texto: 'Preparando', clase: 'bg-spark/10 text-spark ring-spark/25' },
  enviado: { texto: 'En camino', clase: 'bg-spark/10 text-spark ring-spark/25' },
  entregado: { texto: 'Entregado', clase: 'bg-black/[0.04] text-tinta ring-borde' },
  cancelado: { texto: 'Cancelado', clase: 'bg-black/[0.04] text-tinta-suave ring-borde' },
}

const PAGOS: Record<string, string> = {
  transferencia: 'Transferencia bancaria',
  mercadopago: 'Mercado Pago',
  efectivo: 'Efectivo',
  flow: 'Flow',
}

const fechaCorta = new Intl.DateTimeFormat('es-CL', { day: 'numeric', month: 'short', year: 'numeric' })

/** En curso: el pedido todavía tiene pasos por delante. */
export function enCurso(estado: string): boolean {
  return ['pendiente', 'pagado', 'preparando', 'enviado'].includes(estado)
}

export function PedidoEnCuenta({ pedido, abierto }: { pedido: PedidoCuenta; abierto: boolean }) {
  const estado = ESTADOS[pedido.estado] ?? { texto: pedido.estado, clase: 'bg-black/[0.04] text-tinta ring-borde' }
  const unidades = pedido.items.reduce((a, i) => a + i.cantidad, 0)
  const enlaceCourier = enlaceDeSeguimiento({
    courier: pedido.courier,
    codigo: pedido.codigoSeguimiento,
    urlGuardada: pedido.seguimiento,
  })

  return (
    <details
      open={abierto}
      className="group rounded-[18px] bg-papel-alt/60 ring-1 ring-borde/60 transition-colors open:bg-papel-alt open:ring-borde"
    >
      <summary className="grid cursor-pointer list-none grid-cols-[1fr_auto] items-center gap-3 rounded-[18px] px-4 py-3.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark t:px-5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          <span className="text-[15px] font-semibold">
            Pedido <span className="cifra">#{pedido.numero}</span>
          </span>
          <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ring-inset ${estado.clase}`}>
            {estado.texto}
          </span>
          <span className="text-[13px] text-tinta-suave">{fechaCorta.format(new Date(pedido.fecha))}</span>
          <span className="text-[13px] text-tinta-suave">
            · {unidades} {unidades === 1 ? 'producto' : 'productos'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="cifra text-[15px] font-semibold">{clp(pedido.total)}</span>
          <svg
            viewBox="0 0 12 12"
            aria-hidden
            className="size-3 text-tinta-suave transition-transform duration-200 group-open:rotate-180"
          >
            <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </summary>

      <div className="border-t border-borde/60 px-4 pt-4 pb-5 t:px-5">
        {/* A dónde va y cómo se pagó: lo primero que uno busca al revisar una
            compra, y hasta ahora no estaba en ninguna parte. */}
        {(pedido.entrega || pedido.metodoPago) && (
          <dl className="mb-4 grid gap-3 border-b border-borde/60 pb-4 t:grid-cols-2">
            {pedido.entrega && (
              <div className="min-w-0">
                <dt className="text-[12px] tracking-etiqueta text-tinta-suave uppercase">Entrega</dt>
                <dd className="mt-0.5 text-[14px] break-words">{pedido.entrega}</dd>
              </div>
            )}
            {pedido.metodoPago && (
              <div className="min-w-0">
                <dt className="text-[12px] tracking-etiqueta text-tinta-suave uppercase">Pago</dt>
                <dd className="mt-0.5 text-[14px]">{PAGOS[pedido.metodoPago] ?? pedido.metodoPago}</dd>
              </div>
            )}
          </dl>
        )}

        <ul className="grid gap-2.5">
          {pedido.items.map((i, n) => (
            <li key={`${pedido.id}-${n}`} className="flex items-center gap-3">
              <span className="relative size-11 shrink-0 overflow-hidden rounded-[12px] bg-papel">
                {i.imagen && <Image src={i.imagen} alt="" fill sizes="44px" className="object-contain p-1" />}
              </span>
              <span className="min-w-0 flex-1 truncate text-[14px]">
                {i.slug ? (
                  <Link href={`/producto/${i.slug}`} className="hover:text-spark hover:underline">
                    {i.cantidad} × {i.nombre}
                  </Link>
                ) : (
                  `${i.cantidad} × ${i.nombre}`
                )}
              </span>
              <span className="cifra text-[14px] text-tinta-suave">{clp(i.subtotal)}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 border-t border-borde/60 pt-4">
          <LineaEnvio pedido={pedido} />
          {enlaceCourier && <BotonCourier enlace={enlaceCourier} />}

          {/* El acordeón alcanza para mirar de pasada. Para seguir un envío de
              cerca —o mandarle el enlace a alguien— está la página completa. */}
          <div className="mt-5 flex flex-wrap gap-2 border-t border-borde/60 pt-4">
            <Link
              href={`/seguimiento/${pedido.token}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-tinta px-4 py-2.5 text-[14px] font-semibold text-white transition-colors hover:bg-tinta/90"
            >
              Ver seguimiento completo
              <svg viewBox="0 0 12 12" aria-hidden className="size-3">
                <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <BotonRepetir pedidoId={pedido.id} />
            <Link
              href="/ayuda"
              className="inline-flex items-center rounded-full px-4 py-2.5 text-[14px] ring-1 ring-borde ring-inset transition-colors hover:bg-papel"
            >
              Necesito ayuda
            </Link>
          </div>
        </div>
      </div>
    </details>
  )
}

/** Marca cuál pedido conviene mostrar ya abierto: el más reciente en curso. */
export function indiceDestacado(pedidos: PedidoCuenta[]): number {
  return pedidos.findIndex((p) => enCurso(p.estado))
}
