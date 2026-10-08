'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clp } from '@/lib/formato'
import { notificar } from '@/lib/notificar'
import { rastrear } from '@/lib/meta-pixel'
import { Estrella } from '@/app/marca'
import { LlegadaEstimada, SellosConfianza } from '@/components/tienda/confianza-compra'
import type { Hito } from '@/lib/plazo-envio'
import {
  claveLinea,
  escuchaGuardado,
  guardarBolsa,
  leerBolsa,
  sumarLinea,
  acotarUnidades,
  MAX_UNIDADES_LINEA,
  type LineaBolsa,
} from '@/lib/carrito'
import { cotizarBolsa, type CotizacionBolsa } from '@/app/comprar/acciones'

interface ContextoBolsa {
  lineas: LineaBolsa[]
  unidades: number
  subtotal: number
  lista: boolean
  agregar: (linea: LineaBolsa) => void
  cambiar: (clave: string, cantidad: number) => void
  quitar: (clave: string) => void
  vaciar: () => void
  /** Lleva a la página de la bolsa. */
  abrir: () => void
}

const Contexto = createContext<ContextoBolsa | null>(null)

export function useBolsa(): ContextoBolsa {
  const c = useContext(Contexto)
  if (!c) throw new Error('useBolsa debe usarse dentro de <ProveedorBolsa>')
  return c
}

/**
 * Proveedor de la bolsa.
 *
 * Arranca vacío y carga lo guardado recién en el navegador: así el HTML del
 * servidor y el primer render coinciden (sin errores de hidratación). Se
 * sincroniza entre pestañas con el evento `storage`.
 *
 * La bolsa es una página propia (/bolsa), como en Apple, y no una hoja
 * emergente: se puede enlazar, volver atrás y revisar con calma.
 */
export function ProveedorBolsa({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<LineaBolsa[]>([])
  const [lista, setLista] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setLineas(leerBolsa())
    setLista(true)
    const alCambiar = (e: StorageEvent) => e.key === escuchaGuardado && setLineas(leerBolsa())
    addEventListener('storage', alCambiar)
    return () => removeEventListener('storage', alCambiar)
  }, [])

  const actualizar = useCallback((f: (actual: LineaBolsa[]) => LineaBolsa[]) => {
    setLineas((actual) => {
      const nuevas = f(actual)
      guardarBolsa(nuevas)
      return nuevas
    })
  }, [])

  const valor = useMemo<ContextoBolsa>(
    () => ({
      lineas,
      lista,
      unidades: lineas.reduce((a, l) => a + l.cantidad, 0),
      subtotal: lineas.reduce((a, l) => a + l.cantidad * l.precio, 0),
      agregar: (linea) => {
        actualizar((a) => sumarLinea(a, linea))
        // Un solo punto para toda la tienda: ficha, «+» de las cards y /cyber.
        rastrear('AddToCart', { content_ids: [linea.sku], content_name: linea.nombre, content_type: 'product', value: linea.precio * linea.cantidad, currency: 'CLP', num_items: linea.cantidad })
        if (location.pathname !== '/bolsa') {
          void notificar.accion({
            titulo: 'Agregado a tu bolsa',
            descripcion: linea.variante ? `${linea.nombre} · ${linea.variante}` : linea.nombre,
            accion: { titulo: 'Ver bolsa', alPulsar: () => router.push('/bolsa') },
          })
        }
      },
      cambiar: (clave, cantidad) => actualizar((a) => a.map((l) => (claveLinea(l) === clave ? { ...l, cantidad: acotarUnidades(cantidad) } : l))),
      quitar: (clave) => actualizar((a) => a.filter((l) => claveLinea(l) !== clave)),
      vaciar: () => actualizar(() => []),
      abrir: () => router.push('/bolsa'),
    }),
    [lineas, lista, actualizar, router]
  )

  return (
    <Contexto.Provider value={valor}>
      {children}
    </Contexto.Provider>
  )
}

