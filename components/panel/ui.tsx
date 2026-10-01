import Link from 'next/link'
import type { ButtonHTMLAttributes, ComponentProps, ReactNode } from 'react'

/**
 * Kit del panel.
 *
 * Revolut lo resume en una frase: «no hacemos estilos a medida»; cada decisión
 * de diseño se vuelve un componente y las pantallas solo los ensamblan. Acá
 * viven los cuatro que más se repetían como clases sueltas (más de treinta
 * botones copiados): Boton, Tarjeta, Celda y Pildora, más los estilos de campo.
 *
 * Todo sale de los tokens del panel (colores, radios 16/12/24, movimiento),
 * así que el tema oscuro y el sistema de movimiento llegan solos.
 */

type Variante = 'primario' | 'secundario' | 'suave' | 'spark'
type Tamano = 'sm' | 'md' | 'lg'

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-tinta text-white hover:bg-tinta/85',
  secundario: 'bg-papel text-tinta ring-1 ring-borde hover:ring-gris',
  suave: 'bg-papel-alt text-tinta-suave hover:bg-borde/40 hover:text-tinta',
  spark: 'bg-spark text-white hover:bg-spark-hover',
}
const TAMANOS: Record<Tamano, string> = {
  sm: 'min-h-9 px-4 text-[13px]',
  md: 'min-h-11 px-5 text-[14px]',
  lg: 'min-h-12 w-full px-6 text-[15px]',
}

/** Píldora de 36 a 48 px, como los botones de Revolut (42 a 46 px). */
export function claseBoton(variante: Variante = 'primario', tamano: Tamano = 'md', extra = ''): string {
  return `presionable inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTES[variante]} ${TAMANOS[tamano]} ${extra}`
}

type PropsBoton = { variante?: Variante; tamano?: Tamano } & ButtonHTMLAttributes<HTMLButtonElement>

export function Boton({ variante, tamano, className = '', type = 'button', ...resto }: PropsBoton) {
  return <button type={type} className={claseBoton(variante, tamano, className)} {...resto} />
}

export function BotonEnlace({ variante, tamano, className = '', ...resto }: { variante?: Variante; tamano?: Tamano } & ComponentProps<typeof Link>) {
  return <Link className={claseBoton(variante, tamano, className)} {...resto} />
}

/** Widget: la superficie base. Radio 16, borde fino; con `titulo` lleva encabezado. */
export function Tarjeta({
  titulo,
  accion,
  className = '',
  children,
  ...resto
}: { titulo?: ReactNode; accion?: ReactNode } & Omit<ComponentProps<'section'>, 'title'>) {
  return (
    <section className={`rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60 ${className}`} {...resto}>
      {(titulo || accion) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {titulo && <h2 className="text-[15px] font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  )
}

/** Fila de lista: avatar o ícono a la izquierda, texto, monto a la derecha. */
export function Celda({
  izquierda,
  titulo,
  detalle,
  derecha,
  className = '',
}: {
  izquierda?: ReactNode
  titulo: ReactNode
  detalle?: ReactNode
  derecha?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center gap-3.5 px-4 py-3.5 ${className}`}>
      {izquierda}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-medium">{titulo}</p>
        {detalle && <p className="mt-0.5 truncate text-[12.5px] text-gris">{detalle}</p>}
      </div>
      {derecha}
    </div>
  )
}

type Tono = 'neutro' | 'verde' | 'ambar' | 'rojo' | 'spark'
const TONOS: Record<Tono, string> = {
  neutro: 'bg-papel-alt text-tinta-suave',
  verde: 'bg-verde/12 text-verde',
  ambar: 'bg-ambar/12 text-ambar',
  rojo: 'bg-rojo/12 text-rojo',
  spark: 'bg-spark-suave text-spark',
}

/** Etiqueta de estado. El texto la dice; el color solo acompaña. */
export function Pildora({ tono = 'neutro', children, className = '' }: { tono?: Tono; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] leading-none font-semibold ${TONOS[tono]} ${className}`}>{children}</span>
}

/** Campo de formulario: 12 px de radio, fondo hundido, foco visible. */
export const CLASE_CAMPO =
  'w-full rounded-[var(--radius-anidado)] bg-papel-alt px-4 py-3 text-[15px] text-tinta ring-1 ring-borde placeholder:text-gris focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta'
