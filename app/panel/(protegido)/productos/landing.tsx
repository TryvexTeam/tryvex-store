'use client'

import { useEffect, useState, useTransition } from 'react'
import { useAvisos } from '@/components/avisos'
import { IconoBasura, IconoMas } from '@/components/iconos'
import {
  bloqueNuevo,
  FORMATOS,
  MAX_BLOQUES,
  MAX_ITEMS,
  ROTULO_BLOQUE,
  TIPOS_BLOQUE,
  type Bloque,
  type FormatoImagen,
  type TipoBloque,
} from '@/lib/landing-producto'
import { CampoImagen } from '../portada/campo-imagen'
import { guardarLanding, leerLandingPanel, subirImagenLanding } from './acciones-landing'

const campo =
  'w-full min-h-11 rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
const rotulo = 'mb-1 block text-[12px] font-medium text-gris'
const botonSuave =
  'presionable inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta ring-1 ring-borde hover:bg-papel disabled:opacity-40'

const PROPORCION: Record<FormatoImagen, string> = {
  horizontal: 'aspect-[16/9]',
  cuadrado: 'aspect-square',
  vertical: 'aspect-[4/5]',
}

type Cambios = Record<string, unknown>

function Texto({ id, etiqueta, valor, alCambiar, max, pista, area = false }: {
  id: string; etiqueta: string; valor: string; alCambiar: (v: string) => void; max: number; pista?: string; area?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>{etiqueta}</label>
      {area
        ? <textarea id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} maxLength={max} rows={4} placeholder={pista} className={`${campo} resize-y`} />
        : <input id={id} value={valor} onChange={(e) => alCambiar(e.target.value)} maxLength={max} placeholder={pista} className={campo} />}
    </div>
  )
}

function SelectorFormato({ id, valor, alCambiar }: { id: string; valor: FormatoImagen; alCambiar: (v: FormatoImagen) => void }) {
  return (
    <div>
      <label htmlFor={id} className={rotulo}>Forma de la imagen</label>
      <select id={id} value={valor} onChange={(e) => alCambiar(e.target.value as FormatoImagen)} className={campo}>
        {FORMATOS.map((f) => <option key={f.valor} value={f.valor}>{f.rotulo}</option>)}
      </select>
    </div>
  )
}

function Flecha({ abajo }: { abajo?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={abajo ? 'm6 9 6 6 6-6' : 'm18 15-6-6-6 6'} />
    </svg>
  )
}

/** Campo de imagen del equipo: sube a la carpeta del producto y devuelve la URL. */
function Imagen({ productoId, id, etiqueta, pista, valor, alCambiar, formato }: {
  productoId: string; id: string; etiqueta: string; pista: string; valor: string; alCambiar: (url: string) => void; formato: FormatoImagen
}) {
  return (
    <CampoImagen
      id={id}
      etiqueta={etiqueta}
      pista={pista}
      valor={valor}
      alCambiar={alCambiar}
      proporcion={`${PROPORCION[formato]} max-w-[420px]`}
      alQuitar={() => alCambiar('')}
      subir={async (archivo) => {
        const datos = new FormData()
        datos.set('producto_id', productoId)
        datos.set('archivo', archivo)
        const r = await subirImagenLanding(datos)
        return r.ok ? { ok: true as const, url: r.url } : { ok: false as const, error: r.error }
      }}
    />
  )
}

/** Fila de una lista editable (puntos, tarjetas, preguntas) con su botón de quitar. */
function Fila({ etiqueta, alQuitar, children }: { etiqueta: string; alQuitar: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] bg-papel-alt p-3.5 ring-1 ring-borde/60">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[12px] font-semibold text-tinta">{etiqueta}</span>
        <button type="button" onClick={alQuitar} aria-label={`Quitar ${etiqueta.toLowerCase()}`} className="presionable grid size-9 place-items-center rounded-full text-gris hover:text-rojo"><IconoBasura size={16} /></button>
      </div>
      <div className="grid gap-3">{children}</div>
    </div>
  )
}

