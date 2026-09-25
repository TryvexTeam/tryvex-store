import Link from 'next/link'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reportes' }

const REPORTES = [
  { tipo: 'ventas', titulo: 'Ventas', texto: 'Pedidos cobrados, canal, cliente, medio de pago y total.' },
  { tipo: 'pedidos', titulo: 'Pedidos', texto: 'Estados, despacho y pagos pendientes para seguimiento operativo.' },
  { tipo: 'inventario', titulo: 'Inventario', texto: 'Stock disponible, mínimo de reposición y estado de alerta.' },
  { tipo: 'finanzas', titulo: 'Finanzas', texto: 'Ingresos y egresos registrados. Disponible solo con permiso de finanzas.' },
]

export default function Reportes() {
  return (
    <>
      <header className="mb-8">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Reportes</h1>
        <p className="mt-1 text-[15px] text-gris">Exporta CSV para trabajar en Excel, Sheets o tu contabilidad. No se altera ningún dato.</p>
      </header>
      <section aria-label="Exportaciones" className="grid gap-4 sm:grid-cols-2">
        {REPORTES.map((reporte) => (
          <article key={reporte.tipo} className="rounded-[var(--radius-tarjeta)] bg-papel p-6 ring-1 ring-borde/70">
            <h2 className="text-[18px] font-semibold">{reporte.titulo}</h2>
            <p className="mt-2 min-h-12 text-[14px] leading-relaxed text-gris">{reporte.texto}</p>
            <Link href={`/api/reportes?tipo=${reporte.tipo}`} className="mt-5 inline-flex min-h-11 items-center rounded-full bg-tinta px-4 text-[14px] font-medium text-white hover:opacity-85">
              Descargar CSV
            </Link>
          </article>
        ))}
      </section>
    </>
  )
}
