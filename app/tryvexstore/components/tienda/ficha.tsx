'use client'

import { useEffect, useMemo, useRef, useState, ViewTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'
import { precioPara, type FichaProducto } from '@/lib/ficha-precio'
import { useBolsa } from './bolsa'
import { BotonFavorito } from './boton-favorito'

interface Envio {
  plazo: string | null
  tarifa: number
  gratisDesde: number | null
  politica: string
}

/**
 * Ficha de producto.
 *
 * Teléfono: galería a todo el ancho que se desliza, datos debajo y una
 * barra de compra fija al pie que aparece cuando el botón principal sale
 * de la vista. Recién desde 1024 px pasa a dos columnas, cuando la foto
 * puede medir 440 px o más (antes se vería más chica que en el teléfono,
 * el error medido en Dune Dragon). La foto cambia con el color elegido.
 */
export function Ficha({
  ficha,
  envio,
  garantia,
  retracto,
  whatsapp,
}: {
  ficha: FichaProducto
  envio: Envio
  garantia: string
  retracto: string
  whatsapp: string | null
}) {
  const bolsa = useBolsa()
  const conVariantes = ficha.variantes.length > 0
  const primeraDisponible = ficha.variantes.find((v) => v.disponible > 0) ?? ficha.variantes[0] ?? null
  const [varianteId, setVarianteId] = useState<string | null>(primeraDisponible?.id ?? null)
  const variante = ficha.variantes.find((v) => v.id === varianteId) ?? null
  const disponible = conVariantes ? variante?.disponible ?? 0 : ficha.disponible
  const agotado = disponible <= 0

  const [cantidad, setCantidad] = useState(1)
  useEffect(() => setCantidad((c) => Math.min(Math.max(1, c), Math.max(1, disponible))), [disponible])

  const base = variante?.precio ?? ficha.precio
  const { precio, tramo } = precioPara(base, ficha.tramos, cantidad)
  // Un tramo de 1 unidad es el precio normal, no un descuento: no se ofrece
  // como opción ni se celebra con insignia.
  const tramosVisibles = ficha.tramos.filter((t) => t.min > 1)
  const conDescuento = tramo !== null && tramo.min > 1

  // La galería muestra primero la foto del color elegido, si la tiene.
  const fotos = useMemo(() => {
    const lista = variante?.imagen ? [variante.imagen, ...ficha.galeria.filter((g) => g !== variante.imagen)] : ficha.galeria
    return lista.length ? lista : [null]
  }, [variante, ficha.galeria])

  const [foto, setFoto] = useState(0)
  const [zoomFoto, setZoomFoto] = useState(0)
  // La foto ampliada se monta solo con el diálogo abierto: una imagen lazy
  // dentro de un <dialog> cerrado (display:none) no llegaba a cargarse.
  const [zoomAbierto, setZoomAbierto] = useState(false)
  const zoom = useRef<HTMLDialogElement>(null)
  const origenZoom = useRef<HTMLElement | null>(null)
  const gestoZoom = useRef<{ x: number; y: number } | null>(null)
  const overflowPrevio = useRef('')
  function abrirZoom(i: number) {
    origenZoom.current = document.activeElement as HTMLElement
    setZoomFoto(i)
    setZoomAbierto(true)
    overflowPrevio.current = document.body.style.overflow
    zoom.current?.showModal()
    document.body.style.overflow = 'hidden'
  }
  function cerrarZoom() { zoom.current?.close() }
  function moverZoom(delta: number) { setZoomFoto((i) => (i + delta + fotos.length) % fotos.length) }
  useEffect(() => () => { if (zoom.current?.open) document.body.style.overflow = overflowPrevio.current }, [])
  const pista = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setFoto(0)
    pista.current?.scrollTo({ left: 0 })
  }, [fotos])

  function irA(i: number) {
    const el = pista.current
    if (!el) return
    el.scrollTo({ left: i * el.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }

  // Barra fija: aparece solo cuando el botón principal ya quedó atrás.
  // Se mira la posición en cada scroll (un cálculo por cuadro) y no con
  // IntersectionObserver: ese solo avisa al cruzar el borde, y un salto
  // brusco (ancla, volver atrás, deslizamiento rápido) lo pasa de largo.
  const centinela = useRef<HTMLDivElement>(null)
  const [barra, setBarra] = useState(false)
  useEffect(() => {
    let cuadro = 0
    const medir = () => {
      cuadro = 0
      const el = centinela.current
      setBarra(el ? el.getBoundingClientRect().top < 0 : false)
    }
    const alMover = () => { if (!cuadro) cuadro = requestAnimationFrame(medir) }
    medir()
    addEventListener("scroll", alMover, { passive: true })
    addEventListener("resize", alMover)
    return () => {
      removeEventListener("scroll", alMover)
      removeEventListener("resize", alMover)
      cancelAnimationFrame(cuadro)
    }
  }, [])

  function agregarABolsa() {
    bolsa.agregar({
      sku: ficha.sku,
      varianteId: variante?.id ?? null,
      cantidad,
      slug: ficha.slug,
      nombre: ficha.nombre,
      variante: variante?.nombre ?? null,
      imagen: variante?.imagen ?? ficha.galeria[0] ?? null,
      precio: base,
    })
  }

  const destino =
    `/comprar?sku=${encodeURIComponent(ficha.sku)}&n=${cantidad}` + (variante ? `&v=${encodeURIComponent(variante.id)}` : '')

  const envioTexto =
    envio.gratisDesde && precio * cantidad >= envio.gratisDesde
      ? 'Envío gratis'
      : envio.tarifa > 0
        ? `Envío ${clp(envio.tarifa)}`
        : 'Envío sin costo'

  return (
    <>
      <nav aria-label="Ruta" className="px-[var(--canal)] pt-4 text-[12px] text-gris">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-tinta">Tienda</Link></li>
          {ficha.categoria && (
            <>
              <li aria-hidden>›</li>
              <li><Link href="/#lo-ultimo" className="hover:text-tinta">{ficha.categoria.nombre}</Link></li>
            </>
          )}
          <li aria-hidden>›</li>
          <li aria-current="page" className="text-tinta">{ficha.nombre}</li>
        </ol>
      </nav>

      <div className="ficha mx-auto grid max-w-[1204px] gap-8 pt-4 pb-12 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-14 lg:px-[22px] lg:pt-8">
        {/* ── Galería ─────────────────────────────────────────────── */}
        <div className="min-w-0 lg:sticky lg:top-16 lg:self-start">
          <div className="relative overflow-hidden bg-papel-alt lg:rounded-[28px]">
            <div className="absolute right-4 top-4 z-10"><BotonFavorito productoId={ficha.id} nombre={ficha.nombre} /></div>
            <span className="absolute bottom-4 right-4 z-10 rounded-full bg-white px-3 py-1 text-sm text-black lg:hidden" aria-live="polite">{foto + 1} / {fotos.length}</span>
            <div
              ref={pista}
              onScroll={(e) => setFoto(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
              className="sin-barra flex aspect-square snap-x snap-mandatory overflow-x-auto"
              aria-roledescription="carrusel"
              aria-label={`Fotos de ${ficha.nombre}`}
            >
              {fotos.map((src, i) => (
                <div key={`${src}-${i}`} className="relative w-full shrink-0 snap-center" aria-label={`Foto ${i + 1} de ${fotos.length}`}>
                  {src && <button type="button" onClick={() => abrirZoom(i)} aria-label={`Ampliar foto ${i + 1} de ${ficha.nombre}`} className="absolute inset-0 z-[1] cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-black" />}
                  {src ? (
                    i === 0 ? (
                      <ViewTransition name={`producto-${ficha.slug}`}>
                        <Image src={src} alt={ficha.nombre} fill priority sizes="(min-width: 1024px) 680px, 100vw" className="object-contain p-8 t:p-14" />
                      </ViewTransition>
                    ) : (
                      <Image src={src} alt="" fill sizes="(min-width: 1024px) 680px, 100vw" className="object-contain p-8 t:p-14" />
                    )
                  ) : (
                    <span className="grid size-full place-items-center text-borde"><Estrella size={96} /></span>
                  )}
                </div>
              ))}
            </div>
            {fotos.length > 1 && (
              <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2 lg:hidden" aria-hidden>
                {fotos.map((_, i) => (
                  <span key={i} className={`size-1.5 rounded-full transition-colors ${i === foto ? 'bg-tinta' : 'bg-tinta/25'}`} />
                ))}
              </div>
            )}
          </div>

          {fotos.length > 1 && (
            <ul className="mt-4 hidden flex-wrap gap-3 lg:flex" aria-label="Elegir foto">
              {fotos.map((src, i) => (
                <li key={`m-${src}-${i}`}>
                  <button
                    type="button"
                    onClick={() => irA(i)}
                    aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === foto}
                    className={`relative block size-20 overflow-hidden rounded-[14px] bg-papel-alt ring-2 transition-shadow ${i === foto ? 'ring-tinta' : 'ring-transparent hover:ring-borde'}`}
                  >
                    {src && <Image src={src} alt="" fill sizes="80px" className="object-contain p-2" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Datos y compra ─────────────────────────────────────── */}
        <div className="min-w-0 px-[var(--canal)] lg:px-0 lg:pt-4">
          {ficha.etiqueta && <p className="text-[14px] font-semibold text-spark">{ficha.etiqueta}</p>}
          <h1 className="mt-1 text-[32px] leading-[1.06] font-semibold tracking-seccion text-balance t:text-[40px] d:text-[48px]">{ficha.nombre}</h1>
          {ficha.marca && <p className="mt-2 text-[14px] text-gris">{ficha.marca}{ficha.condicion !== 'nuevo' ? ` · ${ficha.condicion}` : ''}</p>}

          <p className="mt-5 flex items-baseline gap-3">
            <span className="cifra text-[28px] font-semibold tracking-seccion">{clp(precio)}</span>
            {ficha.precioAntes && !conDescuento && (
              <span className="cifra text-[17px] text-gris line-through"><span className="sr-only">antes </span>{clp(ficha.precioAntes)}</span>
            )}
            {conDescuento && <span className="rounded-full bg-verde/10 px-2.5 py-0.5 text-[13px] font-semibold text-verde">{tramo.etiqueta}</span>}
          </p>
          <p className="mt-1 text-[14px] text-tinta-suave">{envioTexto}{envio.plazo ? ` · ${envio.plazo}` : ''}</p>

          {/* Variantes */}
          {conVariantes && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-[15px] font-semibold">
                Color · <span className="font-normal text-tinta-suave">{variante?.nombre}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {ficha.variantes.map((v) => (
                  <label
                    key={v.id}
                    className={`ficha-opcion relative flex cursor-pointer items-center gap-2.5 rounded-[14px] px-4 py-3 text-[14px] ring-1 transition-shadow ${
                      v.id === varianteId ? 'ring-2 ring-tinta' : 'ring-borde hover:ring-gris'
                    } ${v.disponible <= 0 ? 'cursor-not-allowed line-through' : ''}`}
                  >
                    <input type="radio" name="variante" value={v.id} disabled={v.disponible <= 0} checked={v.id === varianteId} onChange={() => setVarianteId(v.id)} className="peer sr-only" />
                    <span aria-hidden className={`size-7 shrink-0 rounded-full ring-1 ring-black/30 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 ${v.id === varianteId ? 'outline-2 outline-offset-2 outline-black' : ''}`} style={{ background: v.colorHex ?? '#ddd' }} />
                    {v.nombre}
                    {v.disponible <= 0 && <span className="text-[12px] text-gris">agotado</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Precio por volumen */}
          {tramosVisibles.length > 0 && (
            <div className="mt-7">
              <p className="mb-3 text-[15px] font-semibold">Mientras más llevas, menos pagas</p>
              <ul className="grid grid-cols-2 gap-2.5 t:grid-cols-3">
                {tramosVisibles.map((t) => {
                  const activo = tramo?.min === t.min
                  return (
                    <li key={t.min}>
                      <button
                        type="button"
                        onClick={() => setCantidad(Math.min(t.min, Math.max(1, disponible)))}
                        disabled={t.min > disponible}
                        className={`w-full rounded-[14px] px-4 py-3 text-left ring-1 transition-shadow disabled:opacity-40 ${activo ? 'ring-2 ring-verde' : 'ring-borde hover:ring-gris'}`}
                      >
                        <span className="block text-[13px] text-gris">{t.etiqueta}</span>
                        <span className="cifra block text-[16px] font-semibold">{clp(t.precio)} c/u</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {/* Cantidad y compra */}
          <div className="mt-7 flex items-center gap-4">
            <div className="flex items-center rounded-full ring-1 ring-borde">
              <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))} disabled={cantidad <= 1 || agotado} aria-label="Quitar una unidad" className="grid size-12 place-items-center text-[20px] disabled:opacity-30">−</button>
              <output aria-live="polite" aria-label="Cantidad" className="cifra w-8 text-center text-[17px] font-semibold">{cantidad}</output>
              <button type="button" onClick={() => setCantidad((c) => Math.min(disponible, c + 1))} disabled={cantidad >= disponible || agotado} aria-label="Agregar una unidad" className="grid size-12 place-items-center text-[20px] disabled:opacity-30">+</button>
            </div>
            <p role="status" className="flex items-center gap-2 text-[13px] text-tinta">
              <span aria-hidden className={`size-2 shrink-0 rounded-full ${agotado ? 'bg-gray-500' : disponible <= 5 ? 'bg-amber-700' : 'bg-green-700'}`} />
              {agotado ? 'Agotado' : disponible <= 5 ? 'Últimas unidades' : 'En stock'}
            </p>
          </div>

          {agotado ? (
            <a
              href={whatsapp ? `${whatsapp}?text=${encodeURIComponent(`Hola, me avisan cuando llegue ${ficha.nombre}${variante ? ` (${variante.nombre})` : ''}?`)}` : '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="tienda-boton mt-6 w-full bg-tinta text-white"
            >
              Avísame cuando llegue
            </a>
          ) : (
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={agregarABolsa} className="tienda-boton w-full bg-spark !min-h-[52px] !text-[17px] text-white hover:bg-spark-hover">
                Agregar a la bolsa · <span className="cifra ml-1">{clp(precio * cantidad)}</span>
              </button>
              <Link href={destino} className="tienda-boton w-full text-tinta ring-1 ring-borde ring-inset hover:ring-gris">
                Comprar ahora
              </Link>
            </div>
          )}
          <div ref={centinela} aria-hidden className="h-px" />

          <ul className="mt-6 grid gap-3 rounded-[18px] bg-papel-alt p-5 text-[14px] text-tinta-suave">
            {['Envío a todo Chile', 'Garantía de 6 meses', '10 días de retracto', 'Pago seguro'].map((texto, i) => <li key={texto} className="flex items-center gap-3"><svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0"><path d={['M3 7h11v9H3zM14 10h4l3 3v3h-7M5 16v3h3v-3m8 0v3h3v-3', 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4', 'M4 4v5h5M4 9a8 8 0 1 1 0 7', 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z'][i]} /></svg>{texto}</li>)}
            {whatsapp && (
              <li className="flex gap-3"><Punto /><span>¿Dudas? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-spark hover:underline">Escríbenos por WhatsApp</a>.</span></li>
            )}
          </ul>

          {ficha.descripcion && (
            <section className="mt-10" aria-labelledby="desc-titulo">
              <h2 id="desc-titulo" className="text-[21px] font-semibold tracking-tarjeta">Sobre este producto</h2>
              <p className="mt-3 max-w-[580px] text-[17px] leading-relaxed whitespace-pre-line text-tinta-suave">{ficha.descripcion}</p>
            </section>
          )}

          <div className="mt-8 divide-y divide-borde/70 border-y border-borde/70">
            {[
              { t: 'Envío', c: envio.politica },
              { t: 'Garantía', c: garantia },
              { t: 'Cambios y devoluciones', c: retracto },
            ].map((d) => (
              <details key={d.t} className="ficha-detalle group py-1">
                <summary className="flex cursor-pointer list-none items-center justify-between py-4 text-[17px] font-semibold">
                  {d.t}
                  <span aria-hidden className="text-[22px] font-normal text-gris transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="pb-5 text-[15px] leading-relaxed text-tinta-suave">{d.c}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <dialog ref={zoom} role="dialog" aria-modal="true" aria-label={`Fotos ampliadas de ${ficha.nombre}`} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-[#f5f5f7] p-0 text-tinta backdrop:bg-black/80"
        onClose={() => { setZoomAbierto(false); document.body.style.overflow = overflowPrevio.current; origenZoom.current?.focus() }}
        onKeyDown={(e) => {
          if (e.key === 'Escape') { e.preventDefault(); cerrarZoom() }
          if (e.key === 'ArrowLeft') { e.preventDefault(); moverZoom(-1) }
          if (e.key === 'ArrowRight') { e.preventDefault(); moverZoom(1) }
          if (e.key === 'Tab') {
            const botones = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
            const primero = botones[0], ultimo = botones[botones.length - 1]
            if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo?.focus() }
            else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero?.focus() }
          }
        }}>
        <button type="button" autoFocus onClick={cerrarZoom} aria-label="Cerrar fotos ampliadas" className="absolute top-4 right-4 z-10 grid size-11 place-items-center rounded-full bg-white text-tinta shadow-sm ring-1 ring-borde hover:bg-papel-alt focus-visible:outline-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <div className="relative h-full w-full touch-pan-y" onPointerDown={(e) => { gestoZoom.current = { x: e.clientX, y: e.clientY } }} onPointerCancel={() => { gestoZoom.current = null }} onPointerUp={(e) => { const inicio = gestoZoom.current; gestoZoom.current = null; if (inicio && Math.abs(e.clientX - inicio.x) > 50 && Math.abs(e.clientX - inicio.x) > Math.abs(e.clientY - inicio.y)) moverZoom(e.clientX < inicio.x ? 1 : -1) }}>
          {zoomAbierto && fotos[zoomFoto] && <Image src={fotos[zoomFoto]!} alt={`${ficha.nombre}, foto ${zoomFoto + 1}`} fill sizes="100vw" loading="eager" className="object-contain p-6 t:p-16" />}
        </div>
        {/* Con una sola foto no hay nada que recorrer: sin flechas ni contador. */}
        {fotos.length > 1 && (
          <div className="absolute inset-x-0 bottom-5 flex items-center justify-center gap-4">
            <button type="button" onClick={() => moverZoom(-1)} aria-label="Foto anterior" className="grid size-11 place-items-center rounded-full bg-white shadow-sm ring-1 ring-borde hover:bg-papel-alt">←</button>
            <span aria-live="polite" className="cifra rounded-full bg-white px-3.5 py-1.5 text-[14px] shadow-sm ring-1 ring-borde">{zoomFoto + 1} / {fotos.length}</span>
            <button type="button" onClick={() => moverZoom(1)} aria-label="Foto siguiente" className="grid size-11 place-items-center rounded-full bg-white shadow-sm ring-1 ring-borde hover:bg-papel-alt">→</button>
          </div>
        )}
      </dialog>
      {/* Barra de compra de escritorio (patrón Apple): bajo la cabecera, con nombre,
          precio y botón siempre a mano cuando el botón principal ya quedó atrás. */}
      {!agotado && (
        <div
          aria-hidden={!barra}
          className={`ficha-barra-escritorio fixed inset-x-0 top-11 z-40 hidden border-b border-black/[0.06] bg-papel/85 backdrop-blur-xl lg:block ${barra ? 'ficha-barra-escritorio-visible' : ''}`}
        >
          <div className="mx-auto flex h-14 max-w-[1204px] items-center justify-between gap-6 px-[22px]">
            <p className="truncate text-[19px] font-semibold tracking-cuerpo">{ficha.nombre}</p>
            <div className="flex shrink-0 items-center gap-5">
              <p className="cifra text-[15px] text-tinta-suave">{clp(precio * cantidad)}{variante ? ` · ${variante.nombre}` : ''}</p>
              <button type="button" onClick={agregarABolsa} tabIndex={barra ? 0 : -1} className="tienda-boton min-h-9 bg-spark px-4 py-1.5 text-[14px] text-white hover:bg-spark-hover">
                Agregar a la bolsa
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Barra fija de compra en teléfono y tableta. */}
      {!agotado && (
        <div
          aria-hidden={!barra}
          className={`ficha-barra fixed inset-x-0 bottom-0 z-40 border-t border-black/[0.06] bg-papel/90 px-[var(--canal)] pt-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-xl lg:hidden ${
            barra ? 'ficha-barra-visible' : ''
          }`}
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold">{ficha.nombre}</p>
              <p className="cifra text-[13px] text-tinta-suave">{clp(precio * cantidad)}{variante ? ` · ${variante.nombre}` : ''}</p>
            </div>
            <button type="button" onClick={agregarABolsa} tabIndex={barra ? 0 : -1} className="tienda-boton shrink-0 bg-spark text-white">
              Agregar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function Punto() {
  return <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-spark" />
}
