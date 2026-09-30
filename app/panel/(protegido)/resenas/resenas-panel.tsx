'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { useAvisos } from '@/components/avisos'
import { IconoCamara, IconoBasura, IconoEstrella } from '@/components/iconos'
import { alternarVisibilidadResena, borrarResena, crearResena, editarResena, quitarFotoResena, subirFotoResena } from './acciones'
import { CampoFotoResena } from './campo-foto-resena'

const TIPOS_FOTO_RESENA = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'] as const
const PESO_MAXIMO_FOTO_RESENA = 5 * 1024 * 1024

const campo = 'w-full min-h-11 rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

export type OpcionResena = { productoId: string; producto: string }
export type ResenaPanel = {
  id: string; producto_id: string | null; cliente_nombre: string; texto: string; calificacion: number
  visible: boolean; created_at: string; pedidoNumero: number | null; producto: string | null; foto: string | null
}

const SIN_PRODUCTO = 'Portada de la tienda (sin producto)'

/** «Portada» = sin producto: la reseña sale solo en la sección de la portada. */
function SelectorProducto({ id, opciones, valor, alCambiar, defaultValue = '', disabled }: {
  id: string; opciones: OpcionResena[]; valor?: string; alCambiar?: (v: string) => void; defaultValue?: string; disabled?: boolean
}) {
  const propiedades = valor === undefined ? { defaultValue } : { value: valor, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => alCambiar?.(e.target.value) }
  return (
    <label className="text-[12px] font-medium text-gris" htmlFor={id}>Dónde se muestra
      <select id={id} name="producto_id" disabled={disabled} className={`${campo} mt-1`} {...propiedades}>
        <option value="">{SIN_PRODUCTO}</option>
        {opciones.map((o) => <option key={o.productoId} value={o.productoId}>{o.producto}</option>)}
      </select>
    </label>
  )
}

function SelectorEstrellas({ id, defaultValue = 5, disabled }: { id: string; defaultValue?: number; disabled?: boolean }) {
  return (
    <label className="text-[12px] font-medium text-gris" htmlFor={id}>
      Calificación
      <select id={id} name="calificacion" defaultValue={defaultValue} disabled={disabled} className={`${campo} mt-1`}>
        {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)}{'☆'.repeat(5 - n)} · {n} {n === 1 ? 'estrella' : 'estrellas'}</option>)}
      </select>
    </label>
  )
}

function Estrellas({ calificacion }: { calificacion: number }) {
  return (
    <span role="img" aria-label={`${calificacion} de 5 estrellas`} className="inline-flex items-center gap-0.5 text-tinta">
      {Array.from({ length: 5 }, (_, i) => <IconoEstrella key={i} size={14} activo={i < calificacion} />)}
    </span>
  )
}

