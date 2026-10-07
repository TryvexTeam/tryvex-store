'use client'

import Image from 'next/image'
import { useMemo, useRef, useState, type ReactNode } from 'react'
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
const POR_PAGINA = 6
/** Desde esta cantidad de fotos, la grilla en movimiento encabeza las reseñas. */
const FOTOS_PARA_GRILLA = 6

const decimal = (n: number) => n.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function ResenasFicha({ resenas, resumen, producto }: { resenas: ResenaPublica[]; resumen: ResumenResenas; producto: string }) {
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [visibles, setVisibles] = useState(POR_PAGINA)
  const [abierta, setAbierta] = useState<ResenaPublica | null>(null)
  const visor = useRef<HTMLDialogElement>(null)

  const conFoto = useMemo(() => resenas.filter((r) => r.foto), [resenas])
  const filtradas = useMemo(() => {
    if (filtro === 'todas') return resenas
    if (filtro === 'fotos') return conFoto
    return resenas.filter((r) => r.calificacion === filtro)
  }, [filtro, resenas, conFoto])

  if (resumen.total === 0 || resenas.length === 0) return null

  function elegir(nuevo: Filtro) {
    setFiltro((actual) => (actual === nuevo && nuevo !== 'todas' ? 'todas' : nuevo))
    setVisibles(POR_PAGINA)
  }

  function verFoto(resena: ResenaPublica) {
    setAbierta(resena)
    visor.current?.showModal()
  }

  const recomiendan = Math.round((resumen.positivas / resumen.total) * 100)

  return (
    <section id="resenas" aria-labelledby="resenas-titulo" className="scroll-mt-20 bg-papel-alt pt-14 pb-16 t:pt-20 t:pb-24">
      <div className="mx-auto w-full max-w-[1204px] px-[var(--canal)]">
        <p className="text-[14px] font-semibold tracking-[0.12em] text-tinta-suave uppercase">Reseñas</p>
        <h2 id="resenas-titulo" className="mt-2 max-w-[22ch] text-[32px] leading-[1.05] font-semibold tracking-seccion text-balance text-tinta t:text-[44px]">
          Lo que dicen quienes ya lo tienen.
        </h2>

        {conFoto.length >= FOTOS_PARA_GRILLA && (
          <div className="mt-8">
            <GrillaFotosClientes
              fotos={conFoto.map((r) => ({ id: r.id, src: r.foto!, alt: `Foto de ${r.cliente}` }))}
              alAbrir={(id) => { const r = conFoto.find((x) => x.id === id); if (r) verFoto(r) }}
            >
              <div>
                <p className="cifra text-[56px] leading-none font-semibold tracking-seccion t:text-[72px]">{decimal(resumen.promedio)}</p>
                <p className="mt-3 flex justify-center"><Estrellas calificacion={Math.round(resumen.promedio)} tam={18} claro /></p>
                <p className="mt-2 text-[16px] font-semibold">{resumen.total} reseñas · {conFoto.length} con foto</p>
                <p className="mt-1 text-[14px] text-white/75">Fotos reales de clientes. Toca una para leer su reseña.</p>
              </div>
            </GrillaFotosClientes>
          </div>
        )}

        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-14">
          {/* ── Resumen ─────────────────────────────────────────── */}
          <div className="lg:sticky lg:top-20 lg:self-start">
            <div className="flex items-end gap-4">
              <span className="cifra text-[64px] leading-none font-semibold tracking-seccion text-tinta">{decimal(resumen.promedio)}</span>
              <div className="pb-1.5">
                <Estrellas calificacion={Math.round(resumen.promedio)} tam={18} />
                <p className="mt-1 text-[14px] text-tinta-suave">
                  {resumen.total} {resumen.total === 1 ? 'reseña' : 'reseñas'}
                </p>
              </div>
            </div>
            {resumen.total >= MINIMO_PARA_PROPORCION && (
              <p className="mt-4 text-[15px] text-tinta-suave">
                <span className="cifra font-semibold text-verde">{recomiendan} %</span> lo calificó con 4 o 5 estrellas
              </p>
            )}

            <ul className="mt-5 grid gap-1.5" aria-label="Filtrar por estrellas">
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
                      className={`group grid w-full grid-cols-[34px_1fr_34px] items-center gap-3 rounded-[10px] px-2 py-1.5 text-left text-[14px] transition-colors duration-200 disabled:opacity-40 ${activa ? 'bg-papel ring-1 ring-tinta/15' : 'enabled:hover:bg-papel'}`}
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

          {/* ── Fotos, filtros y lista ──────────────────────────── */}
          <div className="min-w-0">
            {conFoto.length > 0 && conFoto.length < FOTOS_PARA_GRILLA && (
              <div>
                <h3 className="text-[17px] font-semibold text-tinta">Fotos de clientes</h3>
                <ul className="sin-barra -mx-[var(--canal)] mt-3 flex snap-x gap-2.5 overflow-x-auto px-[var(--canal)] pb-1 lg:mx-0 lg:px-0" aria-label="Fotos compartidas por clientes">
                  {conFoto.slice(0, 16).map((r) => (
                    <li key={r.id} className="shrink-0 snap-start">
                      <button type="button" onClick={() => verFoto(r)} className="presionable relative block size-[92px] overflow-hidden rounded-[14px] bg-papel ring-1 ring-borde/60 t:size-[108px]" aria-label={`Ver la foto de ${r.cliente}`}>
                        <Image src={r.foto!} alt="" fill sizes="108px" className="object-cover transition-transform duration-300 hover:scale-[1.04]" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className={`flex flex-wrap gap-2 ${conFoto.length > 0 && conFoto.length < FOTOS_PARA_GRILLA ? 'mt-7' : ''}`} role="group" aria-label="Mostrar">
              <Chip activo={filtro === 'todas'} onClick={() => elegir('todas')}>Todas · {resenas.length}</Chip>
              {conFoto.length > 0 && <Chip activo={filtro === 'fotos'} onClick={() => elegir('fotos')}>Con foto · {conFoto.length}</Chip>}
              {typeof filtro === 'number' && <Chip activo onClick={() => elegir('todas')}>{filtro} estrellas ✕</Chip>}
            </div>

            <p className="sr-only" aria-live="polite">{`Mostrando ${Math.min(visibles, filtradas.length)} de ${filtradas.length} reseñas`}</p>

            <ul className="mt-5 grid gap-4 t:grid-cols-2" aria-label={`Reseñas de ${producto}`}>
              {filtradas.slice(0, visibles).map((r) => (
                <li key={r.id} className="flex flex-col rounded-[22px] bg-papel p-5 shadow-sutil t:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Estrellas calificacion={r.calificacion} tam={15} />
                    {r.verificada && (
                      <span className="inline-flex items-center gap-1 text-[12px] font-semibold text-verde">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                        Compra verificada
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-[16px] leading-[1.5] whitespace-pre-line text-tinta">{r.texto}</p>
                  <div className="mt-auto flex items-end justify-between gap-3 pt-5">
                    <p className="text-[14px] font-semibold text-tinta">{r.cliente}</p>
                    {r.foto && (
                      <button type="button" onClick={() => verFoto(r)} className="presionable relative size-[64px] shrink-0 overflow-hidden rounded-[12px] ring-1 ring-borde/60" aria-label={`Ver la foto de ${r.cliente}`}>
                        <Image src={r.foto} alt="" fill sizes="64px" className="object-cover" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {visibles < filtradas.length && (
              <button type="button" onClick={() => setVisibles((v) => v + POR_PAGINA)} className="presionable mt-6 inline-flex min-h-[44px] items-center rounded-full bg-papel px-6 text-[15px] font-semibold text-tinta ring-1 ring-borde hover:ring-tinta/30">
                Ver más reseñas <span className="cifra ml-1.5 font-normal text-tinta-suave">({filtradas.length - visibles})</span>
              </button>
            )}
          </div>
        </div>
      </div>

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
