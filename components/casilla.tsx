'use client'

/**
 * Casilla de verificación propia.
 *
 * La nativa se dibuja distinta en cada sistema y no admite estilo: rompe la
 * coherencia justo en formularios donde el usuario decide cosas con dinero.
 *
 * Se construye sobre un `input` real, oculto pero presente: así conserva el
 * foco de teclado, la barra espaciadora, el envío con el formulario y el
 * anuncio correcto a un lector de pantalla. Lo que se dibuja es el recuadro;
 * lo que funciona sigue siendo el control del navegador.
 *
 * El área que se toca es la etiqueta entera, no el recuadro de 20 px: en un
 * teléfono apuntar a un cuadradito pequeño es la forma más fácil de fallar.
 */
export function Casilla({
  id,
  name,
  checked,
  defaultChecked,
  onChange,
  children,
  disabled,
  className = '',
}: {
  id?: string
  name?: string
  checked?: boolean
  defaultChecked?: boolean
  onChange?: (v: boolean) => void
  children: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  return (
    <label
      className={`group flex min-h-11 cursor-pointer items-center gap-3 text-[15px] text-tinta select-none has-disabled:cursor-default has-disabled:opacity-60 ${className}`}
    >
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        defaultChecked={defaultChecked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="peer sr-only"
      />
      {/* El visto vive dentro del recuadro, así que su estado no puede venir de
          una utilidad de hermano: se controla desde el contenedor, que sí es
          hermano del input. */}
      <span
        aria-hidden
        className="grid size-[22px] shrink-0 place-items-center rounded-[7px] bg-papel ring-1 ring-borde transition-colors
                   peer-checked:bg-spark peer-checked:ring-spark
                   peer-focus-visible:ring-2 peer-focus-visible:ring-spark peer-focus-visible:ring-offset-2
                   [&>svg]:scale-75 [&>svg]:opacity-0 [&>svg]:transition-all
                   peer-checked:[&>svg]:scale-100 peer-checked:[&>svg]:opacity-100"
      >
        <svg
          width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"
          className="text-white"
        >
          <path d="m5 12 5 5 9-10" />
        </svg>
      </span>
      {children}
    </label>
  )
}
