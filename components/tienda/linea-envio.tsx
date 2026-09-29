import type { PedidoCuenta } from '@/lib/cuenta'

/**
 * Recorrido del pedido, contado en nuestra web.
 *
 * El código del courier se muestra acá como dato —copiable— y no como un enlace
 * que empuje al comprador fuera del sitio. Quien quiera entrar a la página del
 * courier puede, pero no se le obliga: el estado de su compra lo cuenta la
 * tienda donde compró.
 *
 * Cómo se lee:
 *   · check en círculo verde  → paso completado
 *   · círculo rojo que gira   → paso en curso
 *   · anillo gris             → todavía no
 * El trazo entre dos pasos completados va lleno. Mientras el pedido se está
 * preparando, el trazo hacia la sucursal avanza animado hasta la mitad: el
 * paquete ya salió de la cola, pero todavía no llega al courier.
 *
 * Los pasos se derivan del estado del pedido y de sus hitos. Un paso posterior
 * da por cumplidos los anteriores: si el pedido va en camino, ya pasó por la
 * sucursal aunque el equipo no haya cargado el código. Nunca queda un hueco en
 * medio del recorrido.
 */

type EstadoPaso = 'hecho' | 'actual' | 'pendiente'
/** Cómo va el trazo que sale de este paso hacia el siguiente. */
type Avance = 'lleno' | 'mitad' | 'vacio'

interface Paso {
  titulo: string
  detalle: string | null
  cuando: string | null
  estado: EstadoPaso
  avance: Avance
}

// El servidor de Vercel corre en UTC: sin zona explícita, un pago de la 1 p. m.
// en Santiago se mostraba a las 4 p. m.
const hora = new Intl.DateTimeFormat('es-CL', {
  timeZone: 'America/Santiago',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
})

function formatear(fecha: string | null): string | null {
  if (!fecha) return null
  const d = new Date(fecha)
  return Number.isNaN(d.getTime()) ? null : hora.format(d)
}

/** Etapa alcanzada, de 0 (sin pagar) a 4 (entregado). Siempre avanza, nunca salta. */
function etapaDe(pedido: PedidoCuenta): number {
  const e = pedido.estado
  if (pedido.entregadoEn || e === 'entregado') return 4
  if (pedido.enviadoEn || e === 'enviado') return 3
  if (pedido.codigoSeguimiento) return 2
  if (e === 'preparando') return 1.5
  if (pedido.pagadoEn || e === 'pagado') return 1
  return 0
}

