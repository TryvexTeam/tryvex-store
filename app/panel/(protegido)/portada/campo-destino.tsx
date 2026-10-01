'use client'

import { Selector, type OpcionSelector } from '@/components/selector'
import type { DestinoBorrador } from '@/lib/escena-borrador'
import type { TipoDestino } from '@/lib/destinos-pieza'

export interface OpcionesDestino {
  categorias: readonly OpcionSelector[]
  productos: readonly OpcionSelector[]
}

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
export const campo =
  'w-full min-h-[44px] rounded-[var(--radius-anidado)] bg-papel px-3 py-2 text-[15px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none'

/** Qué significa cada destino, dicho en los términos de quien edita. */
const TIPOS: { valor: TipoDestino; etiqueta: string }[] = [
  { valor: 'ninguno', etiqueta: 'A ninguna parte' },
  { valor: 'categoria', etiqueta: 'Una categoría de la tienda' },
  { valor: 'producto', etiqueta: 'Un producto' },
  { valor: 'url', etiqueta: 'Una dirección (redes, otra página)' },
  { valor: 'seccion', etiqueta: 'Una sección de la portada' },
]

const AYUDA: Partial<Record<TipoDestino, string>> = {
  url: 'Empieza con / para este sitio, o con https:// para otro (TikTok, Instagram…). Las de otros sitios se abren en otra pestaña.',
  seccion: 'El ancla de la sección, por ejemplo: beneficios',
}

/**
 * A dónde lleva una pieza, una zona o una cápsula.
 *
 * Categorías y productos se eligen de la lista real de la tienda: escribir el
 * identificador a mano era la forma más fácil de dejar un enlace roto, porque
 * el nombre que se ve («Audífonos») no es el que va en la dirección
 * («audifonos»). Con `prefijo`, además emite campos ocultos para formularios.
 */
export function CampoDestino({ id, etiqueta, valor, alCambiar, opciones, prefijo }: {
  id: string
  etiqueta: string
  valor: DestinoBorrador
  alCambiar: (d: DestinoBorrador) => void
  opciones: OpcionesDestino
  prefijo?: string
}) {
  const lista = valor.tipo === 'categoria' ? opciones.categorias : valor.tipo === 'producto' ? opciones.productos : null
  // Un valor guardado que ya no está en la lista (categoría borrada) se muestra
  // igual, para que se vea qué había y se pueda corregir.
  const conHuerfano = lista && valor.valor && !lista.some((o) => o.valor === valor.valor)
    ? [{ valor: valor.valor, etiqueta: `${valor.valor} (ya no existe)` }, ...lista]
    : lista

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Selector
        id={`${id}-tipo`}
        name={`${prefijo ?? id}_tipo`}
        etiqueta={etiqueta}
        opciones={TIPOS}
        valor={valor.tipo}
        // Al cambiar de tipo el identificador anterior no sirve.
        alCambiar={(t) => alCambiar({ tipo: t as TipoDestino, valor: t === valor.tipo ? valor.valor : '' })}
      />
      {valor.tipo === 'ninguno' ? (
        prefijo ? <input type="hidden" name={`${prefijo}_valor`} value="" /> : null
      ) : conHuerfano ? (
        <Selector
          id={`${id}-valor`}
          name={`${prefijo ?? id}_valor`}
          etiqueta={valor.tipo === 'categoria' ? 'Categoría' : 'Producto'}
          opciones={conHuerfano}
          valor={valor.valor}
          alCambiar={(v) => alCambiar({ ...valor, valor: v })}
          placeholder={valor.tipo === 'categoria' ? 'Elige una categoría' : 'Elige un producto'}
        />
      ) : (
        <div>
          <label htmlFor={`${id}-valor`} className={rotulo}>{valor.tipo === 'url' ? 'Dirección' : 'Sección'}</label>
          <input
            id={`${id}-valor`}
            name={prefijo ? `${prefijo}_valor` : undefined}
            value={valor.valor}
            onChange={(e) => alCambiar({ ...valor, valor: e.target.value })}
            inputMode={valor.tipo === 'url' ? 'url' : undefined}
            placeholder={valor.tipo === 'url' ? 'https://www.instagram.com/tryvexstore.cl/' : 'beneficios'}
            className={campo}
          />
          {AYUDA[valor.tipo] && <p className="mt-1 text-[12px] text-gris">{AYUDA[valor.tipo]}</p>}
        </div>
      )}
    </div>
  )
}
