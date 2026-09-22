'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { crearPedidoPublico, cotizarPedido, declararPago, type Resultado } from './acciones'
import type { DatosPago } from '@/lib/configuracion'
import type { LineaCotizada, LineaPedida } from '@/lib/cotizacion'
import { claveLinea, MAX_UNIDADES_LINEA } from '@/lib/carrito'
import { useBolsa } from '@/components/tienda/bolsa'
import { REGIONES } from '@/lib/chile'
import { Selector } from '@/components/selector'
import { clp } from '@/lib/formato'
import { Estrella } from '@/app/marca'

export interface EnvioCompra {
  tarifa: number
  gratisDesde: number | null
  plazo: string | null
  retiro: boolean
  retiroDireccion: string | null
}

const campo =
  'peer w-full rounded-[12px] bg-papel px-4 pt-6 pb-2 text-[16px] text-tinta ring-1 ring-borde transition-shadow ' +
  'placeholder:text-transparent focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
const flotante =
  'pointer-events-none absolute top-2 left-4 text-[12px] text-gris transition-all ' +
  'peer-placeholder-shown:top-4 peer-placeholder-shown:text-[16px] peer-focus:top-2 peer-focus:text-[12px]'

/** Campo con etiqueta flotante: se lee como etiqueta y ocupa lo que un placeholder. */
function Campo({ id, etiqueta, ...rest }: { id: string; etiqueta: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="relative">
      <input id={id} placeholder={etiqueta} className={campo} {...rest} />
      <label htmlFor={id} className={flotante}>{etiqueta}</label>
    </div>
  )
}

/**
 * Ícono de cada forma de entrega.
 *
 * Trazo simple y un solo tamaño: acompaña a la etiqueta para reconocer la
 * opción de un vistazo, sin competir con ella.
 */
