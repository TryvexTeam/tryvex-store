'use client'

import { useDeferredValue, useId, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { DestinoMenu } from './cabecera'

/**
 * Buscador en capa, verificado contra las dos referencias (2026-09-13):
 * - Apple Store: al abrir muestra «Enlaces rápidos» y el fondo se desenfoca.
 * - Dune Dragon: al escribir muestra productos con foto y precio, y «Ver todo».
 *
 * Filtra en el navegador sobre la vitrina que la cabecera ya recibió del
 * servidor: no hay endpoint nuevo ni dato extra expuesto, y los precios son
 * los de la base. Es un formulario GET a /tienda, así que sin JavaScript la
 * lupa sigue llevando a la búsqueda completa.
 */

type Producto = NonNullable<DestinoMenu['productos']>[number]

const MAX_RESULTADOS = 8
const LARGO_MAXIMO = 60
const ENLACES_FIJOS = [
  { nombre: 'Toda la tienda', href: '/tienda' },
  { nombre: 'Envíos', href: '/envios' },
  { nombre: 'Cambios y devoluciones', href: '/cambios-y-devoluciones' },
  { nombre: 'Preguntas frecuentes', href: '/ayuda/preguntas-frecuentes' },
] as const

/** Sin tildes ni mayúsculas: «audifonos» encuentra «Audífonos», igual que /tienda. */
const normal = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

export function Buscador({ categorias, alAbrir }: { categorias: DestinoMenu[]; alAbrir?: () => void }) {
  const dialogo = useRef<HTMLDialogElement>(null)
  const campo = useRef<HTMLInputElement>(null)
  const [texto, setTexto] = useState('')
  const termino = normal(useDeferredValue(texto).trim())
  const idTitulo = useId()

  // Un producto puede estar en más de una categoría: se deduplica por enlace.
  const productos = useMemo(() => {
    const vistos = new Map<string, Producto>()
    for (const c of categorias) for (const p of c.productos ?? []) if (!vistos.has(p.href)) vistos.set(p.href, p)
    return [...vistos.values()]
  }, [categorias])

  const resultados = useMemo(
    () => (termino ? productos.filter((p) => normal(p.nombre).includes(termino)).slice(0, MAX_RESULTADOS) : []),
    [productos, termino]
  )

  function abrir(e: React.MouseEvent) {
    e.preventDefault()
    alAbrir?.()
    dialogo.current?.showModal()
    campo.current?.focus()
  }

  function cerrar() {
    dialogo.current?.close()
  }

  const busquedaCompleta = `/tienda?q=${encodeURIComponent(texto.trim())}`

  return (
    <>
      <Link href="/tienda?buscar=1" onClick={abrir} aria-haspopup="dialog" aria-label="Buscar en la tienda" className="grid size-11 place-items-center rounded-full text-tinta/80 hover:text-tinta">
        <IconoLupa tamano={17} />
      </Link>

      {/* Clic en el fondo (fuera de la hoja) cierra, como en Apple. Esc lo resuelve <dialog>. */}
      <dialog ref={dialogo} aria-labelledby={idTitulo} onClick={(e) => e.target === e.currentTarget && cerrar()} onClose={() => setTexto('')}
        className="buscador-capa m-0 h-full max-h-none w-full max-w-none bg-transparent p-0 text-tinta">
        <div className="buscador-hoja mx-auto w-full rounded-b-[22px] bg-papel shadow-2xl t:mt-[72px] t:max-w-[680px] t:rounded-[22px]">
          <h2 id={idTitulo} className="sr-only">Buscar en Tryvex</h2>
          <form action="/tienda" role="search" className="flex items-center gap-3 border-b border-borde/70 px-5 py-3">
            <IconoLupa tamano={20} className="shrink-0 text-gris" />
            <label htmlFor="buscador-campo" className="sr-only">Buscar productos</label>
            <input ref={campo} id="buscador-campo" name="q" type="search" value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={LARGO_MAXIMO}
              // Un campo type=search gasta el primer Esc en borrar el texto; aquí Esc siempre cierra.
              onKeyDown={(e) => { if (e.key === 'Escape') { e.preventDefault(); cerrar() } }}
              placeholder="Buscar en Tryvex" autoComplete="off" enterKeyHint="search"
              className="h-11 min-w-0 flex-1 bg-transparent text-[19px] tracking-cuerpo placeholder:text-gris focus:outline-none t:text-[21px]" />
            <button type="button" onClick={cerrar} aria-label="Cerrar buscador" className="grid size-11 shrink-0 place-items-center rounded-full text-gris hover:bg-papel-alt hover:text-tinta">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </form>

          <div className="max-h-[calc(100dvh-160px)] overflow-y-auto px-5 pt-4 pb-6">
            {termino ? (
              <Resultados resultados={resultados} texto={texto.trim()} hrefCompleto={busquedaCompleta} alElegir={cerrar} />
            ) : (
              <EnlacesRapidos categorias={categorias} alElegir={cerrar} />
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}

function Resultados({ resultados, texto, hrefCompleto, alElegir }: { resultados: Producto[]; texto: string; hrefCompleto: string; alElegir: () => void }) {
  return (
    <section aria-live="polite">
      <p className="text-[12px] font-medium text-gris">
        {resultados.length === 0 ? `Sin productos para «${texto}».` : resultados.length === 1 ? '1 producto' : `${resultados.length} productos`}
      </p>
      {resultados.length > 0 && (
        <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-5 t:grid-cols-4">
          {resultados.map((p) => (
            <li key={p.href} className="min-w-0">
              <Link href={p.href} onClick={alElegir} className="group block rounded-xl">
                <span className="relative block aspect-square overflow-hidden rounded-xl bg-papel-alt">
                  {p.imagen && <Image src={p.imagen} alt="" fill sizes="(min-width: 735px) 150px, 45vw" className="object-contain p-3 transition-transform duration-300 group-hover:scale-[1.04]" />}
                </span>
                <span className="mt-2 block text-[14px] leading-snug">{p.nombre}</span>
                <span className="cifra mt-0.5 block text-[14px] text-tinta-suave">{clp(p.precio)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <Link href={hrefCompleto} onClick={alElegir} className="mt-5 inline-flex text-[14px] font-medium text-spark hover:underline">
        Ver todos los resultados en la tienda →
      </Link>
    </section>
  )
}

function EnlacesRapidos({ categorias, alElegir }: { categorias: DestinoMenu[]; alElegir: () => void }) {
  const enlaces = [...categorias.map((c) => ({ nombre: c.nombre, href: c.href })), ...ENLACES_FIJOS]
  return (
    <nav aria-label="Enlaces rápidos">
      <p className="text-[12px] font-medium text-gris">Enlaces rápidos</p>
      <ul className="mt-2">
        {enlaces.map((e) => (
          <li key={e.href}>
            <Link href={e.href} onClick={alElegir} className="flex items-center gap-2 rounded-lg py-2 text-[15px] hover:text-spark">
              <span aria-hidden className="text-gris">→</span>{e.nombre}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function IconoLupa({ tamano, className }: { tamano: number; className?: string }) {
  return (
    <svg width={tamano} height={tamano} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" className={className} aria-hidden>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}
