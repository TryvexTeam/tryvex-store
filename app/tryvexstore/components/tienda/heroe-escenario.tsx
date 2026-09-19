'use client'

import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type PointerEvent } from 'react'
import { getImageProps } from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { EscenaHeroe } from '@/lib/campana'
import type { PromoHeroe } from '@/lib/tienda'

export interface ProductoHeroe {
  slug: string
  href: string
  precio: number
  agotado: boolean
}

type Direccion = 'adelante' | 'atras'

/** Debe superar la cortina de `globals.css` (760 ms) para no cortar la animación. */
const DURACION_TRANSICION = 800

interface HeroeEscenarioProps {
  escenas: ReadonlyArray<EscenaHeroe>
  productos: ReadonlyArray<ProductoHeroe>
  promo: PromoHeroe
}

/** Cifra grande de una escena de promoción, o nada si la base no la respalda. */
function CifraPromo({ tipo, promo, tarjeta = false }: { tipo: EscenaHeroe['promo']; promo: PromoHeroe; tarjeta?: boolean }) {
  if (tipo === 'mayorista' && promo.mayorista) {
    return (
      <p className="heroe-linea-contenido mx-auto mt-5 block">
        <span className={`cifra block leading-none font-bold tracking-titulo ${tarjeta ? 'text-[52px] text-tinta t:text-[72px] d:text-[96px]' : 'text-[64px] text-spark t:text-[96px] d:text-[120px]'}`}>{clp(promo.mayorista.precio)}</span>
        <span className="mt-2 block text-[15px] font-semibold tracking-[0.12em] uppercase t:text-[17px]">c/u desde {promo.mayorista.desde} unidades</span>
      </p>
    )
  }
  if (tipo === 'volumen' && promo.ahorroMaximo) {
    return (
      <p className="heroe-linea-contenido mx-auto mt-5 block">
        <span className="block text-[15px] font-semibold tracking-[0.12em] uppercase t:text-[17px]">Hasta</span>
        <span className={`cifra block leading-none font-bold tracking-titulo ${tarjeta ? 'text-[56px] text-tinta t:text-[68px] d:text-[112px]' : 'text-[72px] text-spark t:text-[112px] d:text-[140px]'}`}>{promo.ahorroMaximo}%</span>
        <span className="mt-1 block text-[15px] font-semibold tracking-[0.12em] uppercase t:text-[17px]">menos comprando por volumen</span>
      </p>
    )
  }
  return null
}

/**
 * Cápsula de compra (patrón de la página de producto de Apple): precio y botón
 * juntos, a la vista sin hacer scroll. Precio real de la vitrina.
 */
function CapsulaCompra({ producto }: { producto: ProductoHeroe }) {
  return (
    // Sin .heroe-linea-contenido: su `display:block` anulaba el flex y pegaba el precio al botón.
    <div className="heroe-capsula mx-auto mt-6 inline-flex items-center gap-4 rounded-full py-2 pr-2 pl-5 backdrop-blur-xl d:absolute d:right-[max(22px,calc((100vw-1160px)/2))] d:bottom-24 d:mt-0">
      <span className="text-[15px] font-semibold t:text-[16px]">
        {producto.agotado ? 'Agotado' : <>Desde <span className="cifra">{clp(producto.precio)}</span></>}
      </span>
      {!producto.agotado && <Link href={producto.href} className="tienda-boton bg-spark text-white hover:bg-spark-hover">Comprar</Link>}
    </div>
  )
}

function FotoEscena({ escena, activa }: { escena: EscenaHeroe; activa: boolean }) {
  if (!escena.fotos) return null
  const comun = { alt: escena.fotos.movil.alt, sizes: '100vw' }
  const movil = getImageProps({ ...comun, src: escena.fotos.movil.src, width: escena.fotos.movil.ancho, height: escena.fotos.movil.alto }).props
  const escritorio = getImageProps({ ...comun, src: escena.fotos.escritorio.src, width: escena.fotos.escritorio.ancho, height: escena.fotos.escritorio.alto }).props

  return (
    <picture>
      <source media="(min-width: 735px)" srcSet={escritorio.srcSet} sizes="100vw" />
      <img
        {...movil}
        // La escena saliente ya no se anuncia: solo la activa describe su imagen.
        alt={activa ? escena.fotos.movil.alt : ''}
        loading={activa ? 'eager' : 'lazy'}
        fetchPriority={activa ? 'high' : 'auto'}
        className="absolute inset-0 size-full object-cover object-bottom t:object-center"
      />
    </picture>
  )
}

