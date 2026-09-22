'use client'

import Image from 'next/image'
import { useState } from 'react'

/**
 * Salida hacia el seguimiento oficial del courier, con su propia marca.
 *
 * El botón lleva el color y el logotipo de quien transporta el paquete. No es
 * decoración: al comprador le dice de un vistazo quién lo tiene, y al llegar al
 * sitio del courier reconoce que está donde correspondía.
 *
 * Cuando el courier acepta el código en la URL, el botón abre el envío ya
 * cargado. Cuando no —Correos de Chile, por ejemplo—, abre su buscador y se
 * ofrece el código para copiar, diciéndolo de frente en vez de dejar a la
 * persona frente a un formulario vacío preguntándose qué pegar.
 *
 * Solo datos planos: el catálogo de couriers guarda funciones y expresiones
 * regulares, y eso no cruza del servidor al cliente.
 */
export interface EnlaceCourier {
  nombre: string
  url: string
  /** `true` si abre el envío; `false` si solo abre el buscador del courier. */
  directo: boolean
  codigo: string
  color: string
  colorTexto: string
  logo: string | null
  logoAncho: number
  logoAlto: number
}

/** Alto al que se dibuja cualquier logotipo, para que todos pesen igual. */
const ALTO_LOGO = 18

export function BotonCourier({ enlace }: { enlace: EnlaceCourier }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(enlace.codigo)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2200)
    } catch {
      // Sin permiso de portapapeles el código igual está a la vista.
      setCopiado(false)
    }
  }

  const ancho = enlace.logo && enlace.logoAlto > 0
    ? Math.round((enlace.logoAncho / enlace.logoAlto) * ALTO_LOGO)
    : 0

  return (
    <div className="mt-6 border-t border-borde/60 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={enlace.url}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-2.5 rounded-full px-5 py-3 text-[15px] font-semibold transition-[transform,box-shadow] duration-200 hover:-translate-y-px hover:shadow-[0_6px_20px_-6px_rgb(0_0_0/0.35)] focus-visible:outline-2 focus-visible:outline-offset-2"
          style={{
            backgroundColor: enlace.color,
            color: enlace.colorTexto,
            outlineColor: enlace.color,
          }}
        >
          {enlace.logo ? (
            <Image
              src={enlace.logo}
              alt={enlace.nombre}
              width={ancho}
              height={ALTO_LOGO}
              // El logotipo del courier viene en su color original; sobre el
              // fondo de marca se lee cuando va en blanco.
              className="brightness-0 invert"
              style={{ height: ALTO_LOGO, width: ancho }}
            />
          ) : (
            <span>{enlace.nombre}</span>
          )}
          <span className="opacity-90">{enlace.directo ? 'Seguir envío' : 'Ir al buscador'}</span>
          <svg viewBox="0 0 12 12" aria-hidden className="size-3 transition-transform duration-200 group-hover:translate-x-0.5">
            <path d="M3 9 9 3M9 3H4.5M9 3v4.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>

        <button
          type="button"
          onClick={copiar}
          className="inline-flex items-center gap-2 rounded-full px-4 py-3 text-[14px] ring-1 ring-borde ring-inset transition-colors hover:bg-papel-alt"
          aria-label={`Copiar el código de seguimiento ${enlace.codigo}`}
        >
          <span className="cifra font-semibold tracking-wide">{enlace.codigo}</span>
          <span className={copiado ? 'font-semibold text-spark' : 'text-tinta-suave'}>
            {copiado ? '¡copiado!' : 'copiar'}
          </span>
        </button>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-tinta-suave">
        {enlace.directo
          ? `Verás el detalle del recorrido en el sitio de ${enlace.nombre}.`
          : `${enlace.nombre} no permite abrir un envío por enlace: copia el código y pégalo en su buscador.`}
      </p>

      <p aria-live="polite" className="sr-only">
        {copiado ? 'Código copiado' : ''}
      </p>
    </div>
  )
}
