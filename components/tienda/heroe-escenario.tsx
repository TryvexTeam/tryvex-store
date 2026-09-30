'use client'

import { Fragment, useEffect, useRef, useState, type CSSProperties, type FocusEvent, type KeyboardEvent, type MouseEvent, type PointerEvent, type RefObject } from 'react'
import { getImageProps } from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { EscenaHeroe } from '@/lib/campana'
import type { CapsulaEscena, ZonaEnlace } from '@/lib/destinos-pieza'
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
/** Lo que dura una escena de foto. Igual a `escenario-progreso` en `globals.css`. */
const DURACION_ESCENA = 6500
/** Si el video no arranca en este plazo (ahorro de batería, red lenta), la escena vuelve a durar lo de una foto. */
const ESPERA_ARRANQUE_VIDEO = 5000

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
    <div className="heroe-capsula mx-auto mt-6 inline-flex items-center gap-4 rounded-full py-2 pr-2 pl-5 backdrop-blur-xl d:absolute d:right-[calc(var(--margen-heroe)+32px)] d:bottom-24 d:mt-0">
      <span className="text-[15px] font-semibold t:text-[16px]">
        {producto.agotado ? 'Agotado' : <>Desde <span className="cifra">{clp(producto.precio)}</span></>}
      </span>
      {!producto.agotado && <Link href={producto.href} className="tienda-boton bg-tinta text-white hover:bg-tinta/85">Comprar</Link>}
    </div>
  )
}

/**
 * Video de la escena: corre solo y en silencio, cubriendo la escena igual que
 * la foto (que queda de imagen de espera mientras carga). Mientras la
 * presentación avanza sola, el video se ve completo y al terminar pasa a la
 * escena siguiente; en pausa, se repite. Con movimiento reducido queda
 * quieto en su primer cuadro.
 */
