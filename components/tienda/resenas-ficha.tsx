'use client'

import Image from 'next/image'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { IconoEstrella } from '@/components/iconos'
import type { ResenaPublica, ResumenResenas } from '@/lib/resenas'
import { GrillaFotosClientes } from './grilla-fotos-clientes'

/**
 * Reseñas en la ficha de producto.
 *
 * Patrón de Judge.me (Dune Dragon) y Loox (la tienda anterior del equipo), en la
 * disciplina de la tienda: resumen con distribución que además filtra, fotos de
 * clientes arriba y una grilla que se lee a su ritmo. En la ficha no hay carrusel
 * que avance solo: una reseña se lee y se compara, no se mira pasar.
 *
 * «Compra verificada» sale solo cuando la reseña nace de un pedido real.
 */

type Filtro = 'todas' | 'fotos' | 1 | 2 | 3 | 4 | 5

/** Con menos reseñas que esto, «2 de 2» suena a montaje: no se muestra el porcentaje. */
const MINIMO_PARA_PROPORCION = 5
/** Desde esta cantidad de fotos, la grilla en movimiento encabeza las reseñas. */
const FOTOS_PARA_GRILLA = 6

const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function ResenasFicha({ resenas, resumen, producto, escribir }: { resenas: ResenaPublica[]; resumen: ResumenResenas; producto: string; /** Botón «Escribir una reseña» (o su estado). */ escribir?: ReactNode }) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const pista = useRef<HTMLUListElement>(null)
  const [extremos, setExtremos] = useState({ inicio: true, fin: false })
  const [abierta, setAbierta] = useState<ResenaPublica | null>(null)
  const visor = useRef<HTMLDialogElement>(null)

  const conFoto = useMemo(() => resenas.filter((r) => r.foto), [resenas])
  const filtradas = useMemo(() => {
    if (filtro === 'todas') return resenas
    if (filtro === 'fotos') return conFoto
    return resenas.filter((r) => r.calificacion === filtro)
  }, [filtro, resenas, conFoto])

  // Con pocas reseñas no hay hacia dónde avanzar: se mide al montar y al cambiar el filtro.
  useEffect(() => medirPista(), [filtradas])

  // Sin reseñas todavía: solo la invitación a ser el primero (si hay botón que ofrecer).
  if (resumen.total === 0 || resenas.length === 0) {
    if (!escribir) return null
    return (
      <section id="resenas" aria-labelledby="resenas-titulo" className="scroll-mt-20 bg-papel-alt px-[var(--canal)] py-14 text-center t:py-20">
        <p className="text-[13px] font-semibold tracking-[0.14em] text-tinta-suave uppercase">Reseñas de clientes</p>
        <h2 id="resenas-titulo" className="mx-auto mt-3 max-w-[18ch] text-[30px] leading-[1.06] font-semibold tracking-seccion text-balance text-tinta t:text-[40px]">Sé el primero en contar cómo te fue.</h2>
        <div className="mt-6 flex justify-center">{escribir}</div>
      </section>
    )
  }

  function elegir(nuevo: Filtro) {
    setFiltro((actual) => (actual === nuevo && nuevo !== 'todas' ? 'todas' : nuevo))
    pista.current?.scrollTo({ left: 0 })
  }

  function verFoto(resena: ResenaPublica) {
    setAbierta(resena)
    visor.current?.showModal()
  }

  function medirPista() {
    const el = pista.current
    if (!el) return
    setExtremos({ inicio: el.scrollLeft <= 2, fin: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 })
  }

  function mover(direccion: 1 | -1) {
    const el = pista.current
    const tarjeta = el?.querySelector('li')
    if (!el || !tarjeta) return
    el.scrollBy({ left: direccion * (tarjeta.getBoundingClientRect().width + 16), behavior: 'smooth' })
  }

  const recomiendan = Math.round((resumen.positivas / resumen.total) * 100)

  const titulo = (
    <>
      <p className="text-[13px] font-semibold tracking-[0.14em] uppercase opacity-70">Reseñas de clientes</p>
      <h2 id="resenas-titulo" className="mx-auto mt-3 max-w-[16ch] text-[34px] leading-[1.04] font-semibold tracking-seccion text-balance t:text-[52px] d:text-[60px]">
        Lo que dicen quienes ya lo tienen.
      </h2>
    </>
  )
  const nota = (claro: boolean) => (
    <div className="mt-6 inline-flex items-center gap-4">
      <span className="cifra text-[56px] leading-none font-semibold tracking-seccion t:text-[68px]">{decimal(resumen.promedio)}</span>
      <span className="text-left">
        <Estrellas calificacion={Math.round(resumen.promedio)} tam={18} claro={claro} />
        <span className="mt-1 block text-[15px] font-medium opacity-80">
          {resumen.total} {resumen.total === 1 ? 'reseña' : 'reseñas'}{conFoto.length > 0 ? ` · ${conFoto.length} con foto` : ''}
        </span>
      </span>
    </div>
  )

  return (
    <section id="resenas" aria-labelledby="resenas-titulo" className="scroll-mt-20 bg-papel-alt pb-16 t:pb-24">
      {/* ── Apertura a todo el ancho ─────────────────────────── */}
      {conFoto.length >= FOTOS_PARA_GRILLA ? (
        <GrillaFotosClientes
          fotos={conFoto.map((r) => ({ id: r.id, src: r.foto!, alt: `Foto de ${r.cliente}` }))}
          alAbrir={(id) => { const r = conFoto.find((x) => x.id === id); if (r) verFoto(r) }}
        >
          <div>
            {titulo}
            {nota(true)}
            <p className="mt-4 text-[14px] text-white/70">Fotos reales de clientes · toca una para leer su reseña</p>
          </div>
        </GrillaFotosClientes>
      ) : (
        <div className="px-[var(--canal)] pt-14 text-center text-tinta t:pt-20">
          {titulo}
          {nota(false)}
        </div>
      )}

      {/* ── Control: distribución, filtros y flechas, alineados al contenido ── */}
      <div className="mx-auto mt-10 w-full max-w-[1204px] px-[var(--canal)] t:mt-12">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
          <div className="w-full max-w-[420px] lg:max-w-[360px]">
            {resumen.total >= MINIMO_PARA_PROPORCION && (
              <p className="mb-3 text-[15px] text-tinta-suave">
                <span className="cifra font-semibold text-verde">{recomiendan} %</span> lo calificó con 4 o 5 estrellas
              </p>
            )}
            <ul className="grid gap-1 lg:gap-0" aria-label="Filtrar por estrellas">
              {resumen.distribucion.map((cantidad, i) => {
                const estrellas = (5 - i) as 1 | 2 | 3 | 4 | 5
                const activa = filtro === estrellas
                return (
                  <li key={estrellas}>
                    <button
                      type="button"
                      disabled={cantidad === 0}
                      aria-pressed={activa}
                      onClick={() => elegir(estrellas)}
                      className={`grid w-full grid-cols-[34px_1fr_40px] items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[14px] lg:py-1 lg:text-[13px] transition-colors duration-200 disabled:opacity-40 ${activa ? 'bg-papel ring-1 ring-tinta/15' : 'enabled:hover:bg-papel'}`}
                    >
                      <span className="cifra flex items-center gap-1 font-medium text-tinta">{estrellas}<IconoEstrella size={13} activo /></span>
                      <span className="h-2 overflow-hidden rounded-full bg-borde/70">
                        <span className="block h-full origin-left rounded-full bg-tinta transition-transform duration-500" style={{ transform: `scaleX(${cantidad / resumen.total})` }} />
                      </span>
                      <span className="cifra text-right text-tinta-suave">{cantidad}</span>
                      <span className="sr-only">{`reseñas de ${estrellas} ${estrellas === 1 ? 'estrella' : 'estrellas'}`}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end">
            {escribir}
            <div className="flex flex-wrap gap-2" role="group" aria-label="Mostrar">
              <Chip activo={filtro === 'todas'} onClick={() => elegir('todas')}>Todas · {resenas.length}</Chip>
              {conFoto.length > 0 && <Chip activo={filtro === 'fotos'} onClick={() => elegir('fotos')}>Con foto · {conFoto.length}</Chip>}
              {typeof filtro === 'number' && <Chip activo onClick={() => elegir('todas')}>{filtro} estrellas ✕</Chip>}
            </div>
            {/* Flechas fuera de las tarjetas (no las tapan); solo desde 735 px y se apagan en los extremos. */}
            <div className="hidden shrink-0 gap-2 t:flex">
              <Flecha lado="izquierda" apagada={extremos.inicio} onClick={() => mover(-1)} />
              <Flecha lado="derecha" apagada={extremos.fin} onClick={() => mover(1)} />
            </div>
          </div>
        </div>
      </div>

      <p className="sr-only" aria-live="polite">{`${filtradas.length} reseñas`}</p>

      {/* ── Carrusel a todo el ancho: la primera tarjeta alineada al contenido, el resto corre hasta el borde ── */}
      <ul
        ref={pista}
        onScroll={medirPista}
        aria-label={`Reseñas de ${producto}`}
        className="sin-barra mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [--margen-resenas:max(var(--canal),calc((100vw-1204px)/2+var(--canal)))] [padding-inline:var(--margen-resenas)] [scroll-padding-inline:var(--margen-resenas)] t:gap-5"
      >
        {filtradas.map((r) => (
          <li key={r.id} className="flex w-[min(80vw,320px)] shrink-0 snap-start flex-col overflow-hidden rounded-[18px] bg-papel shadow-sutil transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgb(0_0_0/0.10)] t:w-[300px]">
            {r.foto && (
              <button type="button" onClick={() => verFoto(r)} className="group relative aspect-[4/5] w-full overflow-hidden bg-papel-alt t:aspect-square" aria-label={`Ver la foto de ${r.cliente} en grande`}>
                <Image src={r.foto} alt="" fill sizes="(min-width: 735px) 300px, 80vw" className="object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
              </button>
            )}
            <div className="flex flex-1 flex-col p-5 t:p-6">
              <div className="flex items-center justify-between gap-3">
                <Estrellas calificacion={r.calificacion} tam={15} />
                {r.verificada && (
                  <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-verde">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                    Compra verificada
                  </span>
                )}
              </div>
              {/* Sin foto, la reseña es la protagonista de la tarjeta: va más grande y entre comillas. */}
              <p className={`mt-3 whitespace-pre-line text-tinta ${r.foto ? 'line-clamp-4 text-[16px] leading-[1.5]' : 'line-clamp-[12] text-[19px] leading-[1.4] font-medium'}`}>{r.foto ? r.texto : `“${r.texto}”`}</p>
              <p className="mt-auto pt-5 text-[14px] font-semibold text-tinta">{r.cliente}</p>
            </div>
          </li>
        ))}
      </ul>

      <dialog
        ref={visor}
        onClose={() => setAbierta(null)}
        onClick={(e) => { if (e.target === e.currentTarget) visor.current?.close() }}
        aria-label={abierta ? `Foto de ${abierta.cliente}` : 'Foto de cliente'}
        className="m-auto w-[min(92vw,560px)] overflow-hidden rounded-[24px] bg-papel p-0 text-tinta shadow-2xl backdrop:bg-black/60"
      >
        {abierta?.foto && (
          <div>
            <div className="relative aspect-square w-full bg-papel-alt">
              <Image src={abierta.foto} alt={`Foto compartida por ${abierta.cliente}`} fill sizes="560px" className="object-contain" />
            </div>
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <Estrellas calificacion={abierta.calificacion} tam={15} />
                <button type="button" onClick={() => visor.current?.close()} className="presionable inline-flex min-h-[44px] items-center rounded-full px-4 text-[14px] font-semibold text-tinta ring-1 ring-borde" autoFocus>Cerrar</button>
              </div>
              <p className="mt-2 text-[15px] leading-[1.5]">{abierta.texto}</p>
              <p className="mt-2 text-[14px] font-semibold">{abierta.cliente}</p>
            </div>
          </div>
        )}
      </dialog>
    </section>
  )
}

function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={activo} onClick={onClick} className={`presionable inline-flex min-h-[40px] items-center rounded-full px-4 text-[14px] font-medium transition-colors duration-200 ${activo ? 'bg-tinta text-white' : 'bg-papel text-tinta ring-1 ring-borde hover:ring-tinta/30'}`}>
      {children}
    </button>
  )
}

/** Estrellas de la ficha y de la cabecera del producto. */
export function Estrellas({ calificacion, tam = 15, claro = false }: { calificacion: number; tam?: number; claro?: boolean }) {
  return (
    <span role="img" aria-label={`${calificacion} de 5 estrellas`} className={`inline-flex items-center gap-0.5 ${claro ? 'text-white' : 'text-tinta'}`}>
      {Array.from({ length: 5 }, (_, i) => <IconoEstrella key={i} size={tam} activo={i < calificacion} />)}
    </span>
  )
}

function Flecha({ lado, apagada, onClick }: { lado: 'izquierda' | 'derecha'; apagada: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={apagada}
      aria-label={lado === 'izquierda' ? 'Reseña anterior' : 'Reseña siguiente'}
      className="presionable grid size-11 place-items-center rounded-full bg-papel text-tinta ring-1 ring-borde transition-opacity duration-200 hover:ring-tinta/30 disabled:pointer-events-none disabled:opacity-30"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d={lado === 'izquierda' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
    </button>
  )
}
