import Link from 'next/link'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { clp } from '@/lib/formato'
import { Tendencia } from '@/components/tendencia'
import { IconoMas, IconoStock, IconoProductos } from '@/components/iconos'

export const dynamic = 'force-dynamic'

const DIAS_TENDENCIA = 14

/** Estados que ya cuentan como venta hecha. */
const VENDIDOS = ['pagado', 'preparando', 'enviado', 'entregado', 'completado']

const TONO_ESTADO: Record<string, string> = {
  pendiente: 'bg-ambar/10 text-ambar',
  pagado: 'bg-verde/10 text-verde',
  preparando: 'bg-verde/10 text-verde',
  enviado: 'bg-verde/10 text-verde',
  entregado: 'bg-verde/10 text-verde',
  completado: 'bg-verde/10 text-verde',
  cancelado: 'bg-gris/15 text-gris',
}

/** «hace 2 h» dice más que una fecha cuando lo que importa es qué tan reciente es. */
function haceCuanto(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const horas = Math.round(min / 60)
  if (horas < 24) return `hace ${horas} h`
  const dias = Math.round(horas / 24)
  if (dias === 1) return 'ayer'
  if (dias < 30) return `hace ${dias} días`
  return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short' })
}

function saludo(): string {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export default async function Resumen() {
  const yo = await integranteActual()
  const supabase = await crearClienteServidor()

  const desde = new Date(Date.now() - DIAS_TENDENCIA * 86_400_000).toISOString()

  const [{ data: stock }, { data: productos }, { data: recientes }, { data: delPeriodo }, { data: actividad }] =
    await Promise.all([
      supabase.from('v_stock_actual').select('producto_id,sku,nombre,stock'),
      supabase.from('productos').select('id,nombre,precio_base,costo_unitario,activo'),
      supabase
        .from('pedidos')
        .select('id,numero,cliente_nombre,estado,total_clp,created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('pedidos')
        .select('estado,total_clp,created_at')
        .gte('created_at', desde),
      supabase
        .from('actividad_tienda')
        .select('id,accion,entidad,detalle,created_at,dim_integrantes(nombre)')
        .order('created_at', { ascending: false })
        .limit(8),
    ])

  const unidades = (stock ?? []).reduce((a, s) => a + (s.stock ?? 0), 0)
  const precioPorProducto = new Map(
    (productos ?? []).map((p) => [p.id, Number(p.precio_base ?? 0)])
  )
  const costoPorProducto = new Map(
    (productos ?? []).map((p) => [p.id, Number(p.costo_unitario ?? 0)])
  )

  const valorInventario = (stock ?? []).reduce(
    (a, s) => a + (s.stock ?? 0) * (precioPorProducto.get(s.producto_id) ?? 0),
    0
  )
  const costoInventario = (stock ?? []).reduce(
    (a, s) => a + (s.stock ?? 0) * (costoPorProducto.get(s.producto_id) ?? 0),
    0
  )

  const periodo = delPeriodo ?? []
  const vendido = periodo
    .filter((p) => VENDIDOS.includes(p.estado))
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const porCobrar = periodo
    .filter((p) => p.estado === 'pendiente')
    .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
  const pendientes = periodo.filter((p) => p.estado === 'pendiente').length

  // Serie por día: se parte de los días, no de los pedidos, para que un día
  // sin ventas valga cero en vez de desaparecer y falsear la curva.
  const serie = Array.from({ length: DIAS_TENDENCIA }, (_, i) => {
    const d = new Date(Date.now() - (DIAS_TENDENCIA - 1 - i) * 86_400_000)
    const clave = d.toISOString().slice(0, 10)
    const valor = periodo
      .filter(
        (p) => VENDIDOS.includes(p.estado) && p.created_at?.slice(0, 10) === clave
      )
      .reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
    return { dia: clave, valor }
  })

  const atajos = [
    { href: '/panel/pedidos', etiqueta: 'Nuevo pedido', Icono: IconoMas },
    { href: '/panel/stock', etiqueta: 'Mover stock', Icono: IconoStock },
    { href: '/panel/productos', etiqueta: 'Productos', Icono: IconoProductos },
  ]

  return (
    <>
      <header className="mb-6">
        <p className="text-[13px] font-medium text-gris">{saludo()},</p>
        <h1 className="text-[27px] leading-tight font-semibold tracking-[-0.024em] sm:text-[2.2rem]">
          {yo.nombre.split(' ')[0]}.
        </h1>
      </header>

      {/* ── Tarjeta principal ──────────────────────────────────────
          Una sola cifra manda: lo vendido. Las demás la acompañan, no
          compiten con ella. */}
      <section
        aria-label="Ventas recientes"
        className="entra overflow-hidden rounded-[var(--radius-tarjeta)] bg-tinta p-5 text-papel
                   shadow-[var(--shadow-alzado)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[12px] font-semibold tracking-[0.05em] text-white/55 uppercase">
              Vendido
            </p>
            <p className="cifra mt-1.5 text-[2.1rem] leading-none font-semibold">
              {clp(vendido)}
            </p>
            <p className="mt-1.5 text-[13px] text-white/55">
              últimos {DIAS_TENDENCIA} días
            </p>
          </div>

          {porCobrar > 0 && (
            <Link
              href="/panel/pedidos"
              className="presionable shrink-0 rounded-full bg-white/10 px-3 py-1.5 text-right
                         text-[12px] leading-tight text-white/85 backdrop-blur-sm"
            >
              <span className="cifra block font-semibold">{clp(porCobrar)}</span>
              por cobrar
            </Link>
          )}
        </div>

        <div className="mt-4 text-verde">
          <Tendencia puntos={serie} etiqueta="Ventas por día" />
        </div>
      </section>

      {/* ── Atajos ────────────────────────────────────────────────
          Lo que se hace todos los días, a un toque y al alcance del pulgar. */}
      <nav aria-label="Acciones rápidas" className="mt-4 grid grid-cols-3 gap-2.5">
        {atajos.map(({ href, etiqueta, Icono }, i) => (
          <Link
            key={href}
            href={href}
            style={{ animationDelay: `${60 + i * 45}ms` }}
            className="entra presionable flex min-h-[68px] flex-col items-center justify-center gap-1.5
                       rounded-[14px] bg-papel px-2 py-3 text-center shadow-[var(--shadow-sutil)]
                       ring-1 ring-borde/60"
          >
            <Icono size={20} className="text-spark" />
            <span className="text-[12px] leading-tight font-medium">{etiqueta}</span>
          </Link>
        ))}
      </nav>

      {/* ── Métricas ──────────────────────────────────────────────── */}
      <section
        aria-label="Inventario"
        className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4"
      >
        <Metrica
          rotulo="Stock"
          valor={String(unidades)}
          nota={unidades === 1 ? 'unidad disponible' : 'unidades disponibles'}
          alerta={unidades === 0}
          retraso={0}
        />
        <Metrica
          rotulo="Por gestionar"
          valor={String(pendientes)}
          nota={pendientes === 0 ? 'todo al día' : 'pedidos pendientes'}
          alerta={pendientes > 0}
          retraso={45}
        />
        <Metrica
          rotulo="Inventario"
          valor={clp(valorInventario)}
          nota="a precio de lista"
          retraso={90}
        />
        {yo.ver_finanzas && (
          <Metrica
            rotulo="Margen potencial"
            valor={clp(valorInventario - costoInventario)}
            nota={`sobre ${clp(costoInventario)} de costo`}
            retraso={135}
          />
        )}
      </section>

      {/* ── Actividad ─────────────────────────────────────────────── */}
      <section className="mt-8" aria-label="Últimos pedidos">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-[17px] font-semibold tracking-cuerpo">Últimos pedidos</h2>
          <Link
            href="/panel/pedidos"
            className="inline-flex min-h-11 items-center rounded-md px-2 -mr-2 text-[14px] font-medium text-spark hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {!recientes?.length ? (
          <div className="rounded-[var(--radius-tarjeta)] bg-papel px-6 py-12 text-center ring-1 ring-borde/70">
            <p className="text-[15px] font-medium">Todavía no hay pedidos.</p>
            <p className="mx-auto mt-1.5 max-w-xs text-[13px] text-gris">
              Aparecerán acá apenas entre el primero, desde la tienda o cargado a mano.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-borde/60 overflow-hidden rounded-[var(--radius-tarjeta)] bg-papel ring-1 ring-borde/60">
            {recientes.map((p) => (
              <li key={p.id}>
                <Link
                  href="/panel/pedidos"
                  className="presionable flex items-center gap-3 px-4 py-3.5 hover:bg-papel-alt/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium">
                      {p.cliente_nombre || `Pedido ${p.numero ?? ''}`}
                    </p>
                    <p className="mt-0.5 text-[12px] text-gris">
                      {haceCuanto(p.created_at)}
                    </p>
                  </div>

                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ${
                      TONO_ESTADO[p.estado] ?? 'bg-gris/15 text-gris'
                    }`}
                  >
                    {p.estado}
                  </span>

                  <span className="cifra shrink-0 text-[14px] font-semibold">
                    {clp(p.total_clp)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Bitácora ──────────────────────────────────────────────
          Quién hizo qué. La escribe la base por triggers, así que no se
          escapa ningún cambio aunque no venga del panel. */}
      {!!actividad?.length && (
        <section className="mt-8" aria-label="Actividad del equipo">
          <h2 className="mb-3 text-[17px] font-semibold tracking-cuerpo">Actividad del equipo</h2>
          <ol className="space-y-3 border-l border-borde/70 pl-5">
            {actividad.map((a) => (
              <li key={a.id} className="relative">
                <span aria-hidden className="absolute top-1.5 -left-[25px] size-2.5 rounded-full bg-papel ring-2 ring-spark/60" />
                <p className="text-[14px] leading-snug">
                  <span className="font-medium first-letter:uppercase">{a.accion}</span>{" "}
                  <span className="text-tinta-suave">{a.entidad}</span>
                  {a.detalle && <span className="font-medium"> · {a.detalle}</span>}
                </p>
                <p className="mt-0.5 text-[12px] text-gris">
                  {[(a.dim_integrantes as { nombre?: string } | null)?.nombre ?? 'Sistema', haceCuanto(a.created_at)].join(' · ')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </>
  )
}

function Metrica({
  rotulo,
  valor,
  nota,
  alerta,
  retraso,
}: {
  rotulo: string
  valor: string
  nota?: string
  /** Pide atención sin gritar: un punto, no una tarjeta roja entera. */
  alerta?: boolean
  retraso: number
}) {
  return (
    <div
      style={{ animationDelay: `${retraso}ms` }}
      className="entra rounded-[14px] bg-papel p-4 shadow-[var(--shadow-sutil)] ring-1 ring-borde/60"
    >
      <div className="flex items-center gap-1.5">
        {alerta && (
          <span aria-hidden className="size-1.5 rounded-full bg-ambar" />
        )}
        <p className="text-[11px] font-semibold tracking-[0.04em] text-gris uppercase">
          {rotulo}
        </p>
      </div>
      <p className="cifra mt-2 text-[1.4rem] leading-none font-semibold">{valor}</p>
      {nota && <p className="mt-1.5 text-[12px] leading-snug text-gris">{nota}</p>}
    </div>
  )
}
