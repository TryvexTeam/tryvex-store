import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual, NEGOCIO_TIENDA } from '@/lib/sesion'
import { clp } from '@/lib/formato'
import { ResumenFinanzas, ListaMovimientos, type Movimiento } from '@/components/panel/finanzas-vista'
import { SelectorPeriodo, DesgloseCategorias, AvisoSinComprobante, desglosarPorCategoria } from '@/components/panel/finanzas-extras'
import { BotonImprimir } from '@/components/panel/boton-imprimir'
import { BotonEnlace } from '@/components/panel/ui'
import { resolverPeriodo, queryDePeriodo } from '@/lib/periodo'
import FormularioMovimiento from './formulario'
import Comprobante from './comprobante'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Finanzas' }

export default async function Finanzas({ searchParams }: { searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; sin?: string }> }) {
  const yo = await integranteActual()
  const params = await searchParams
  const periodo = resolverPeriodo(params)
  const soloSinComprobante = params.sin === '1'

  // El enlace ya se oculta en el layout, pero alguien puede escribir la URL.
  // Por debajo el RLS también lo bloquearía; esto da un desvío limpio.
  if (!yo.ver_finanzas) redirect('/panel')

  const supabase = await crearClienteServidor()

  const LIMITE = 2000
  let consulta = supabase
    .from('movimientos_financieros')
    .select('id,tipo,categoria,descripcion,monto_clp,fecha,metodo_pago,contraparte,voucher_path,voucher_nombre')
    // La tabla es compartida con Tryvex Plataform: aquí solo lo de la tienda.
    .eq('negocio', NEGOCIO_TIENDA)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(LIMITE)
  if (periodo.desde) consulta = consulta.gte('fecha', periodo.desde)
  if (periodo.hasta) consulta = consulta.lte('fecha', periodo.hasta)

  const consultaAnterior = periodo.anterior
    ? supabase
        .from('movimientos_financieros')
        .select('tipo,monto_clp')
        .eq('negocio', NEGOCIO_TIENDA)
        .gte('fecha', periodo.anterior.desde)
        .lte('fecha', periodo.anterior.hasta)
        .limit(LIMITE)
    : null

  const [{ data: movs }, { data: movsAnteriores }, { data: stock }, { data: productos }] = await Promise.all([
    consulta,
    consultaAnterior ?? Promise.resolve({ data: null }),
    supabase.from('v_stock_actual').select('producto_id,stock'),
    supabase.from('productos').select('id,precio_base,costo_unitario'),
  ])

  const todos = (movs ?? []) as Movimiento[]
  const n = (v: string | number) => Number(v) || 0

  const ingresos = todos.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + n(m.monto_clp), 0)
  const egresos = todos.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + n(m.monto_clp), 0)
  const balance = ingresos - egresos
  const anterior = movsAnteriores
    ? {
        ingresos: movsAnteriores.filter((m) => m.tipo === 'ingreso').reduce((a, m) => a + n(m.monto_clp), 0),
        egresos: movsAnteriores.filter((m) => m.tipo === 'egreso').reduce((a, m) => a + n(m.monto_clp), 0),
      }
    : null

  const sinComprobante = todos.filter((m) => m.tipo === 'egreso' && !m.voucher_path)
  const lista = (soloSinComprobante ? sinComprobante : todos).slice(0, 200)
  const truncado = todos.length >= LIMITE

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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[2.2rem] leading-tight font-semibold tracking-[-0.022em]">Finanzas</h1>
          <p className="mt-1 text-[15px] text-gris">
            {todos.length === 0
              ? 'No hay movimientos en este periodo.'
              : `${todos.length} ${todos.length === 1 ? 'movimiento' : 'movimientos'} · ${periodo.etiqueta}${truncado ? ' (se muestran los más recientes)' : ''}`}
          </p>
        </div>
        <div className="no-imprimir flex items-center gap-2">
          <BotonEnlace variante="secundario" tamano="sm" href={`/api/reportes?tipo=finanzas&${queryDePeriodo(periodo)}`} aria-label="Descargar los movimientos de este periodo en CSV">
            CSV
          </BotonEnlace>
          <BotonImprimir />
        </div>
      </header>

      <SelectorPeriodo periodo={periodo} conservarSin={soloSinComprobante} />

      {/*
        Jerarquía numérica: UNA cifra manda.
        Antes las tres cifras medían lo mismo (2rem) y el ojo no sabía dónde
        posarse: el balance, que es la pregunta real, competía con sus propios
        sumandos. Ahora el balance domina y los sumandos quedan subordinados.

        Y el signo va escrito, no solo pintado: distinguir ingreso de egreso
        únicamente por el color deja fuera a quien no lo percibe, y en dinero
        esa confusión cuesta caro. El «+» y el «−» dicen lo mismo sin color.
      */}
      <ResumenFinanzas balance={balance} ingresos={ingresos} egresos={egresos} anterior={anterior} etiquetaPeriodo={periodo.etiqueta} />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <DesgloseCategorias titulo="Salió por categoría" filas={desglosarPorCategoria(todos, 'egreso')} tono="spark" />
        <DesgloseCategorias titulo="Entró por categoría" filas={desglosarPorCategoria(todos, 'ingreso')} tono="verde" />
      </div>

      <AvisoSinComprobante cantidad={sinComprobante.length} activo={soloSinComprobante} periodo={periodo} />

      {/* Punto de equilibrio: la pregunta real del negocio. */}
      {margenUnitario > 0 && todos.length > 0 && (
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
              <p className="text-[15px] text-gris">{soloSinComprobante ? 'Todos los egresos tienen comprobante.' : 'Nada registrado en este periodo.'}</p>
              <p className="mt-1 text-[13px] text-gris">Prueba con otro periodo o anota un movimiento.</p>
            </div>
          ) : (
            <ListaMovimientos
              lista={lista}
              comprobante={(m) => (m.voucher_path ? <Comprobante ruta={m.voucher_path} nombre={m.voucher_nombre} /> : null)}
            />
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
