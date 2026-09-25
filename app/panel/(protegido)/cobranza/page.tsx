import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { clp, fecha } from '@/lib/formato'
import { Estado, Acciones } from '../pedidos/controles'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Cobranza' }

export default async function Cobranza() {
  const supabase = await crearClienteServidor()
  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('id,numero,cliente_nombre,cliente_email,cliente_fono,total_clp,created_at,metodo_pago,pago_declarado_at')
    .eq('estado', 'pendiente')
    .order('pago_declarado_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: true })
    .limit(200)
  const lista = pedidos ?? []
  const total = lista.reduce((s, p) => s + Number(p.total_clp ?? 0), 0)

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Cobranza</h1>
        <p className="mt-1 text-[15px] text-gris">Pagos pendientes ordenados para confirmar transferencias sin confundirlos con ventas cerradas.</p>
      </header>
      <section aria-label="Por cobrar" className="mb-8 rounded-[var(--radius-tarjeta)] bg-tinta p-6 text-papel">
        <p className="text-[12px] font-semibold uppercase tracking-etiqueta text-white/60">Por cobrar</p>
        <p className="cifra mt-2 text-[44px] leading-none font-semibold">{clp(total)}</p>
        <p className="mt-2 text-[13px] text-white/55">{lista.length} {lista.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'}</p>
      </section>
      {!lista.length ? <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-14 text-center text-[15px] text-gris ring-1 ring-borde/70">No hay pagos pendientes.</div> : (
        <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">
          {lista.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="cifra text-[13px] text-gris">#{p.numero}</span><p className="truncate text-[15px] font-medium">{p.cliente_nombre}</p><Estado estado="pendiente" /></div>
                <p className="mt-1 truncate text-[12px] text-gris">{[p.cliente_email, p.cliente_fono, p.metodo_pago ?? 'Pago sin especificar', fecha(p.created_at)].filter(Boolean).join(' · ')}</p>
                {p.pago_declarado_at && <p className="mt-1 text-[12px] font-medium text-ambar">El cliente declaró su pago: verificar antes de cancelar.</p>}
              </div>
              <span className="cifra text-[16px] font-medium">{clp(p.total_clp)}</span>
              <Acciones id={p.id} estado="pendiente" />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-5 text-[13px] text-gris">¿Necesitas el detalle del despacho? <Link href="/panel/pedidos" className="font-medium text-spark hover:underline">Ver todos los pedidos</Link>.</p>
    </>
  )
}
