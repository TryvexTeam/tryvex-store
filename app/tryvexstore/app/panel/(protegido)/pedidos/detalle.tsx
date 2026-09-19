'use client'

import { useState, useTransition } from 'react'
import { clp } from '@/lib/formato'
import { Hoja } from '@/components/hoja'
import { useAvisos } from '@/components/avisos'
import { guardarDetallePedido } from './acciones-detalle'
import { Estado, Acciones } from './controles'

export interface PedidoDetalle {
  id: string
  numero: number
  cliente_nombre: string
  cliente_email: string | null
  cliente_fono: string | null
  canal: string
  estado: string
  metodo_pago: string | null
  subtotal_clp: number
  envio_clp: number
  total_clp: number
  notas: string | null
  created_at: string
  pagado_at: string | null
  enviado_at: string | null
  entregado_at: string | null
  region: string | null
  comuna: string | null
  envio_courier: string | null
  envio_seguimiento: string | null
  envio_url_seguimiento: string | null
  pago_referencia: string | null
  boleta_folio: string | null
  boleta_url: string | null
  items: { nombre: string; variante: string | null; cantidad: number; precio_unitario: number }[]
}

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

const hora = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null

/** Botón «Ver» de la fila y la hoja con todo lo que el equipo necesita del pedido. */
export function DetallePedido({ pedido }: { pedido: PedidoDetalle }) {
  const [abierta, setAbierta] = useState(false)
  const [guardando, iniciar] = useTransition()
  const avisos = useAvisos()

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    iniciar(async () => {
      const r = await guardarDetallePedido(datos)
      if (r.ok) avisos.ok(`Pedido #${pedido.numero} actualizado.`)
      else avisos.error(r.error)
    })
  }

  // La línea de tiempo cuenta el pedido como lo vive el cliente.
  const hitos = [
    { rotulo: 'Creado', cuando: hora(pedido.created_at) },
    { rotulo: 'Pagado', cuando: hora(pedido.pagado_at) },
    { rotulo: 'Enviado', cuando: hora(pedido.enviado_at) },
    { rotulo: 'Entregado', cuando: hora(pedido.entregado_at) },
  ]

  const texto = (nombre: keyof PedidoDetalle, etiqueta: string, extra?: Partial<React.InputHTMLAttributes<HTMLInputElement>>) => (
    <div>
      <label htmlFor={`pd-${pedido.id}-${nombre}`} className={rotulo}>{etiqueta}</label>
      <input id={`pd-${pedido.id}-${nombre}`} name={nombre} defaultValue={(pedido[nombre] as string | null) ?? ''}
             disabled={guardando} className={campo} {...extra} />
    </div>
  )

  return (
    <>
      <button type="button" onClick={() => setAbierta(true)}
              className="presionable inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-medium text-spark hover:bg-spark-suave">
        Ver
      </button>

      <Hoja abierta={abierta} onCerrar={() => setAbierta(false)}
            titulo={`Pedido #${pedido.numero}`} bajada={`${pedido.cliente_nombre} · ${clp(pedido.total_clp)}`}>
        <div className="space-y-7">
          <div className="flex items-center justify-between gap-3">
            <Estado estado={pedido.estado} />
            <Acciones id={pedido.id} estado={pedido.estado} />
          </div>

          <ol aria-label="Seguimiento" className="grid grid-cols-4 gap-1.5">
            {hitos.map((h) => (
              <li key={h.rotulo} className="min-w-0">
                <span aria-hidden className={`block h-1 rounded-full ${h.cuando ? 'bg-verde' : 'bg-borde'}`} />
                <p className={`mt-1.5 text-[12px] font-medium ${h.cuando ? 'text-tinta' : 'text-gris'}`}>{h.rotulo}</p>
                <p className="truncate text-[11px] text-gris">{h.cuando ?? '—'}</p>
              </li>
            ))}
          </ol>

          <section aria-label="Productos">
            <ul className="divide-y divide-borde/60 rounded-[12px] bg-papel-alt">
              {pedido.items.map((it, i) => (
                <li key={i} className="flex items-baseline gap-3 px-4 py-3 text-[14px]">
                  <span className="cifra text-gris">{it.cantidad}×</span>
                  <span className="min-w-0 flex-1 truncate">
                    {it.nombre}{it.variante && <span className="text-gris"> · {it.variante}</span>}
                  </span>
                  <span className="cifra">{clp(it.cantidad * it.precio_unitario)}</span>
                </li>
              ))}
              <li className="flex justify-between px-4 py-2.5 text-[13px] text-gris">
                <span>Envío</span><span className="cifra">{clp(pedido.envio_clp)}</span>
              </li>
              <li className="flex justify-between px-4 py-3 text-[15px] font-semibold">
                <span>Total</span><span className="cifra">{clp(pedido.total_clp)}</span>
              </li>
            </ul>
          </section>

          <section aria-label="Cliente" className="grid gap-1 text-[14px]">
            <p className="font-medium">{pedido.cliente_nombre}</p>
            {pedido.cliente_fono && (
              <a className="text-spark" href={`https://wa.me/${pedido.cliente_fono.replace(/\D/g, '')}`}
                 target="_blank" rel="noopener noreferrer">WhatsApp {pedido.cliente_fono}</a>
            )}
            {pedido.cliente_email && <a className="text-spark" href={`mailto:${pedido.cliente_email}`}>{pedido.cliente_email}</a>}
            {pedido.notas && <p className="mt-1 text-[13px] text-gris">{pedido.notas}</p>}
          </section>

          <form onSubmit={enviar} className="space-y-5">
            <input type="hidden" name="id" value={pedido.id} />
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-[15px] font-semibold">Despacho</legend>
              {texto('region', 'Región')}
              {texto('comuna', 'Comuna')}
              {texto('envio_courier', 'Courier', { placeholder: 'Starken, Blue Express…' })}
              {texto('envio_seguimiento', 'N.º de seguimiento')}
              <div className="sm:col-span-2">{texto('envio_url_seguimiento', 'Enlace de seguimiento', { type: 'url', placeholder: 'https://' })}</div>
            </fieldset>
            <fieldset className="grid gap-3 sm:grid-cols-2">
              <legend className="mb-2 text-[15px] font-semibold">Pago y boleta</legend>
              {texto('pago_referencia', 'Referencia del pago', { placeholder: 'N.º de transferencia' })}
              {texto('boleta_folio', 'Folio de boleta')}
              <div className="sm:col-span-2">{texto('boleta_url', 'Enlace a la boleta', { type: 'url', placeholder: 'https://' })}</div>
            </fieldset>
            <button type="submit" disabled={guardando}
                    className="presionable w-full rounded-[10px] bg-spark py-3 text-[15px] font-semibold text-white hover:bg-spark-hover disabled:opacity-60">
              {guardando ? 'Guardando…' : 'Guardar pedido'}
            </button>
          </form>
        </div>
      </Hoja>
    </>
  )
}