function IconoEntrega({ tipo, activo }: { tipo: 'casa' | 'sucursal' | 'mano'; activo: boolean }) {
  const trazos: Record<typeof tipo, string> = {
    casa: 'M3 9.5 11 3l8 6.5M5.5 11v8h11v-8',
    sucursal: 'M4 9h14v10H4V9Zm-1-5h16l1 5H2l1-5Zm5 15v-6h5v6',
    mano: 'M7 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4a5 5 0 0 1-5 5H9l-4-4.5a1.6 1.6 0 0 1 2.2-2.3L9 13',
  }
  return (
    <svg
      viewBox="0 0 22 22"
      aria-hidden
      className={`size-[22px] transition-colors duration-200 ${activo ? 'text-tinta' : 'text-gris'}`}
      fill="none"
    >
      <path d={trazos[tipo]} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Paso({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`paso-${n}`} className="border-t border-borde/70 pt-7 first:border-0 first:pt-0">
      <h2 id={`paso-${n}`} className="mb-4 flex items-center gap-3 text-[21px] font-semibold tracking-tarjeta">
        <span aria-hidden className="grid size-7 place-items-center rounded-full bg-tinta text-[13px] text-white">{n}</span>
        {titulo}
      </h2>
      {children}
    </section>
  )
}

/**
 * Checkout de una o varias líneas.
 *
 * Dos orígenes: la bolsa (lo normal) o «Comprar ahora» desde una ficha, que
 * llega con una sola línea en la URL. En ambos casos cada cambio se vuelve a
 * cotizar en el servidor, y lo que se muestra es exactamente lo que se cobra.
 */
export default function Checkout({
  lineaDirecta,
  envio,
  datosPago,
}: {
  /** «Comprar ahora»: una línea que no pasa por la bolsa. */
  lineaDirecta: LineaPedida | null
  envio: EnvioCompra
  datosPago: DatosPago
}) {
  const bolsa = useBolsa()
  const desdeBolsa = lineaDirecta === null
  const [directa, setDirecta] = useState<LineaPedida | null>(lineaDirecta)

  // Lo pedido: la bolsa o la línea directa. Solo identificadores y cantidades.
  const pedidas: LineaPedida[] = useMemo(
    () => (desdeBolsa ? bolsa.lineas.map((l) => ({ sku: l.sku, varianteId: l.varianteId, cantidad: l.cantidad })) : directa ? [directa] : []),
    [desdeBolsa, bolsa.lineas, directa]
  )

  const [cotizadas, setCotizadas] = useState<LineaCotizada[] | null>(null)
  const [cotizando, setCotizando] = useState(false)
  const turno = useRef(0)
  useEffect(() => {
    if (desdeBolsa && !bolsa.lista) return
    if (pedidas.length === 0) return setCotizadas([])
    const mio = ++turno.current
    setCotizando(true)
    // Espera breve: tocar «+» tres veces seguidas no dispara tres cotizaciones.
    const t = setTimeout(async () => {
      const r = await cotizarPedido(pedidas)
      if (mio !== turno.current) return
      setCotizadas(r.ok ? r.lineas : [])
      setCotizando(false)
    }, 250)
    return () => clearTimeout(t)
  }, [pedidas, desdeBolsa, bolsa.lista])

  const [entrega, setEntrega] = useState<'envio' | 'sucursal' | 'retiro'>('envio')
  const [region, setRegion] = useState('')
  const [metodo, setMetodo] = useState('transferencia')
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState<Extract<Resultado, { ok: true }> | null>(null)
  const [enviando, iniciar] = useTransition()

  const lineas = cotizadas ?? []
  const subtotal = lineas.reduce((a, l) => a + l.subtotal, 0)
  const ahorro = lineas.reduce((a, l) => a + (l.precioBase - l.precio) * l.cantidad, 0)
  const gratis = envio.gratisDesde !== null && subtotal >= envio.gratisDesde
  // El envío va incluido en el precio: no se le cobra al comprador en ninguna
  // de las tres formas de entrega.
  const costoEnvio = 0
  const total = subtotal + costoEnvio
  const faltaParaGratis = 0
  const hayProblemas = lineas.some((l) => l.error)
  const vacio = cotizadas !== null && lineas.length === 0

  function cambiar(l: LineaCotizada, cantidad: number) {
    const n = Math.max(1, Math.min(MAX_UNIDADES_LINEA, cantidad))
    if (desdeBolsa) bolsa.cambiar(claveLinea(l), n)
    else setDirecta((d) => (d ? { ...d, cantidad: n } : d))
  }
  function quitar(l: LineaCotizada) {
    if (desdeBolsa) bolsa.quitar(claveLinea(l))
    else setDirecta(null)
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const datos = new FormData(e.currentTarget)
    datos.set('lineas', JSON.stringify(pedidas))
    iniciar(async () => {
      const r = await crearPedidoPublico(datos)
      if (r.ok) {
        if (desdeBolsa) bolsa.vaciar()
        // Con tarjeta el pago ocurre en Mercado Pago: se sale directo, sin
        // mostrar una confirmación intermedia que nadie leería.
        if (r.checkoutUrl) {
          window.location.href = r.checkoutUrl
          return
        }
        setListo(r)
        window.scrollTo({ top: 0 })
      } else setError(r.error)
    })
  }

  if (listo) return <Confirmacion listo={listo} datosPago={datosPago} metodo={metodo} />

  if (vacio)
    return (
      <div className="py-20 text-center">
        <p className="text-[28px] font-semibold tracking-seccion">Tu bolsa está vacía.</p>
        <Link href="/tienda" className="tienda-boton mt-6 bg-spark text-white hover:bg-spark-hover">Ver la tienda</Link>
      </div>
    )

  const resumen = (
    <div className="rounded-[22px] bg-papel p-5 ring-1 ring-borde/70 t:p-6" aria-busy={cotizando}>
      <h2 className="text-[17px] font-semibold">Resumen</h2>
      <dl className="mt-4 space-y-2 text-[14px]">
        <div className="flex justify-between"><dt className="text-tinta-suave">Productos</dt><dd className="cifra">{clp(subtotal + ahorro)}</dd></div>
        {ahorro > 0 && <div className="flex justify-between text-verde"><dt>Descuento por volumen</dt><dd className="cifra">−{clp(ahorro)}</dd></div>}
        <div className="flex justify-between"><dt className="text-tinta-suave">{entrega === 'envio' ? 'Envío' : 'Retiro'}</dt><dd className="cifra">{costoEnvio === 0 ? 'Gratis' : clp(costoEnvio)}</dd></div>
        <div className="flex justify-between border-t border-borde/70 pt-3 text-[18px] font-semibold"><dt>Total</dt><dd className={`cifra transition-opacity ${cotizando ? 'opacity-50' : ''}`}>{clp(total)}</dd></div>
      </dl>
      {faltaParaGratis > 0 && <p className="mt-3 rounded-[10px] bg-verde/10 px-3 py-2 text-[13px] text-verde">Te faltan {clp(faltaParaGratis)} para el envío gratis.</p>}
    </div>
  )

  return (
    <form onSubmit={enviar} className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12" noValidate>
      <input type="hidden" name="entrega" value={entrega} />
      {/* Trampa para bots: fuera de la vista y del orden de tabulación. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 overflow-hidden">
        <label htmlFor="sitio_web">No completar</label>
        <input id="sitio_web" name="sitio_web" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="min-w-0 space-y-8">
        <Paso n={1} titulo={desdeBolsa ? 'Tu bolsa' : 'Tu pedido'}>
          {cotizadas === null ? (
            <div className="h-24 animate-pulse rounded-[18px] bg-papel" aria-label="Cargando tu pedido" />
          ) : (
            <ul className="divide-y divide-borde/60 rounded-[18px] bg-papel px-4 ring-1 ring-borde/70">
              {lineas.map((l) => (
                <li key={l.clave} className="flex gap-4 py-4">
                  <span className="relative size-[76px] shrink-0 overflow-hidden rounded-[14px] bg-papel-alt">
                    {l.imagen ? <Image src={l.imagen} alt="" fill sizes="76px" className="object-contain p-1.5" /> : <Estrella size={28} className="m-auto mt-6 text-borde" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        {l.slug ? <Link href={`/producto/${l.slug}`} className="text-[15px] leading-snug font-semibold hover:underline">{l.nombre}</Link> : <p className="text-[15px] font-semibold">{l.nombre}</p>}
                        {l.variante && <p className="text-[13px] text-gris">{l.variante}</p>}
                        {l.tramo && <p className="text-[12px] font-semibold text-verde">{l.tramo}</p>}
                      </div>
                      <span className="cifra shrink-0 text-[15px] font-semibold">{clp(l.subtotal)}</span>
                    </div>
                    <div className="mt-2.5 flex items-center gap-4">
                      <div className="flex items-center rounded-full ring-1 ring-borde" role="group" aria-label={`Cantidad de ${l.nombre}`}>
                        <button type="button" onClick={() => cambiar(l, l.cantidad - 1)} disabled={l.cantidad <= 1 || enviando} aria-label="Quitar una unidad" className="grid size-9 place-items-center text-[18px] disabled:opacity-30">−</button>
                        <output aria-live="polite" className="cifra w-6 text-center text-[15px] font-semibold">{l.cantidad}</output>
                        <button type="button" onClick={() => cambiar(l, l.cantidad + 1)} disabled={l.cantidad >= Math.max(1, l.disponible) || enviando} aria-label="Agregar una unidad" className="grid size-9 place-items-center text-[18px] disabled:opacity-30">+</button>
                      </div>
                      <button type="button" onClick={() => quitar(l)} disabled={enviando} className="text-[13px] text-gris hover:text-rojo">Quitar</button>
                    </div>
                    {l.error && <p role="alert" className="mt-2 text-[13px] font-medium text-rojo">{l.error}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {desdeBolsa && <Link href="/tienda" className="mt-3 inline-block text-[14px] text-spark hover:underline">Seguir comprando</Link>}
        </Paso>

        {/* En teléfono el resumen va tras la bolsa: se ve el total antes de escribir. */}
        <div className="lg:hidden">{resumen}</div>

        <Paso n={2} titulo="Tus datos">
          <div className="grid gap-3 t:grid-cols-2">
            <div className="t:col-span-2"><Campo id="nombre" name="nombre" etiqueta="Nombre y apellido" autoComplete="name" required disabled={enviando} /></div>
            <Campo id="fono" name="fono" etiqueta="Teléfono" inputMode="tel" autoComplete="tel" required disabled={enviando} />
            <Campo id="email" name="email" etiqueta="Correo (opcional)" type="email" autoComplete="email" disabled={enviando} />
          </div>
        </Paso>

        <Paso n={3} titulo="Entrega">
          {/* Las tres formas de entrega, y el envío es gratis en todas: se dice
              en cada tarjeta para que nadie tema un cargo escondido al final. */}
          <div role="radiogroup" aria-label="Forma de entrega" className="mb-5 grid gap-2.5 t:grid-cols-3">
            {([
              ['envio', 'Despacho a domicilio', envio.plazo ?? 'Llega a tu puerta', 'casa'],
              ['sucursal', 'Retiro en sucursal', 'Lo buscas cuando puedas', 'sucursal'],
              ...(envio.retiro ? [['retiro', 'Retiro con nosotros', 'Coordinamos contigo', 'mano'] as const] : []),
            ] as const).map(([v, t, n, icono]) => {
              const activo = entrega === v
              return (
                <button
                  key={v}
                  type="button"
                  role="radio"
                  aria-checked={activo}
                  onClick={() => setEntrega(v)}
                  className={[
                    'group relative overflow-hidden rounded-[16px] p-4 text-left transition-all duration-200',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark',
                    activo
                      ? 'bg-papel-alt ring-2 ring-tinta'
                      : 'ring-1 ring-borde hover:-translate-y-px hover:ring-tinta/40',
                  ].join(' ')}
                >
                  <span className="flex items-start justify-between gap-2">
                    <IconoEntrega tipo={icono} activo={activo} />
                    <span
                      aria-hidden
                      className={[
                        'mt-0.5 grid size-[18px] shrink-0 place-items-center rounded-full ring-1 transition-all duration-200',
                        activo ? 'bg-tinta ring-tinta' : 'ring-borde',
                      ].join(' ')}
                    >
                      <svg viewBox="0 0 10 10" className={`size-[7px] text-white transition-opacity duration-200 ${activo ? 'opacity-100' : 'opacity-0'}`} fill="none">
                        <path d="M1.5 5.2 3.8 7.5 8.5 2.8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                  </span>
                  <span className="mt-2.5 block text-[15px] font-semibold">{t}</span>
                  <span className="mt-0.5 block text-[13px] text-tinta-suave">{n}</span>
                  <span className="mt-2 inline-block rounded-full bg-spark/10 px-2 py-0.5 text-[12px] font-semibold text-spark">
                    Gratis
                  </span>
                </button>
              )
            })}
          </div>

          {/* El bloque cambia con la forma de entrega. La transición evita que
              los campos salten de golpe al cambiar de opción. */}
          <div key={entrega} className="entrega-panel">
            {entrega === 'envio' && (
              <div className="grid gap-3 t:grid-cols-2">
                <Selector
                  id="region"
                  name="region"
                  etiqueta="Región"
                  placeholder="Elige tu región"
                  opciones={REGIONES.map((r) => ({ valor: r, etiqueta: r }))}
                  valor={region}
                  alCambiar={setRegion}
                  required
                  disabled={enviando}
                />
                <Campo id="comuna" name="comuna" etiqueta="Comuna" autoComplete="address-level2" required disabled={enviando} />
                <div className="t:col-span-2"><Campo id="direccion" name="direccion" etiqueta="Calle, número y depto." autoComplete="street-address" required disabled={enviando} /></div>
              </div>
            )}

            {entrega === 'sucursal' && (
              <div className="grid gap-3 t:grid-cols-2">
                <Selector
                  id="region"
                  name="region"
                  etiqueta="Región"
                  placeholder="Elige tu región"
                  opciones={REGIONES.map((r) => ({ valor: r, etiqueta: r }))}
                  valor={region}
                  alCambiar={setRegion}
                  required
                  disabled={enviando}
                />
                <Campo id="comuna" name="comuna" etiqueta="Comuna" autoComplete="address-level2" required disabled={enviando} />
                <div className="t:col-span-2">
                  <Campo id="sucursal" name="sucursal" etiqueta="¿En qué sucursal quieres retirar?" required disabled={enviando} />
                </div>
                <p className="t:col-span-2 text-[13px] leading-relaxed text-tinta-suave">
                  Escribe la sucursal que te quede cómoda. Te avisamos apenas tu pedido esté
                  disponible para retirar, y lo guardan varios días.
                </p>
              </div>
            )}

            {entrega === 'retiro' && (
              <p className="rounded-[14px] bg-papel-alt p-4 text-[14px] text-tinta-suave">
                {envio.retiroDireccion ?? 'Coordinamos el retiro por WhatsApp.'}
              </p>
            )}
          </div>
        </Paso>

        <Paso n={4} titulo="Pago">
          <div role="radiogroup" aria-label="Forma de pago" className="grid gap-2.5 t:grid-cols-2">
            {([
              ['transferencia', 'Transferencia', 'Te mostramos los datos al confirmar'],
              ['mercadopago', 'Mercado Pago', 'Tarjeta de crédito, débito o cuotas'],
            ] as const).map(([v, t, n]) => (
              <label key={v} className={`cursor-pointer rounded-[14px] p-4 ring-1 ${metodo === v ? 'ring-2 ring-tinta' : 'ring-borde'}`}>
                <input type="radio" name="metodo_pago" value={v} checked={metodo === v} onChange={() => setMetodo(v)} className="sr-only" />
                <span className="block text-[15px] font-semibold">{t}</span>
                <span className="mt-0.5 block text-[13px] text-gris">{n}</span>
              </label>
            ))}
          </div>
        </Paso>

        {error && <p role="alert" className="rounded-[12px] bg-spark-suave px-4 py-3 text-[14px] text-rojo">{error}</p>}

        <div>
          <button type="submit" disabled={enviando || cotizando || hayProblemas || lineas.length === 0} className="tienda-boton w-full bg-spark !min-h-[56px] !text-[17px] text-white hover:bg-spark-hover disabled:opacity-40">
            {hayProblemas ? 'Revisa tu pedido' : enviando ? 'Reservando tu pedido…' : `Confirmar pedido · ${clp(total)}`}
          </button>
          <p className="mt-3 text-center text-[13px] leading-relaxed text-gris">No se cobra nada todavía: reservamos tus unidades y te indicamos cómo pagar.</p>
        </div>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-20">{resumen}</div>
      </aside>
    </form>
  )
}

/**
 * Un dato de la transferencia, con su botón de copiar.
 *
 * En un teléfono, teclear un número de cuenta de diez dígitos mirando la
 * pantalla es la fricción más alta de toda la compra, y donde se cometen los
 * errores caros: una cifra mal y el dinero se va a otra parte. El botón copia
 * el valor CRUDO, sin puntos ni signos, que es lo que pide la app del banco.
 */
function DatoCopiable({ rotulo, valor, crudo }: { rotulo: string; valor: string; crudo?: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(crudo ?? valor)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 1800)
    } catch {
      // Sin permiso de portapapeles el dato igual está a la vista: no se
      // interrumpe al usuario con un error por algo que puede resolver leyendo.
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-borde/50 py-1 last:border-0">
      <dt className="shrink-0 text-[13px] text-gris">{rotulo}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className="cifra truncate text-[15px] font-medium">{valor}</span>
        <button
          type="button"
          onClick={copiar}
          aria-label={copiado ? `${rotulo} copiado` : `Copiar ${rotulo.toLowerCase()}`}
          className="presionable inline-flex min-h-11 shrink-0 items-center rounded-full px-2.5 text-[12px] font-medium text-spark hover:bg-spark-suave"
        >
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </dd>
    </div>
  )
}