/** Ícono de la bolsa con el número de unidades: lleva a la página /bolsa. */
export function BotonBolsa({ className = '' }: { className?: string }) {
  const { unidades, lista } = useBolsa()
  return (
    <Link
      href="/bolsa"
      aria-label={unidades ? `Bolsa, ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}` : 'Bolsa vacía'}
      className={`relative grid size-10 place-items-center min-[360px]:size-11 rounded-full text-tinta/80 hover:text-tinta ${className}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 8h14l-1 12H6L5 8ZM9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {lista && unidades > 0 && (
        <span aria-hidden className="bolsa-contador cifra absolute top-1.5 right-1 grid min-w-[17px] place-items-center rounded-full bg-spark px-1 text-[10px] leading-[17px] font-semibold text-white">
          {unidades}
        </span>
      )}
    </Link>
  )
}

function Miniatura({ src, grande = false }: { src: string | null; grande?: boolean }) {
  return (
    <span className={`relative block shrink-0 overflow-hidden bg-papel-alt ${grande ? 'size-24 rounded-[14px] t:size-[140px] t:rounded-[18px]' : 'size-12 rounded-[10px]'}`}>
      {src ? <Image src={src} alt="" fill sizes={grande ? '140px' : '48px'} className="object-contain p-2" /> : <Estrella size={28} className="m-auto mt-3 text-borde" />}
    </span>
  )
}

function Stepper({ valor, onCambio, etiqueta }: { valor: number; onCambio: (n: number) => void; etiqueta: string }) {
  return (
    <div className="flex items-center rounded-full ring-1 ring-borde" role="group" aria-label={`Cantidad de ${etiqueta}`}>
      <button type="button" onClick={() => onCambio(valor - 1)} disabled={valor <= 1} aria-label="Quitar una unidad" className="grid size-10 place-items-center text-[18px] disabled:opacity-30">−</button>
      <output aria-live="polite" className="cifra w-7 text-center text-[15px] font-semibold">{valor}</output>
      <button type="button" onClick={() => onCambio(valor + 1)} disabled={valor >= MAX_UNIDADES_LINEA} aria-label="Agregar una unidad" className="grid size-10 place-items-center text-[18px] disabled:opacity-30">+</button>
    </div>
  )
}

/** Espera breve: tocar «+» tres veces seguidas no dispara tres cotizaciones. */
const ESPERA_COTIZACION = 350

/**
 * Cotiza la bolsa en el servidor: el precio por pack, el stock y el envío
 * que ve el comprador son los mismos que se cobran. Mientras llega, se
 * muestra lo guardado en el navegador.
 */
function useCotizacionBolsa(lineas: LineaBolsa[]) {
  const [cotizacion, setCotizacion] = useState<CotizacionBolsa | null>(null)
  const turno = useRef(0)
  const pedidas = useMemo(() => lineas.map((l) => ({ sku: l.sku, varianteId: l.varianteId, cantidad: l.cantidad })), [lineas])
  useEffect(() => {
    if (pedidas.length === 0) return
    const mio = ++turno.current
    const t = setTimeout(async () => {
      try {
        const r = await cotizarBolsa(pedidas)
        if (mio === turno.current) setCotizacion(r)
      } catch {
        if (mio === turno.current) setCotizacion(null)
      }
    }, ESPERA_COTIZACION)
    return () => clearTimeout(t)
  }, [pedidas])
  return cotizacion?.ok ? cotizacion : null
}

/** Barra de envío gratis: cuánto falta, medido sobre el subtotal ya cotizado. */
function BarraEnvio({ subtotal, gratisDesde }: { subtotal: number; gratisDesde: number }) {
  const falta = Math.max(0, gratisDesde - subtotal)
  const avance = Math.min(100, Math.round((subtotal / gratisDesde) * 100))
  return (
    <div className="pb-2">
      <p className="text-[13px] text-tinta-suave" aria-live="polite">
        {falta === 0 ? <span className="font-medium text-verde">Tu pedido tiene envío gratis.</span> : <>Te faltan <span className="cifra font-semibold text-tinta">{clp(falta)}</span> para el envío gratis.</>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-papel-alt" role="progressbar" aria-label="Avance hacia el envío gratis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={avance}>
        <div className={`bolsa-avance h-full rounded-full ${falta === 0 ? 'bg-verde' : 'bg-spark'}`} style={{ transform: `scaleX(${avance / 100})` }} />
      </div>
    </div>
  )
}

/**
 * Página de la bolsa (/bolsa), como la de Apple: título grande, los
 * productos en lista y el resumen con el total y el botón de pago.
 */
export function PaginaBolsa({ hitosEnvio = null, envioGratis = false }: { hitosEnvio?: readonly Hito[] | null; envioGratis?: boolean }) {
  const { lineas, subtotal: subtotalLocal, unidades, cambiar, quitar, lista } = useBolsa()
  const cotizacion = useCotizacionBolsa(lineas)
  const cotizadas = new Map((cotizacion?.lineas ?? []).map((c) => [c.clave, c]))
  // Solo se confía en la cotización si corresponde a la bolsa actual, línea por línea.
  const vigente = cotizacion !== null && lineas.every((l) => cotizadas.get(claveLinea(l))?.cantidad === l.cantidad)
  const subtotal = vigente ? [...cotizadas.values()].reduce((a, c) => a + c.subtotal, 0) : subtotalLocal
  const gratisDesde = vigente ? cotizacion.envio.gratisDesde : null

  // La bolsa vive en el navegador: hasta leerla, no se afirma que está vacía.
  if (!lista) return <div aria-busy className="min-h-[50svh]" />

  if (lineas.length === 0) {
    return (
      <div className="py-16 text-center t:py-24">
        <h1 className="text-[32px] leading-tight font-semibold tracking-seccion t:text-[40px]">Tu bolsa está vacía.</h1>
        <p className="mt-3 text-[17px] text-tinta-suave">Lo que agregues aparecerá aquí.</p>
        <Link href="/tienda" className="tienda-boton mt-8 bg-tinta text-white hover:bg-tinta/85">Ver la tienda</Link>
      </div>
    )
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-14">
      <div className="min-w-0">
        <h1 className="text-[32px] leading-tight font-semibold tracking-seccion t:text-[40px]">Revisa tu bolsa.</h1>
        <p className="mt-2 text-[17px] text-tinta-suave">
          {unidades} {unidades === 1 ? 'unidad' : 'unidades'} · Envío gratis a todo Chile.
        </p>

        <ul className="mt-8 divide-y divide-borde/70 border-y border-borde/70">
          {lineas.map((l) => {
            const clave = claveLinea(l)
            const c = vigente ? cotizadas.get(clave) : undefined
            return (
              <li key={clave} className="flex gap-4 py-6 t:gap-7 t:py-8">
                <Link href={`/producto/${l.slug}`} tabIndex={-1} aria-hidden>
                  <Miniatura src={l.imagen} grande />
                </Link>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 t:flex-row t:items-start t:justify-between t:gap-6">
                    <div className="min-w-0">
                      <Link href={`/producto/${l.slug}`} className="line-clamp-2 text-[17px] leading-snug font-semibold hover:underline t:text-[21px]">{l.nombre}</Link>
                      {l.variante && <p className="mt-0.5 text-[14px] text-gris">{l.variante}</p>}
                    </div>
                    <span className="t:text-right">
                      <span className="cifra block text-[17px] font-semibold t:text-[21px]">{clp(c ? c.subtotal : l.precio * l.cantidad)}</span>
                      {c?.tramo && <span className="cifra block text-[13px] text-verde">{c.tramo} · {clp(c.precio)} c/u</span>}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <Stepper valor={l.cantidad} onCambio={(n) => cambiar(clave, n)} etiqueta={l.nombre} />
                    <button type="button" onClick={() => quitar(clave)} className="text-[14px] text-gris underline-offset-2 hover:text-tinta hover:underline">Eliminar</button>
                  </div>
                  {c?.error && <p className="mt-3 text-[14px] text-rojo" role="alert">{c.error}</p>}
                  {c?.siguienteTramo && !c.error && (
                    <button
                      type="button"
                      onClick={() => cambiar(clave, l.cantidad + c.siguienteTramo!.faltan)}
                      className="presionable mt-3 flex w-full max-w-[420px] items-center justify-between gap-3 rounded-[12px] bg-verde/10 px-3.5 py-2.5 text-left text-[14px] text-verde hover:bg-verde/15"
                    >
                      <span>Lleva {c.siguienteTramo.faltan} más y paga <span className="cifra font-semibold">{clp(c.siguienteTramo.precio)}</span> c/u</span>
                      <span aria-hidden className="font-semibold">+{c.siguienteTramo.faltan}</span>
                    </button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <Link href="/tienda" className="mt-5 inline-block text-[15px] text-spark hover:underline">Seguir comprando</Link>
      </div>

      {/* Resumen: fijo al costado en escritorio, al final en teléfono. */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[18px] bg-papel p-6 ring-1 ring-borde/70">
          <h2 className="text-[19px] font-semibold tracking-cuerpo">Resumen</h2>
          <dl className="mt-4 space-y-2.5 text-[15px]">
            <div className="flex justify-between"><dt className="text-tinta-suave">Subtotal</dt><dd className={`cifra transition-opacity ${vigente ? '' : 'opacity-60'}`}>{clp(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-tinta-suave">Envío</dt><dd>Gratis</dd></div>
          </dl>
          {gratisDesde !== null && gratisDesde > 0 && <div className="mt-4"><BarraEnvio subtotal={subtotal} gratisDesde={gratisDesde} /></div>}
          <div className="mt-4 flex items-baseline justify-between border-t border-borde/70 pt-4">
            <span className="text-[17px] font-semibold">Total</span>
            <span className={`cifra text-[24px] font-semibold transition-opacity ${vigente ? '' : 'opacity-60'}`}>{clp(subtotal)}</span>
          </div>
          <LlegadaEstimada hitos={hitosEnvio} className="mt-5" />
          <Link href="/comprar" className="tienda-boton mt-4 w-full bg-tinta !min-h-[52px] !text-[17px] text-white hover:bg-tinta/85">
            Pagar
          </Link>
          <p className="mt-3 text-center text-[12px] text-gris" aria-live="polite">
            {vigente ? 'Precios por pack incluidos.' : 'Actualizando precios…'}
          </p>
          <SellosConfianza envioGratis={envioGratis} className="mt-5 border-t border-borde/70 pt-5" />
        </div>
      </aside>
    </div>
  )
}