export function pasosDelPedido(pedido: PedidoCuenta): Paso[] {
  if (pedido.estado === 'cancelado') {
    return [
      {
        titulo: 'Pedido cancelado',
        detalle: 'Si fue un error, escríbenos y lo resolvemos.',
        cuando: formatear(pedido.fecha),
        estado: 'actual',
        avance: 'vacio',
      },
    ]
  }

  const etapa = etapaDe(pedido)
  const retiroEnPunto = pedido.tipoEntrega === 'sucursal'
  const retiroEnPersona = pedido.tipoEntrega === 'retiro'

  // Cada paso sabe en qué etapa empieza y en cuál queda completo.
  const definicion: { titulo: string; detalle: string | null; cuando: string | null; desde: number; hasta: number }[] = [
    {
      titulo: 'Preparando tu pedido',
      detalle:
        etapa === 1
          ? 'Pago recibido. Tu pedido está en la fila para prepararse.'
          : etapa === 1.5
            ? 'Lo estamos empaquetando.'
            : null,
      cuando: formatear(pedido.pagadoEn),
      desde: 1,
      hasta: 1.5,
    },
    ...(retiroEnPersona
      ? [
          {
            titulo: 'Listo para retirar',
            detalle: etapa >= 3 && etapa < 4 ? 'Te esperamos para entregártelo.' : null,
            cuando: formatear(pedido.enviadoEn),
            desde: 3,
            hasta: 4,
          },
        ]
      : [
          {
            titulo: 'En sucursal de envío',
            detalle: pedido.codigoSeguimiento ? `${pedido.courier ?? 'Courier'} · ${pedido.codigoSeguimiento}` : null,
            cuando: null,
            desde: 2,
            hasta: 3,
          },
          {
            titulo: retiroEnPunto ? 'En camino a tu punto de retiro' : 'En camino',
            detalle: null,
            cuando: formatear(pedido.enviadoEn),
            desde: 3,
            hasta: 4,
          },
        ]),
    {
      titulo: retiroEnPunto || retiroEnPersona ? 'Retirado' : 'Entregado',
      detalle: null,
      cuando: formatear(pedido.entregadoEn),
      desde: 4,
      hasta: 4,
    },
  ]

  const pasos: Paso[] = definicion.map((d, i) => {
    const siguiente = definicion[i + 1]
    // Un paso queda completo al alcanzar su etapa final; el último, al llegar.
    const hecho = etapa >= d.hasta
    const estado: EstadoPaso = hecho ? 'hecho' : etapa >= d.desde ? 'actual' : 'pendiente'
    const avance: Avance = !siguiente
      ? 'vacio'
      : etapa >= siguiente.desde
        ? 'lleno'
        : hecho
          ? 'mitad'
          : 'vacio'
    return { titulo: d.titulo, detalle: d.detalle, cuando: d.cuando, estado, avance }
  })

  // Mientras el pago no esté acreditado no se promete nada: el recorrido no
  // empieza hasta que hay plata, porque el paquete tampoco se prepara antes.
  if (etapa === 0) {
    return [
      {
        titulo: 'Esperando el pago',
        detalle: 'Apenas se acredite, empezamos a preparar tu pedido.',
        cuando: null,
        estado: 'actual',
        avance: 'vacio',
      },
      ...pasos,
    ]
  }
  return pasos
}

