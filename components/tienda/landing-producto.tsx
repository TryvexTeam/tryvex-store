import Image from 'next/image'
import type { Bloque, FormatoImagen } from '@/lib/landing-producto'

/**
 * Landing del producto: los bloques que el equipo arma desde el panel.
 *
 * Es un Server Component sin estado: cada bloque se dibuja con los textos y las
 * imágenes que llegan, y un bloque sin nada que mostrar no se dibuja. Las
 * preguntas usan <details>, que se abre sin JavaScript y con el teclado.
 */

const MARCO: Record<FormatoImagen, string> = {
  horizontal: 'aspect-[16/9]',
  cuadrado: 'aspect-square',
  vertical: 'aspect-[4/5]',
}

const COLUMNAS: Record<number, string> = { 1: 't:grid-cols-1', 2: 't:grid-cols-2', 3: 't:grid-cols-3', 4: 't:grid-cols-4' }

const contenedor = 'mx-auto w-full max-w-[1204px] px-[22px]'
const antetituloCls = 'text-[14px] font-semibold tracking-[0.12em] text-tinta-suave uppercase'
const tituloCls = 'text-[32px] leading-[1.05] font-semibold tracking-seccion text-tinta t:text-[48px]'
const textoCls = 'text-[16px] leading-relaxed text-tinta-suave t:text-[17px]'

/** Párrafos separados por una línea en blanco. */
function Parrafos({ texto, className = textoCls }: { texto: string; className?: string }) {
  return (
    <>
      {texto.split(/\n{2,}/).map((p, i) => (
        <p key={i} className={`${className} ${i > 0 ? 'mt-4' : ''} whitespace-pre-line`}>{p}</p>
      ))}
    </>
  )
}

function Foto({ src, alt, formato, sizes, className = '' }: { src: string; alt: string; formato: FormatoImagen; sizes: string; className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded-[24px] bg-papel-alt t:rounded-[28px] ${MARCO[formato]} ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} className="object-cover" />
    </div>
  )
}

function Seccion({ etiqueta, children, className = '' }: { etiqueta?: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={etiqueta || undefined} className={`${contenedor} py-12 t:py-20 ${className}`}>
      {children}
    </section>
  )
}

function Punto() {
  return <span aria-hidden className="mt-[9px] size-1.5 shrink-0 rounded-full bg-spark" />
}

