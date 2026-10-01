'use client'

import { useState, useTransition } from 'react'
import { Casilla } from '@/components/casilla'
import { useAvisos } from '@/components/avisos'
import { leerDestino } from '@/lib/destinos-pieza'
import type { DestinoBorrador } from '@/lib/escena-borrador'
import { guardarPieza, subirImagenPieza } from './acciones'
import { CampoDestino, campo, type OpcionesDestino } from './campo-destino'
import { CampoImagen } from './campo-imagen'

export interface PiezaEditable {
  clave: string
  titulo: string | null
  visible: boolean
  orden: number
  contenido: Record<string, unknown>
}

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const txt = (c: Record<string, unknown>, k: string): string => (typeof c[k] === 'string' ? (c[k] as string) : '')

/**
 * Editor de una franja de la portada (los bloques con foto que aparecen al
 * bajar). Las escenas del banner tienen su propio editor, con vista previa.
 */
export function EditorPieza({ pieza, opciones }: { pieza: PiezaEditable; opciones: OpcionesDestino }) {
  const c = pieza.contenido
  const k = pieza.clave
  const avisos = useAvisos()
  const [fotoMovil, setFotoMovil] = useState(txt(c, 'foto_movil'))
  const [fotoEscritorio, setFotoEscritorio] = useState(txt(c, 'foto_escritorio'))
  const [destino, setDestino] = useState<DestinoBorrador>(() => {
    const d = leerDestino(c.destino)
    return { tipo: d.tipo, valor: d.tipo === 'ninguno' ? '' : d.valor }
  })
  const [error, setError] = useState<string | null>(null)
  const [guardando, empezar] = useTransition()

  const subir = (campoImagen: 'foto_movil' | 'foto_escritorio') => async (archivo: File) => {
    const datos = new FormData()
    datos.set('clave', k)
    datos.set('campo', campoImagen)
    datos.set('archivo', archivo)
    return subirImagenPieza(datos)
  }

  return (
    <form
      action={(datos) =>
        empezar(async () => {
          setError(null)
          const r = await guardarPieza(datos)
          if (r.ok) avisos.ok('Guardado. Ya se ve en la portada.')
          else setError(r.error)
        })
      }
      className="rounded-[var(--radius-widget)] bg-papel p-4 ring-1 ring-borde md:p-5"
    >
      <input type="hidden" name="clave" value={k} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[17px] font-semibold tracking-cuerpo text-tinta">{pieza.titulo ?? k}</h2>
          <p className="mt-0.5 text-[12px] text-gris">{k}</p>
        </div>
        <Casilla name="visible" defaultChecked={pieza.visible} className="!text-[14px] text-tinta-suave">Mostrar en la portada</Casilla>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div>
          <label htmlFor={`t-${k}`} className={rotulo}>Título</label>
          <input id={`t-${k}`} name="titulo" defaultValue={txt(c, 'titulo')} maxLength={240} className={campo} />
        </div>
        <div>
          <label htmlFor={`b-${k}`} className={rotulo}>Bajada</label>
          <input id={`b-${k}`} name="bajada" defaultValue={txt(c, 'bajada')} maxLength={240} className={campo} />
        </div>

        <CampoImagen id={`fm-${k}`} nombre="foto_movil" etiqueta="Imagen para teléfono" pista="vertical" valor={fotoMovil} alCambiar={setFotoMovil} subir={subir('foto_movil')} proporcion="aspect-[4/5] max-w-[168px]" />
        <CampoImagen id={`fe-${k}`} nombre="foto_escritorio" etiqueta="Imagen para escritorio" pista="panorámica" valor={fotoEscritorio} alCambiar={setFotoEscritorio} subir={subir('foto_escritorio')} proporcion="aspect-[21/9] max-w-[320px]" />

        <div className="md:col-span-2">
          <label htmlFor={`a-${k}`} className={rotulo}>Descripción de la imagen</label>
          <input id={`a-${k}`} name="alt" defaultValue={txt(c, 'alt')} maxLength={240} className={campo} />
          <p className="mt-1 text-[12px] text-gris">Describe qué se ve. Si la imagen es solo decorativa, déjalo vacío.</p>
        </div>

        <div className="md:col-span-2">
          <CampoDestino id={`destino-${k}`} prefijo="destino" etiqueta="Al tocarla, lleva a" valor={destino} alCambiar={setDestino} opciones={opciones} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button type="submit" disabled={guardando} className="presionable inline-flex min-h-[44px] items-center rounded-full bg-tinta px-6 text-[15px] font-medium text-papel hover:bg-tinta/90 disabled:opacity-60">
          {guardando ? 'Guardando…' : 'Guardar'}
        </button>
        {error && <p role="alert" className="text-[14px] text-rojo">{error}</p>}
      </div>
    </form>
  )
}
