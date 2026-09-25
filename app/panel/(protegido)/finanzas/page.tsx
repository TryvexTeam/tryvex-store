import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { clp, fecha as fmtFecha } from '@/lib/formato'
import { categoriaHistorica, etiquetaCategoria } from '@/lib/finanzas'
import FormularioMovimiento from './formulario'
import Comprobante from './comprobante'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Finanzas' }

type Movimiento = {
  id: string
  tipo: string
  categoria: string
  descripcion: string
  monto_clp: string | number
  fecha: string
  metodo_pago: string | null
  contraparte: string | null
  voucher_path: string | null
  voucher_nombre: string | null
}

export default async function Finanzas() {
  const yo = await integranteActual()

  // El enlace ya se oculta en el layout, pero alguien puede escribir la URL.
  // Por debajo el RLS también lo bloquearía; esto da un desvío limpio.
  if (!yo.ver_finanzas) redirect('/panel')

  const supabase = await crearClienteServidor()

  const [{ data: movs }, { data: stock }, { data: productos }] = await Promise.all([
    supabase
      .from('movimientos_financieros')
      .select('id,tipo,categoria,descripcion,monto_clp,fecha,metodo_pago,contraparte,voucher_path,voucher_nombre')
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(60),
    supabase.from('v_stock_actual').select('producto_id,stock'),
    supabase.from('productos').select('id,precio_base,costo_unitario'),
  ])

  const lista = (movs ?? []) as Movimiento[]
  const n = (v: string | number) => Number(v) || 0

  const ingresos = lista.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + n(m.monto_clp), 0)
  const egresos = lista.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + n(m.monto_clp), 0)
  const balance = ingresos - egresos

  // ── Analítica propia: lo que Treinta no muestra ──────────────────
  // Cuánto falta para recuperar lo invertido, y cuántas unidades son.
  const unidades = (stock ?? []).reduce((a, s) => a + (s.stock ?? 0), 0)
  const p = productos?.[0]
  const precio = n(p?.precio_base ?? 0)
  const costo = n(p?.costo_unitario ?? 0)
  const margenUnitario = precio - costo
  const porRecuperar = Math.max(0, egresos - ingresos)
  const unidadesParaEquilibrio =
    margenUnitario > 0 ? Math.ceil(porRecuperar / margenUnitario) : null

  const alcanzable = unidadesParaEquilibrio !== null && unidadesParaEquilibrio <= unidades

  return (
    <>
      <header className="mb-8">
        <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Finanzas</h1>
        <p className="mt-1 text-[15px] text-gris">
          {lista.length === 0
            ? 'Aún no hay movimientos registrados.'
            : `${lista.length} movimientos recientes.`}
        </p>
      </header>

      {/*
        Jerarquía numérica: UNA cifra manda.
        Antes las tres cifras medían lo mismo (2rem) y el ojo no sabía dónde
        posarse: el balance, que es la pregunta real, competía con sus propios
        sumandos. Ahora el balance domina y los sumandos quedan subordinados.

        Y el signo va escrito, no solo pintado: distinguir ingreso de egreso
        únicamente por el color deja fuera a quien no lo percibe, y en dinero
        esa confusión cuesta caro. El «+» y el «−» dicen lo mismo sin color.
      */}
      <section aria-label="Resumen" className="mb-8 grid grid-cols-2 gap-3 t:gap-4">
        <div className="col-span-2 rounded-[var(--radius-tarjeta)] bg-tinta p-5 text-papel t:p-6">
          <p className="text-[12px] font-semibold tracking-etiqueta text-white/60 uppercase">
            Balance
          </p>
          <p className="cifra mt-2 text-[40px] leading-none font-semibold tracking-titulo t:text-[48px]">
            {clp(balance)}
          </p>
          <p className="mt-2 text-[13px] text-white/55">
            {balance >= 0 ? 'a favor' : 'en rojo'}
          </p>
        </div>

        <div className="rounded-[var(--radius-tarjeta)] bg-papel p-4 ring-1 ring-borde/70 t:p-5">
          <p className="text-[12px] font-semibold tracking-etiqueta text-gris uppercase">
            Ingresos
          </p>
          <p className="cifra mt-2 text-[24px] leading-none font-semibold text-verde t:text-[26px]">
            <span aria-hidden>+</span>
            <span className="sr-only">más </span>
            {clp(ingresos)}
          </p>
        </div>

        <div className="rounded-[var(--radius-tarjeta)] bg-papel p-4 ring-1 ring-borde/70 t:p-5">
          <p className="text-[12px] font-semibold tracking-etiqueta text-gris uppercase">
            Egresos
          </p>
          <p className="cifra mt-2 text-[24px] leading-none font-semibold text-tinta-suave t:text-[26px]">
            <span aria-hidden>−</span>
            <span className="sr-only">menos </span>
            {clp(egresos)}
          </p>
        </div>
      </section>

      {/* Punto de equilibrio: la pregunta real del negocio. */}
      {margenUnitario > 0 && lista.length > 0 && (
        <section
          aria-label="Punto de equilibrio"
          className="mb-10 rounded-[var(--radius-tarjeta)] bg-papel p-6 ring-1 ring-borde/70"
        >
          <h2 className="text-[15px] font-semibold">Punto de equilibrio</h2>
          {egresos === 0 ? (
            <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
              Todavía no hay egresos registrados, así que no hay inversión que
              recuperar. Anota la importación para que el cálculo tenga sentido.
            </p>
          ) : porRecuperar === 0 ? (
            <p className="mt-2 text-[15px] text-verde">
              Inversión recuperada. Todo lo que vendas desde acá es ganancia.
            </p>
          ) : (
            <>
              <p className="mt-2 text-[15px] leading-relaxed text-tinta-suave">
                Faltan <strong className="cifra text-tinta">{clp(porRecuperar)}</strong> para
                recuperar lo invertido, o sea{' '}
                <strong className="cifra text-tinta">{unidadesParaEquilibrio}</strong>{' '}
                unidades a {clp(precio)} con margen de {clp(margenUnitario)} c/u.
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-papel-alt">
                <div
                  className="h-full rounded-full bg-spark transition-[width] duration-500"
                  style={{
                    width: `${Math.min(100, egresos > 0 ? (ingresos / egresos) * 100 : 0)}%`,
                  }}
                />
              </div>
              <p className="mt-2 text-[13px] text-gris">
                {alcanzable
                  ? `Alcanza con el stock actual (${unidades} unidades).`
                  : `Con las ${unidades} unidades en bodega no alcanza: hay que reponer.`}
              </p>
            </>
          )}
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-label="Movimientos" className="min-w-0">
          <h2 className="mb-4 text-[1.35rem] font-semibold tracking-[-0.015em]">Movimientos</h2>

          {lista.length === 0 ? (
            <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-14 text-center ring-1 ring-borde/70">
              <p className="text-[15px] text-gris">Nada registrado todavía.</p>
              <p className="mt-1 text-[13px] text-gris">
                Parte anotando tu primera importación: unidades y costo.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/70">
              {lista.map((m) => (
                <li key={m.id} className="flex items-center gap-3 px-4 py-3.5 t:gap-4 t:px-5">
                  {/* Flecha además de color: la dirección del movimiento se lee
                      aunque no se distingan los tonos, y de un vistazo. */}
                  <span
                    aria-hidden
                    className={`grid size-8 shrink-0 place-items-center rounded-full text-[15px] font-semibold ${
                      m.tipo === 'ingreso' ? 'bg-verde/10 text-verde' : 'bg-papel-alt text-tinta-suave'
                    }`}
                  >
                    {m.tipo === 'ingreso' ? '↓' : '↑'}
                  </span>
                  <span className="sr-only">{m.tipo === 'ingreso' ? 'Ingreso:' : 'Egreso:'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-tinta">{m.descripcion}</p>
                    <p className="mt-0.5 truncate text-[12px] text-gris">
                      {[etiquetaCategoria(categoriaHistorica(m.categoria, m.tipo), m.categoria), m.contraparte, fmtFecha(m.fecha)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {m.voucher_path && (
                    <Comprobante ruta={m.voucher_path} nombre={m.voucher_nombre} />
                  )}
                  <span
                    className={`cifra shrink-0 text-[15px] font-medium ${
                      m.tipo === 'ingreso' ? 'text-verde' : 'text-tinta'
                    }`}
                  >
                    {m.tipo === 'ingreso' ? '+' : '−'}
                    {clp(m.monto_clp)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="min-w-0">
          {yo.gestionar_finanzas ? (
            <FormularioMovimiento />
          ) : (
            <div className="rounded-[var(--radius-tarjeta)] bg-papel p-6 text-[14px] leading-relaxed text-gris ring-1 ring-borde/70">
              Puedes ver las finanzas pero no registrar movimientos. Pídele el permiso{' '}
              <code className="text-tinta">gestionar_finanzas</code> a un administrador.
            </div>
          )}
        </aside>
      </div>
    </>
  )
}
