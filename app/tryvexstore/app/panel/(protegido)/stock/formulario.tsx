'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { Selector } from '@/components/selector'
import { registrarStock, precioParaCantidad } from './acciones'
import { clp } from '@/lib/formato'
import type { ProductoConVariantes } from '@/lib/variantes-cliente'

const MOTIVOS = [
  { v: 'ingreso', t: 'Ingreso', ayuda: 'Llegó mercadería que compramos', signo: '+' },
  { v: 'venta', t: 'Venta', ayuda: 'Salió vendida', signo: '−' },
  { v: 'devolucion', t: 'Devolución', ayuda: 'El cliente la devolvió y vuelve a entrar', signo: '+' },
  { v: 'merma', t: 'Merma', ayuda: 'Rota, perdida o inservible', signo: '−' },
  { v: 'regalo', t: 'Regalo', ayuda: 'Muestra, obsequio o influencer', signo: '−' },
  { v: 'uso_interno', t: 'Uso interno', ayuda: 'Se la quedó alguien del equipo', signo: '−' },
  { v: 'ajuste', t: 'Ajuste', ayuda: 'Corrección de conteo. Acepta negativo', signo: '±' },
]

/** Los que además mueven dinero. */
const CON_VALOR = ['venta', 'devolucion']

const campo =
  'w-full min-h-11 rounded-[10px] bg-papel px-3.5 py-2.5 text-[15px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

