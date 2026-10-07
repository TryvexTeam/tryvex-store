'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { IconoEstrella } from '@/components/iconos'
import type { ResenaPublica } from '@/lib/resenas'

type Props = {
  resenas: ResenaPublica[]
  titulo?: string
  bajada?: string
  resumen?: { promedio: number; total: number; positivas?: number }
}

/** Con menos reseñas que esto, «2 de 2» suena a montaje: no se muestra el porcentaje. */
const MINIMO_PARA_PROPORCION = 5

const TONOS = ['#dff3ea', '#dbeafe', '#fce7f3', '#fef3c7']

const INTERVALO = 4200

export function Comentarios({
  resenas,
  titulo = 'Lo que dicen de Tryvex.',
  bajada = 'Opiniones de nuestra comunidad.',
  resumen,
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
            {resumen && resumen.total > 0 && (
              <p className="mt-2 flex items-center gap-1.5 text-[15px] font-medium text-tinta">
                <Estrellas calificacion={Math.round(resumen.promedio)} />
                <span>{resumen.promedio.toFixed(1)} · {resumen.total} {resumen.total === 1 ? 'reseña' : 'reseñas'}</span>
              </p>
            )}
            {resumen && resumen.positivas !== undefined && resumen.total >= MINIMO_PARA_PROPORCION && (
              <p className="mt-1 text-[14px] text-tinta-suave">
                <span className="cifra font-semibold text-verde">{resumen.positivas} de {resumen.total}</span> clientes lo calificaron con 4 o 5 estrellas
              </p>
            )}
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
              /* Las fotos de clientes llegan en cualquier proporción (vertical, horizontal,
                 cuadrada). Con `object-cover` en un marco fijo se recortaban: un audífono
                 vertical quedaba reducido a una franja del medio. Acá la foto se muestra
                 entera (`object-contain`) y los costados se rellenan con ella misma
                 desenfocada, así el marco mantiene su altura y las cards del carrusel
                 siguen alineadas sin barras vacías. */
              <div className="relative isolate mb-5 aspect-[4/3] overflow-hidden rounded-[18px] bg-papel-alt">
                <Image src={resena.foto} alt="" aria-hidden fill sizes="(min-width: 640px) 390px, 82vw" className="-z-10 scale-125 object-cover opacity-60 blur-2xl" />
                <Image src={resena.foto} alt={`Foto compartida por ${resena.cliente}`} fill sizes="(min-width: 640px) 390px, 82vw" className="object-contain" />
              </div>
            )}
            <div className="relative flex items-center justify-between"><span className="text-[13px] font-semibold text-tinta">{resena.verificada ? 'Compra verificada' : 'Reseña de cliente'}</span><span className="rounded-full bg-tinta px-3 py-1 text-[11px] font-semibold tracking-[0.1em] text-white uppercase">Tryvex</span></div>
            <div className="relative mt-3"><Estrellas calificacion={resena.calificacion} /></div>
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

function Estrellas({ calificacion }: { calificacion: number }) {
  return (
    <span role="img" aria-label={`${calificacion} de 5 estrellas`} className="inline-flex items-center gap-0.5 text-tinta">
      {Array.from({ length: 5 }, (_, i) => <IconoEstrella key={i} size={15} activo={i < calificacion} />)}
    </span>
  )
}
