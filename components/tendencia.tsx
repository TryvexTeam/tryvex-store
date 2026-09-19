import { clp } from '@/lib/formato'

interface Punto {
  /** Día en formato ISO corto, para la descripción accesible. */
  dia: string
  valor: number
}

/**
 * Curva de tendencia de los últimos días.
 *
 * No lleva ejes ni rejilla a propósito: en una tarjeta de resumen la pregunta
 * no es «cuánto exactamente el martes», sino «esto sube o baja». El número
 * exacto ya está escrito al lado, grande.
 *
 * Es una imagen para el ojo, así que para un lector de pantalla se expone la
 * misma información en texto y se oculta el dibujo: una curva sin describir
 * no le dice nada a quien no la ve.
 */
export function Tendencia({
  puntos,
  etiqueta,
}: {
  puntos: Punto[]
  etiqueta: string
}) {
  const ANCHO = 240
  const ALTO = 56

  if (puntos.length < 2) {
    return (
      <div
        className="h-14 rounded-[10px] bg-white/5"
        aria-label={`${etiqueta}: sin datos suficientes para una tendencia`}
        role="img"
      />
    )
  }

  const valores = puntos.map((p) => p.valor)

  // Sin ninguna venta, la curva sería una línea plana pegada al fondo con un
  // hueco encima: se lee como un gráfico roto, no como «aún no hay ventas».
  // Se dice con palabras.
  if (valores.every((v) => v === 0)) {
    return (
      <p className="flex h-14 items-center text-[13px] text-white/45">
        Sin ventas cerradas en estos días. La curva aparece con la primera.
      </p>
    )
  }

  const max = Math.max(...valores)
  const min = Math.min(...valores)
  // Un rango cero (todos los días iguales) dividiría por cero y dejaría la
  // línea fuera del lienzo; se aplana al centro, que es lo que describe.
  const rango = max - min || 1

  const coord = (v: number, i: number) => {
    const x = (i / (puntos.length - 1)) * ANCHO
    const y = ALTO - ((v - min) / rango) * (ALTO - 8) - 4
    return [x, y] as const
  }

  const puntosSvg = puntos.map((p, i) => coord(p.valor, i))
  const linea = puntosSvg.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${linea} L${ANCHO},${ALTO} L0,${ALTO} Z`
  const [ux, uy] = puntosSvg[puntosSvg.length - 1]

  const total = valores.reduce((a, v) => a + v, 0)

  return (
    <>
      <svg
        viewBox={`0 0 ${ANCHO} ${ALTO}`}
        preserveAspectRatio="none"
        className="h-14 w-full"
        aria-hidden
      >
        <defs>
          <linearGradient id="deg-tendencia" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.28" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#deg-tendencia)" />
        <path
          d={linea}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* El último punto marcado: es el dato de hoy, el que se busca. */}
        <circle cx={ux} cy={uy} r="3" fill="currentColor" vectorEffect="non-scaling-stroke" />
      </svg>

      <span className="sr-only">
        {etiqueta}: {clp(total)} en los últimos {puntos.length} días. Día más alto,{' '}
        {clp(max)}. Día más bajo, {clp(min)}.
      </span>
    </>
  )
}
