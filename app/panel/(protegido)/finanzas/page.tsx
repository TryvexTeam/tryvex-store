import { redirect } from 'next/navigation'
import { clp } from '@/lib/formato'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual, NEGOCIO_TIENDA } from '@/lib/sesion'
import { ResumenFinanzas, ListaMovimientos, type Movimiento } from '@/components/panel/finanzas-vista'
import { SelectorPeriodo, DesgloseCategorias, AvisoSinComprobante, CuentasPorMetodo, CapitalSocios, PestanasMovimientos, desglosarPorCategoria, type FiltroTipo } from '@/components/panel/finanzas-extras'
import { agruparPorMetodo } from '@/lib/cuentas'
import { calcularCapital, CATEGORIA_APORTE } from '@/lib/capital'
import { calcularResultado } from '@/lib/resultado'
import { calcularCuadre, calcularRecuperacion, stockPropioACosto } from '@/lib/cuadre'
import { saldosDeEfectivo, totalPorDepositar } from '@/lib/efectivo'
import { CuadreDeCaja } from '@/components/panel/cuadre-caja'
import { ResultadoNegocio, NosDeben, ValorStock } from '@/components/panel/resultado-negocio'
import { BotonImprimir } from '@/components/panel/boton-imprimir'
import { BotonEnlace } from '@/components/panel/ui'
import { resolverPeriodo, queryDePeriodo } from '@/lib/periodo'
import FormularioMovimiento from './formulario'
import Comprobante from './comprobante'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Finanzas' }

/** «Ventas $436.000 · Aporte de socio $480.000»: las tres categorías más grandes y cuántas más hay. */
function resumirCategorias(filas: { etiqueta: string; total: number }[]): string {
  const principales = filas.slice(0, 3).map((f) => `${f.etiqueta} ${clp(f.total)}`).join(' · ')
  return filas.length > 3 ? `${principales} · y ${filas.length - 3} más` : principales
}

