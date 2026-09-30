'use client'

import { useCallback, useState, useTransition } from 'react'
import { useAvisos } from '@/components/avisos'
import { ESCENAS_BANNER } from '@/lib/campana'
import { borradorDesde } from '@/lib/escena-borrador'
import { cambiarVisibilidadEscena } from './acciones'
import type { OpcionesDestino } from './campo-destino'
import { EditorEscena } from './editor-escena'
import type { PiezaEditable } from './editor'

/** Una línea que dice qué tiene la escena, para no abrirla solo a averiguarlo. */
function resumen(p: PiezaEditable): string {
  const codigo = ESCENAS_BANNER.find((e) => `heroe-${e.id}` === p.clave)
  const b = borradorDesde(p.contenido, codigo)
  const partes = [
    b.video ? 'Video' : b.foto_movil || b.foto_escritorio ? 'Imagen' : codigo?.estilo === 'tarjeta' ? 'Tarjeta de color' : 'Color liso',
    b.capsulas.length ? `${b.capsulas.length} ${b.capsulas.length === 1 ? 'cápsula' : 'cápsulas'}` : null,
    b.division !== 'completa' ? 'Zonas con enlace' : null,
    b.sin_texto ? 'Sin texto encima' : null,
  ]
  return partes.filter(Boolean).join(' · ')
}

function Miniatura({ p }: { p: PiezaEditable }) {
  const codigo = ESCENAS_BANNER.find((e) => `heroe-${e.id}` === p.clave)
  const b = borradorDesde(p.contenido, codigo)
  const foto = b.foto_escritorio || b.foto_movil
  return (
    <span className={`relative block aspect-[16/9] w-[112px] shrink-0 overflow-hidden rounded-[10px] ring-1 ring-borde ${(codigo?.tono ?? 'oscuro') === 'oscuro' ? 'bg-black' : 'bg-[#e9f1f8]'}`}>
      {b.video ? (
        <video src={`${b.video}#t=0.1`} preload="metadata" muted playsInline className="size-full object-cover" />
      ) : foto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={foto} alt="" className="size-full object-cover" />
      ) : null}
    </span>
  )
}

/**
 * Las escenas del banner como una lista de tarjetas: se ve cuál es cuál, cuáles
 * están visibles y se abre la que se quiere editar. Ocultar una no exige abrirla.
 */
export function ListaEscenas({ piezas, opciones, precios }: { piezas: PiezaEditable[]; opciones: OpcionesDestino; precios: Record<string, number> }) {
  const avisos = useAvisos()
  const [abierta, setAbierta] = useState<string | null>(null)
  const [, empezar] = useTransition()
  const cerrar = useCallback(() => setAbierta(null), [])
  const pieza = piezas.find((p) => p.clave === abierta)

  function alternar(p: PiezaEditable) {
    empezar(async () => {
      const r = await cambiarVisibilidadEscena(p.clave, !p.visible)
      if (r.ok) avisos.ok(p.visible ? 'Escena oculta. Ya no se ve en la tienda.' : 'Escena visible en la tienda.')
      else avisos.error(r.error)
    })
  }

  return (
    <>
      <ul className="grid gap-3">
        {piezas.map((p) => {
          const codigo = ESCENAS_BANNER.find((e) => `heroe-${e.id}` === p.clave)
          return (
            <li key={p.clave} className={`flex items-center gap-3 rounded-[18px] bg-papel p-3 ring-1 ring-borde ${p.visible ? '' : 'opacity-70'}`}>
              <button type="button" onClick={() => setAbierta(p.clave)} className="presionable flex min-w-0 flex-1 items-center gap-3 rounded-[12px] text-left">
                <Miniatura p={p} />
                <span className="min-w-0">
                  <span className="block truncate text-[16px] font-semibold tracking-cuerpo text-tinta">{p.titulo ?? codigo?.etiqueta ?? p.clave}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-gris">{resumen(p)}</span>
                  {!p.visible && <span className="mt-1 inline-block rounded-full bg-papel-alt px-2 py-0.5 text-[11px] font-medium text-tinta-suave">Oculta</span>}
                </span>
              </button>
              <button type="button" onClick={() => alternar(p)} aria-label={p.visible ? `Ocultar ${codigo?.etiqueta ?? p.clave}` : `Mostrar ${codigo?.etiqueta ?? p.clave}`} aria-pressed={p.visible} className="presionable inline-flex min-h-[44px] shrink-0 items-center rounded-full bg-papel-alt px-4 text-[13px] font-medium text-tinta-suave ring-1 ring-borde">
                {p.visible ? 'Ocultar' : 'Mostrar'}
              </button>
            </li>
          )
        })}
      </ul>

      {pieza && (
        <EditorEscena
          key={pieza.clave}
          pieza={pieza}
          codigo={ESCENAS_BANNER.find((e) => `heroe-${e.id}` === pieza.clave)}
          opciones={opciones}
          precios={precios}
          alCerrar={cerrar}
        />
      )}
    </>
  )
}
