'use client'

import { useCallback, useMemo, useRef, useState, useTransition } from 'react'
import { Casilla } from '@/components/casilla'
import { Hoja } from '@/components/hoja'
import { useAvisos } from '@/components/avisos'
import type { EscenaHeroe } from '@/lib/campana'
import { borradorDesde, type BorradorEscena } from '@/lib/escena-borrador'
import { guardarEscena, subirImagenEscena } from './acciones'
import { CampoCapsulas } from './campo-capsulas'
import { CampoColores } from './campo-colores'
import { CampoDestino, campo, type OpcionesDestino } from './campo-destino'
import { CampoImagen } from './campo-imagen'
import { CampoVideo } from './campo-video'
import { CampoZonas } from './campo-zonas'
import type { PiezaEditable } from './editor'
import { VistaPreviaEscena, type Pantalla } from './vista-previa-escena'

type Seccion = 'imagen' | 'textos' | 'enlaces' | 'colores' | 'capsulas'

const SECCIONES: { id: Seccion; nombre: string }[] = [
  { id: 'imagen', nombre: 'Imagen y video' },
  { id: 'textos', nombre: 'Textos' },
  { id: 'enlaces', nombre: 'Enlaces' },
  { id: 'colores', nombre: 'Colores' },
  { id: 'capsulas', nombre: 'Cápsulas' },
]

const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

/** Lo que se compara y se envía: sin las llaves que solo usa la lista del editor. */
const limpio = (b: BorradorEscena) => ({ ...b, capsulas: b.capsulas.map(({ id: _id, ...resto }) => resto) })

function Texto({ id, etiqueta, valor, alCambiar, max, ayuda, placeholder }: {
  id: string; etiqueta: string; valor: string; alCambiar: (v: string) => void; max: number; ayuda?: string; placeholder?: string
}) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{etiqueta}</label>
      <div className="relative">
        <input id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} maxLength={max} placeholder={placeholder} className={`${campo} ${valor ? 'pr-11' : ''}`} />
        {valor && (
          <button type="button" onClick={() => alCambiar('')} aria-label={`Borrar ${etiqueta.toLowerCase()}`} className="absolute top-0 right-0 grid size-11 place-items-center text-gris hover:text-tinta">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden><path d="m6 6 12 12M18 6 6 18" /></svg>
          </button>
        )}
      </div>
      {ayuda && <p className="mt-1 text-[12px] text-gris">{ayuda}</p>}
    </div>
  )
}

/**
 * Editor de una escena del banner, en una hoja.
 *
 * Trabaja sobre un borrador: nada cambia en la tienda hasta «Publicar», y la
 * vista previa muestra cada cambio al instante, en teléfono y en escritorio.
 * Lo que aparece aquí es exactamente lo que hay en la portada: un texto que se
 * borra desaparece, una imagen que se quita no vuelve.
 */
