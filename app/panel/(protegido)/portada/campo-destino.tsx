'use client'

import { useState } from 'react'
import { Selector, type OpcionSelector } from '@/components/selector'
import type { TipoDestino } from '@/lib/destinos-pieza'

export interface OpcionesDestino {
  categorias: readonly OpcionSelector[]
  productos: readonly OpcionSelector[]
}

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const campo =
  'w-full min-h-[44px] rounded-[10px] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'

/** Qué significa cada destino, dicho en los términos de quien edita. */
const TIPOS: { valor: TipoDestino; etiqueta: string }[] = [
  { valor: 'ninguno', etiqueta: 'No lleva a ninguna parte' },
  { valor: 'categoria', etiqueta: 'Una categoría de la tienda' },
  { valor: 'producto', etiqueta: 'Un producto' },
  { valor: 'url', etiqueta: 'Una dirección (redes, otra página)' },
  { valor: 'seccion', etiqueta: 'Una sección de la portada' },
]

const AYUDA: Partial<Record<TipoDestino, string>> = {
  url: 'Empieza con / para este sitio, o con https:// para otro (TikTok, Instagram…). Las direcciones de otros sitios se abren en otra pestaña.',
  seccion: 'El ancla de la sección, por ejemplo: beneficios',
}

/**
 * A dónde lleva una pieza o una zona de la imagen.
 *
 * Categorías y productos se eligen de la lista real de la tienda: escribir el
 * identificador a mano era la forma más fácil de dejar un enlace roto, porque
 * el nombre que se ve («Audífonos») no es el que va en la dirección
 * («audifonos»).
 */
export function CampoDestino({ prefijo, etiqueta, inicial, opciones }: {
  /** Prefijo de los campos del formulario: `<prefijo>_tipo` y `<prefijo>_valor`. */
  prefijo: string
  etiqueta: string
  inicial: { tipo?: string; valor?: string }
  opciones: OpcionesDestino
}) {
  const [tipo, setTipo] = useState<string>(inicial.tipo ?? 'ninguno')
  const [valor, setValor] = useState(inicial.valor ?? '')
  const lista = tipo === 'categoria' ? opciones.categorias : tipo === 'producto' ? opciones.productos : null
  // Un valor guardado que ya no está en la lista (categoría borrada) se muestra
  // igual, para que se vea qué había y se pueda corregir.
  const conHuerfano = lista && valor && !lista.some((o) => o.valor === valor)
    ? [{ valor, etiqueta: `${valor} (ya no existe)` }, ...lista]
    : lista

  function cambiarTipo(t: string) {
    setTipo(t)
    // Al pasar de categoría a producto el identificador anterior no sirve.
    if (t !== tipo) setValor('')
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Selector
        id={`${prefijo}-tipo`}
        name={`${prefijo}_tipo`}
        etiqueta={etiqueta}
        opciones={TIPOS}
        valor={tipo}
        alCambiar={cambiarTipo}
      />
      {tipo === 'ninguno' ? (
        <input type="hidden" name={`${prefijo}_valor`} value="" />
      ) : conHuerfano ? (
        <Selector
          id={`${prefijo}-valor`}
          name={`${prefijo}_valor`}
          etiqueta={tipo === 'categoria' ? 'Categoría' : 'Producto'}
          opciones={conHuerfano}
          valor={valor}
          alCambiar={setValor}
          placeholder={tipo === 'categoria' ? 'Elige una categoría' : 'Elige un producto'}
        />
      ) : (
        <div>
          <label htmlFor={`${prefijo}-valor`} className={rotulo}>{tipo === 'url' ? 'Dirección' : 'Sección'}</label>
          <input
            id={`${prefijo}-valor`}
            name={`${prefijo}_valor`}
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            inputMode={tipo === 'url' ? 'url' : undefined}
            placeholder={tipo === 'url' ? 'https://www.instagram.com/tryvexstore.cl/' : 'beneficios'}
            className={campo}
          />
          {AYUDA[tipo as TipoDestino] && <p className="mt-1 text-[12px] text-gris">{AYUDA[tipo as TipoDestino]}</p>}
        </div>
      )}
    </div>
  )
}
