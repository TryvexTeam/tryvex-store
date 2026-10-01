import Link from 'next/link'
import { clp } from '@/lib/formato'
import { Tendencia } from '@/components/tendencia'
import { IconoMas, IconoStock, IconoProductos, IconoFinanzas } from '@/components/iconos'
import { TarjetaTryvex } from '@/components/panel/tarjeta-tryvex'
import { AccionRedonda, Avatar, CambioPildora, EncabezadoDia, MontoGrande, agruparPorDia, horaCorta } from '@/components/panel/fintech'

/**
 * Portada del panel: solo presentación. Recibe los datos ya calculados, así que
 * la misma pieza sirve para la página real y para una vista de prueba con datos
 * falsos (el panel exige sesión, y sin ella no se puede ver el diseño).
 */

export const DIAS_TENDENCIA = 14

/** Estados que ya cuentan como venta hecha. */
export const VENDIDOS = ['pagado', 'preparando', 'enviado', 'entregado', 'completado']

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


export interface PedidoReciente {
  id: string
  numero: number | string | null
  cliente_nombre: string | null
  estado: string
  total_clp: number | string | null
  created_at: string
}

export interface ActividadReciente {
  id: string | number
  accion: string
  entidad: string
  detalle: string | null
  created_at: string
  dim_integrantes: unknown
}

export interface DatosResumen {
  nombre: string
  verFinanzas: boolean
  recientes: PedidoReciente[] | null
  actividad: ActividadReciente[] | null
  serie: { dia: string; valor: number }[]
  vendido: number
  vendidoAnterior: number
  porCobrar: number
  pendientes: number
  unidades: number
  valorInventario: number
  costoInventario: number
  /** Lo que va entre el saludo y el saldo (la tarjeta de avisos del teléfono). */
  avisos?: React.ReactNode
}

