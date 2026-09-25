import { crearClienteServidor } from '@/lib/supabase/servidor'
import { clp, fecha } from '@/lib/formato'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Clientes' }

type Pedido = { cliente_nombre: string | null; cliente_email: string | null; cliente_fono: string | null; estado: string; total_clp: number | string; created_at: string }
const EXCLUIDOS = ['pendiente', 'cancelado']

export default async function Clientes() {
  const supabase = await crearClienteServidor()
  const { data } = await supabase.from('pedidos').select('cliente_nombre,cliente_email,cliente_fono,estado,total_clp,created_at').order('created_at', { ascending: false }).limit(5000)
  const grupos = new Map<string, { nombre: string; email: string | null; fono: string | null; pedidos: number; total: number; ultima: string }>()
  for (const p of (data ?? []) as Pedido[]) {
    const clave = p.cliente_email?.trim().toLowerCase() || p.cliente_fono?.replace(/\D/g, '') || `sin-contacto:${p.cliente_nombre ?? ''}`
    const actual = grupos.get(clave) ?? { nombre: p.cliente_nombre || 'Cliente sin nombre', email: p.cliente_email, fono: p.cliente_fono, pedidos: 0, total: 0, ultima: p.created_at }
    if (!EXCLUIDOS.includes(p.estado)) { actual.pedidos += 1; actual.total += Number(p.total_clp ?? 0) }
    if (p.created_at > actual.ultima) actual.ultima = p.created_at
    grupos.set(clave, actual)
  }
  const clientes = [...grupos.values()].filter((c) => c.pedidos > 0).sort((a, b) => b.total - a.total)

  return (
    <>
      <header className="mb-8"><h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Clientes</h1><p className="mt-1 text-[15px] text-gris">Resumen automático desde pedidos cobrados. No crea una ficha CRM paralela ni expone datos fuera del equipo.</p></header>
      {!clientes.length ? <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-14 text-center text-[15px] text-gris ring-1 ring-borde/70">Aún no hay clientes con compras cobradas.</div> : <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">{clientes.map((c) => <li key={`${c.email}-${c.fono}-${c.nombre}`} className="flex flex-wrap items-center gap-4 px-5 py-4"><div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{c.nombre}</p><p className="mt-1 truncate text-[12px] text-gris">{[c.email, c.fono, `Última compra: ${fecha(c.ultima)}`].filter(Boolean).join(' · ')}</p></div><div className="text-right"><p className="cifra text-[15px] font-medium">{clp(c.total)}</p><p className="text-[12px] text-gris">{c.pedidos} {c.pedidos === 1 ? 'compra' : 'compras'}</p></div></li>)}</ul>}
    </>
  )
}