function AgregarFila({ texto, alAgregar, deshabilitado }: { texto: string; alAgregar: () => void; deshabilitado: boolean }) {
  return (
    <button type="button" onClick={alAgregar} disabled={deshabilitado} className={`${botonSuave} w-fit`}>
      <IconoMas size={14} />{texto}
    </button>
  )
}

function CamposBloque({ b, productoId, set }: { b: Bloque; productoId: string; set: (c: Cambios) => void }) {
  const p = `${b.id}`
  switch (b.tipo) {
    case 'encabezado':
      return (
        <>
          <Texto id={`${p}-ante`} etiqueta="Texto pequeño de arriba (opcional)" valor={b.antetitulo} alCambiar={(v) => set({ antetitulo: v })} max={80} pista="Ej.: Sonido sin cables" />
          <Texto id={`${p}-tit`} etiqueta="Título" valor={b.titulo} alCambiar={(v) => set({ titulo: v })} max={140} />
          <Texto id={`${p}-baj`} etiqueta="Bajada" valor={b.bajada} alCambiar={(v) => set({ bajada: v })} max={400} area />
          <SelectorFormato id={`${p}-fmt`} valor={b.formato} alCambiar={(v) => set({ formato: v })} />
          <Imagen productoId={productoId} id={`${p}-img`} etiqueta="Imagen (opcional)" pista="Va bajo el título" valor={b.imagen} alCambiar={(v) => set({ imagen: v })} formato={b.formato} />
        </>
      )
    case 'imagen_texto':
      return (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${p}-lado`} className={rotulo}>Imagen a la</label>
              <select id={`${p}-lado`} value={b.lado} onChange={(e) => set({ lado: e.target.value })} className={campo}>
                <option value="izquierda">Izquierda</option>
                <option value="derecha">Derecha</option>
              </select>
            </div>
            <SelectorFormato id={`${p}-fmt`} valor={b.formato} alCambiar={(v) => set({ formato: v })} />
          </div>
          <Imagen productoId={productoId} id={`${p}-img`} etiqueta="Imagen" pista="Al lado del texto" valor={b.imagen} alCambiar={(v) => set({ imagen: v })} formato={b.formato} />
          <Texto id={`${p}-ante`} etiqueta="Texto pequeño de arriba (opcional)" valor={b.antetitulo} alCambiar={(v) => set({ antetitulo: v })} max={80} />
          <Texto id={`${p}-tit`} etiqueta="Título" valor={b.titulo} alCambiar={(v) => set({ titulo: v })} max={140} />
          <Texto id={`${p}-txt`} etiqueta="Texto" valor={b.texto} alCambiar={(v) => set({ texto: v })} max={1500} area pista="Deja una línea en blanco para separar párrafos." />
          {b.puntos.map((pt, i) => (
            <Fila key={i} etiqueta={`Punto ${i + 1}`} alQuitar={() => set({ puntos: b.puntos.filter((_, j) => j !== i) })}>
              <Texto id={`${p}-pt-${i}`} etiqueta="Texto del punto" valor={pt} alCambiar={(v) => set({ puntos: b.puntos.map((x, j) => (j === i ? v : x)) })} max={160} />
            </Fila>
          ))}
          <AgregarFila texto="Agregar punto" deshabilitado={b.puntos.length >= MAX_ITEMS} alAgregar={() => set({ puntos: [...b.puntos, ''] })} />
        </>
      )
    case 'galeria':
      return (
        <>
          <Texto id={`${p}-tit`} etiqueta="Título (opcional)" valor={b.titulo} alCambiar={(v) => set({ titulo: v })} max={140} />
          <SelectorFormato id={`${p}-fmt`} valor={b.formato} alCambiar={(v) => set({ formato: v })} />
          {b.imagenes.map((im, i) => (
            <Fila key={i} etiqueta={`Imagen ${i + 1}`} alQuitar={() => set({ imagenes: b.imagenes.filter((_, j) => j !== i) })}>
              <Imagen productoId={productoId} id={`${p}-im-${i}`} etiqueta="Imagen" pista="Se ordenan en fila" valor={im.imagen} alCambiar={(v) => set({ imagenes: b.imagenes.map((x, j) => (j === i ? { ...x, imagen: v } : x)) })} formato={b.formato} />
              <Texto id={`${p}-pie-${i}`} etiqueta="Pie de foto (opcional)" valor={im.pie} alCambiar={(v) => set({ imagenes: b.imagenes.map((x, j) => (j === i ? { ...x, pie: v } : x)) })} max={140} />
            </Fila>
          ))}
          <AgregarFila texto="Agregar imagen" deshabilitado={b.imagenes.length >= MAX_ITEMS} alAgregar={() => set({ imagenes: [...b.imagenes, { imagen: '', pie: '' }] })} />
        </>
      )
    case 'caracteristicas':
      return (
        <>
          <Texto id={`${p}-tit`} etiqueta="Título" valor={b.titulo} alCambiar={(v) => set({ titulo: v })} max={140} />
          <Texto id={`${p}-baj`} etiqueta="Bajada (opcional)" valor={b.bajada} alCambiar={(v) => set({ bajada: v })} max={400} area />
          {b.items.map((it, i) => (
            <Fila key={i} etiqueta={`Tarjeta ${i + 1}`} alQuitar={() => set({ items: b.items.filter((_, j) => j !== i) })}>
              <Imagen productoId={productoId} id={`${p}-it-${i}`} etiqueta="Imagen (opcional)" pista="Arriba de la tarjeta" valor={it.imagen} alCambiar={(v) => set({ items: b.items.map((x, j) => (j === i ? { ...x, imagen: v } : x)) })} formato="horizontal" />
              <Texto id={`${p}-itt-${i}`} etiqueta="Título" valor={it.titulo} alCambiar={(v) => set({ items: b.items.map((x, j) => (j === i ? { ...x, titulo: v } : x)) })} max={100} />
              <Texto id={`${p}-itx-${i}`} etiqueta="Texto" valor={it.texto} alCambiar={(v) => set({ items: b.items.map((x, j) => (j === i ? { ...x, texto: v } : x)) })} max={400} area />
            </Fila>
          ))}
          <AgregarFila texto="Agregar tarjeta" deshabilitado={b.items.length >= MAX_ITEMS} alAgregar={() => set({ items: [...b.items, { imagen: '', titulo: '', texto: '' }] })} />
        </>
      )
    case 'banner':
      return (
        <>
          <Imagen productoId={productoId} id={`${p}-img`} etiqueta="Imagen para computador" pista="Ancha, tipo 21:9" valor={b.imagen} alCambiar={(v) => set({ imagen: v })} formato="horizontal" />
          <Imagen productoId={productoId} id={`${p}-mov`} etiqueta="Imagen para teléfono (opcional)" pista="Vertical, tipo 4:5. Si falta, se usa la de computador" valor={b.imagenMovil} alCambiar={(v) => set({ imagenMovil: v })} formato="vertical" />
          <Texto id={`${p}-tit`} etiqueta="Título (opcional)" valor={b.titulo} alCambiar={(v) => set({ titulo: v })} max={140} />
          <Texto id={`${p}-txt`} etiqueta="Texto (opcional)" valor={b.texto} alCambiar={(v) => set({ texto: v })} max={400} area />
          <div>
            <label htmlFor={`${p}-col`} className={rotulo}>Color del texto</label>
            <select id={`${p}-col`} value={b.color} onChange={(e) => set({ color: e.target.value })} className={campo}>
              <option value="claro">Blanco (con degradado oscuro abajo)</option>
              <option value="oscuro">Negro (para imágenes claras)</option>
            </select>
          </div>
        </>
      )
    case 'preguntas':
      return (
        <>
          <Texto id={`${p}-tit`} etiqueta="Título (opcional)" valor={b.titulo} alCambiar={(v) => set({ titulo: v })} max={140} pista="Ej.: Preguntas frecuentes" />
          {b.items.map((it, i) => (
            <Fila key={i} etiqueta={`Pregunta ${i + 1}`} alQuitar={() => set({ items: b.items.filter((_, j) => j !== i) })}>
              <Texto id={`${p}-pq-${i}`} etiqueta="Pregunta" valor={it.pregunta} alCambiar={(v) => set({ items: b.items.map((x, j) => (j === i ? { ...x, pregunta: v } : x)) })} max={200} />
              <Texto id={`${p}-pr-${i}`} etiqueta="Respuesta" valor={it.respuesta} alCambiar={(v) => set({ items: b.items.map((x, j) => (j === i ? { ...x, respuesta: v } : x)) })} max={1000} area />
            </Fila>
          ))}
          <AgregarFila texto="Agregar pregunta" deshabilitado={b.items.length >= MAX_ITEMS} alAgregar={() => set({ items: [...b.items, { pregunta: '', respuesta: '' }] })} />
        </>
      )
  }
}

function resumen(b: Bloque): string {
  if ('titulo' in b && b.titulo) return b.titulo
  if (b.tipo === 'preguntas') return b.items[0]?.pregunta ?? ''
  return ''
}

/**
 * Editor de la landing de un producto: bloques que se agregan, ordenan, ocultan y
 * editan sin tocar código. Las imágenes se guardan al subirlas; los textos y el
 * orden, al pulsar «Guardar landing».
 */
export function LandingProducto({ productoId }: { productoId: string }) {
  const avisos = useAvisos()
  const [pendiente, iniciar] = useTransition()
  const [bloques, setBloques] = useState<Bloque[] | null>(null)
  const [slug, setSlug] = useState('')
  const [disponible, setDisponible] = useState(true)
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set())
  const [sucio, setSucio] = useState(false)
  const [nuevo, setNuevo] = useState<TipoBloque>('imagen_texto')

  useEffect(() => {
    let vigente = true
    leerLandingPanel(productoId).then((r) => {
      if (!vigente) return
      if (r.ok) { setBloques(r.bloques); setSlug(r.slug); setDisponible(r.disponible) }
      else { setBloques([]); avisos.error(r.error) }
    })
    return () => { vigente = false }
    // avisos es estable por contexto; solo interesa recargar al cambiar de producto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productoId])

  function editar(f: (b: Bloque[]) => Bloque[]) {
    setBloques((actual) => f(actual ?? []))
    setSucio(true)
  }
  const cambiar = (id: string, c: Cambios) => editar((l) => l.map((b) => (b.id === id ? ({ ...b, ...c } as Bloque) : b)))
  function mover(i: number, d: -1 | 1) {
    editar((l) => { const n = [...l]; const j = i + d; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n })
  }
  function alternar(id: string) {
    setAbiertos((a) => { const n = new Set(a); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  function agregar() {
    const b = bloqueNuevo(nuevo)
    editar((l) => [...l, b])
    setAbiertos((a) => new Set(a).add(b.id))
  }
  function quitar(b: Bloque) {
    if (!confirm(`¿Quitar el bloque «${ROTULO_BLOQUE[b.tipo]}»? Se pierde lo que escribió en él.`)) return
    editar((l) => l.filter((x) => x.id !== b.id))
  }
  function guardar() {
    iniciar(async () => {
      const r = await guardarLanding(productoId, bloques ?? [])
      if (r.ok) { setBloques(r.bloques); setSucio(false); avisos.ok('Landing guardada.') }
      else avisos.error(r.error)
    })
  }

  return (
    <section className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70" aria-labelledby={`landing-${productoId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id={`landing-${productoId}`} className="text-[15px] font-semibold">Landing del producto</h3>
          <p className="mt-0.5 max-w-[56ch] text-[12px] text-gris">Bloques que se muestran bajo la ficha: textos e imágenes que usted escribe y sube. Los bloques ocultos no salen en la tienda.</p>
        </div>
        {slug && <a href={`/producto/${slug}`} target="_blank" rel="noopener noreferrer" className={botonSuave}>Ver en la tienda</a>}
      </div>

      {bloques === null ? (
        <p className="mt-4 text-[13px] text-gris">Cargando…</p>
      ) : !disponible ? (
        <p role="status" className="mt-4 rounded-[10px] bg-papel-alt px-4 py-3 text-[13px] text-tinta ring-1 ring-borde">
          La landing todavía no está habilitada en la base de datos: falta aplicar la migración <code>2026-09-30-landing-por-producto.sql</code>.
        </p>
      ) : (
        <>
          {bloques.length === 0 ? (
            <p className="mt-4 rounded-[12px] bg-papel-alt px-4 py-8 text-center text-[13px] text-gris">Este producto aún no tiene landing. Agregue el primer bloque.</p>
          ) : (
            <ul className="mt-4 grid gap-3">
              {bloques.map((b, i) => {
                const abierto = abiertos.has(b.id)
                return (
                  <li key={b.id} className={`rounded-[14px] ring-1 ${b.visible ? 'bg-papel ring-borde' : 'bg-papel-alt ring-borde/60'}`}>
                    <div className="flex items-center gap-1 p-2">
                      <button type="button" onClick={() => alternar(b.id)} aria-expanded={abierto} className="min-h-11 min-w-0 flex-1 rounded-[10px] px-2 text-left hover:bg-papel-alt">
                        <span className="block truncate text-[13px] font-semibold text-tinta">{i + 1}. {ROTULO_BLOQUE[b.tipo]}{!b.visible && <span className="ml-2 rounded-full bg-papel px-2 py-0.5 text-[11px] font-medium text-gris ring-1 ring-borde">Oculto</span>}</span>
                        <span className="block truncate text-[12px] text-gris">{resumen(b) || 'Sin título todavía'}</span>
                      </button>
                      <button type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label={`Subir el bloque ${i + 1}`} className={`${botonSuave} !min-h-10 !w-10 !px-0`}><Flecha /></button>
                      <button type="button" onClick={() => mover(i, 1)} disabled={i === bloques.length - 1} aria-label={`Bajar el bloque ${i + 1}`} className={`${botonSuave} !min-h-10 !w-10 !px-0`}><Flecha abajo /></button>
                      <button type="button" onClick={() => cambiar(b.id, { visible: !b.visible })} className={botonSuave}>{b.visible ? 'Ocultar' : 'Mostrar'}</button>
                      <button type="button" onClick={() => quitar(b)} aria-label={`Quitar el bloque ${i + 1}`} className="presionable grid size-10 place-items-center rounded-full text-gris hover:text-rojo"><IconoBasura size={16} /></button>
                    </div>
                    {abierto && (
                      <div className="grid gap-4 border-t border-borde/70 p-4">
                        <CamposBloque b={b} productoId={productoId} set={(c) => cambiar(b.id, c)} />
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap items-end gap-2">
            <div className="min-w-[200px] flex-1">
              <label htmlFor={`nuevo-${productoId}`} className={rotulo}>Agregar un bloque</label>
              <select id={`nuevo-${productoId}`} value={nuevo} onChange={(e) => setNuevo(e.target.value as TipoBloque)} className={campo}>
                {TIPOS_BLOQUE.map((t) => <option key={t.tipo} value={t.tipo}>{t.rotulo}</option>)}
              </select>
            </div>
            <button type="button" onClick={agregar} disabled={bloques.length >= MAX_BLOQUES} className={`${botonSuave} !min-h-11 px-4`}><IconoMas size={14} />Agregar</button>
          </div>
          <p className="mt-1.5 text-[12px] text-gris">{TIPOS_BLOQUE.find((t) => t.tipo === nuevo)?.ayuda}</p>

          <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-borde/70 pt-4">
            <button type="button" onClick={guardar} disabled={pendiente || !sucio} className="presionable min-h-11 rounded-full bg-tinta px-6 text-[13px] font-semibold text-white hover:bg-tinta/85 disabled:opacity-50">
              {pendiente ? 'Guardando…' : 'Guardar landing'}
            </button>
            <span role="status" className="text-[12px] text-gris">{sucio ? 'Hay cambios sin guardar.' : 'Todo guardado.'}</span>
          </div>
        </>
      )}
    </section>
  )
}
