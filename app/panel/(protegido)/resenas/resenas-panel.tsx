'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { useAvisos } from '@/components/avisos'
import { IconoCamara, IconoBasura } from '@/components/iconos'
import { alternarVisibilidadResena, borrarResena, crearResena, subirFotoResena } from './acciones'

const TIPOS_FOTO_RESENA = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/heic'] as const
const PESO_MAXIMO_FOTO_RESENA = 5 * 1024 * 1024

export type OpcionResena = { pedidoId: string; pedidoNumero: number; cliente: string; productoId: string; producto: string }
export type ResenaPanel = {
  id: string; pedido_id: string; producto_id: string; cliente_nombre: string; texto: string
  visible: boolean; created_at: string; pedidoNumero: number; producto: string; foto: string | null
}

const campo = 'w-full min-h-11 rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

export function ResenasPanel({ opciones, resenas }: { opciones: OpcionResena[]; resenas: ResenaPanel[] }) {
  const avisos = useAvisos()
  const [pendiente, iniciar] = useTransition()
  const [opcion, setOpcion] = useState(opciones[0] ? `${opciones[0].pedidoId}:${opciones[0].productoId}` : '')
  const entradas = useRef<Record<string, HTMLInputElement | null>>({})

  function crear(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    const elegida = opciones.find((o) => `${o.pedidoId}:${o.productoId}` === opcion)
    if (!elegida) return avisos.error('Elige un producto de un pedido entregado.')
    datos.set('pedido_id', elegida.pedidoId)
    datos.set('producto_id', elegida.productoId)
    datos.set('cliente_nombre', elegida.cliente)
    iniciar(async () => {
      const r = await crearResena(datos)
      if (r.ok) { e.currentTarget.reset(); avisos.ok('Reseña creada. Ahora puedes agregarle una foto.') }
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
      <header><h1 className="text-[26px] leading-tight font-semibold tracking-[-0.022em] sm:text-[2.2rem]">Reseñas</h1><p className="mt-1 max-w-[68ch] text-[14px] text-gris sm:text-[15px]">Publica opiniones solo de productos incluidos en pedidos entregados. Cada reseña puede llevar una foto arriba de su texto.</p></header>
      <section className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70 sm:p-6">
        <h2 className="text-[17px] font-semibold">Nueva reseña verificada</h2>
        {opciones.length === 0 ? <p className="mt-2 text-[14px] text-gris">Todavía no hay productos en pedidos entregados para reseñar.</p> : (
          <form onSubmit={crear} className="mt-4 grid gap-3">
            <label className="text-[12px] font-medium text-gris" htmlFor="resena-producto">Producto comprado y entregado
              <select id="resena-producto" value={opcion} onChange={(e) => setOpcion(e.target.value)} disabled={pendiente} className={`${campo} mt-1`}>
                {opciones.map((o) => <option key={`${o.pedidoId}:${o.productoId}`} value={`${o.pedidoId}:${o.productoId}`}>#{o.pedidoNumero} · {o.cliente} · {o.producto}</option>)}
              </select>
            </label>
            <label className="text-[12px] font-medium text-gris" htmlFor="resena-texto">Reseña<textarea id="resena-texto" name="texto" required maxLength={1200} disabled={pendiente} rows={4} className={`${campo} mt-1 resize-y`} placeholder="Escribe aquí lo que compartió la persona." /></label>
            <label className="flex items-center gap-2 text-[13px] text-tinta"><input name="visible" type="checkbox" defaultChecked disabled={pendiente} /> Publicar de inmediato</label>
            <button type="submit" disabled={pendiente} className="presionable w-fit rounded-full bg-spark px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">{pendiente ? 'Guardando…' : 'Crear reseña'}</button>
          </form>
        )}
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
                  <div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{r.cliente_nombre}</p><span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${r.visible ? 'bg-verde/10 text-verde' : 'bg-papel-alt text-gris'}`}>{r.visible ? 'Visible' : 'Oculta'}</span></div>
                  <p className="mt-1 text-[12px] text-gris">Pedido #{r.pedidoNumero} · {r.producto}</p>
                  <p className="mt-3 whitespace-pre-wrap text-[14px] leading-relaxed text-tinta">{r.texto}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <input ref={(el) => { entradas.current[r.id] = el }} type="file" accept={TIPOS_FOTO_RESENA.join(',')} className="sr-only" onChange={(e) => subir(r.id, e.target.files?.[0])} />
                    <button type="button" disabled={pendiente} onClick={() => entradas.current[r.id]?.click()} className="presionable inline-flex min-h-10 items-center gap-1.5 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta disabled:opacity-60"><IconoCamara size={16} />{r.foto ? 'Cambiar foto' : 'Agregar foto'}</button>
                    <button type="button" disabled={pendiente} onClick={() => visibilidad(r)} className="presionable min-h-10 rounded-full bg-papel-alt px-3.5 text-[12px] font-medium text-tinta disabled:opacity-60">{r.visible ? 'Ocultar' : 'Publicar'}</button>
                    <button type="button" disabled={pendiente} onClick={() => borrar(r)} aria-label={`Borrar reseña de ${r.cliente_nombre}`} className="presionable grid min-h-10 min-w-10 place-items-center rounded-full bg-papel-alt text-gris hover:text-rojo disabled:opacity-60"><IconoBasura size={16} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