function VideoEscena({ escena, activa, reducido, enBucle, barra, alTerminar, alFallar }: {
  escena: EscenaHeroe
  activa: boolean
  reducido: boolean
  enBucle: boolean
  /** Barra de progreso de la escena: se llena con el avance real del video. */
  barra: RefObject<HTMLSpanElement | null>
  alTerminar: () => void
  alFallar: () => void
}) {
  const video = useRef<HTMLVideoElement>(null)
  const poster = escena.fotos ? getImageProps({ src: escena.fotos.escritorio.src, alt: '', width: escena.fotos.escritorio.ancho, height: escena.fotos.escritorio.alto, sizes: '100vw' }).props.src : undefined
  const fallar = useRef(alFallar)
  useEffect(() => { fallar.current = alFallar })

  // Si el navegador bloquea la reproducción o el video no arranca a tiempo,
  // la presentación no puede quedar esperando un final que nunca llega.
  useEffect(() => {
    const v = video.current
    if (!v || !activa || reducido) return
    let arranco = false
    const alArrancar = () => { arranco = true }
    v.addEventListener('playing', alArrancar, { once: true })
    v.play()?.catch(() => fallar.current())
    const plazo = window.setTimeout(() => { if (!arranco) fallar.current() }, ESPERA_ARRANQUE_VIDEO)
    return () => {
      window.clearTimeout(plazo)
      v.removeEventListener('playing', alArrancar)
    }
  }, [activa, reducido, escena.video])

  // La barra sigue al video cuadro a cuadro: con un tiempo fijo se llenaba
  // antes o después de que el video terminara.
  useEffect(() => {
    const v = video.current
    if (!v || !activa) return
    let id = 0
    const pintar = () => {
      if (barra.current && v.duration) barra.current.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`
      id = requestAnimationFrame(pintar)
    }
    id = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(id)
  }, [activa, barra])

  return (
    <video
      ref={video}
      key={escena.video}
      src={escena.video}
      poster={poster}
      muted
      loop={enBucle}
      playsInline
      preload={activa ? 'auto' : 'metadata'}
      aria-hidden
      onEnded={alTerminar}
      onError={alFallar}
      className="absolute inset-0 size-full object-cover"
    />
  )
}

/**
 * Partes de la imagen que llevan a lugares distintos (una mitad a TikTok,
 * la otra a Instagram). Van sobre la foto, bajo el texto: el titular y el
 * botón siguen respondiendo a su propio clic.
 */
function ZonasEscena({ zonas, alClic }: { zonas: readonly ZonaEnlace[]; alClic: (e: MouseEvent<HTMLAnchorElement>) => void }) {
  return zonas.map((z, i) => {
    const estilo: CSSProperties = { left: `${z.x}%`, top: `${z.y}%`, width: `${z.ancho}%`, height: `${z.alto}%` }
    const clase = 'heroe-zona absolute z-10 block focus-visible:outline-3 focus-visible:outline-offset-[-6px] focus-visible:outline-white'
    return z.externo ? (
      <a key={i} data-zona href={z.href} target="_blank" rel="noopener noreferrer" aria-label={`${z.etiqueta} (se abre en otra pestaña)`} className={clase} style={estilo} onClick={alClic} />
    ) : (
      <Link key={i} data-zona href={z.href} aria-label={z.etiqueta} className={clase} style={estilo} onClick={alClic} />
    )
  })
}

/**
 * Cápsulas puestas desde el panel: texto (o el precio real del producto) y un
 * botón con destino, en la posición elegida para cada tamaño de pantalla. La
 * posición viaja en variables CSS y `globals.css` decide cuál usar: así no hay
 * que medir la pantalla con JavaScript ni esperar a la hidratación.
 */
function CapsulasLibres({ capsulas, productos, tono }: { capsulas: readonly CapsulaEscena[]; productos: ReadonlyArray<ProductoHeroe>; tono: EscenaHeroe['tono'] }) {
  return (
    <div data-tono={tono} className="heroe-copy pointer-events-none absolute inset-0 z-[25]">
      {capsulas.map((c, i) => {
        const producto = c.productoSlug ? productos.find((p) => p.slug === c.productoSlug) ?? null : null
        const texto = c.texto ?? (producto ? (producto.agotado ? 'Agotado' : `Desde ${clp(producto.precio)}`) : null)
        const posicion = {
          '--cx-m': c.movil.x, '--cy-m': c.movil.y,
          '--cx-d': c.escritorio.x, '--cy-d': c.escritorio.y,
        } as CSSProperties
        const boton = 'tienda-boton bg-tinta text-white hover:bg-tinta/85'
        return (
          <div key={i} style={posicion} className={`heroe-capsula heroe-capsula-libre pointer-events-auto inline-flex items-center gap-3 rounded-full py-2 backdrop-blur-xl ${c.href ? 'pr-2' : 'pr-5'} ${texto ? 'pl-5' : 'pl-2'}`}>
            {texto && <span className="cifra text-[15px] font-semibold whitespace-nowrap t:text-[16px]">{texto}</span>}
            {c.href && c.boton && (c.externo
              ? <a href={c.href} target="_blank" rel="noopener noreferrer" className={boton}>{c.boton}<span className="sr-only"> (se abre en otra pestaña)</span></a>
              : <Link href={c.href} className={boton}>{c.boton}</Link>)}
          </div>
        )
      })}
    </div>
  )
}

/**
 * Resalte elegido en el panel. Va en `style` y no en clase: las reglas de
 * tono de `globals.css` pintan el titular y ganarían a una clase.
 */
function estiloAcento(acento: string | undefined): { className: string; style?: CSSProperties } {
  if (!acento) return { className: '' }
  if (acento === 'degradado') return { className: 'heroe-titulo-degradado', style: { color: 'transparent' } }
  return { className: '', style: { color: acento } }
}

/** Botón de la escena: su destino y su texto se eligen en el panel. */
function BotonEscena({ escena, className, porDefecto }: { escena: EscenaHeroe; className: string; porDefecto: string }) {
  const href = escena.href ?? '/tienda'
  const texto = escena.boton ?? porDefecto
  return /^https?:\/\//i.test(href)
    ? <a href={href} target="_blank" rel="noopener noreferrer" className={className}>{texto}<span className="sr-only"> (se abre en otra pestaña)</span></a>
    : <Link href={href} className={className}>{texto}</Link>
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
  /** Un deslizamiento recién hecho: el clic que lo sigue no debe abrir una zona. */
  const deslizo = useRef(false)
  const barraVideo = useRef<HTMLSpanElement>(null)
  /** Escena cuyo video no pudo reproducirse: vuelve a durar lo de una foto. */
  const [videoFallido, setVideoFallido] = useState<string | null>(null)

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

  const puedeAvanzar = paginaCargada && reproduciendo && !reducido && !hover && !enfocado && visible && escenas.length > 1
  // Una escena con video dura lo que dura su video: avanza al terminar, no a los 6,5 s.
  const escenaActiva = escenas[activa]
  const esperaVideo = Boolean(escenaActiva?.video) && videoFallido !== escenaActiva?.id && !reducido

  useEffect(() => {
    if (!puedeAvanzar || esperaVideo) return
    const id = window.setTimeout(() => cambiar((activa + 1) % escenas.length, 'adelante'), DURACION_ESCENA)
    return () => window.clearTimeout(id)
  }, [activa, escenas.length, puedeAvanzar, esperaVideo])

  function alTerminarVideo() {
    if (puedeAvanzar) cambiar((activa + 1) % escenas.length, 'adelante')
  }

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
    // Las zonas de la imagen cubren la escena entera: si contaran como control, no se podría deslizar.
    const sobreControl = (e.target as Element).closest('button, a:not([data-zona])')
    deslizo.current = false
    puntero.current = e.pointerType === 'mouse' || sobreControl ? null : { x: e.clientX, y: e.clientY }
  }

  function alSubirPuntero(e: PointerEvent<HTMLElement>) {
    const inicio = puntero.current
    puntero.current = null
    if (!inicio) return
    const delta = e.clientX - inicio.x
    if (Math.abs(delta) < 40 || Math.abs(delta) < Math.abs(e.clientY - inicio.y)) return
    deslizo.current = true
    cambiar((activa + (delta < 0 ? 1 : -1) + escenas.length) % escenas.length, delta < 0 ? 'adelante' : 'atras')
  }

  function alClicZona(e: MouseEvent<HTMLAnchorElement>) {
    if (deslizo.current) e.preventDefault()
    deslizo.current = false
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
      className="heroe heroe-escenario heroe-banner relative isolate mt-[var(--margen-heroe)] flex min-h-[min(640px,calc(100svh-96px-var(--margen-heroe)))] flex-col overflow-hidden bg-black text-white d:min-h-[min(760px,calc(100svh-88px-var(--margen-heroe)))]"
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
                {escena.video && videoFallido !== escena.id ? (
                  <VideoEscena
                    escena={escena}
                    activa={esActiva}
                    reducido={reducido}
                    enBucle={!puedeAvanzar}
                    barra={barraVideo}
                    alTerminar={alTerminarVideo}
                    alFallar={() => setVideoFallido(escena.id)}
                  />
                ) : (
                  escena.estilo !== 'tarjeta' && <FotoEscena escena={escena} activa={esActiva} />
                )}
                <span aria-hidden className="heroe-velo absolute inset-0" />
                {escena.estilo !== 'tarjeta' && escena.zonas && escena.zonas.length > 0 && <ZonasEscena zonas={escena.zonas} alClic={alClicZona} />}
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
        const acento = estiloAcento(escena.acento)
        // Un afiche que ya trae su texto: el titular queda solo para lectores de pantalla.
        const capsulas = escena.capsulas && escena.capsulas.length > 0
          ? <CapsulasLibres capsulas={escena.capsulas} productos={productos} tono={escena.tono} />
          : null
        if (escena.sinTexto) {
          return (
            <Fragment key={`copy-${escena.id}`}>
              <h1 id="heroe-titulo" className="sr-only">{`${escena.titulo[0]} ${escena.titulo[1]}`.trim() || escena.etiqueta}</h1>
              {capsulas}
            </Fragment>
          )
        }
        return (
          <Fragment key={`copy-${escena.id}`}>
          {/* Sin puntero en la capa: cubre la escena entera y taparía las zonas de la imagen. */}
          <div data-tono={escena.tono} className={`heroe-copy pointer-events-none absolute inset-0 z-20 flex ${escena.estilo === 'tarjeta' ? 'items-center pt-20' : escena.texto === 'arriba' ? 'items-start pt-16 t:pt-20' : 'items-center'} ${esActiva ? 'heroe-escena-copy-activa' : 'heroe-escena-copy-saliendo'} ${entrando ? 'heroe-escena-copy-entrando' : ''}`} aria-hidden={!esActiva} inert={!esActiva ? true : undefined}>
            <div className="heroe-copy-interior mx-auto w-full max-w-[1204px] px-[22px] pb-24 text-center [&_.heroe-tarjeta]:pointer-events-auto [&_a]:pointer-events-auto">
              {escena.estilo === 'tarjeta' ? <div className="heroe-tarjeta mx-auto flex w-[min(92vw,880px)] flex-col items-center justify-center rounded-[36px] border-[3px] border-transparent bg-white px-5 py-6 t:px-10 t:py-8 d:min-h-[min(56vh,480px)] text-tinta shadow-[0_18px_70px_rgb(90_200_250_/_12%)] sm:px-12" >
                <div className="heroe-linea"><span className="heroe-linea-contenido text-[15px] font-semibold tracking-apoyo text-tinta-suave t:text-[17px]" style={acento.style?.color !== 'transparent' ? acento.style : undefined}>{escena.antetitulo}</span></div>
                <div className="heroe-linea mt-3"><h1 id={esActiva ? 'heroe-titulo' : undefined} className="heroe-linea-contenido mx-auto block w-full max-w-[16ch] text-[34px] leading-[1.04] font-semibold tracking-seccion text-balance t:text-[48px] d:text-[64px]"><span className={escena.acento ? acento.className : 'heroe-titulo-degradado'} style={acento.style}>{escena.titulo[0]}</span> {escena.titulo[1]}</h1></div>
                {escena.promo && <div className="heroe-linea" style={{ animationDelay: '90ms' }}><CifraPromo tipo={escena.promo} promo={promo} tarjeta /></div>}
                <div className="heroe-linea mt-4"><p className="heroe-linea-contenido mx-auto block w-full max-w-[30ch] text-[17px] leading-snug text-tinta-suave t:max-w-[34ch] t:text-[21px]">{escena.bajada}</p></div>
                {/* El color claro de .heroe-linea-contenido pintaba de tinta el texto del botón: va en el envoltorio. */}
                <div className="heroe-linea mt-7"><div className="heroe-linea-contenido"><BotonEscena escena={escena} className="tienda-boton bg-tinta text-white hover:bg-tinta/90" porDefecto={escena.promo === 'mayorista' ? 'Ver la tienda' : 'Ver ofertas'} /></div></div>
              </div> : <>
              <div className="heroe-linea"><span className="heroe-linea-contenido text-[15px] font-semibold tracking-apoyo text-[#ff6b61] t:text-[17px]" style={{ animationDelay: '0ms', ...(acento.style?.color !== 'transparent' ? acento.style : {}) }}>{escena.antetitulo}</span></div>
              <div className="heroe-linea mt-3"><h1 id={esActiva ? 'heroe-titulo' : undefined} className="heroe-linea-contenido mx-auto block w-full max-w-[13ch] text-[44px] leading-[1.02] font-semibold tracking-titulo text-balance t:text-[64px] d:text-[80px]" style={{ animationDelay: '60ms' }}>{escena.titulo[0]} <span className={escena.acento ? acento.className : 'text-[#ff5a4f]'} style={acento.style}>{escena.titulo[1]}</span></h1></div>
              {escena.promo && <div className="heroe-linea" style={{ animationDelay: '90ms' }}><CifraPromo tipo={escena.promo} promo={promo} /></div>}
              <div className="heroe-linea mt-4"><p className="heroe-linea-contenido mx-auto block w-full max-w-[30ch] text-[17px] leading-snug text-white/85 t:max-w-[34ch] t:text-[21px]" style={{ animationDelay: '120ms' }}>{escena.bajada}</p></div>
              <div className="heroe-linea mt-7"><div className="heroe-linea-contenido flex items-center justify-center gap-3" style={{ animationDelay: '180ms' }}>
                <BotonEscena escena={escena} className="banner-secundario tienda-boton text-white ring-1 ring-white/40 ring-inset hover:bg-white/10" porDefecto="Ver la tienda" />
              </div></div>
              {producto && !capsulas && <CapsulaCompra producto={producto} />}
              </>}
            </div>
          </div>
          {capsulas}
          </Fragment>
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
                    <span
                      ref={esActiva && esperaVideo && reproduciendo ? barraVideo : undefined}
                      className={`heroe-escenario-progreso block h-full origin-left rounded-full ${esActiva && reproduciendo && !reducido ? (esperaVideo ? 'heroe-escenario-progreso-video' : 'heroe-escenario-progreso-activo') : esActiva ? 'heroe-escenario-progreso-pausado' : ''}`}
                      key={`${escena.id}-${activa}`}
                    />
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