export function ResenasPanel({ opciones, resenas }: { opciones: OpcionResena[]; resenas: ResenaPanel[] }) {
  const avisos = useAvisos()
  const [pendiente, iniciar] = useTransition()
  const [productoId, setProductoId] = useState('')
  const [fotoNueva, setFotoNueva] = useState<File | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const entradas = useRef<Record<string, HTMLInputElement | null>>({})

  function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    // e.currentTarget se vacía cuando termina el evento: hay que guardarlo antes del await.
    const formulario = e.currentTarget
    const datos = new FormData(formulario)
    datos.set('producto_id', productoId)
    datos.delete('archivo')
    if (fotoNueva) datos.set('archivo', fotoNueva)
    iniciar(async () => {
      const r = await crearResena(datos)
      if (r.ok) { formulario.reset(); setFotoNueva(null); avisos.ok(fotoNueva ? 'Reseña creada con su foto.' : 'Reseña creada.') }
      else avisos.error(r.error)
    })
  }

  function guardar(e: React.FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    datos.set('resena_id', id)
    iniciar(async () => {
      const r = await editarResena(datos)
      if (r.ok) { setEditando(null); avisos.ok('Reseña actualizada.') }
      else avisos.error(r.error)
    })
  }

  function subir(id: string, archivo: File | undefined) {
    if (!archivo) return
    if (!TIPOS_FOTO_RESENA.includes(archivo.type as (typeof TIPOS_FOTO_RESENA)[number])) return avisos.error('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
    if (archivo.size > PESO_MAXIMO_FOTO_RESENA) return avisos.error('La foto supera el máximo de 5 MB.')
    const datos = new FormData()
    datos.set('resena_id', id); datos.set('archivo', archivo)
    iniciar(async () => {
      const r = await subirFotoResena(datos)
      if (r.ok) avisos.ok('Foto añadida a la reseña.')
      else avisos.error(r.error)
      const entrada = entradas.current[id]
      if (entrada) entrada.value = ''
    })
  }

  function quitarFoto(r: ResenaPanel) {
    iniciar(async () => {
      const resultado = await quitarFotoResena(r.id)
      if (resultado.ok) avisos.ok('Foto quitada de la reseña.')
      else avisos.error(resultado.error)
    })
  }

  function visibilidad(r: ResenaPanel) {
    iniciar(async () => {
      const resultado = await alternarVisibilidadResena(r.id, !r.visible)
      if (resultado.ok) avisos.ok(r.visible ? 'Reseña oculta de la tienda.' : 'Reseña publicada en la tienda.')
      else avisos.error(resultado.error)
    })
  }

  function borrar(r: ResenaPanel) {
    if (!confirm(`¿Borrar la reseña de ${r.cliente_nombre}?`)) return
    iniciar(async () => {
      const resultado = await borrarResena(r.id)
      if (resultado.ok) avisos.ok('Reseña borrada.')
      else avisos.error(resultado.error)
    })
  }

  return (
    <div className="space-y-8">
      <header><h1 className="text-[26px] leading-tight font-semibold tracking-[-0.022em] sm:text-[2.2rem]">Reseñas</h1><p className="mt-1 max-w-[68ch] text-[14px] text-gris sm:text-[15px]">Escribe testimonios de clientes: nombre, calificación, texto y una foto opcional. Elige si van en un producto o solo en la sección de la portada.</p></header>
      <section className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70 sm:p-6">
        <h2 className="text-[17px] font-semibold">Nueva reseña</h2>
        <form onSubmit={crear} className="mt-4 grid gap-3">
            <SelectorProducto id="resena-producto" opciones={opciones} valor={productoId} alCambiar={setProductoId} disabled={pendiente} />
            <label className="text-[12px] font-medium text-gris" htmlFor="resena-cliente">Nombre del cliente
              <input id="resena-cliente" name="cliente_nombre" required maxLength={120} disabled={pendiente} className={`${campo} mt-1`} placeholder="Como quieres que aparezca firmando la reseña." />
            </label>
            <label className="text-[12px] font-medium text-gris" htmlFor="resena-texto">Reseña<textarea id="resena-texto" name="texto" required maxLength={1200} disabled={pendiente} rows={4} className={`${campo} mt-1 resize-y`} placeholder="Escribe aquí la reseña." /></label>
            <SelectorEstrellas id="resena-calificacion" disabled={pendiente} />
            <CampoFotoResena id="resena-foto" archivo={fotoNueva} alCambiar={setFotoNueva} alError={avisos.error} deshabilitado={pendiente} />
            <label className="flex items-center gap-2 text-[13px] text-tinta"><input name="visible" type="checkbox" defaultChecked disabled={pendiente} /> Publicar de inmediato</label>
            <button type="submit" disabled={pendiente} className="presionable w-fit rounded-full bg-spark px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">{pendiente ? 'Guardando…' : 'Crear reseña'}</button>
          </form>
        
      </section>
      <section aria-labelledby="resenas-lista">
        <div className="mb-3 flex items-baseline justify-between"><h2 id="resenas-lista" className="text-[18px] font-semibold">Reseñas creadas</h2><span className="text-[13px] text-gris">{resenas.length}</span></div>
        {resenas.length === 0 ? <p className="rounded-[14px] bg-papel px-5 py-10 text-center text-[14px] text-gris ring-1 ring-borde/70">Aún no has agregado reseñas.</p> : (
          <ul className="grid gap-3">
            {resenas.map((r) => (
              <li key={r.id} className="flex flex-col gap-4 rounded-[var(--radius-tarjeta)] bg-papel p-4 ring-1 ring-borde/70 sm:flex-row sm:p-5">
                <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-[12px] bg-papel-alt sm:w-40">
                  {r.foto ? <Image src={r.foto} alt={`Foto de la reseña de ${r.cliente_nombre}`} fill sizes="160px" className="object-cover" /> : <span className="grid size-full place-items-center text-[12px] text-gris">Sin foto</span>}
                </div>
                <div className="min-w-0 flex-1">
                  {editando === r.id ? (
                    <form onSubmit={(e) => guardar(e, r.id)} className="grid gap-3">
                      <label className="text-[12px] font-medium text-gris" htmlFor={`editar-nombre-${r.id}`}>Nombre del cliente
                        <input id={`editar-nombre-${r.id}`} name="cliente_nombre" defaultValue={r.cliente_nombre} required maxLength={120} disabled={pendiente} className={`${campo} mt-1`} />
                      </label>
                      <SelectorProducto id={`editar-producto-${r.id}`} opciones={opciones} defaultValue={r.producto_id ?? ''} disabled={pendiente} />
                      <SelectorEstrellas id={`editar-calificacion-${r.id}`} defaultValue={r.calificacion} disabled={pendiente} />
                      <label className="text-[12px] font-medium text-gris" htmlFor={`editar-texto-${r.id}`}>Reseña
                        <textarea id={`editar-texto-${r.id}`} name="texto" defaultValue={r.texto} required maxLength={1200} disabled={pendiente} rows={4} className={`${campo} mt-1 resize-y`} />
                      </label>
                      <div className="flex gap-2">
                        <button type="submit" disabled={pendiente} className="presionable min-h-10 rounded-full bg-spark px-4 text-[12px] font-semibold text-white disabled:opacity-60">{pendiente ? 'Guardando…' : 'Guardar'}</button>
                        <button type="button" disabled={pendiente} onClick={() => setEditando(null)} className="presionable min-h-10 rounded-full bg-papel-alt px-4 text-[12px] font-medium text-tinta disabled:opacity-60">Cancelar</button>
                      </div>
                    </form>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold">{r.cliente_nombre}</p>
                        <Estrellas calificacion={r.calificacion} />
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.visible ? 'bg-verde/10 text-verde' : 'bg-papel-alt text-gris'}`}>{r.visible ? 'Visible' : 'Oculta'}</span>
                      </div>
                      <p className="mt-1 text-[12px] text-gris">{r.pedidoNumero ? `Pedido #${r.pedidoNumero} · ` : ''}{r.producto ?? SIN_PRODUCTO}</p>
                      <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-tinta">{r.texto}</p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <input ref={(el) => { entradas.current[r.id] = el }} type="file" accept={TIPOS_FOTO_RESENA.join(',')} className="sr-only" onChange={(e) => subir(r.id, e.target.files?.[0])} />
                        <button type="button" disabled={pendiente} onClick={() => entradas.current[r.id]?.click()} className="presionable inline-flex min-h-10 items-center gap-1.5 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta disabled:opacity-60"><IconoCamara size={16} />{r.foto ? 'Cambiar foto' : 'Agregar foto'}</button>
                        {r.foto && <button type="button" disabled={pendiente} onClick={() => quitarFoto(r)} className="presionable min-h-10 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta disabled:opacity-60">Quitar foto</button>}
                        <button type="button" disabled={pendiente} onClick={() => setEditando(r.id)} className="presionable min-h-10 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta disabled:opacity-60">Editar</button>
                        <button type="button" disabled={pendiente} onClick={() => visibilidad(r)} className="presionable min-h-10 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta disabled:opacity-60">{r.visible ? 'Ocultar' : 'Publicar'}</button>
                        <button type="button" disabled={pendiente} onClick={() => borrar(r)} aria-label={`Borrar reseña de ${r.cliente_nombre}`} className="presionable grid min-h-10 min-w-10 place-items-center rounded-full bg-papel-alt text-gris hover:text-rojo disabled:opacity-60"><IconoBasura size={16} /></button>
                      </div>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