/** El punto del hito: check en verde, círculo rojo que gira, o anillo gris. */
function Hito({ estado, retraso }: { estado: EstadoPaso; retraso: number }) {
  if (estado === 'hecho') {
    return (
      <span
        aria-hidden
        className="envio-hito grid size-[20px] shrink-0 place-items-center rounded-full bg-verde text-white shadow-[0_1px_3px_rgba(29,158,75,0.35)]"
        style={{ animationDelay: `${retraso}ms` }}
      >
        <svg viewBox="0 0 12 12" className="size-[11px]" fill="none">
          <path d="M2.2 6.3 4.8 8.8 9.8 3.4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    )
  }
  if (estado === 'actual') {
    return (
      <span aria-hidden className="envio-hito relative grid size-[20px] shrink-0 place-items-center" style={{ animationDelay: `${retraso}ms` }}>
        {/* Riel tenue y arco rojo que gira sobre él: «en curso». */}
        <span className="absolute inset-0 rounded-full border-2 border-spark/20" />
        <span className="envio-giro absolute inset-0 rounded-full border-2 border-transparent border-t-spark border-r-spark" />
        <span className="size-[6px] rounded-full bg-spark" />
      </span>
    )
  }
  return (
    <span
      aria-hidden
      className="envio-hito block size-[20px] shrink-0 rounded-full bg-papel ring-2 ring-inset ring-borde"
      style={{ animationDelay: `${retraso}ms` }}
    />
  )
}

/**
 * El trazo entre dos hitos: un riel gris siempre visible y, encima, lo
 * recorrido. `mitad` avanza animado hasta la mitad y su punta late: el pedido
 * se mueve hacia el siguiente paso, pero todavía no llega.
 */
function Trazo({ avance, retraso, eje }: { avance: Avance; retraso: number; eje: 'v' | 'h' }) {
  const vertical = eje === 'v'
  return (
    <span
      aria-hidden
      className={`relative flex-1 overflow-visible rounded-full bg-borde ${vertical ? 'w-[2px]' : 'h-[2px]'}`}
      style={vertical ? { minHeight: 24 } : undefined}
    >
      {avance !== 'vacio' && (
        <span
          className={`absolute rounded-full bg-verde ${avance === 'lleno' ? 'envio-trazo-lleno' : 'envio-trazo-mitad'} ${
            vertical ? 'inset-x-0 top-0' : 'inset-y-0 left-0'
          }`}
          style={{
            ...(vertical ? { height: avance === 'lleno' ? '100%' : '50%' } : { width: avance === 'lleno' ? '100%' : '50%' }),
            animationDelay: `${retraso}ms`,
          }}
        >
          {avance === 'mitad' && (
            <span
              className={`envio-punta absolute size-[8px] rounded-full bg-verde ${
                vertical ? 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2' : 'top-1/2 right-0 translate-x-1/2 -translate-y-1/2'
              }`}
            />
          )}
        </span>
      )}
    </span>
  )
}

/**
 * Retraso entre hitos.
 *
 * Corto a propósito: mientras la animación no arranca, el texto todavía no se
 * ve, así que una cascada larga deja la tarjeta en blanco justo al abrir. Con
 * este valor el recorrido completo termina en menos de medio segundo.
 */
const PASO_MS = 70

function Textos({ paso, compacto }: { paso: Paso; compacto: boolean }) {
  const activo = paso.estado !== 'pendiente'
  return (
    <>
      <p className={`${compacto ? 'text-[14px]' : 'text-[15px]'} leading-snug ${activo ? 'font-semibold text-tinta' : 'text-tinta-suave'}`}>
        {paso.titulo}
      </p>
      {paso.cuando && <p className={`cifra mt-0.5 ${compacto ? 'text-[12px]' : 'text-[13px]'} text-tinta-suave`}>{paso.cuando}</p>}
      {paso.detalle && (
        <p className={`mt-0.5 ${compacto ? 'text-[12px]' : 'text-[13px]'} break-words ${paso.estado === 'actual' ? 'text-spark' : 'text-tinta-suave'}`}>
          {paso.detalle}
        </p>
      )}
    </>
  )
}

export function LineaEnvio({ pedido }: { pedido: PedidoCuenta }) {
  const pasos = pasosDelPedido(pedido)

  return (
    <>
      {/* Teléfono: vertical. Cada hito tiene su renglón y el texto respira. */}
      <ol className="mt-4 grid gap-0 t:hidden">
        {pasos.map((paso, i) => {
          const ultimo = i === pasos.length - 1
          const retraso = i * PASO_MS
          return (
            <li key={paso.titulo} className="grid grid-cols-[22px_1fr] gap-x-3">
              <div className="grid justify-items-center">
                <span className="mt-[1px]">
                  <Hito estado={paso.estado} retraso={retraso} />
                </span>
                {!ultimo && (
                  <span className="my-1.5 flex flex-1 justify-center">
                    <Trazo avance={paso.avance} retraso={retraso + 60} eje="v" />
                  </span>
                )}
              </div>
              <div className={`envio-texto ${ultimo ? 'pb-0' : 'pb-5'}`} style={{ animationDelay: `${retraso + 40}ms` }}>
                <Textos paso={paso} compacto={false} />
              </div>
            </li>
          )
        })}
      </ol>

      {/* Tablet y escritorio: horizontal. Columnas de ancho igual —si no, el
          texto largo de un paso se come el riel del siguiente— con el hito
          arriba y su etiqueta debajo, para leer el recorrido de un vistazo. */}
      <ol className="mt-5 hidden t:grid" style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}>
        {pasos.map((paso, i) => {
          const ultimo = i === pasos.length - 1
          const retraso = i * PASO_MS
          return (
            <li key={paso.titulo} className="min-w-0">
              <div className="flex h-[20px] items-center gap-2.5">
                <Hito estado={paso.estado} retraso={retraso} />
                {!ultimo && <Trazo avance={paso.avance} retraso={retraso + 60} eje="h" />}
              </div>
              <div className="envio-texto mt-3 pr-5" style={{ animationDelay: `${retraso + 40}ms` }}>
                <Textos paso={paso} compacto />
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