function BloqueLanding({ bloque }: { bloque: Bloque }) {
  switch (bloque.tipo) {
    case 'encabezado': {
      if (!bloque.titulo && !bloque.bajada && !bloque.imagen) return null
      return (
        <Seccion etiqueta={bloque.titulo}>
          <div className="mx-auto max-w-[760px] text-center">
            {bloque.antetitulo && <p className={antetituloCls}>{bloque.antetitulo}</p>}
            {bloque.titulo && <h2 className={`${tituloCls} ${bloque.antetitulo ? 'mt-2' : ''}`}>{bloque.titulo}</h2>}
            {bloque.bajada && <div className="mt-4"><Parrafos texto={bloque.bajada} /></div>}
          </div>
          {bloque.imagen && <Foto src={bloque.imagen} alt={bloque.titulo} formato={bloque.formato} sizes="(min-width: 1204px) 1160px, 92vw" className={bloque.titulo || bloque.bajada ? 'mt-10' : ''} />}
        </Seccion>
      )
    }

    case 'imagen_texto': {
      if (!bloque.titulo && !bloque.texto && !bloque.imagen && bloque.puntos.length === 0) return null
      return (
        <Seccion etiqueta={bloque.titulo}>
          <div className="grid items-center gap-8 t:grid-cols-2 t:gap-14">
            {bloque.imagen && (
              <Foto src={bloque.imagen} alt={bloque.titulo} formato={bloque.formato} sizes="(min-width: 834px) 570px, 92vw" className={bloque.lado === 'derecha' ? 't:order-2' : ''} />
            )}
            <div className={bloque.imagen ? '' : 'mx-auto max-w-[760px] t:col-span-2'}>
              {bloque.antetitulo && <p className={antetituloCls}>{bloque.antetitulo}</p>}
              {bloque.titulo && <h2 className={`${tituloCls} ${bloque.antetitulo ? 'mt-2' : ''}`}>{bloque.titulo}</h2>}
              {bloque.texto && <div className="mt-4"><Parrafos texto={bloque.texto} /></div>}
              {bloque.puntos.length > 0 && (
                <ul className="mt-6 grid gap-3">
                  {bloque.puntos.map((p, i) => (
                    <li key={i} className="flex gap-3 text-[16px] leading-relaxed text-tinta"><Punto />{p}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Seccion>
      )
    }

    case 'galeria': {
      const fotos = bloque.imagenes.filter((i) => i.imagen)
      if (fotos.length === 0) return null
      const columnas = COLUMNAS[Math.min(fotos.length, 4)]
      return (
        <Seccion etiqueta={bloque.titulo}>
          {bloque.titulo && <h2 className={`${tituloCls} mb-8 text-center`}>{bloque.titulo}</h2>}
          <ul className={`grid grid-cols-2 gap-4 t:gap-6 ${columnas}`}>
            {fotos.map((f, i) => (
              <li key={i}>
                <figure>
                  <Foto src={f.imagen} alt={f.pie} formato={bloque.formato} sizes="(min-width: 834px) 280px, 46vw" />
                  {f.pie && <figcaption className="mt-3 text-[14px] leading-snug text-tinta-suave">{f.pie}</figcaption>}
                </figure>
              </li>
            ))}
          </ul>
        </Seccion>
      )
    }

    case 'caracteristicas': {
      const items = bloque.items.filter((i) => i.titulo || i.texto || i.imagen)
      if (items.length === 0) return null
      const columnas = COLUMNAS[Math.min(items.length, 3)]
      return (
        <Seccion etiqueta={bloque.titulo}>
          {(bloque.titulo || bloque.bajada) && (
            <div className="mx-auto mb-10 max-w-[760px] text-center">
              {bloque.titulo && <h2 className={tituloCls}>{bloque.titulo}</h2>}
              {bloque.bajada && <div className="mt-4"><Parrafos texto={bloque.bajada} /></div>}
            </div>
          )}
          <ul className={`grid gap-4 t:gap-6 ${columnas}`}>
            {items.map((it, i) => (
              <li key={i} className="flex flex-col overflow-hidden rounded-[24px] bg-papel shadow-sutil">
                {it.imagen && (
                  <div className="relative aspect-[4/3] bg-papel-alt">
                    <Image src={it.imagen} alt={it.titulo} fill sizes="(min-width: 834px) 380px, 92vw" className="object-cover" />
                  </div>
                )}
                <div className="p-6">
                  {it.titulo && <h3 className="text-[20px] leading-tight font-semibold tracking-cuerpo text-tinta">{it.titulo}</h3>}
                  {it.texto && <div className="mt-2"><Parrafos texto={it.texto} className="text-[15px] leading-relaxed text-tinta-suave" /></div>}
                </div>
              </li>
            ))}
          </ul>
        </Seccion>
      )
    }

    case 'banner': {
      if (!bloque.imagen && !bloque.imagenMovil) return null
      const claro = bloque.color === 'claro'
      const movil = bloque.imagenMovil || bloque.imagen
      const escritorio = bloque.imagen || bloque.imagenMovil
      return (
        <Seccion etiqueta={bloque.titulo}>
          <div className="relative overflow-hidden rounded-[24px] bg-papel-alt t:rounded-[28px]">
            <div className="relative aspect-[4/5] t:hidden">
              <Image src={movil} alt="" fill sizes="92vw" className="object-cover" />
            </div>
            <div className="relative hidden aspect-[21/9] t:block">
              <Image src={escritorio} alt="" fill sizes="1160px" className="object-cover" />
            </div>
            {claro && (bloque.titulo || bloque.texto) && <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />}
            {(bloque.titulo || bloque.texto) && (
              <div className={`absolute inset-x-0 bottom-0 p-6 t:p-12 ${claro ? 'text-white' : 'text-tinta'}`}>
                <div className="max-w-[560px]">
                  {bloque.titulo && <h2 className="text-[30px] leading-[1.05] font-semibold tracking-seccion t:text-[44px]">{bloque.titulo}</h2>}
                  {bloque.texto && <div className="mt-3"><Parrafos texto={bloque.texto} className="text-[16px] leading-relaxed t:text-[18px]" /></div>}
                </div>
              </div>
            )}
          </div>
        </Seccion>
      )
    }

    case 'preguntas': {
      const items = bloque.items.filter((i) => i.pregunta && i.respuesta)
      if (items.length === 0) return null
      return (
        <Seccion etiqueta={bloque.titulo || 'Preguntas frecuentes'}>
          <div className="mx-auto max-w-[760px]">
            {bloque.titulo && <h2 className={`${tituloCls} mb-8 text-center`}>{bloque.titulo}</h2>}
            <div className="divide-y divide-black/10 rounded-[24px] bg-papel px-6 shadow-sutil">
              {items.map((it, i) => (
                <details key={i} className="group py-5">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-semibold text-tinta [&::-webkit-details-marker]:hidden">
                    {it.pregunta}
                    <span aria-hidden className="shrink-0 text-[22px] leading-none text-tinta-suave transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <div className="mt-3"><Parrafos texto={it.respuesta} className="text-[15px] leading-relaxed text-tinta-suave" /></div>
                </details>
              ))}
            </div>
          </div>
        </Seccion>
      )
    }
  }
}

export function LandingProducto({ bloques }: { bloques: Bloque[] }) {
  if (bloques.length === 0) return null
  return (
    <div className="bg-papel-alt">
      {bloques.map((b) => <BloqueLanding key={b.id} bloque={b} />)}
    </div>
  )
}
