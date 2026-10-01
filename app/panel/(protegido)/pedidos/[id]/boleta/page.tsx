import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { integranteActual } from '@/lib/sesion'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { leerConfiguracion } from '@/lib/configuracion'
import { clp } from '@/lib/formato'
import { BotonImprimir } from './imprimir'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Boleta del pedido' }

/**
 * Boleta del pedido, lista para imprimir o guardar como PDF.
 *
 * Reúne todo lo de la venta en una hoja: tienda, cliente, entrega, pago y el
 * detalle de cada producto con su color. La tienda todavía no emite boleta
 * electrónica, así que el documento lo dice: es un comprobante interno y no
 * reemplaza la boleta del SII.
 *
 * Se lee con la sesión del integrante (RLS): quien no es del equipo no llega.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const IVA = 0.19

const ENTREGA: Record<string, string> = {
  envio: 'Despacho a domicilio',
  sucursal: 'Retiro en punto Starken',
  retiro: 'Retiro en persona',
}
const METODO: Record<string, string> = {
  mercadopago: 'Tarjeta o Mercado Pago',
  transferencia: 'Transferencia bancaria',
  efectivo: 'Efectivo',
  presencial: 'Pago presencial',
}
const ESTADO: Record<string, string> = {
  pendiente: 'Pendiente de pago',
  pagado: 'Pagado',
  preparando: 'Pagado · en preparación',
  enviado: 'Pagado · enviado',
  entregado: 'Pagado · entregado',
  cancelado: 'Cancelado',
}

const fechaHora = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('es-CL', { timeZone: 'America/Santiago', day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
    : null

interface Linea {
  cantidad: number
  precio_unitario: number | string
  subtotal_clp: number | string | null
  tramo_aplicado: string | null
  productos: { nombre: string; sku: string | null } | null
  producto_variantes: { nombre: string; sku: string | null } | null
}

export default async function Boleta({ params }: { params: Promise<{ id: string }> }) {
  await integranteActual()
  const { id } = await params
  if (!UUID.test(id)) notFound()

  const supabase = await crearClienteServidor()
  const [{ data: p }, configuracion] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id,numero,created_at,estado,canal,metodo_pago,subtotal_clp,envio_clp,total_clp,notas,cliente_nombre,cliente_email,cliente_fono,' +
          'region,comuna,direccion,pagado_at,pago_referencia,boleta_folio,envio_courier,envio_seguimiento,' +
          'pedido_items(cantidad,precio_unitario,subtotal_clp,tramo_aplicado,productos(nombre,sku),producto_variantes(nombre,sku))'
      )
      .eq('id', id)
      .maybeSingle(),
    leerConfiguracion(),
  ])
  if (!p) notFound()

  const pedido = p as unknown as {
    numero: number
    created_at: string
    estado: string
    canal: string
    metodo_pago: string | null
    subtotal_clp: number | string
    envio_clp: number | string
    total_clp: number | string
    notas: string | null
    cliente_nombre: string
    cliente_email: string | null
    cliente_fono: string | null
    region: string | null
    comuna: string | null
    direccion: { entrega?: string; direccion?: string | null; sucursal?: string | null } | null
    pagado_at: string | null
    pago_referencia: string | null
    boleta_folio: string | null
    envio_courier: string | null
    envio_seguimiento: string | null
    pedido_items: Linea[] | null
  }

  const lineas = (pedido.pedido_items ?? []).map((l) => {
    const precio = Number(l.precio_unitario)
    return {
      nombre: l.productos?.nombre ?? 'Producto',
      color: l.producto_variantes?.nombre ?? null,
      sku: l.producto_variantes?.sku ?? l.productos?.sku ?? null,
      cantidad: Number(l.cantidad),
      precio,
      subtotal: l.subtotal_clp != null ? Number(l.subtotal_clp) : precio * Number(l.cantidad),
      tramo: l.tramo_aplicado,
    }
  })
  const total = Number(pedido.total_clp)
  const neto = Math.round(total / (1 + IVA))
  const tipoEntrega = pedido.direccion?.entrega ?? 'envio'
  const lugar =
    tipoEntrega === 'sucursal'
      ? pedido.direccion?.sucursal ?? null
      : tipoEntrega === 'retiro'
        ? configuracion?.retiro_direccion ?? 'Coordinado con el cliente'
        : pedido.direccion?.direccion ?? null
  const unidades = lineas.reduce((a, l) => a + l.cantidad, 0)

  return (
    <div className="mx-auto max-w-[860px] pb-16">
      {/* Solo la hoja sale en la impresión: el panel alrededor se oculta. */}
      <style>{`@media print {
        @page { size: A4; margin: 14mm; }
        body * { visibility: hidden !important; }
        #boleta, #boleta * { visibility: visible !important; }
        #boleta { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; border: 0 !important; }
      }`}</style>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/panel/pedidos#pedido-${pedido.numero}`} className="text-[14px] text-gris hover:text-tinta">
          ← Volver a pedidos
        </Link>
        <BotonImprimir />
      </div>

      <article id="boleta" data-tema="claro" className="rounded-[20px] bg-white p-7 text-tinta shadow-[0_1px_3px_rgba(0,0,0,.06),0_12px_32px_rgba(0,0,0,.06)] ring-1 ring-borde/70 sm:p-10">
        {/* Encabezado: quién vende y qué documento es. */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-borde pb-6">
          <div>
            <p className="text-[22px] font-semibold tracking-[-0.02em]">{configuracion?.nombre_tienda ?? 'Tryvex Store'}</p>
            <div className="mt-1 space-y-0.5 text-[13px] text-gris">
              {configuracion?.titular && <p>{configuracion.titular}</p>}
              {configuracion?.rut && <p>RUT {configuracion.rut}</p>}
              <p>{configuracion?.email_visible ?? configuracion?.email_contacto ?? 'tryvex@tryvex.tech'}</p>
              {configuracion?.whatsapp && <p>WhatsApp {configuracion.whatsapp}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[12px] font-semibold tracking-[0.08em] text-gris uppercase">Boleta de compra</p>
            <p className="cifra mt-1 text-[26px] font-semibold tracking-[-0.02em]">N.º {pedido.numero}</p>
            <p className="mt-1 text-[13px] text-gris">{fechaHora(pedido.created_at)}</p>
            {pedido.boleta_folio && <p className="mt-1 text-[13px]">Folio SII {pedido.boleta_folio}</p>}
          </div>
        </header>

        {/* Cliente, entrega y pago, en tres bloques. */}
        <section className="grid gap-6 border-b border-borde py-6 sm:grid-cols-3">
          <div>
            <h2 className="text-[11px] font-semibold tracking-[0.08em] text-gris uppercase">Cliente</h2>
            <p className="mt-2 text-[15px] font-medium">{pedido.cliente_nombre}</p>
            {pedido.cliente_email && <p className="text-[13px] break-all text-tinta-suave">{pedido.cliente_email}</p>}
            {pedido.cliente_fono && <p className="text-[13px] text-tinta-suave">{pedido.cliente_fono}</p>}
          </div>
          <div>
            <h2 className="text-[11px] font-semibold tracking-[0.08em] text-gris uppercase">Entrega</h2>
            <p className="mt-2 text-[15px] font-medium">{ENTREGA[tipoEntrega] ?? tipoEntrega}</p>
            {lugar && <p className="text-[13px] text-tinta-suave">{lugar}</p>}
            {tipoEntrega !== 'retiro' && (pedido.comuna || pedido.region) && (
              <p className="text-[13px] text-tinta-suave">{[pedido.comuna, pedido.region].filter(Boolean).join(', ')}</p>
            )}
            {pedido.envio_seguimiento && (
              <p className="mt-1 text-[13px] text-tinta-suave">
                {pedido.envio_courier ?? 'Courier'} · {pedido.envio_seguimiento}
              </p>
            )}
          </div>
          <div>
            <h2 className="text-[11px] font-semibold tracking-[0.08em] text-gris uppercase">Pago</h2>
            <p className="mt-2 text-[15px] font-medium">{METODO[pedido.metodo_pago ?? ''] ?? pedido.metodo_pago ?? '—'}</p>
            <p className="text-[13px] text-tinta-suave">{ESTADO[pedido.estado] ?? pedido.estado}</p>
            {pedido.pagado_at && <p className="text-[13px] text-tinta-suave">Pagado el {fechaHora(pedido.pagado_at)}</p>}
            {pedido.pago_referencia && <p className="text-[12px] break-all text-gris">Ref. {pedido.pago_referencia}</p>}
          </div>
        </section>

        {/* Detalle de productos. */}
        <section className="py-6">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="border-b border-borde text-left text-[11px] tracking-[0.08em] text-gris uppercase">
                <th className="pb-2 font-semibold">Producto</th>
                <th className="pb-2 text-right font-semibold">Cant.</th>
                <th className="hidden pb-2 text-right font-semibold sm:table-cell">Precio unit.</th>
                <th className="pb-2 text-right font-semibold">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {lineas.map((l, i) => (
                <tr key={i} className="border-b border-borde/60 align-top">
                  <td className="py-3 pr-3">
                    <p className="font-medium">{l.nombre}</p>
                    <p className="text-[12px] text-gris">
                      {[l.color && `Color: ${l.color}`, l.sku && `SKU ${l.sku}`, l.tramo && `Precio por volumen: ${l.tramo}`].filter(Boolean).join(' · ')}
                    </p>
                  </td>
                  <td className="cifra py-3 text-right">{l.cantidad}</td>
                  <td className="cifra hidden py-3 text-right sm:table-cell">{clp(l.precio)}</td>
                  <td className="cifra py-3 text-right font-medium">{clp(l.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto mt-5 grid max-w-[300px] gap-1.5 text-[14px]">
            <div className="flex justify-between text-tinta-suave">
              <dt>Subtotal ({unidades} {unidades === 1 ? 'unidad' : 'unidades'})</dt>
              <dd className="cifra">{clp(pedido.subtotal_clp)}</dd>
            </div>
            <div className="flex justify-between text-tinta-suave">
              <dt>Envío</dt>
              <dd className="cifra">{Number(pedido.envio_clp) === 0 ? 'Gratis' : clp(pedido.envio_clp)}</dd>
            </div>
            <div className="mt-1 flex justify-between border-t border-borde pt-2 text-[17px] font-semibold">
              <dt>Total</dt>
              <dd className="cifra">{clp(total)}</dd>
            </div>
            <div className="flex justify-between text-[12px] text-gris">
              <dt>Neto</dt>
              <dd className="cifra">{clp(neto)}</dd>
            </div>
            <div className="flex justify-between text-[12px] text-gris">
              <dt>IVA (19 %) incluido</dt>
              <dd className="cifra">{clp(total - neto)}</dd>
            </div>
          </dl>
        </section>

        {pedido.notas && (
          <p className="border-t border-borde pt-4 text-[13px] text-tinta-suave">
            <span className="font-medium text-tinta">Notas:</span> {pedido.notas}
          </p>
        )}

        <footer className="mt-6 border-t border-borde pt-4 text-[11px] leading-relaxed text-gris">
          Comprobante interno de venta de {configuracion?.nombre_tienda ?? 'Tryvex Store'}. No reemplaza la boleta electrónica emitida ante el SII.
          Canal: {pedido.canal === 'web' ? 'tienda online' : pedido.canal}.
        </footer>
      </article>
    </div>
  )
}
