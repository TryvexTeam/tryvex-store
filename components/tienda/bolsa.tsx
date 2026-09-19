'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { clp } from '@/lib/formato'
import { Hoja } from '@/components/hoja'
import { Estrella } from '@/app/marca'
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
 */
export function ProveedorBolsa({ children }: { children: React.ReactNode }) {
  const [lineas, setLineas] = useState<LineaBolsa[]>([])
  const [lista, setLista] = useState(false)
  const [abierta, setAbierta] = useState(false)
  const [agregada, setAgregada] = useState<LineaBolsa | null>(null)

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
        setAgregada(linea)
      },
      cambiar: (clave, cantidad) => actualizar((a) => a.map((l) => (claveLinea(l) === clave ? { ...l, cantidad: acotarUnidades(cantidad) } : l))),
      quitar: (clave) => actualizar((a) => a.filter((l) => claveLinea(l) !== clave)),
      vaciar: () => actualizar(() => []),
      abrir: () => setAbierta(true),
    }),
    [lineas, lista, actualizar]
  )

  return (
    <Contexto.Provider value={valor}>
      {children}
      <HojaBolsa abierta={abierta} onCerrar={() => setAbierta(false)} />
      <AvisoAgregado linea={agregada} onCerrar={() => setAgregada(null)} />
    </Contexto.Provider>
  )
}

/** Ícono de la bolsa con el número de unidades. */
export function BotonBolsa({ className = '' }: { className?: string }) {
  const { unidades, abrir, lista } = useBolsa()
  return (
    <button
      type="button"
      onClick={abrir}
      aria-label={unidades ? `Bolsa, ${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}` : 'Bolsa vacía'}
      className={`relative grid size-11 place-items-center rounded-full text-tinta/80 hover:text-tinta ${className}`}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 8h14l-1 12H6L5 8ZM9 8V6a3 3 0 0 1 6 0v2" />
      </svg>
      {lista && unidades > 0 && (
        <span aria-hidden className="bolsa-contador cifra absolute top-1.5 right-1 grid min-w-[17px] place-items-center rounded-full bg-spark px-1 text-[10px] leading-[17px] font-semibold text-white">
          {unidades}
        </span>
      )}
    </button>
  )
}

function Miniatura({ src }: { src: string | null }) {
  return (
    <span className="relative size-[72px] shrink-0 overflow-hidden rounded-[14px] bg-papel-alt">
      {src ? <Image src={src} alt="" fill sizes="72px" className="object-contain p-1.5" /> : <Estrella size={28} className="m-auto mt-5 text-borde" />}
    </span>
  )
}

function Stepper({ valor, onCambio, etiqueta }: { valor: number; onCambio: (n: number) => void; etiqueta: string }) {
  return (
    <div className="flex items-center rounded-full ring-1 ring-borde" role="group" aria-label={`Cantidad de ${etiqueta}`}>
      <button type="button" onClick={() => onCambio(valor - 1)} disabled={valor <= 1} aria-label="Quitar una unidad" className="grid size-9 place-items-center text-[18px] disabled:opacity-30">−</button>
      <output aria-live="polite" className="cifra w-6 text-center text-[15px] font-semibold">{valor}</output>
      <button type="button" onClick={() => onCambio(valor + 1)} disabled={valor >= MAX_UNIDADES_LINEA} aria-label="Agregar una unidad" className="grid size-9 place-items-center text-[18px] disabled:opacity-30">+</button>
    </div>
  )
}

/** Espera breve: tocar «+» tres veces seguidas no dispara tres cotizaciones. */
const ESPERA_COTIZACION = 350

/**
 * Cotiza la bolsa en el servidor mientras la hoja está abierta: el precio por
 * pack, el stock y el envío que ve el comprador son los mismos que se cobran.
 * Mientras llega, se muestra lo guardado en el navegador.
 */