export function HeroeEscenario({ escenas, productos, promo }: HeroeEscenarioProps) {
  const [activa, setActiva] = useState(0)
  const [anterior, setAnterior] = useState<number | null>(null)
  const [direccion, setDireccion] = useState<Direccion>('adelante')
  const [reproduciendo, setReproduciendo] = useState(true)
  const [reducido, setReducido] = useState(false)
  const [hover, setHover] = useState(false)
  const [enfocado, setEnfocado] = useState(false)
  const [visible, setVisible] = useState(true)
  const puntero = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const consulta = matchMedia('(prefers-reduced-motion: reduce)')
    const actualizar = () => {
      setReducido(consulta.matches)
      if (consulta.matches) setReproduciendo(false)
    }
    actualizar()
    consulta.addEventListener('change', actualizar)
    return () => consulta.removeEventListener('change', actualizar)
  }, [])

  useEffect(() => {
    const alCambiarVisibilidad = () => setVisible(document.visibilityState === 'visible')
    document.addEventListener('visibilitychange', alCambiarVisibilidad)
    return () => document.removeEventListener('visibilitychange', alCambiarVisibilidad)
  }, [])

  useEffect(() => {
    if (anterior === null) return
    // Un poco más que la cortina (760 ms): la escena vieja se retira cuando ya no se ve.
    const id = window.setTimeout(() => setAnterior(null), DURACION_TRANSICION)
    return () => window.clearTimeout(id)
  }, [anterior])

  /* El autoavance espera a que la página termine de cargar. Medido el
     2026-09-17: arrancando de inmediato, cada diapositiva nueva más grande
     reabría un candidato de LCP y la métrica terminaba en 18,3 s — la fijaba
     la TERCERA foto, no la que lleva priority. Difiriendo el arranque, el LCP
     vuelve a ser la primera imagen. */
  const [paginaCargada, setPaginaCargada] = useState(false)
  useEffect(() => {
    if (document.readyState === 'complete') { setPaginaCargada(true); return }
    const alCargar = () => setPaginaCargada(true)
    window.addEventListener('load', alCargar, { once: true })
    return () => window.removeEventListener('load', alCargar)
  }, [])

  useEffect(() => {
    if (!paginaCargada || !reproduciendo || reducido || hover || enfocado || !visible || escenas.length < 2) return
    const id = window.setTimeout(() => cambiar((activa + 1) % escenas.length, 'adelante'), 6500)
    return () => window.clearTimeout(id)
  }, [activa, escenas.length, reproduciendo, reducido, hover, enfocado, visible, paginaCargada])

  // Precarga la foto de la escena siguiente: sin esto la cortina revelaba un fondo
  // vacío mientras la imagen (lazy) recién empezaba a descargarse.
  useEffect(() => {
    const siguiente = escenas[(activa + 1) % escenas.length]
    if (!siguiente?.fotos) return
    const escritorio = matchMedia('(min-width: 735px)').matches
    const foto = escritorio ? siguiente.fotos.escritorio : siguiente.fotos.movil
    const { srcSet, src } = getImageProps({ src: foto.src, alt: '', width: foto.ancho, height: foto.alto, sizes: '100vw' }).props
    const img = new window.Image()
    img.sizes = '100vw'
    if (srcSet) img.srcset = srcSet
    img.src = src
  }, [activa, escenas])

  function cambiar(indice: number, sentido?: Direccion) {
    if (indice === activa || indice < 0 || indice >= escenas.length) return
    setDireccion(sentido ?? (indice > activa ? 'adelante' : 'atras'))
    setAnterior(activa)
    setActiva(indice)
  }

  // Pausa por foco solo con teclado (APG). Con un clic el botón queda enfocado y,
  // si contara, la presentación se detenía para siempre tras tocar una pestaña.
  function alEnfocar(e: FocusEvent<HTMLElement>) {
    if ((e.target as Element).matches(':focus-visible')) setEnfocado(true)
  }

  function alDesenfocar(e: FocusEvent<HTMLElement>) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setEnfocado(false)
  }

  // Gesto de deslizar solo con dedo o lápiz, y nunca empezando sobre un control.
  // Sin setPointerCapture: capturar el puntero en la sección se robaba el clic
  // de las pestañas, del botón Pausa y de los enlaces (solo servía el teclado).
  function alBajarPuntero(e: PointerEvent<HTMLElement>) {
    const sobreControl = (e.target as Element).closest('button, a')
    puntero.current = e.pointerType === 'mouse' || sobreControl ? null : { x: e.clientX, y: e.clientY }
  }

  function alSubirPuntero(e: PointerEvent<HTMLElement>) {
    const inicio = puntero.current
    puntero.current = null
    if (!inicio) return
    const delta = e.clientX - inicio.x
    if (Math.abs(delta) < 40 || Math.abs(delta) < Math.abs(e.clientY - inicio.y)) return
    cambiar((activa + (delta < 0 ? 1 : -1) + escenas.length) % escenas.length, delta < 0 ? 'adelante' : 'atras')
  }

  function alTeclado(e: KeyboardEvent<HTMLButtonElement>, indice: number) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const siguiente = e.key === 'Home' ? 0 : e.key === 'End' ? escenas.length - 1 : (indice + (e.key === 'ArrowRight' ? 1 : -1) + escenas.length) % escenas.length
    cambiar(siguiente, e.key === 'ArrowRight' ? 'adelante' : e.key === 'ArrowLeft' ? 'atras' : undefined)
    document.getElementById(`escena-tab-${escenas[siguiente].id}`)?.focus()
  }

  return (
    <section
      aria-roledescription="carrusel"
      aria-label="Presentación de productos Tryvex"
      aria-live={reproduciendo && !reducido ? 'off' : 'polite'}
      data-tono={escenas[activa]?.tono ?? 'oscuro'}
      data-direccion={direccion}
      className="heroe heroe-escenario heroe-banner relative isolate flex min-h-[min(640px,calc(100svh-48px))] flex-col overflow-hidden bg-black text-white d:min-h-[min(760px,calc(100svh-44px))]"
      onPointerDown={alBajarPuntero}
      onPointerUp={alSubirPuntero}
      onFocusCapture={alEnfocar}
      onBlurCapture={alDesenfocar}
    >
      <div className="heroe-imagen absolute inset-0 -z-10">
        {escenas.map((escena, indice) => {
          const esActiva = indice === activa
          const esAnterior = indice === anterior
          if (!esActiva && !esAnterior) return null
          const entrando = esActiva && anterior !== null
          const estiloEscena = { '--foco-x': `${escena.foco.x}%`, '--foco-y': `${escena.foco.y}%` } as CSSProperties
          return (
            <div
              key={escena.id}
              id={`escena-${escena.id}`}
              className={`heroe-escena absolute inset-0 ${esActiva ? 'heroe-escena-activa' : 'heroe-escena-saliendo'} ${entrando ? 'heroe-escena-entrando' : ''}`}
              style={estiloEscena}
              data-tono={escena.tono}
              aria-hidden={!esActiva}
              inert={!esActiva ? true : undefined}
              {...(esActiva ? { role: 'group', 'aria-roledescription': 'escena', 'aria-label': `${indice + 1} de ${escenas.length}: ${escena.etiqueta}` } : {})}
            >
              {/* En teléfono la foto puede empezar más abajo (`movilDesde`) para no quedar bajo el
                  titular; su borde superior se funde con el fondo. Con texto arriba, desde tableta la
                  foto también baja para que los productos no queden detrás de la bajada y el CTA. */}
              <div
                className={`absolute inset-x-0 top-[var(--movil-desde)] bottom-0 t:[mask-image:none] ${escena.movilDesde ? '[mask-image:linear-gradient(to_bottom,transparent,#000_16%)]' : ''} ${escena.texto === 'arriba' ? 't:top-[40%]' : 't:top-0'}`}
                style={{ '--movil-desde': `${escena.movilDesde ?? 0}%` } as CSSProperties}
              >
                {escena.estilo !== 'tarjeta' && <FotoEscena escena={escena} activa={esActiva} />}
                <span aria-hidden className="heroe-velo absolute inset-0" />
              </div>
            </div>
          )
        })}
      </div>

      {escenas.map((escena, indice) => {
        // Solo el texto de la escena activa: el saliente quedaba visible bajo la
        // animación de scroll de `.heroe-copy` (pisaba su opacidad) y la tarjeta
        // vieja se veía encima de la escena nueva durante la cortina.
        if (indice !== activa) return null
        const esActiva = true
        const entrando = anterior !== null
        // Solo por slug: tomarlo por índice ponía «Comprar» de otro producto en escenas de categoría.
        const producto = escena.productoSlug ? productos.find((item) => item.slug === escena.productoSlug) ?? null : null
        return (
          <div key={`copy-${escena.id}`} data-tono={escena.tono} className={`heroe-copy absolute inset-0 z-20 flex ${escena.estilo === 'tarjeta' ? 'items-center pt-20' : escena.texto === 'arriba' ? 'items-start pt-16 t:pt-20' : 'items-center'} ${esActiva ? 'heroe-escena-copy-activa' : 'heroe-escena-copy-saliendo'} ${entrando ? 'heroe-escena-copy-entrando' : ''}`} aria-hidden={!esActiva} inert={!esActiva ? true : undefined}>
            <div className="heroe-copy-interior mx-auto w-full max-w-[1204px] px-[22px] pb-24 text-center">
              {escena.estilo === 'tarjeta' ? <div className="heroe-tarjeta mx-auto flex w-[min(92vw,880px)] flex-col items-center justify-center rounded-[36px] border-[3px] border-transparent bg-white px-5 py-6 t:px-10 t:py-8 d:min-h-[min(56vh,480px)] text-tinta shadow-[0_18px_70px_rgb(90_200_250_/_12%)] sm:px-12" >
                <div className="heroe-linea"><span className="heroe-linea-contenido text-[15px] font-semibold tracking-apoyo text-tinta-suave t:text-[17px]">{escena.antetitulo}</span></div>
                <div className="heroe-linea mt-3"><h1 id={esActiva ? 'heroe-titulo' : undefined} className="heroe-linea-contenido mx-auto block w-full max-w-[16ch] text-[34px] leading-[1.04] font-semibold tracking-seccion text-balance t:text-[48px] d:text-[64px]"><span className="heroe-titulo-degradado">{escena.titulo[0]}</span> {escena.titulo[1]}</h1></div>
                {escena.promo && <div className="heroe-linea" style={{ animationDelay: '90ms' }}><CifraPromo tipo={escena.promo} promo={promo} tarjeta /></div>}
                <div className="heroe-linea mt-4"><p className="heroe-linea-contenido mx-auto block w-full max-w-[30ch] text-[17px] leading-snug text-tinta-suave t:max-w-[34ch] t:text-[21px]">{escena.bajada}</p></div>
                {/* El color claro de .heroe-linea-contenido pintaba de tinta el texto del botón: va en el envoltorio. */}
                <div className="heroe-linea mt-7"><div className="heroe-linea-contenido"><Link href="/tienda" className="tienda-boton bg-tinta text-white hover:bg-tinta/90">{escena.promo === 'mayorista' ? 'Ver la tienda' : 'Ver ofertas'}</Link></div></div>
              </div> : <>
              <div className="heroe-linea"><span className="heroe-linea-contenido text-[15px] font-semibold tracking-apoyo text-[#ff6b61] t:text-[17px]" style={{ animationDelay: '0ms' }}>{escena.antetitulo}</span></div>
              <div className="heroe-linea mt-3"><h1 id={esActiva ? 'heroe-titulo' : undefined} className="heroe-linea-contenido mx-auto block w-full max-w-[13ch] text-[44px] leading-[1.02] font-semibold tracking-titulo text-balance t:text-[64px] d:text-[80px]" style={{ animationDelay: '60ms' }}>{escena.titulo[0]} <span className="text-[#ff5a4f]">{escena.titulo[1]}</span></h1></div>
              {escena.promo && <div className="heroe-linea" style={{ animationDelay: '90ms' }}><CifraPromo tipo={escena.promo} promo={promo} /></div>}
              <div className="heroe-linea mt-4"><p className="heroe-linea-contenido mx-auto block w-full max-w-[30ch] text-[17px] leading-snug text-white/85 t:max-w-[34ch] t:text-[21px]" style={{ animationDelay: '120ms' }}>{escena.bajada}</p></div>
              <div className="heroe-linea mt-7"><div className="heroe-linea-contenido flex items-center justify-center gap-3" style={{ animationDelay: '180ms' }}>
                <Link href="/tienda" className="banner-secundario tienda-boton text-white ring-1 ring-white/40 ring-inset hover:bg-white/10">Ver la tienda</Link>
              </div></div>
              {producto && <CapsulaCompra producto={producto} />}
              </>}
            </div>
          </div>
        )
      })}

      {/* Controles al estilo Apple: botón redondo de pausa y una cápsula de puntos donde la
          escena activa se estira y se llena con el progreso. La pausa por puntero vive solo
          aquí (sobre todo el héroe la presentación nunca avanzaba); Pausa (WCAG 2.2.2), el
          foco y el movimiento reducido siguen deteniéndola. */}
      <div className="heroe-escenario-navegacion absolute inset-x-0 bottom-0 z-30 flex justify-center pb-5 t:pb-6">
        <div className="flex items-center gap-3" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
          <button
            type="button"
            className="heroe-control grid size-11 shrink-0 place-items-center rounded-full backdrop-blur-xl"
            aria-label={reproduciendo ? 'Detener presentación' : 'Iniciar presentación'}
            aria-pressed={!reproduciendo}
            onClick={() => setReproduciendo((estado) => !estado)}
          >
            {reproduciendo ? (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor"><rect x="2.5" y="1.5" width="3" height="11" rx="1" /><rect x="8.5" y="1.5" width="3" height="11" rx="1" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden fill="currentColor"><path d="M3.5 1.8v10.4a.8.8 0 0 0 1.2.7l8.3-5.2a.8.8 0 0 0 0-1.4L4.7 1.1a.8.8 0 0 0-1.2.7Z" /></svg>
            )}
          </button>
          <nav aria-label="Escenas de la presentación" role="tablist" className="heroe-control flex h-11 items-center gap-1 rounded-full px-3 backdrop-blur-xl">
            {escenas.map((escena, indice) => {
              const esActiva = indice === activa
              return (
                <button
                  key={escena.id}
                  id={`escena-tab-${escena.id}`}
                  type="button"
                  role="tab"
                  aria-selected={esActiva}
                  aria-current={esActiva ? 'true' : undefined}
                  aria-controls={`escena-${escena.id}`}
                  aria-label={`${escena.etiqueta}, escena ${indice + 1} de ${escenas.length}`}
                  tabIndex={esActiva ? 0 : -1}
                  className="heroe-punto grid h-11 place-items-center px-2.5"
                  onClick={() => cambiar(indice)}
                  onKeyDown={(e) => alTeclado(e, indice)}
                >
                  <span aria-hidden className={`heroe-punto-pista block h-2 overflow-hidden rounded-full ${esActiva ? 'heroe-punto-activo w-12' : 'w-2'}`}>
                    <span className={`heroe-escenario-progreso block h-full origin-left rounded-full ${esActiva && reproduciendo && !reducido ? 'heroe-escenario-progreso-activo' : esActiva ? 'heroe-escenario-progreso-pausado' : ''}`} key={`${escena.id}-${activa}`} />
                  </span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </section>
  )
}
