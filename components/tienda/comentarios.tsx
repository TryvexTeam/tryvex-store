'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { ResenaPublica } from '@/lib/resenas'

type Props = {
  resenas: ResenaPublica[]
  titulo?: string
  bajada?: string
}

const TONOS = ['#dff3ea', '#dbeafe', '#fce7f3', '#fef3c7']

const INTERVALO = 4200

export function Comentarios({
  resenas,
  titulo = 'Lo que cuentan quienes compraron.',
  bajada = 'Reseñas de clientes con compras entregadas en Tryvex.',
}: Props) {
  const pista = useRef<HTMLUListElement>(null)
  const [pausado, setPausado] = useState(false)

  function avanzar(direccion: 1 | -1) {
    const el = pista.current
    const tarjeta = el?.querySelector('li')
    if (!el || !tarjeta) return

    const distancia = tarjeta.getBoundingClientRect().width + 20
    const alFinal = el.scrollLeft + el.clientWidth >= el.scrollWidth - 2
    const alInicio = el.scrollLeft <= 1
    if ((direccion === 1 && alFinal) || (direccion === -1 && alInicio)) {
      el.scrollTo({ left: direccion === 1 ? 0 : el.scrollWidth, behavior: 'smooth' })
      return
    }
    el.scrollBy({ left: direccion * distancia, behavior: 'smooth' })
  }

  useEffect(() => {
    if (pausado || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const intervalo = window.setInterval(() => avanzar(1), INTERVALO)
    return () => window.clearInterval(intervalo)
  }, [pausado])

  if (resenas.length === 0) return null

  return (
    <section aria-labelledby="comentarios-titulo" className="comentarios-seccion relative mt-16 overflow-hidden bg-papel-alt py-16 t:mt-24 t:py-24">
      <div className="mx-auto w-full max-w-[1204px] px-[22px]">
        <div className="flex flex-col gap-5 t:flex-row t:items-end t:justify-between">
          <div>
            <p className="text-[14px] font-semibold tracking-[0.12em] text-tinta-suave uppercase">Comunidad Tryvex</p>
            <h2 id="comentarios-titulo" className="mt-2 text-[32px] leading-[1.05] font-semibold tracking-seccion text-tinta t:text-[48px]">{titulo}</h2>
            <p className="mt-3 max-w-[56ch] text-[16px] leading-relaxed text-tinta-suave t:text-[17px]">{bajada}</p>
          </div>
          <div className="flex gap-2">
            <button type="button" aria-label="Ver comentario anterior" onClick={() => avanzar(-1)} className="comentarios-control"><Flecha direccion="izquierda" /></button>
            <button type="button" aria-label="Ver siguiente comentario" onClick={() => avanzar(1)} className="comentarios-control"><Flecha direccion="derecha" /></button>
          </div>
        </div>
      </div>

      <ul ref={pista} aria-label="Comentarios de clientes" className="comentarios-pista sin-barra mt-8 flex snap-x snap-mandatory gap-5 overflow-x-auto px-[max(22px,calc((100vw-1160px)/2))] pb-3" onMouseEnter={() => setPausado(true)} onMouseLeave={() => setPausado(false)} onFocusCapture={() => setPausado(true)} onBlurCapture={(evento) => { if (!evento.currentTarget.contains(evento.relatedTarget)) setPausado(false) }} onPointerDown={() => setPausado(true)} onPointerUp={() => setPausado(false)}>
        {resenas.map((resena, indice) => (
          <li key={resena.id} className="comentario-tarjeta relative isolate flex min-h-[330px] w-[min(82vw,390px)] shrink-0 snap-start flex-col overflow-hidden rounded-[28px] bg-papel p-6 shadow-sutil t:min-h-[360px] t:w-[390px] t:p-8" style={{ '--comentario-tono': TONOS[indice % TONOS.length], '--comentario-indice': indice } as CSSProperties}>
            <span aria-hidden className="comentario-orbita comentario-orbita-a" /><span aria-hidden className="comentario-orbita comentario-orbita-b" />
            {resena.foto && (
              <div className="relative mb-5 aspect-[16/9] overflow-hidden rounded-[18px] bg-papel-alt">
                <Image src={resena.foto} alt={`Foto compartida por ${resena.cliente}`} fill sizes="(min-width: 640px) 390px, 82vw" className="object-cover" />
              </div>
            )}
            <div className="relative flex items-center justify-between"><span className="text-[13px] font-semibold text-tinta">Compra verificada</span><span className="rounded-full bg-tinta px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-white uppercase">Tryvex</span></div>
            <blockquote className="relative mt-5 text-[22px] leading-[1.18] font-medium tracking-cuerpo text-tinta t:text-[25px]">“{resena.texto}”</blockquote>
            <footer className="relative mt-auto pt-7"><p className="font-semibold text-tinta">{resena.cliente}</p><p className="mt-0.5 text-[14px] text-tinta-suave">{resena.producto}</p></footer>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Flecha({ direccion }: { direccion: 'izquierda' | 'derecha' }) {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d={direccion === 'izquierda' ? 'm15 18-6-6 6-6' : 'm9 18 6-6-6-6'} /></svg>
}
