/**
 * Marca Tryvex.
 *
 * Los tres trazos son los mismos de "Tryvex Landing" (src/components/NavBar.tsx),
 * copiados punto por punto a propósito: si el contorno difiere, la estrella
 * "salta" entre la landing corporativa y este panel y se nota.
 *
 * La chispa roja se mantiene en #e53935 en todos los contextos: es el acento de
 * marca y contrasta tanto sobre papel claro como sobre tinta.
 */
const ESTRELLA =
  'M 50 4 C 52 32, 68 48, 96 50 C 68 52, 52 68, 50 96 C 48 68, 32 52, 4 50 C 32 48, 48 32, 50 4 Z'
const CHISPA =
  'M 82 14 C 83 19, 87 23, 92 24 C 87 25, 83 29, 82 34 C 81 29, 77 25, 72 24 C 77 23, 81 19, 82 14 Z'

export function Estrella({
  size = 20,
  className = '',
}: {
  size?: number
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <path d={ESTRELLA} fill="currentColor" />
      <path d={CHISPA} fill="#e53935" />
    </svg>
  )
}

export function Marca({
  size = 20,
  etiqueta = 'Tryvex',
  className = '',
}: {
  size?: number
  etiqueta?: string | null
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 text-tinta ${className}`}>
      <Estrella size={size} />
      {etiqueta && (
        <span
          className="font-semibold tracking-[-0.01em]"
          style={{ fontSize: size * 0.85 }}
        >
          {etiqueta}
        </span>
      )}
    </span>
  )
}