export function EditorEscena({ pieza, codigo, opciones, precios, alCerrar }: {
  pieza: PiezaEditable
  codigo: EscenaHeroe | undefined
  opciones: OpcionesDestino
  precios: Record<string, number>
  alCerrar: () => void
}) {
  const k = pieza.clave
  const avisos = useAvisos()
  const inicial = useMemo(() => borradorDesde(pieza.contenido, codigo), [pieza.contenido, codigo])
  const [b, setB] = useState<BorradorEscena>(inicial)
  const [visible, setVisible] = useState(pieza.visible)
  const [publicado, setPublicado] = useState(() => JSON.stringify({ v: pieza.visible, b: limpio(inicial) }))
  const [seccion, setSeccion] = useState<Seccion>('imagen')
  const [pantalla, setPantalla] = useState<Pantalla>('movil')
  const [error, setError] = useState<string | null>(null)
  const [saliendo, setSaliendo] = useState(false)
  const [guardando, empezar] = useTransition()

  const actual = JSON.stringify({ v: visible, b: limpio(b) })
  const hayCambios = actual !== publicado
  const cambios = useRef(hayCambios)
  cambios.current = hayCambios

  const cambiar = (c: Partial<BorradorEscena>) => { setError(null); setB((x) => ({ ...x, ...c })) }

  // Estable a propósito: la hoja vuelve a enfocar su primer control cada vez que esta función cambia.
  const pedirCierre = useCallback(() => { if (cambios.current) setSaliendo(true); else alCerrar() }, [alCerrar])

  function publicar() {
    setError(null)
    empezar(async () => {
      const r = await guardarEscena(k, visible, limpio(b))
      if (!r.ok) return setError(r.error)
      setPublicado(JSON.stringify({ v: visible, b: JSON.parse(r.guardado) }))
      setSaliendo(false)
      avisos.ok('Publicado. Ya se ve en la tienda.')
    })
  }

  const subir = async (campoImagen: 'foto_movil' | 'foto_escritorio', archivo: File) => {
    const datos = new FormData()
    datos.set('clave', k)
    datos.set('campo', campoImagen)
    datos.set('archivo', archivo)
    return subirImagenEscena(datos)
  }

  const titulo = b.etiqueta || codigo?.etiqueta || k
  const pie = (
    <div className="flex flex-col gap-2">
      {error && <p role="alert" className="text-[13px] text-rojo">{error}</p>}
      {saliendo ? (
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-auto text-[14px] text-tinta">Tienes cambios sin publicar.</p>
          <button type="button" onClick={() => setSaliendo(false)} className="presionable inline-flex min-h-[44px] items-center rounded-full bg-papel-alt px-5 text-[14px] font-medium text-tinta ring-1 ring-borde">Seguir editando</button>
          <button type="button" onClick={alCerrar} className="presionable inline-flex min-h-[44px] items-center rounded-full px-5 text-[14px] font-medium text-rojo hover:bg-rojo/10">Descartar</button>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <p className="mr-auto text-[13px] text-gris" aria-live="polite">{guardando ? 'Publicando…' : hayCambios ? 'Cambios sin publicar' : 'Todo publicado'}</p>
          <button type="button" onClick={publicar} disabled={guardando || !hayCambios} className="presionable inline-flex min-h-[48px] items-center rounded-full bg-tinta px-7 text-[15px] font-medium text-papel hover:bg-tinta/90 disabled:opacity-40">
            Publicar cambios
          </button>
        </div>
      )}
    </div>
  )

  return (
    <Hoja abierta onCerrar={pedirCierre} titulo={titulo} bajada={k} ancho="amplio" pie={pie}>
      <div className="grid gap-6 md:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <aside className="md:sticky md:top-0 md:self-start">
          <div role="group" aria-label="Ver como" className="mx-auto mb-3 flex w-fit rounded-full bg-papel-alt p-1 ring-1 ring-borde">
            {([['movil', 'Teléfono'], ['escritorio', 'Escritorio']] as const).map(([v, n]) => (
              <button key={v} type="button" aria-pressed={pantalla === v} onClick={() => setPantalla(v)} className={`min-h-[40px] rounded-full px-4 text-[13px] font-medium ${pantalla === v ? 'bg-tinta text-papel' : 'text-tinta-suave'}`}>{n}</button>
            ))}
          </div>
          <VistaPreviaEscena borrador={b} codigo={codigo} pantalla={pantalla} precios={precios} />
          <div className="mt-3 flex justify-center">
            <Casilla checked={visible} onChange={setVisible} className="!text-[14px] text-tinta-suave">Mostrar esta escena en la tienda</Casilla>
          </div>
        </aside>

        <div className="min-w-0">
          <div role="tablist" aria-label="Qué editar" className="sin-barra sticky top-0 z-10 -mx-5 flex gap-1 overflow-x-auto bg-papel px-5 py-2">
            {SECCIONES.map((s) => (
              <button key={s.id} type="button" role="tab" id={`tab-${s.id}`} aria-selected={seccion === s.id} aria-controls={`panel-${s.id}`} onClick={() => setSeccion(s.id)} className={`presionable min-h-[44px] shrink-0 rounded-full px-4 text-[14px] font-medium ${seccion === s.id ? 'bg-tinta text-papel' : 'bg-papel-alt text-tinta-suave ring-1 ring-borde'}`}>
                {s.nombre}{s.id === 'capsulas' && b.capsulas.length > 0 ? ` · ${b.capsulas.length}` : ''}
              </button>
            ))}
          </div>

          <div role="tabpanel" id={`panel-${seccion}`} aria-labelledby={`tab-${seccion}`} className="grid gap-5">
            {seccion === 'imagen' && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <CampoImagen id={`fm-${k}`} etiqueta="Imagen para teléfono" pista="vertical" valor={b.foto_movil} alCambiar={(v) => cambiar({ foto_movil: v })} alQuitar={() => cambiar({ foto_movil: '' })} subir={(a) => subir('foto_movil', a)} proporcion="aspect-[4/5] max-w-[168px]" />
                  <CampoImagen id={`fe-${k}`} etiqueta="Imagen para escritorio" pista="panorámica" valor={b.foto_escritorio} alCambiar={(v) => cambiar({ foto_escritorio: v })} alQuitar={() => cambiar({ foto_escritorio: '' })} subir={(a) => subir('foto_escritorio', a)} proporcion="aspect-[21/9] max-w-[320px]" />
                </div>
                <p className="-mt-2 text-[12px] leading-snug text-gris">Con una sola imagen, se usa para teléfono y escritorio. Sin imágenes ni video, la escena queda de color liso.</p>
                <Texto id={`a-${k}`} etiqueta="Descripción de la imagen" valor={b.alt} alCambiar={(v) => cambiar({ alt: v })} max={240} ayuda="Describe qué se ve, para quien no puede verla. Si es solo decorativa, déjalo vacío." />
                <CampoVideo clave={k} valor={b.video} alCambiar={(v) => cambiar({ video: v })} />
                <Casilla checked={b.sin_texto} onChange={(v) => cambiar({ sin_texto: v })} className="!text-[14px] text-tinta-suave">La imagen ya trae su propio texto: no mostrar titular ni botón encima</Casilla>
              </>
            )}

            {seccion === 'textos' && (
              <>
                <p className="text-[12px] leading-snug text-gris">Lo que dejes vacío no se muestra. Usa la × para borrar un texto.</p>
                {/* La cifra también es texto de la escena: escondida al final, quien vaciaba todos los campos la seguía viendo en la tienda. */}
                {codigo?.promo && (
                  <div className="rounded-[14px] bg-papel-alt/60 p-3 ring-1 ring-borde">
                    <Casilla checked={b.mostrar_cifra} onChange={(v) => cambiar({ mostrar_cifra: v })} className="!text-[14px] font-medium">
                      Mostrar la cifra grande
                    </Casilla>
                    <p className="mt-1 pl-8 text-[12px] leading-snug text-gris">
                      {codigo.promo === 'volumen' ? 'Dice «Hasta X % menos comprando por volumen».' : 'Dice «$ c/u desde N unidades».'} Se calcula sola con sus precios por pack. Desmárcala para quitarla de la escena.
                    </p>
                  </div>
                )}
                <Texto id={`an-${k}`} etiqueta="Texto chico de arriba" valor={b.antetitulo} alCambiar={(v) => cambiar({ antetitulo: v })} max={120} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Texto id={`t1-${k}`} etiqueta="Titular, primera línea" valor={b.titulo_1} alCambiar={(v) => cambiar({ titulo_1: v })} max={80} />
                  <Texto id={`t2-${k}`} etiqueta="Titular, segunda línea" valor={b.titulo_2} alCambiar={(v) => cambiar({ titulo_2: v })} max={80} ayuda="Va resaltada en color." />
                </div>
                <Texto id={`b-${k}`} etiqueta="Bajada" valor={b.bajada} alCambiar={(v) => cambiar({ bajada: v })} max={240} />
                <Texto id={`bt-${k}`} etiqueta="Texto del botón" valor={b.boton} alCambiar={(v) => cambiar({ boton: v })} max={40} ayuda="Sin texto, no hay botón." />
                <Texto id={`et-${k}`} etiqueta="Nombre de la escena" valor={b.etiqueta} alCambiar={(v) => cambiar({ etiqueta: v })} max={40} ayuda="Solo lo oyen los lectores de pantalla y aparece en esta lista." />
              </>
            )}

            {seccion === 'enlaces' && (
              <>
                <CampoDestino id={`dest-${k}`} etiqueta="El botón lleva a" valor={b.destino} alCambiar={(d) => cambiar({ destino: d })} opciones={opciones} />
                <div>
                  <h3 className="mb-2 text-[14px] font-semibold text-tinta">Partir la imagen en zonas</h3>
                  <CampoZonas clave={k} division={b.division} zonas={b.zonas} alCambiar={(division, zonas) => cambiar({ division, zonas })} opciones={opciones} />
                </div>
              </>
            )}

            {seccion === 'colores' && (
              <CampoColores clave={k} tema={b.tema_texto} acento={b.acento} libre={b.acento_libre} alCambiar={(c) => cambiar(c)} />
            )}

            {seccion === 'capsulas' && (
              <CampoCapsulas clave={k} capsulas={b.capsulas} alCambiar={(c) => cambiar({ capsulas: c })} opciones={opciones} />
            )}
          </div>
        </div>
      </div>
    </Hoja>
  )
}
