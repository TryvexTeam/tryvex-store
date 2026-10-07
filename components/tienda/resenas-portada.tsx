'use client'

import dynamic from 'next/dynamic'
import { useMemo, useState } from 'react'
import { IconoEstrella } from '@/components/iconos'
import type { ResenaPublica } from '@/lib/resenas'
import type { FlexCarouselItem } from './flex-carousel'
import { Comentarios } from './comentarios'

// WebGL: solo en el navegador. Mientras carga, el espacio queda reservado (sin salto de layout).
const FlexCarousel = dynamic(() => import('./flex-carousel'), { ssr: false, loading: () => null })

/** Con menos fotos, la cinta se ve vacía: se usa el carrusel de tarjetas de siempre. */
const MINIMO_DE_FOTOS = 4
const MINIMO_PARA_PROPORCION = 5

/** Misma URL que pide `next/image`: mismo dominio (sin CORS para WebGL), WebP y a la medida de la tarjeta. */
const optimizada = (url: string) => `/_next/image?url=${encodeURIComponent(url)}&w=828&q=75`

/**
 * Reseñas de la portada: las fotos de clientes en la cinta de React Bits (Flex
 * Carousel) y, debajo, la reseña de la foto que está al frente.
 */
export function ResenasPortada({ resenas, resumen }: { resenas: ResenaPublica[]; resumen?: { promedio: number; total: number; positivas?: number } }) {
  const conFoto = useMemo(() => resenas.filter((r): r is ResenaPublica & { foto: string } => Boolean(r.foto)), [resenas])
  const items = useMemo<FlexCarouselItem[]>(
    () => conFoto.map((r) => ({ src: optimizada(r.foto), alt: `Foto de ${r.cliente} con ${r.producto}`, title: r.cliente, subtitle: r.producto })),
    [conFoto],
  )
  const [activa, setActiva] = useState(0)

  if (conFoto.length < MINIMO_DE_FOTOS) return <Comentarios resenas={resenas} resumen={resumen} />
  const resena = conFoto[activa] ?? conFoto[0]

  return (
    <section aria-labelledby="resenas-portada-titulo" className="relative mt-16 overflow-hidden bg-papel-alt pt-16 pb-14 t:mt-24 t:pt-24 t:pb-20">
      <div className="mx-auto w-full max-w-[1204px] px-[22px] text-center">
        <p className="text-[14px] font-semibold tracking-[0.12em] text-tinta-suave uppercase">Comunidad Tryvex</p>
        <h2 id="resenas-portada-titulo" className="mx-auto mt-2 max-w-[18ch] text-[32px] leading-[1.05] font-semibold tracking-seccion text-balance text-tinta t:text-[48px]">
          Fotos reales de nuestros clientes.
        </h2>
        {resumen && resumen.total > 0 && (
          <p className="mt-3 inline-flex items-center gap-2 text-[15px] font-medium text-tinta">
            <Estrellas calificacion={Math.round(resumen.promedio)} />
            <span className="cifra">{resumen.promedio.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} · {resumen.total} reseñas</span>
          </p>
        )}
        {resumen?.positivas !== undefined && resumen.total >= MINIMO_PARA_PROPORCION && (
          <p className="mt-1 text-[14px] text-tinta-suave">
            <span className="cifra font-semibold text-verde">{resumen.positivas} de {resumen.total}</span> clientes lo calificaron con 4 o 5 estrellas
          </p>
        )}
      </div>

      <div className="mt-6 h-[420px] w-full t:h-[520px] d:h-[580px]">
        <FlexCarousel
          items={items}
          etiqueta="Fotos de clientes"
          preset="liquid"
          intro="rise"
          fit="portrait"
          cardHeight={0.78}
          gap={16}
          radius={22}
          captions={false}
          autoplay
          interval={5}
          // En la portada la rueda del mouse es para bajar por la página, no para mover la cinta.
          captureWheel={false}
          onChange={(indice) => setActiva(indice)}
          className="text-tinta"
        />
      </div>

      <figure className="mx-auto mt-2 w-full max-w-[620px] px-[22px] text-center">
        <div className="flex items-center justify-center gap-3">
          <Estrellas calificacion={resena.calificacion} />
          <span className="cifra text-[13px] text-tinta-suave tabular-nums">
            {String(activa + 1).padStart(2, '0')} / {String(conFoto.length).padStart(2, '0')}
          </span>
        </div>
        {/* key: al cambiar de foto, el texto entra de nuevo en vez de reemplazarse en seco. */}
        <blockquote key={resena.id} className="resena-portada-texto mt-3 text-[20px] leading-[1.3] font-medium tracking-cuerpo text-balance text-tinta t:text-[24px]">
          “{resena.texto}”
        </blockquote>
        <figcaption className="mt-3 text-[15px]">
          <span className="font-semibold text-tinta">{resena.cliente}</span>
          <span className="text-tinta-suave"> · {resena.producto}</span>
          {resena.verificada && <span className="ml-2 text-[13px] font-semibold text-verde">Compra verificada</span>}
        </figcaption>
      </figure>
    </section>
  )
}

function Estrellas({ calificacion }: { calificacion: number }) {
  return (
    <span role="img" aria-label={`${calificacion} de 5 estrellas`} className="inline-flex items-center gap-0.5 text-tinta">
      {Array.from({ length: 5 }, (_, i) => <IconoEstrella key={i} size={15} activo={i < calificacion} />)}
    </span>
  )
}
