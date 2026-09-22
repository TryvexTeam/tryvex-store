import type { PedidoCuenta } from '@/lib/cuenta'

/**
 * Recorrido del pedido, contado en nuestra web.
 *
 * El código del courier se muestra acá como dato —copiable— y no como un enlace
 * que empuje al comprador fuera del sitio. Quien quiera entrar a la página del
 * courier puede, pero no se le obliga: el estado de su compra lo cuenta la
 * tienda donde compró.
 *
 * Los pasos se derivan de lo que ya guarda el pedido, sin estados nuevos:
 * mientras no haya código cargado, el envío sigue «preparándose», aunque el
 * equipo ya lo esté empaquetando. Nunca se anuncia un avance que no ocurrió.
 */

interface Paso {
  titulo: string
  detalle: string | null
  cuando: string | null
  estado: 'hecho' | 'actual' | 'pendiente'
}

const hora = new Intl.DateTimeFormat('es-CL', {
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

export function pasosDelPedido(pedido: PedidoCuenta): Paso[] {
  const cancelado = pedido.estado === 'cancelado'
  const pagado = Boolean(pedido.pagadoEn) || ['pagado', 'preparando', 'enviado', 'entregado'].includes(pedido.estado)
  const enSucursal = Boolean(pedido.codigoSeguimiento)
  const enCamino = Boolean(pedido.enviadoEn) || ['enviado', 'entregado'].includes(pedido.estado)
  const entregado = Boolean(pedido.entregadoEn) || pedido.estado === 'entregado'

  if (cancelado) {
    return [
      { titulo: 'Pedido cancelado', detalle: 'Si fue un error, escríbenos y lo resolvemos.', cuando: formatear(pedido.fecha), estado: 'actual' },
    ]
  }

  const marca = (condicion: boolean, siguiente: boolean): Paso['estado'] =>
    condicion ? (siguiente ? 'hecho' : 'actual') : 'pendiente'

  // Mientras el pago no esté acreditado no se promete nada: el recorrido no
  // empieza hasta que hay plata, porque el paquete tampoco se prepara antes.
  const esperandoPago: Paso[] = pagado
    ? []
    : [
        {
          titulo: 'Esperando el pago',
          detalle: 'Apenas se acredite, empezamos a preparar tu pedido.',
          cuando: null,
          estado: 'actual',
        },
      ]

  return [
    ...esperandoPago,
    {
      titulo: 'Preparando tu pedido',
      detalle: pagado && !enSucursal ? 'Lo estamos empaquetando.' : null,
      cuando: formatear(pedido.pagadoEn),
      estado: marca(pagado, enSucursal || enCamino || entregado),
    },
    {
      titulo: 'En sucursal de envío',
      detalle: pedido.codigoSeguimiento
        ? `${pedido.courier ?? 'Courier'} · ${pedido.codigoSeguimiento}`
        : null,
      cuando: null,
      estado: marca(enSucursal, enCamino || entregado),
    },
    {
      titulo: 'En camino',
      detalle: null,
      cuando: formatear(pedido.enviadoEn),
      estado: marca(enCamino, entregado),
    },
    {
      titulo: 'Entregado',
      detalle: null,
      cuando: formatear(pedido.entregadoEn),
      estado: entregado ? 'actual' : 'pendiente',
    },
  ]
}

/** El punto del hito: relleno con visto, anillo vivo, o apagado. */
function Hito({ estado, retraso }: { estado: Paso['estado']; retraso: number }) {
  return (
    <span
      aria-hidden
      className={[
        'envio-hito grid size-[15px] shrink-0 place-items-center rounded-full ring-2',
        estado === 'hecho'
          ? 'bg-spark ring-spark'
          : estado === 'actual'
            ? 'bg-papel ring-spark'
            : 'bg-papel ring-borde',
      ].join(' ')}
      style={{ animationDelay: `${retraso}ms` }}
    >
      {estado === 'hecho' && (
        <svg viewBox="0 0 10 10" className="size-[8px] text-white" fill="none" aria-hidden>
          <path d="M1.5 5.2 3.8 7.5 8.5 2.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
      {estado === 'actual' && <span className="size-[6px] rounded-full bg-spark" />}
    </span>
  )
}

/**
 * El trazo entre dos hitos.
 *
 * Son dos capas: una apagada siempre presente, y encima el trazo recorrido que
 * crece con la animación. Así el riel completo se ve desde el principio y lo
 * que se anima es el avance, no la aparición del camino.
 */
function Trazo({ recorrido, retraso, eje }: { recorrido: boolean; retraso: number; eje: 'v' | 'h' }) {
  const base = eje === 'v' ? 'relative w-px flex-1 bg-borde' : 'relative h-px flex-1 bg-borde'
  return (
    <span aria-hidden className={base} style={eje === 'v' ? { minHeight: 20 } : undefined}>
      {recorrido && (
        <span
          className="envio-trazo-lleno absolute inset-0 bg-spark/50"
          style={{ animationDelay: `${retraso}ms` }}
        />
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

export function LineaEnvio({ pedido }: { pedido: PedidoCuenta }) {
  const pasos = pasosDelPedido(pedido)

  return (
    <>
      {/* Teléfono: vertical. Cada hito tiene su renglón y el texto respira. */}
      <ol className="mt-4 grid gap-0 t:hidden">
        {pasos.map((paso, i) => {
          const ultimo = i === pasos.length - 1
          const activo = paso.estado !== 'pendiente'
          const retraso = i * PASO_MS
          return (
            <li key={paso.titulo} className="grid grid-cols-[22px_1fr] gap-x-3">
              <div className="grid justify-items-center">
                <span className="mt-[3px]">
                  <Hito estado={paso.estado} retraso={retraso} />
                </span>
                {!ultimo && (
                  <span className="my-1 flex flex-1 justify-center">
                    <Trazo recorrido={paso.estado === 'hecho'} retraso={retraso + 60} eje="v" />
                  </span>
                )}
              </div>

              <div className={`envio-texto ${ultimo ? 'pb-0' : 'pb-4'}`} style={{ animationDelay: `${retraso + 40}ms` }}>
                <p className={`text-[15px] leading-snug ${activo ? 'font-semibold text-tinta' : 'text-tinta-suave'}`}>
                  {paso.titulo}
                </p>
                {paso.cuando && <p className="cifra mt-0.5 text-[13px] text-tinta-suave">{paso.cuando}</p>}
                {paso.detalle && <p className="mt-0.5 text-[13px] text-tinta-suave">{paso.detalle}</p>}
              </div>
            </li>
          )
        })}
      </ol>

      {/* Tablet y escritorio: horizontal. Columnas de ancho igual —si no, el
          texto largo de un paso se come el riel del siguiente— con el hito
          arriba y su etiqueta debajo, para leer el recorrido de un vistazo. */}
      <ol
        className="mt-5 hidden t:grid"
        style={{ gridTemplateColumns: `repeat(${pasos.length}, minmax(0, 1fr))` }}
      >
        {pasos.map((paso, i) => {
          const ultimo = i === pasos.length - 1
          const activo = paso.estado !== 'pendiente'
          const retraso = i * PASO_MS
          return (
            <li key={paso.titulo} className="min-w-0">
              <div className="flex h-[15px] items-center gap-2">
                <Hito estado={paso.estado} retraso={retraso} />
                {!ultimo && <Trazo recorrido={paso.estado === 'hecho'} retraso={retraso + 60} eje="h" />}
              </div>

              <div className="envio-texto mt-3 pr-5" style={{ animationDelay: `${retraso + 40}ms` }}>
                <p className={`text-[14px] leading-snug ${activo ? 'font-semibold text-tinta' : 'text-tinta-suave'}`}>
                  {paso.titulo}
                </p>
                {paso.cuando && <p className="cifra mt-0.5 text-[12px] text-tinta-suave">{paso.cuando}</p>}
                {paso.detalle && <p className="mt-0.5 text-[12px] break-words text-tinta-suave">{paso.detalle}</p>}
              </div>
            </li>
          )
        })}
      </ol>
    </>
  )
}