function useCotizacionBolsa(abierta: boolean, lineas: LineaBolsa[]) {
  const [cotizacion, setCotizacion] = useState<CotizacionBolsa | null>(null)
  const turno = useRef(0)
  const pedidas = useMemo(() => lineas.map((l) => ({ sku: l.sku, varianteId: l.varianteId, cantidad: l.cantidad })), [lineas])
  useEffect(() => {
    if (!abierta || pedidas.length === 0) return
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
  }, [abierta, pedidas])
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

function HojaBolsa({ abierta, onCerrar }: { abierta: boolean; onCerrar: () => void }) {
  const { lineas, subtotal: subtotalLocal, unidades, cambiar, quitar } = useBolsa()
  const cotizacion = useCotizacionBolsa(abierta, lineas)
  const cotizadas = new Map((cotizacion?.lineas ?? []).map((c) => [c.clave, c]))
  // Solo se confía en la cotización si corresponde a la bolsa actual, línea por línea.
  const vigente = cotizacion !== null && lineas.every((l) => cotizadas.get(claveLinea(l))?.cantidad === l.cantidad)
  const subtotal = vigente ? [...cotizadas.values()].reduce((a, c) => a + c.subtotal, 0) : subtotalLocal
  const gratisDesde = vigente ? cotizacion.envio.gratisDesde : null

  return (
    <Hoja
      abierta={abierta}
      onCerrar={onCerrar}
      titulo="Tu bolsa"
      bajada={unidades ? `${unidades} ${unidades === 1 ? 'unidad' : 'unidades'}` : undefined}
      pie={
        lineas.length > 0 ? (
          <div className="pb-2">
            {gratisDesde !== null && gratisDesde > 0 && <BarraEnvio subtotal={subtotal} gratisDesde={gratisDesde} />}
            <div className="flex items-baseline justify-between py-2">
              <span className="text-[15px] text-tinta-suave">Subtotal</span>
              <span className={`cifra text-[20px] font-semibold transition-opacity ${vigente ? '' : 'opacity-60'}`}>{clp(subtotal)}</span>
            </div>
            <Link href="/comprar" onClick={onCerrar} className="tienda-boton w-full bg-spark !min-h-[52px] text-white hover:bg-spark-hover">
              Pagar
            </Link>
            <p className="mt-2 text-center text-[12px] text-gris">
              {vigente ? 'Precios por pack incluidos. El envío se confirma con tu dirección.' : 'Actualizando precios…'}
            </p>
          </div>
        ) : undefined
      }
    >
      {lineas.length === 0 ? (
        <div className="py-10 text-center">
          <p className="text-[19px] font-semibold tracking-cuerpo">Tu bolsa está vacía.</p>
          <Link href="/tienda" onClick={onCerrar} className="mt-3 inline-block text-[15px] text-spark hover:underline">Ver la tienda</Link>
        </div>
      ) : (
        <ul className="divide-y divide-borde/60">
          {lineas.map((l) => {
            const clave = claveLinea(l)
            const c = vigente ? cotizadas.get(clave) : undefined
            return (
              <li key={clave} className="flex gap-4 py-4">
                <Miniatura src={l.imagen} />
                <div className="min-w-0 flex-1">
                  <Link href={`/producto/${l.slug}`} onClick={onCerrar} className="line-clamp-2 text-[15px] leading-snug font-semibold hover:underline">{l.nombre}</Link>
                  {l.variante && <p className="text-[13px] text-gris">{l.variante}</p>}
                  <div className="mt-2.5 flex items-center justify-between gap-3">
                    <Stepper valor={l.cantidad} onCambio={(n) => cambiar(clave, n)} etiqueta={l.nombre} />
                    <span className="text-right">
                      <span className="cifra block text-[15px] font-semibold">{clp(c ? c.subtotal : l.precio * l.cantidad)}</span>
                      {c?.tramo && <span className="cifra block text-[12px] text-verde">{c.tramo} · {clp(c.precio)} c/u</span>}
                    </span>
                  </div>
                  {c?.error && <p className="mt-2 text-[13px] text-rojo" role="alert">{c.error}</p>}
                  {c?.siguienteTramo && !c.error && (
                    <button type="button" onClick={() => cambiar(clave, l.cantidad + c.siguienteTramo!.faltan)}
                      className="presionable mt-2.5 flex w-full items-center justify-between gap-3 rounded-[12px] bg-verde/10 px-3 py-2 text-left text-[13px] text-verde hover:bg-verde/15">
                      <span>Lleva {c.siguienteTramo.faltan} más y paga <span className="cifra font-semibold">{clp(c.siguienteTramo.precio)}</span> c/u</span>
                      <span aria-hidden className="font-semibold">+{c.siguienteTramo.faltan}</span>
                    </button>
                  )}
                  <button type="button" onClick={() => quitar(clave)} className="mt-2 text-[13px] text-gris hover:text-rojo">Quitar</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Hoja>
  )
}

/**
 * Confirmación al agregar: «Agregado», el total y dos salidas. Es la
 * diferencia medida contra Dune Dragon, que agrega en silencio.
 */
function AvisoAgregado({ linea, onCerrar }: { linea: LineaBolsa | null; onCerrar: () => void }) {
  const { subtotal, unidades } = useBolsa()
  return (
    <Hoja abierta={linea !== null} onCerrar={onCerrar} titulo="Agregado a tu bolsa">
      {linea && (
        <div className="space-y-5 pb-2">
          <div className="flex gap-4">
            <Miniatura src={linea.imagen} />
            <div className="min-w-0">
              <p className="text-[16px] leading-snug font-semibold">{linea.nombre}</p>
              <p className="text-[13px] text-gris">
                {[linea.variante, `${linea.cantidad} ${linea.cantidad === 1 ? 'unidad' : 'unidades'}`].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <div className="flex items-baseline justify-between rounded-[14px] bg-papel-alt px-4 py-3">
            <span className="text-[14px] text-tinta-suave">Tu bolsa · {unidades} {unidades === 1 ? 'unidad' : 'unidades'}</span>
            <span className="cifra text-[18px] font-semibold">{clp(subtotal)}</span>
          </div>
          <div className="grid gap-3 t:grid-cols-2">
            <button type="button" onClick={onCerrar} className="tienda-boton w-full text-tinta ring-1 ring-borde ring-inset hover:ring-gris">Seguir comprando</button>
            <Link href="/comprar" onClick={onCerrar} className="tienda-boton w-full bg-spark text-white hover:bg-spark-hover">Pagar</Link>
          </div>
        </div>
      )}
    </Hoja>
  )
}
