/**
 * Íconos del panel.
 *
 * SVG inline y no una librería: son doce trazos y traerse un paquete entero
 * costaría más kilobytes que todo el panel. Todos comparten caja de 24 y
 * `currentColor`, así que el color lo decide quien los usa.
 */

type Props = {
  size?: number
  className?: string
  /** Estado activo: trazo más grueso. Rellenar el ícono lo convertía en una mancha. */
  activo?: boolean
}

const base = (size: number) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
})

export function IconoPortada({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={activo ? 2.3 : 1.7}>
      <path d="M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <path d="M3 12h18" stroke="currentColor" fill="none" />
      <path d="M6 15h7M6 17.5h4" stroke="currentColor" fill="none" />
    </svg>
  )
}

export function IconoResumen({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={activo ? 2.3 : 1.7}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}

export function IconoPedidos({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={activo ? 2.3 : 1.7}>
      <path d="M4 7h16l-1.2 12.1a2 2 0 0 1-2 1.9H7.2a2 2 0 0 1-2-1.9L4 7Z" />
      <path d="M9 7V5.5a3 3 0 0 1 6 0V7" stroke="currentColor" fill="none" />
    </svg>
  )
}

export function IconoProductos({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={activo ? 2.3 : 1.7}>
      <path d="M3.5 8.5 12 4l8.5 4.5v7L12 20l-8.5-4.5v-7Z" />
      <path d="m3.5 8.5 8.5 4.5 8.5-4.5M12 13v7" stroke="currentColor" fill="none" />
    </svg>
  )
}

export function IconoStock({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={activo ? 2.3 : 1.7}>
      <rect x="3.5" y="10" width="5" height="10.5" rx="1.2" />
      <rect x="9.5" y="6" width="5" height="14.5" rx="1.2" />
      <rect x="15.5" y="13" width="5" height="7.5" rx="1.2" />
    </svg>
  )
}

export function IconoFinanzas({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} strokeWidth={activo ? 2.3 : 1.7}>
      <rect x="3" y="6" width="18" height="13" rx="2.4" />
      <path d="M3 10.5h18" stroke="currentColor" fill="none" />
      <path d="M7 15h3" stroke="currentColor" fill="none" />
    </svg>
  )
}

export function IconoMas({ size = 24, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

export function IconoCamara({ size = 24, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M3 8.8A1.8 1.8 0 0 1 4.8 7h2.4l1.3-2h7l1.3 2h2.4A1.8 1.8 0 0 1 21 8.8v9.4a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 18.2V8.8Z" />
      <circle cx="12" cy="13.2" r="3.6" />
    </svg>
  )
}

export function IconoEstrella({ size = 24, className, activo }: Props) {
  return (
    <svg {...base(size)} className={className} fill={activo ? 'currentColor' : 'none'}>
      <path d="m12 4 2.4 5 5.4.8-3.9 3.8.9 5.4-4.8-2.6-4.8 2.6.9-5.4L4.2 9.8 9.6 9 12 4Z" />
    </svg>
  )
}

export function IconoBasura({ size = 24, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M4.5 7h15M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7" />
      <path d="M6.5 7l.9 12a2 2 0 0 0 2 1.9h5.2a2 2 0 0 0 2-1.9l.9-12" />
    </svg>
  )
}

export function IconoCerrar({ size = 24, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

export function IconoFlecha({
  size = 24,
  className,
  direccion = 'derecha',
}: Props & { direccion?: 'izquierda' | 'derecha' }) {
  return (
    <svg
      {...base(size)}
      className={className}
      style={{ transform: direccion === 'izquierda' ? 'rotate(180deg)' : undefined }}
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function IconoBuscar({ size = 24, className }: Props) {
  return (
    <svg {...base(size)} className={className}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </svg>
  )
}