/**
 * «Ya transferí»: el comprador avisa, el equipo confirma.
 *
 * Pide el correo o teléfono del pedido porque esta acción es pública: sin ese
 * dato, cualquiera podría recorrer números de pedido marcándolos y llenar de
 * ruido la cola de trabajo. Con él, solo lo marca quien hizo la compra.
 */
function AvisoDeTransferencia({ numero }: { numero: number }) {
  const [abierto, setAbierto] = useState(false)
  const [listo, setListo] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (listo) {
    return (
      <p role="status" className="mt-3 rounded-[12px] bg-verde/10 px-3 py-2.5 text-[14px] text-verde">
        Gracias, lo anotamos. Revisamos tu transferencia y te confirmamos.
      </p>
    )
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="presionable mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-papel-alt px-4 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-borde/40"
      >
        Ya transferí
      </button>
    )
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        setError(null)
        setEnviando(true)
        const datos = new FormData(e.currentTarget)
        datos.set('numero', String(numero))
        const r = await declararPago(datos)
        setEnviando(false)
        if (r.ok) setListo(true)
        else setError(r.error)
      }}
      className="mt-3 rounded-[12px] bg-papel-alt p-3 text-left"
    >
      <label htmlFor="av-contacto" className="mb-1 block text-[12px] font-medium text-gris">
        Tu correo o teléfono del pedido
      </label>
      <input
        id="av-contacto"
        name="contacto"
        required
        autoComplete="email"
        className="min-h-11 w-full rounded-[10px] bg-papel px-3 text-[15px] ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none"
      />
      <label htmlFor="av-ref" className="mt-2 mb-1 block text-[12px] font-medium text-gris">
        N.º de transferencia <span className="font-normal">(opcional)</span>
      </label>
      <input
        id="av-ref"
        name="referencia"
        inputMode="numeric"
        className="min-h-11 w-full rounded-[10px] bg-papel px-3 text-[15px] ring-1 ring-borde focus:ring-2 focus:ring-spark focus:outline-none"
      />
      {error && <p role="alert" className="mt-2 text-[13px] text-rojo">{error}</p>}
      <button
        type="submit"
        disabled={enviando}
        className="presionable mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-tinta px-4 text-[14px] font-medium text-papel disabled:opacity-60"
      >
        {enviando ? 'Enviando…' : 'Avisar que transferí'}
      </button>
    </form>
  )
}