export default async function Finanzas({ searchParams }: { searchParams: Promise<{ periodo?: string; desde?: string; hasta?: string; sin?: string; tipo?: string }> }) {
  const yo = await integranteActual()
  const params = await searchParams
  const periodo = resolverPeriodo(params)
  const soloSinComprobante = params.sin === '1'
  const filtroTipo: FiltroTipo = params.tipo === 'ingreso' || params.tipo === 'egreso' ? params.tipo : 'todos'

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

  // Movimientos de stock del periodo (en hora de Santiago: -04:00 al inicio y -03:00 al final cubren el cambio de horario).
  let consultaStock = supabase
    .from('stock_movimientos')
    .select('producto_id,tipo,cantidad,total_clp')
    .in('tipo', ['venta', 'devolucion', 'merma', 'uso_interno', 'regalo', 'ajuste'])
    .limit(20000)
  if (periodo.desde) consultaStock = consultaStock.gte('created_at', `${periodo.desde}T00:00:00-04:00`)
  if (periodo.hasta) consultaStock = consultaStock.lte('created_at', `${periodo.hasta}T23:59:59-03:00`)

  const [{ data: movs }, { data: movsAnteriores }, { data: aportesSocios }, { data: comprasStock }, { data: stock }, { data: productos }, { data: movsStock }, { data: porCobrarPedidos }, { data: saldoRows }, { data: efectivoRows }, { data: integrantes }, { data: todosLosMovs }, { data: previasStock }, { data: retirosSocios }] = await Promise.all([
    consulta,
    consultaAnterior ?? Promise.resolve({ data: null }),
    // El capital es de TODO el historial, no del periodo que se esté mirando.
    supabase.from('movimientos_financieros').select('contraparte,monto_clp').eq('negocio', NEGOCIO_TIENDA).eq('tipo', 'ingreso').eq('categoria', CATEGORIA_APORTE).limit(2000),
    supabase.from('movimientos_financieros').select('monto_clp').eq('negocio', NEGOCIO_TIENDA).eq('tipo', 'egreso').eq('categoria', 'Inventario e insumos').limit(5000),
    supabase.from('v_stock_actual').select('producto_id,stock'),
    supabase.from('productos').select('id,precio_base,costo_unitario'),
    consultaStock,
    supabase.from('pedidos').select('numero,cliente_nombre,total_clp').eq('estado', 'pendiente').order('numero', { ascending: true }).limit(200),
    // Cuadre de caja: lo declarado (cuenta y efectivo), lo que el sistema espera y el stock previo de un integrante.
    supabase.from('saldo_cuenta').select('monto_clp,fecha,nota').order('created_at', { ascending: false }).limit(1),
    supabase.from('efectivo_por_depositar').select('id,integrante_id,tipo,monto_clp,fecha,nota').order('fecha', { ascending: false }).order('created_at', { ascending: false }).limit(500),
    supabase.from('dim_integrantes').select('id,nombre').eq('activo', true).order('nombre'),
    supabase.from('movimientos_financieros').select('tipo,monto_clp').eq('negocio', NEGOCIO_TIENDA).limit(20000),
    supabase.from('stock_movimientos').select('producto_id,cantidad').eq('tipo', 'ingreso').ilike('motivo', 'Stock previo%').limit(1000),
    supabase.from('movimientos_financieros').select('contraparte,monto_clp').eq('negocio', NEGOCIO_TIENDA).eq('tipo', 'egreso').eq('categoria', 'Retiro de socio').limit(2000),
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

  const capital = calcularCapital(aportesSocios ?? [], (comprasStock ?? []).reduce((a, m) => a + n(m.monto_clp), 0), retirosSocios ?? [])

  const sinComprobante = todos.filter((m) => m.tipo === 'egreso' && !m.voucher_path)
  const base = soloSinComprobante ? sinComprobante : todos
  const lista = (filtroTipo === 'todos' || soloSinComprobante ? base : base.filter((m) => m.tipo === filtroTipo)).slice(0, 200)
  const cuentas = agruparPorMetodo(todos)
  const conteoTipos = { todos: todos.length, ingreso: todos.filter((m) => m.tipo === 'ingreso').length, egreso: todos.filter((m) => m.tipo === 'egreso').length }
  const truncado = todos.length >= LIMITE

  // ── Resultado: ganancia, lo que nos deben y lo que hay en bodega ─────
  const costoPor = new Map((productos ?? []).map((p) => [p.id as string, n(p.costo_unitario ?? 0)]))
  const precioPor = new Map((productos ?? []).map((p) => [p.id as string, n(p.precio_base ?? 0)]))
  const resultado = calcularResultado(movsStock ?? [], costoPor)
  const filasStock = (stock ?? []).filter((f) => n(f.stock ?? 0) > 0)
  const valorStock = {
    unidades: filasStock.reduce((a, f) => a + n(f.stock), 0),
    aCosto: filasStock.reduce((a, f) => a + n(f.stock) * (costoPor.get(f.producto_id) ?? 0), 0),
    aPrecio: filasStock.reduce((a, f) => a + n(f.stock) * (precioPor.get(f.producto_id) ?? 0), 0),
    productos: filasStock.length,
  }
  // ── Cuadre de caja ────────────────────────────────────────────────
  const esperado = (todosLosMovs ?? []).reduce((a, m) => a + (m.tipo === 'ingreso' ? n(m.monto_clp) : -n(m.monto_clp)), 0)
  const saldoVigente = saldoRows?.[0] ? { monto: n(saldoRows[0].monto_clp), fecha: String(saldoRows[0].fecha), nota: (saldoRows[0].nota as string | null) ?? null } : null
  const saldosEfectivo = saldosDeEfectivo(efectivoRows ?? [])
  const cuadre = calcularCuadre({ esperado, enCuenta: saldoVigente?.monto ?? 0, enEfectivo: totalPorDepositar(saldosEfectivo) })
  const nombreDe = new Map((integrantes ?? []).map((i) => [i.id as string, i.nombre as string]))
  const personasEfectivo = (integrantes ?? []).map((i) => ({ id: i.id as string, nombre: i.nombre as string, saldo: saldosEfectivo.find((s) => s.integranteId === i.id)?.saldo ?? 0 }))
  const historialEfectivo = (efectivoRows ?? []).slice(0, 20).map((m) => ({ id: m.id as string, persona: nombreDe.get(m.integrante_id) ?? 'Alguien', tipo: m.tipo as 'recibe' | 'deposita', monto: n(m.monto_clp), fecha: String(m.fecha), nota: (m.nota as string | null) ?? null }))
  const previas = new Map<string, number>()
  for (const m of previasStock ?? []) previas.set(m.producto_id, (previas.get(m.producto_id) ?? 0) + n(m.cantidad))
  const stockPropio = stockPropioACosto(filasStock.map((f) => ({ producto_id: f.producto_id, stock: n(f.stock), costo: costoPor.get(f.producto_id) ?? 0 })), previas)
  const totalPorCobrar = (porCobrarPedidos ?? []).reduce((a, p) => a + n(p.total_clp), 0)
  const recuperacion = calcularRecuperacion({ aportado: capital.totalAportado, hay: cuadre.hay, stockPropioACosto: stockPropio, porCobrar: totalPorCobrar })

  const pedidosPorCobrar = (porCobrarPedidos ?? []).map((p) => ({ numero: p.numero, cliente: p.cliente_nombre ?? 'Sin nombre', total: n(p.total_clp) }))

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
      <ResumenFinanzas
        balance={balance}
        ingresos={ingresos}
        egresos={egresos}
        anterior={anterior}
        etiquetaPeriodo={periodo.etiqueta}
        detalleEntro={resumirCategorias(desglosarPorCategoria(todos, 'ingreso'))}
        detalleSalio={resumirCategorias(desglosarPorCategoria(todos, 'egreso'))}
      />

      <div className="mb-8 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <ResultadoNegocio resultado={resultado} etiquetaPeriodo={periodo.etiqueta} />
        <div className="grid gap-4 content-start">
          <NosDeben pedidos={pedidosPorCobrar} />
          <ValorStock {...valorStock} />
        </div>
      </div>

      <CuadreDeCaja cuadre={cuadre} recuperacion={recuperacion} cuenta={saldoVigente} personas={personasEfectivo} historial={historialEfectivo} puedeGestionar={Boolean(yo.gestionar_finanzas)} />

      <CapitalSocios capital={capital} />

      <CuentasPorMetodo cuentas={cuentas} />

      <div className="mb-8 grid gap-4 md:grid-cols-2">
        <DesgloseCategorias titulo="Salió por categoría" filas={desglosarPorCategoria(todos, 'egreso')} tono="spark" />
        <DesgloseCategorias titulo="Entró por categoría" filas={desglosarPorCategoria(todos, 'ingreso')} tono="verde" />
      </div>

      <AvisoSinComprobante cantidad={sinComprobante.length} activo={soloSinComprobante} periodo={periodo} />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        <section aria-label="Movimientos" className="min-w-0">
          <h2 className="mb-4 text-[1.35rem] font-semibold tracking-[-0.015em]">Movimientos</h2>
          {!soloSinComprobante && <PestanasMovimientos periodo={periodo} activa={filtroTipo} cuentas={conteoTipos} />}

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
