import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import { Estado, Acciones, NuevoPedido } from './controles'
import { DetallePedido, type PedidoDetalle } from './detalle'
import { productosConVariantes } from '@/lib/variantes-cliente'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Pedidos' }

const CANAL: Record<string, string> = {
  whatsapp: 'WhatsApp', web: 'Web', presencial: 'Presencial', mayorista: 'Mayorista',
}

export default async function Pedidos() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data: pedidos }, { data: productos }, { data: stock }] = await Promise.all([
    supabase
      .from('pedidos')
      .select(
        'id,numero,cliente_nombre,cliente_email,cliente_fono,canal,estado,metodo_pago,subtotal_clp,envio_clp,total_clp,notas,created_at,' +
          'pagado_at,enviado_at,entregado_at,region,comuna,envio_courier,envio_seguimiento,envio_url_seguimiento,' +
          'pago_referencia,boleta_folio,boleta_url,pedido_items(cantidad,precio_unitario,productos(nombre),producto_variantes(nombre))'
      )
      .order('created_at', { ascending: false })
      .limit(80),
    productosConVariantes(supabase).then((data) => ({ data })),
    supabase.from('v_stock_actual').select('stock'),
  ])

  type ItemCrudo = {
    cantidad: number
    precio_unitario: number
    productos: { nombre: string } | null
    producto_variantes: { nombre: string } | null
  }
  type PedidoCrudo = Omit<PedidoDetalle, 'items'> & { pedido_items: ItemCrudo[] | null }

  // El select concatenado no se infiere: se declara la forma pedida y se
  // normalizan los numeric de Postgres, que llegan como texto.
  const lista = ((pedidos ?? []) as unknown as PedidoCrudo[]).map(
    ({ pedido_items, ...p }): PedidoDetalle => ({
      ...p,
      subtotal_clp: Number(p.subtotal_clp),
      envio_clp: Number(p.envio_clp ?? 0),
      total_clp: Number(p.total_clp),
      items: (pedido_items ?? []).map((i) => ({
        nombre: i.productos?.nombre ?? 'Producto',
        variante: i.producto_variantes?.nombre ?? null,
        cantidad: i.cantidad,
        precio_unitario: Number(i.precio_unitario),
      })),
    })
  )
  const disponible = (stock ?? []).reduce((a, s) => a + (s.stock ?? 0), 0)

  const abiertos = lista.filter((p) => ['pendiente', 'pagado', 'preparando'].includes(p.estado))
  const porCobrar = lista
    .filter((p) => p.estado === 'pendiente')
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const vendido = lista
    .filter((p) => !['pendiente', 'cancelado'].includes(p.estado))
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)

  return (
    <>
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-seccion t:text-[40px]">Pedidos</h1>
          <p className="mt-1 text-[15px] text-gris">
            {lista.length === 0
              ? 'Todavía no hay pedidos.'
              : `${abiertos.length} abiertos de ${lista.length} · ${disponible} unidades libres`}
          </p>
        </div>
        {productos?.length ? <NuevoPedido productos={productos} stock={disponible} /> : null}
      </header>

      {/*
        Manda la cifra accionable, no la más grande del negocio. «Por cobrar»
        es la única que pide hacer algo hoy: perseguir esos pagos. «Vendido»
        es historia y «Abiertos» un conteo. Antes las tres medían 2rem y el
        ojo no sabía cuál miraba primero.
      */}
      {lista.length > 0 && (
        <section aria-label="Resumen" className="mb-8 grid grid-cols-2 gap-3 t:gap-4">
          <div className="col-span-2 rounded-[var(--radius-tarjeta)] bg-tinta p-5 text-papel t:p-6">
            <p className="text-[12px] font-semibold tracking-etiqueta text-white/60 uppercase">Por cobrar</p>
            <p className="cifra mt-2 text-[40px] leading-none font-semibold tracking-titulo t:text-[48px]">{clp(porCobrar)}</p>
            <p className="mt-2 text-[13px] text-white/55">
              {porCobrar > 0 ? 'Pedidos esperando transferencia' : 'Todo al día'}
            </p>
          </div>
          <div className="rounded-[var(--radius-tarjeta)] bg-papel p-4 ring-1 ring-borde/70 t:p-5">
            <p className="text-[12px] font-semibold tracking-etiqueta text-gris uppercase">Vendido</p>
            <p className="cifra mt-2 text-[24px] leading-none font-semibold t:text-[26px]">{clp(vendido)}</p>
          </div>
          <div className="rounded-[var(--radius-tarjeta)] bg-papel p-4 ring-1 ring-borde/70 t:p-5">
            <p className="text-[12px] font-semibold tracking-etiqueta text-gris uppercase">Abiertos</p>
            <p className="cifra mt-2 text-[24px] leading-none font-semibold t:text-[26px]">{abiertos.length}</p>
          </div>
        </section>
      )}

      {lista.length === 0 ? (
        <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-16 text-center ring-1 ring-borde/70">
          <p className="text-[15px] text-gris">Sin pedidos todavía.</p>
          <p className="mt-1 text-[13px] text-gris">
            Crea uno a mano cuando cierres una venta por WhatsApp.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">
          {lista.map((p) => {
            const unidades = p.items.reduce((a, i) => a + i.cantidad, 0)
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="cifra text-[13px] text-gris">#{p.numero}</span>
                    <p className="truncate text-[15px] font-medium text-tinta">{p.cliente_nombre}</p>
                    <Estado estado={p.estado} />
                  </div>
                  <p className="mt-1 truncate text-[12px] text-gris">
                    {[
                      `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}`,
                      CANAL[p.canal] ?? p.canal,
                      p.cliente_fono,
                      fmtFecha(p.created_at),
                      p.notas,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="cifra shrink-0 text-[15px] font-medium">{clp(p.total_clp)}</span>
                <Acciones id={p.id} estado={p.estado} />
                <DetallePedido pedido={p} />
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
