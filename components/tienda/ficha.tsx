'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import { IconoBolsa, IconoPersonas } from '@/components/iconos'
import type { PruebaSocial } from '@/lib/prueba-social'
import { precioPara, type FichaProducto } from '@/lib/ficha-precio'
import { useBolsa } from './bolsa'
import { GaleriaFicha } from './galeria-ficha'
import { MediosPago } from './medios-pago'
import { EnvioEstimado } from './envio-estimado'
import type { Hito } from '@/lib/plazo-envio'
import { Estrellas } from './resenas-ficha'
import { DescripcionFicha } from './descripcion-ficha'

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
  hitosEnvio = null,
  varianteInicial = null,
  pruebaSocial = null,
  valoracion = null,
}: {
  ficha: FichaProducto
  envio: Envio
  garantia: string
  retracto: string
  whatsapp: string | null
  /** Fechas estimadas de entrega, calculadas en el servidor; null = no mostrar. */
  hitosEnvio?: Hito[] | null
  /** Color elegido en la card (?v=): la ficha abre con ese. */
  varianteInicial?: string | null
  /** Compradores reales del producto (conteo de pedidos pagados); null si aún son pocos. */
  pruebaSocial?: PruebaSocial | null
  /** Nota de las reseñas visibles; sin reseñas no se muestra nada. */
  valoracion?: { promedio: number; total: number } | null
}) {
  const bolsa = useBolsa()
  const conVariantes = ficha.variantes.length > 0
  // Variantes sin color ni muestra son modelos (iPhone 15 Pro, 16 Pro…): se
  // eligen por nombre, sin círculo de color.
  const sonColores = ficha.variantes.some((v) => v.colorHex || v.muestra)
  const primeraDisponible = ficha.variantes.find((v) => v.disponible > 0) ?? ficha.variantes[0] ?? null
  // Si se llega desde un círculo de la card, manda ese color (si existe).
  const pedida = ficha.variantes.find((v) => v.id === varianteInicial) ?? null
  const [varianteId, setVarianteId] = useState<string | null>(pedida?.id ?? primeraDisponible?.id ?? null)
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

      {/* Como Dune Dragon: la galería llega al borde izquierdo y ocupa cerca del
          63 % del ancho; los datos quedan a la derecha, en el canal. */}
      <div className="ficha grid gap-8 pt-4 pb-12 lg:grid-cols-[minmax(0,63fr)_minmax(0,37fr)] lg:gap-12 lg:pt-0 lg:pr-[var(--canal)]">
        {/* ── Galería ─────────────────────────────────────────────── */}
        <div className="min-w-0">
          <GaleriaFicha medios={fotos} nombre={ficha.nombre} slug={ficha.slug} productoId={ficha.id} />
        </div>

        {/* ── Datos y compra ─────────────────────────────────────── */}
        <div className="min-w-0 px-[var(--canal)] lg:sticky lg:top-16 lg:self-start lg:px-0 lg:pt-4">
          {ficha.etiqueta && <p className="text-[14px] font-semibold text-spark">{ficha.etiqueta}</p>}
          <h1 className="mt-1 text-[32px] leading-[1.06] font-semibold tracking-seccion text-balance t:text-[40px] d:text-[48px]">{ficha.nombre}</h1>
          {ficha.marca && <p className="mt-2 text-[14px] text-gris">{ficha.marca}{ficha.condicion !== 'nuevo' ? ` · ${ficha.condicion}` : ''}</p>}
          {/* Prueba social donde el comprador mira primero: junto al nombre, y lleva a las reseñas. */}
          {valoracion && valoracion.total > 0 && (
            <a href="#resenas" className="group mt-3 inline-flex items-center gap-2 text-[14px] text-tinta">
              <Estrellas calificacion={Math.round(valoracion.promedio)} tam={15} />
              <span className="cifra font-semibold">{valoracion.promedio.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</span>
              <span className="text-tinta-suave underline-offset-4 group-hover:underline">{valoracion.total} {valoracion.total === 1 ? 'reseña' : 'reseñas'}</span>
            </a>
          )}

          <p className="mt-5 flex items-baseline gap-3">
            <span className="cifra text-[28px] font-semibold tracking-seccion">{clp(precio)}</span>
            {ficha.precioAntes && !conDescuento && (
              <span className="cifra text-[17px] text-gris line-through"><span className="sr-only">antes </span>{clp(ficha.precioAntes)}</span>
            )}
            {conDescuento && <span className="rounded-full bg-verde/10 px-2.5 py-0.5 text-[13px] font-semibold text-verde">{tramo.etiqueta}</span>}
          </p>
          {/* Con fechas a la vista, el plazo en texto («Entre 1 y 3 días hábiles») sobra y
              hasta contradice: se muestra solo cuando no hay línea de tiempo. */}
          <p className="mt-1 text-[14px] text-tinta-suave">{envioTexto}{envio.plazo && !(hitosEnvio && !agotado) ? ` · ${envio.plazo}` : ''}</p>
          {hitosEnvio && !agotado && <EnvioEstimado hitos={hitosEnvio} />}

          {/* Variantes */}
          {conVariantes && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-[15px] font-semibold">
                {sonColores ? 'Color' : 'Modelo'} · <span className="font-normal text-tinta-suave">{variante?.nombre}</span>
              </legend>
              <div className="flex flex-wrap gap-2.5">
                {ficha.variantes.map((v) => (
                  <label
                    key={v.id}
                    className={`ficha-opcion relative flex cursor-pointer items-center gap-2.5 rounded-[14px] px-4 py-3 text-[14px] ring-1 transition-shadow ${
                      v.id === varianteId ? 'ring-2 ring-tinta' : 'ring-borde hover:ring-gris'
                    } ${v.disponible <= 0 ? 'text-tinta-suave' : ''}`}
                  >
                    {/* Un color agotado se puede elegir para verlo: la compra ya se
                        bloquea sola con el stock del color elegido. */}
                    <input type="radio" name="variante" value={v.id} checked={v.id === varianteId} onChange={() => setVarianteId(v.id)} className="peer sr-only" />
                    {sonColores && (
                      <span aria-hidden className={`size-7 shrink-0 rounded-full ring-1 ring-black/30 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 ${v.id === varianteId ? 'outline-2 outline-offset-2 outline-black' : ''}`} style={v.muestra ? { backgroundImage: `url("${v.muestra}")`, backgroundSize: 'cover', backgroundPosition: 'center' } : { background: v.colorHex ?? '#ddd' }} />
                    )}
                    {v.nombre}
                    {v.disponible <= 0 && <span className="text-[12px] text-gris">agotado</span>}
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {/* Packs por cantidad. Cada opción dice cuánto se ahorra en pesos, calculado
              contra el precio normal de esa misma cantidad: nunca un «hasta» ni un
              porcentaje que el comprador no pueda comprobar. */}
          {tramosVisibles.length > 0 && (
            <fieldset className="mt-7">
              <legend className="mb-3 text-[15px] font-semibold">Mientras más llevas, menos pagas</legend>
              <ul className="grid grid-cols-2 gap-2.5">
                {[{ min: 1, etiqueta: '1 unidad', precio: base }, ...tramosVisibles].map((t) => {
                  const activo = (tramo?.min ?? 1) === t.min
                  const ahorro = (base - t.precio) * t.min
                  const sinStock = t.min > Math.max(1, disponible)
                  return (
                    <li key={t.min}>
                      <button
                        type="button"
                        aria-pressed={activo}
                        onClick={() => setCantidad(t.min)}
                        disabled={sinStock}
                        className={`pack-opcion flex h-full w-full flex-col rounded-[14px] px-4 py-3 text-left ring-1 disabled:opacity-40 ${activo ? 'ring-2 ring-verde' : 'ring-borde hover:ring-tinta'}`}
                      >
                        <span className="block text-[13px] text-gris">{t.etiqueta}</span>
                        <span className="cifra block text-[16px] font-semibold">{clp(t.precio)} c/u</span>
                        {t.min > 1 && <span className="cifra mt-0.5 block text-[12px] text-tinta-suave">{clp(t.precio * t.min)} por {t.min}</span>}
                        {ahorro > 0 && <span key={activo ? 'activo' : 'reposo'} className={`cifra mt-auto pt-2 text-[12px] font-semibold text-verde ${activo ? 'texto-brillo' : ''}`}>Ahorras {clp(ahorro)}</span>}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </fieldset>
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

          {!agotado && pruebaSocial && (
            <p className="mt-4 flex items-center gap-2 text-[13px] text-tinta-suave">
              <IconoPersonas size={16} className="shrink-0" />
              <span><strong className="font-semibold text-tinta">{pruebaSocial.personas} personas</strong> compraron esto {pruebaSocial.periodo}</span>
            </p>
          )}

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
              {/* Verde 700 (#15803d): con texto blanco da 5:1; el token --color-verde da 3.5:1 y no alcanza. */}
              <Link href={destino} className="tienda-boton boton-presion w-full gap-2 bg-green-700 !min-h-[52px] !text-[17px] text-white">
                <IconoBolsa size={22} />
                <span>Comprar · <span className="cifra ml-1">{clp(precio * cantidad)}</span></span>
              </Link>
              <button type="button" onClick={agregarABolsa} className="tienda-boton boton-presion boton-presion-contorno boton-bolsa w-full gap-2 !min-h-[52px] !text-[17px] text-tinta ring-1 ring-borde ring-inset hover:ring-tinta">
                <IconoBolsa size={22} />
                Agregar al carrito
              </button>
            </div>
          )}
          {!agotado && (
            <MediosPago alto={22} className="mt-3 justify-center" />
          )}
          <div ref={centinela} aria-hidden className="h-px" />

          <ul className="mt-6 grid gap-3 rounded-[18px] bg-papel-alt p-5 text-[14px] text-tinta-suave">
            {['Envío a todo Chile', 'Garantía de 6 meses', 'Seguimiento de tu pedido', 'Pago seguro'].map((texto, i) => <li key={texto} className="flex items-center gap-3"><svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0"><path d={['M3 7h11v9H3zM14 10h4l3 3v3h-7M5 16v3h3v-3m8 0v3h3v-3', 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4', 'M12 21s-7-6.2-7-11a7 7 0 1 1 14 0c0 4.8-7 11-7 11ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z'][i]} /></svg>{texto}</li>)}
            {whatsapp && (
              <li className="flex gap-3"><Punto /><span>¿Dudas? <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="text-spark hover:underline">Escríbenos por WhatsApp</a>.</span></li>
            )}
          </ul>

          {ficha.descripcion && (
            <section className="mt-10" aria-labelledby="desc-titulo">
              <h2 id="desc-titulo" className="text-[21px] font-semibold tracking-tarjeta">Sobre este producto</h2>
              <DescripcionFicha texto={ficha.descripcion} />
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
              <button type="button" onClick={agregarABolsa} tabIndex={barra ? 0 : -1} className="tienda-boton boton-presion boton-presion-contorno boton-bolsa min-h-9 gap-1.5 px-4 py-1.5 text-[14px] text-tinta ring-1 ring-borde ring-inset hover:ring-tinta">
                <IconoBolsa size={18} />
                Agregar al carrito
              </button>
              <Link href={destino} tabIndex={barra ? 0 : -1} className="tienda-boton boton-presion gap-1.5 min-h-9 bg-green-700 px-4 py-1.5 text-[14px] text-white">
                <IconoBolsa size={18} />
                Comprar
              </Link>
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
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={agregarABolsa} tabIndex={barra ? 0 : -1} aria-label="Agregar al carrito" className="tienda-boton boton-presion boton-presion-contorno boton-bolsa gap-1.5 !px-4 text-tinta ring-1 ring-borde ring-inset hover:ring-tinta">
                <IconoBolsa size={20} />
                Agregar
              </button>
              <Link href={destino} tabIndex={barra ? 0 : -1} className="tienda-boton boton-presion gap-1.5 bg-green-700 text-white">
                <IconoBolsa size={18} />
                Comprar
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Punto() {
  return <span aria-hidden className="mt-[7px] size-1.5 shrink-0 rounded-full bg-spark" />
}