export function ResumenPanel({
  nombre: nombreIntegrante,
  verFinanzas,
  recientes,
  actividad,
  serie,
  vendido,
  vendidoAnterior,
  porCobrar,
  pendientes,
  unidades,
  valorInventario,
  costoInventario,
  avisos,
}: DatosResumen) {
  const atajos = [
    { href: '/panel/pedidos', etiqueta: 'Nuevo pedido', Icono: IconoMas },
    { href: '/panel/stock', etiqueta: 'Mover stock', Icono: IconoStock },
    { href: '/panel/productos', etiqueta: 'Productos', Icono: IconoProductos },
    ...(verFinanzas ? [{ href: '/panel/finanzas', etiqueta: 'Finanzas', Icono: IconoFinanzas }] : []),
  ]

  return (
    <>
      <header className="mb-6">
        <p className="text-[13px] font-medium text-gris">{saludo()},</p>
        <h1 className="text-[27px] leading-tight font-semibold tracking-[-0.024em] sm:text-[2.2rem]">
          {nombreIntegrante.split(' ')[0]}.
        </h1>
      </header>

      {avisos}

      {/* ── Saldo ───────────────────────────────────────────────────
          La plata va DENTRO de la tarjeta: una sola cifra manda, enorme. El cambio frente
          al periodo anterior dice si se vende más o menos, que es lo que se
          quiere saber antes de leer el número. Debajo, como en una app de
          dinero, la tarjeta: al darle la vuelta muestra lo «por cobrar». */}
      <div className="entra mx-auto w-full max-w-[420px] lg:max-w-[460px]">
        <TarjetaTryvex
          nombre={nombreIntegrante}
          etiquetaMonto={`Vendido · últimos ${DIAS_TENDENCIA} días`}
          monto={<MontoGrande valor={vendido} className="tarjeta-relieve-grande mt-2" tamano="text-[clamp(30px,10.5vw,44px)]" />}
          cambio={<CambioPildora actual={vendido} anterior={vendidoAnterior} oscuro />}
          tendencia={<Tendencia puntos={serie} etiqueta="Ventas por día" />}
          porCobrar={clp(porCobrar)}
          etiquetaPorCobrar="Por cobrar"
        />
      </div>

      {/* ── Acciones ────────────────────────────────────────────────
          Redondas y con la etiqueta debajo, al alcance del pulgar. */}
      <nav
        aria-label="Acciones rápidas"
        style={{ gridTemplateColumns: `repeat(${atajos.length}, minmax(0, 1fr))` }}
        className="mt-7 grid gap-2 lg:max-w-[540px]"
      >
        {atajos.map(({ href, etiqueta, Icono }, i) => (
          <AccionRedonda key={href} href={href} etiqueta={etiqueta} Icono={Icono} retraso={70 + i * 45} />
        ))}
      </nav>

      {/* ── Métricas ──────────────────────────────────────────────── */}
      <section aria-label="Inventario" className="mt-7 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
        <Metrica rotulo="Inventario" valor={clp(valorInventario)} nota="a precio de lista" retraso={90} />
        {verFinanzas && (
          <Metrica
            rotulo="Margen potencial"
            valor={clp(valorInventario - costoInventario)}
            nota={`sobre ${clp(costoInventario)} de costo`}
            retraso={135}
          />
        )}
      </section>

      {/* ── Movimientos: agrupados por día, como el extracto de una cuenta ── */}
      <section className="mt-9" aria-label="Últimos pedidos">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-[19px] font-semibold tracking-cuerpo">Últimos pedidos</h2>
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
          agruparPorDia(recientes, (p) => p.created_at).map((g) => {
            const netoDelDia = g.items.filter((p) => VENDIDOS.includes(p.estado)).reduce((a, p) => a + Number(p.total_clp ?? 0), 0)
            return (
              <div key={g.clave}>
                <EncabezadoDia etiqueta={g.etiqueta} neto={netoDelDia > 0 ? netoDelDia : undefined} />
                <ul className="divide-y divide-borde/50 overflow-hidden rounded-[22px] bg-papel ring-1 ring-borde/60">
                  {g.items.map((p, i) => {
                    const vendida = VENDIDOS.includes(p.estado)
                    const nombre = p.cliente_nombre || `Pedido ${p.numero ?? ''}`
                    return (
                      <li key={p.id} style={{ animationDelay: `${i * 35}ms` }} className="entra">
                        <Link href="/panel/pedidos" className="presionable flex items-center gap-3.5 px-4 py-3.5 hover:bg-papel-alt/60">
                          <Avatar texto={nombre} tono={vendida ? 'verde' : p.estado === 'pendiente' ? 'ambar' : 'neutro'} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[15px] font-medium">{nombre}</p>
                            <p className="mt-0.5 truncate text-[12.5px] text-gris">
                              Pedido #{p.numero} · {horaCorta(p.created_at)} · <span className="capitalize">{p.estado}</span>
                            </p>
                          </div>
                          <span className={`cifra shrink-0 text-[15px] font-semibold ${vendida ? 'text-verde' : p.estado === 'cancelado' ? 'text-gris line-through' : 'text-tinta'}`}>
                            {vendida && <span aria-hidden>+</span>}
                            {vendida && <span className="sr-only">más </span>}
                            {clp(p.total_clp)}
                          </span>
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )
          })
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
      className="entra rounded-[20px] bg-papel p-4 shadow-[var(--shadow-sutil)] ring-1 ring-borde/60"
    >
      <div className="flex items-center gap-1.5">
        {alerta && <span aria-hidden className="size-1.5 rounded-full bg-ambar" />}
        <p className="text-[13px] font-medium text-gris">{rotulo}</p>
      </div>
      <p className="cifra mt-2.5 text-[clamp(1.2rem,5.6vw,1.65rem)] leading-none font-semibold tracking-[-0.02em]">{valor}</p>
      {nota && <p className="mt-2 text-[12.5px] leading-snug text-gris">{nota}</p>}
    </div>
  )
}
