'use client'

import { useState } from 'react'

/**
 * Solo datos planos.
 *
 * El catálogo de couriers guarda funciones y expresiones regulares, y eso no
 * cruza del servidor al cliente: React exige objetos simples. Lo que llega acá
 * es el resultado ya resuelto, no el courier entero.
 */
export interface EnlaceCourier {
  nombre: string
  url: string
  /** `true` si abre el envío; `false` si solo abre el buscador del courier. */
  directo: boolean
  codigo: string
}

/**
 * Salida hacia el seguimiento oficial del courier.
 *
 * Cuando el courier acepta el código en la URL, el botón abre el envío ya
 * cargado. Cuando no —Correos de Chile, por ejemplo—, abre su buscador y se
 * ofrece el código para copiar, diciéndolo de frente en vez de dejar a la
 * persona frente a un formulario vacío preguntándose qué pegar.
 */
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

  return (
    <div className="mt-6 border-t border-borde/60 pt-5">
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={enlace.url}
          target="_blank"
          rel="noopener noreferrer"
          className="tienda-boton bg-tinta text-white hover:bg-tinta/90"
        >
          {enlace.directo ? `Seguir en ${enlace.nombre}` : `Ir a ${enlace.nombre}`} ↗
        </a>

        <button
          type="button"
          onClick={copiar}
          className="tienda-boton text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt"
          aria-label={`Copiar el código de seguimiento ${enlace.codigo}`}
        >
          <span className="cifra">{enlace.codigo}</span>
          <span className="ml-2 text-tinta-suave">{copiado ? '¡copiado!' : 'copiar'}</span>
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