export default function FormularioStock({
  productos,
}: {
  productos: ProductoConVariantes[]
}) {
  const form = useRef<HTMLFormElement>(null)
  const [tipo, setTipo] = useState('ingreso')
  const [producto, setProducto] = useState(productos[0]?.id ?? '')
  const [variante, setVariante] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [precio, setPrecio] = useState('')
  const [tramo, setTramo] = useState<string | null>(null)
  const [sugerido, setSugerido] = useState<number | null>(null)
  const [tocoPrecio, setTocoPrecio] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error' | 'aviso'; texto: string } | null>(null)
  const [enviando, iniciar] = useTransition()

  const actual = MOTIVOS.find((m) => m.v === tipo)!
  const variantesDe = productos.find((p) => p.id === producto)?.variantes ?? []
  const mueveDinero = CON_VALOR.includes(tipo)
  const unidades = Math.abs(Number(cantidad) || 0)

  // Sugerir el precio del tramo. Si el usuario ya escribió uno a mano, no se
  // pisa: puede estar haciendo un precio especial a propósito.
  useEffect(() => {
    if (!mueveDinero || !producto || unidades < 1 || tocoPrecio) return
    let vigente = true
    precioParaCantidad(producto, unidades).then((r) => {
      if (!vigente || !r) return
      setSugerido(r.precio)
      setTramo(r.etiqueta)
      if (!tocoPrecio) setPrecio(String(r.precio))
    })
    return () => { vigente = false }
  }, [mueveDinero, producto, unidades, tocoPrecio])

  const total = mueveDinero && unidades > 0 && Number(precio) > 0 ? unidades * Number(precio) : 0
  const costo = Number(productos.find((p) => p.id === producto)?.costo_unitario ?? 0)
  const bajoCosto = costo > 0 && Number(precio) > 0 && Number(precio) < costo
  const ganancia = costo > 0 ? (Number(precio) - costo) * unidades : 0

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const datos = new FormData(e.currentTarget)
    iniciar(async () => {
      const r = await registrarStock(datos)
      if (r.ok) {
        form.current?.reset()
        setCantidad(''); setVariante(''); setPrecio(''); setTramo(null); setTocoPrecio(false)
        setMsg({ tipo: r.aviso ? 'aviso' : 'ok', texto: r.aviso ?? 'Movimiento registrado.' })
        setTimeout(() => setMsg(null), r.aviso ? 7000 : 2600)
      } else {
        setMsg({ tipo: 'error', texto: r.error })
      }
    })
  }

  return (
    <form
      ref={form}
      onSubmit={enviar}
      className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70"
    >
      <h2 className="mb-4 text-[15px] font-semibold">Registrar movimiento</h2>

      <div role="radiogroup" aria-label="Motivo" className="mb-1 flex flex-wrap gap-1.5">
        {MOTIVOS.map((m) => (
          <button
            key={m.v}
            type="button"
            role="radio"
            aria-checked={tipo === m.v}
            onClick={() => { setTipo(m.v); setTocoPrecio(false) }}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-[14px] font-medium transition-colors ${
              tipo === m.v ? 'bg-tinta text-white' : 'bg-papel-alt text-tinta-suave hover:bg-borde/40'
            }`}
          >
            {m.t}
          </button>
        ))}
      </div>
      <p className="mb-4 text-[12px] text-gris">
        <span aria-hidden className="mr-1 font-medium">{actual.signo}</span>
        {actual.ayuda}
      </p>
      <input type="hidden" name="tipo" value={tipo} />

      <div className="space-y-2.5">
        <Selector
          id="producto"
          name="producto_id"
          etiqueta="Producto"
          placeholder="Elige el producto"
          opciones={productos.map((p) => ({ valor: p.id, etiqueta: p.nombre }))}
          valor={producto}
          alCambiar={(v) => { setProducto(v); setVariante('') }}
          required
          disabled={enviando}
        />

        {variantesDe.length > 0 && (
          <Selector
            id="variante-stock"
            name="variante_id"
            etiqueta="Variante"
            placeholder="Elige la variante"
            opciones={variantesDe.map((v) => ({ valor: v.id, etiqueta: `${v.nombre} · ${v.stock} u.` }))}
            valor={variante}
            alCambiar={setVariante}
            required
            disabled={enviando}
          />
        )}

        <div>
          <label htmlFor="cantidad" className="sr-only">Cantidad</label>
          <input
            id="cantidad" name="cantidad" type="number" step="1" required
            value={cantidad} onChange={(e) => setCantidad(e.target.value)}
            placeholder={tipo === 'ajuste' ? 'Cantidad (+ o −)' : 'Cantidad'}
            disabled={enviando} className={`${campo} cifra text-[18px] font-medium`}
          />
        </div>

        {mueveDinero && (
          <>
            <div>
              <label htmlFor="precio" className="mb-1 block px-1 text-[12px] font-medium text-gris">
                Precio unitario — tú decides
              </label>
              <input
                id="precio" name="precio_unitario" type="number" min="0"
                value={precio}
                onChange={(e) => { setPrecio(e.target.value); setTocoPrecio(true) }}
                placeholder="Precio unitario"
                disabled={enviando} className={`${campo} cifra`}
              />

              {/* El tramo es referencia, no obligacion: se ofrece, no se impone. */}
              {sugerido != null && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2 px-1">
                  <span className="text-[12px] text-gris">
                    {tramo} sugiere {clp(sugerido)}
                  </span>
                  {Number(precio) !== sugerido && (
                    <button
                      type="button"
                      onClick={() => { setPrecio(String(sugerido)); setTocoPrecio(false) }}
                      className="rounded-full bg-papel-alt px-2.5 py-0.5 text-[12px] text-tinta
                                 transition-colors hover:bg-borde/50"
                    >
                      Aplicar
                    </button>
                  )}
                  {Number(precio) > 0 && Number(precio) !== sugerido && (
                    <span className="text-[12px] font-medium text-ambar">Precio negociado</span>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="contraparte" className="sr-only">Cliente</label>
              <input
                id="contraparte" name="contraparte" maxLength={90}
                placeholder="Cliente (opcional)" disabled={enviando} className={campo}
              />
            </div>

            {total > 0 && (
              <div className={`rounded-[10px] px-3.5 py-2.5 text-[14px] ${
                bajoCosto ? 'bg-spark-suave' : 'bg-papel-alt'
              }`}>
                <p className="text-tinta-suave">
                  Total: <strong className="cifra text-tinta">{clp(total)}</strong>
                  <span className="text-gris"> · {unidades} × {clp(Number(precio))}</span>
                </p>
                {costo > 0 && (
                  <p className={`mt-1 text-[13px] ${bajoCosto ? 'text-rojo' : 'text-gris'}`}>
                    {bajoCosto
                      ? `Estás vendiendo bajo el costo de ${clp(costo)}. Pierdes ${clp((costo - Number(precio)) * unidades)}.`
                      : `Ganancia: ${clp(ganancia)} · ${Math.round((ganancia / total) * 100)}% del total`}
                  </p>
                )}
              </div>
            )}
          </>
        )}

        <div>
          <label htmlFor="motivo" className="sr-only">Nota</label>
          <input
            id="motivo" name="motivo" maxLength={140}
            placeholder="Nota (opcional)" disabled={enviando} className={campo}
          />
        </div>
      </div>

      {msg && (
        <p
          role={msg.tipo === 'error' ? 'alert' : 'status'}
          className={`mt-3 text-[13px] ${
            msg.tipo === 'error' ? 'text-rojo' : msg.tipo === 'aviso' ? 'text-ambar' : 'text-verde'
          }`}
        >
          {msg.texto}
        </p>
      )}

      <button
        type="submit" disabled={enviando}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-full bg-spark px-5 text-[15px] font-medium text-white
                   transition-colors hover:bg-spark-hover disabled:opacity-40"
      >
        {enviando ? 'Guardando…' : mueveDinero && total > 0 ? `Guardar y anotar ${clp(total)}` : 'Guardar'}
      </button>

      {mueveDinero && (
        <p className="mt-2.5 text-center text-[12px] text-gris">
          El tramo es una referencia. El precio final lo pones tú.
        </p>
      )}
    </form>
  )
}
