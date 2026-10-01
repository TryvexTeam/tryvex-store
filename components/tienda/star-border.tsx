/*
 * Star Border — adaptado de React Bits (https://reactbits.dev), de David Haz.
 * Copyright (c) 2026 David Haz. Licencia MIT + Commons Clause: se puede usar
 * dentro de un sitio o producto, no revender el componente. Aviso conservado.
 *
 * Cambios respecto del original:
 *  - Sin dependencias ni `use client`: es solo HTML y CSS.
 *  - Los keyframes viven en globals.css (Tailwind 4 no usa tailwind.config).
 *  - El radio se hereda, para usarlo como píldora igual que el resto de botones.
 *  - Con `prefers-reduced-motion` el destello se queda quieto (globals.css).
 */

type Props<T extends React.ElementType> = React.ComponentPropsWithoutRef<T> & {
  as?: T
  color?: string
  speed?: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
}

export function StarBorder<T extends React.ElementType = 'button'>({
  as,
  className = '',
  color = 'white',
  speed = '6s',
  backgroundColor = '#000',
  textColor = '#fff',
  borderColor = '#2a2a2a',
  children,
  ...resto
}: Props<T>) {
  const Componente: React.ElementType = as ?? 'button'
  return (
    <Componente className={`star-borde relative inline-block overflow-hidden rounded-full py-px ${className}`} {...resto}>
      <span aria-hidden className="star-borde-abajo" style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }} />
      <span aria-hidden className="star-borde-arriba" style={{ background: `radial-gradient(circle, ${color}, transparent 10%)`, animationDuration: speed }} />
      <span className="relative z-[1] flex min-h-[52px] items-center justify-center rounded-[inherit] border px-7 text-[17px] font-medium" style={{ background: backgroundColor, color: textColor, borderColor }}>
        {children}
      </span>
    </Componente>
  )
}