function Confirmacion({ listo, datosPago, metodo }: { listo: Extract<Resultado, { ok: true }>; datosPago: DatosPago; metodo: string }) {
  const [copiadoTodo, setCopiadoTodo] = useState(false)
  // Sin WhatsApp configurado la URL quedaría apuntando a la nada: mejor ofrecer
  // el correo que un botón que lleva a un error.
  const hayWhatsapp = Boolean(listo.whatsapp) && !listo.whatsapp.includes('/null')

  const bloque = [
    `Pedido #${listo.numero}`,
    `Monto: ${listo.total}`,
    `Banco: ${datosPago.banco}`,
    `Tipo: ${datosPago.tipo}`,
    `Cuenta: ${datosPago.numero}`,
    `RUT: ${datosPago.rut}`,
    `Titular: ${datosPago.titular}`,
    `Correo: ${datosPago.email}`,
  ].join('\n')

  async function copiarTodo() {
    try {
      await navigator.clipboard.writeText(bloque)
      setCopiadoTodo(true)
      setTimeout(() => setCopiadoTodo(false), 2200)
    } catch {
      /* los datos siguen a la vista */
    }
  }

  return (
    <div className="mx-auto max-w-[560px] text-center">
      <span aria-hidden className="mx-auto grid size-16 place-items-center rounded-full bg-verde/12 text-verde">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5 9-10" /></svg>
      </span>
      <h1 className="mt-5 text-[32px] leading-tight font-semibold tracking-seccion t:text-[40px]">¡Pedido reservado!</h1>
      <p className="mt-2 text-[17px] text-tinta-suave">
        Tu número es <strong className="cifra text-tinta">#{listo.numero}</strong> · total <strong className="cifra text-tinta">{clp(listo.total)}</strong>
      </p>
      {/* Plazo con consecuencia dicha: da urgencia honesta y explica por qué un
          pedido puede caerse. Sin esto el comprador asume que lo esperan siempre. */}
      <p className="mt-1 text-[14px] text-gris">Reservamos tus unidades por 24 horas.</p>

      <ol className="mt-8 space-y-3 text-left">
        <li className="rounded-[18px] bg-papel p-5 ring-1 ring-borde/70">
          <p className="text-[15px] font-semibold">1. {metodo === 'transferencia' ? 'Transfiere el total' : 'Te enviamos el link de pago'}</p>
          {metodo === 'transferencia' ? (
            <>
              <dl className="mt-3">
                <DatoCopiable rotulo="Monto" valor={clp(listo.total)} crudo={String(listo.total)} />
                <DatoCopiable rotulo="Cuenta" valor={datosPago.numero} crudo={datosPago.numero.replace(/\D/g, '')} />
                <DatoCopiable rotulo="RUT" valor={datosPago.rut} crudo={datosPago.rut.replace(/\./g, '')} />
                <div className="flex items-center justify-between gap-3 border-b border-borde/50 py-1">
                  <dt className="shrink-0 text-[13px] text-gris">Banco</dt>
                  <dd className="truncate text-[15px] font-medium">{datosPago.banco} · {datosPago.tipo}</dd>
                </div>
                <div className="flex items-center justify-between gap-3 py-1">
                  <dt className="shrink-0 text-[13px] text-gris">Titular</dt>
                  <dd className="truncate text-[15px] font-medium">{datosPago.titular}</dd>
                </div>
              </dl>

              <button
                type="button"
                onClick={copiarTodo}
                className="presionable mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-papel-alt px-4 text-[14px] font-medium text-tinta ring-1 ring-borde hover:bg-borde/40"
              >
                {copiadoTodo ? 'Datos copiados' : 'Copiar todos los datos'}
              </button>

              {/* El número en el comentario es lo que después permite saber quién
                  pagó en segundos, en vez de cruzar montos y nombres a mano. */}
              <p className="mt-3 rounded-[12px] bg-spark-suave px-3 py-2.5 text-[14px] text-tinta">
                Importante: escribe <strong className="cifra">#{listo.numero}</strong> en el comentario de la transferencia.
              </p>
            </>
          ) : (
            <p className="mt-1 text-[14px] text-tinta-suave">Por WhatsApp, apenas nos escribas.</p>
          )}
        </li>
        <li className="rounded-[18px] bg-papel p-5 ring-1 ring-borde/70">
          <p className="text-[15px] font-semibold">2. Avísanos que transferiste</p>
          <p className="mt-1 text-[14px] text-tinta-suave">
            {hayWhatsapp
              ? 'Con tu número de pedido confirmamos el pago y coordinamos la entrega.'
              : `Escríbenos a ${datosPago.email} con tu número de pedido y te confirmamos.`}
          </p>
          <AvisoDeTransferencia numero={listo.numero} />
        </li>
      </ol>

      {hayWhatsapp ? (
        <a href={listo.whatsapp} target="_blank" rel="noopener noreferrer" className="tienda-boton mt-8 w-full bg-spark !min-h-[56px] !text-[17px] text-white hover:bg-spark-hover">
          Abrir WhatsApp con mi pedido
        </a>
      ) : (
        <a href={`mailto:${datosPago.email}?subject=Pedido%20%23${listo.numero}`} className="tienda-boton mt-8 w-full bg-spark !min-h-[56px] !text-[17px] text-white hover:bg-spark-hover">
          Escribirnos por correo
        </a>
      )}
      <Link href="/" className="mt-4 inline-block text-[15px] text-spark hover:underline">Seguir comprando</Link>
    </div>
  )
}

