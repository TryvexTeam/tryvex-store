'use client'

import { useState, useTransition } from 'react'
import { Selector } from '@/components/selector'
import { cambiarEstado, crearPedido, crearVentaRapida } from './acciones'
import { precioParaCantidad } from '../stock/acciones'
import { clp } from '@/lib/formato'
import type { ProductoConVariantes } from '@/lib/variantes-cliente'

const ROTULO: Record<string, string> = {
  pendiente: 'Pendiente',
  pagado: 'Pagado',
  preparando: 'Preparando',
  enviado: 'Enviado',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const SIGUIENTE: Record<string, string[]> = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['preparando', 'enviado', 'cancelado'],
  preparando: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
}

export function Estado({ estado }: { estado: string }) {
  const estilo =
    estado === 'entregado' ? 'bg-verde/10 text-verde'
    : estado === 'cancelado' ? 'bg-papel-alt text-gris line-through'
    : estado === 'pendiente' ? 'bg-spark-suave text-ambar'
    : 'bg-tinta text-white'

  return (
    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-medium ${estilo}`}>
      {ROTULO[estado] ?? estado}
    </span>
  )
}

export function Acciones({ id, estado }: { id: string; estado: string }) {
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [trabajando, iniciar] = useTransition()

  const opciones = SIGUIENTE[estado] ?? []
  if (!opciones.length) return null

  function mover(nuevo: string) {
    if (nuevo === 'cancelado' && !confirm('¿Cancelar el pedido? El stock vuelve a bodega.')) return
    setError(null); setAviso(null)
    iniciar(async () => {
      const r = await cambiarEstado(id, nuevo)
      if (!r.ok) setError(r.error)
      else if (r.aviso) setAviso(r.aviso)
    })
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {opciones.map((o) => (
          <button
            key={o}
            onClick={() => mover(o)}
            disabled={trabajando}
            className={`inline-flex min-h-11 items-center rounded-full px-4 text-[13px] font-medium transition-colors disabled:opacity-40 ${
              o === 'cancelado'
                ? 'text-gris hover:bg-spark-suave hover:text-rojo'
                : 'bg-tinta text-white hover:opacity-85'
            }`}
          >
            {o === 'pagado' ? 'Marcar pagado' : ROTULO[o]}
          </button>
        ))}
      </div>
      {error && <p role="alert" className="text-right text-[12px] text-rojo">{error}</p>}
      {aviso && <p role="status" className="max-w-xs text-right text-[12px] text-ambar">{aviso}</p>}
    </div>
  )
}

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

export function NuevoPedido({
  productos,
  stock,
  modoRapido = false,
}: {
  productos: ProductoConVariantes[]
  stock: number
  /** Venta presencial: abre el formulario y precarga canal y efectivo. */
  modoRapido?: boolean
}) {
  const [abierto, setAbierto] = useState(modoRapido)
  const [producto, setProducto] = useState(productos[0]?.id ?? '')
  const [variante, setVariante] = useState('')
  const [canal, setCanal] = useState(modoRapido ? 'presencial' : 'whatsapp')
  const [metodoPago, setMetodoPago] = useState(modoRapido ? 'efectivo' : '')
  const [cantidad, setCantidad] = useState('1')
  const [precio, setPrecio] = useState('')
  const [envio, setEnvio] = useState('')
  const [tramo, setTramo] = useState<string | null>(null)
  const [tocoPrecio, setTocoPrecio] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null)
  const [enviando, iniciar] = useTransition()

  const variantesDe = productos.find((p) => p.id === producto)?.variantes ?? []
  const unidades = Math.max(0, Number(cantidad) || 0)
  const total = unidades * (Number(precio) || 0) + (Number(envio) || 0)
  const costo = Number(productos.find((p) => p.id === producto)?.costo_unitario ?? 0)
  const ganancia = costo > 0 ? (Number(precio) - costo) * unidades : 0

  // Igual que en Stock: el tramo sugiere, el vendedor decide.
  async function sugerir(u: number) {
    if (!producto || u < 1 || tocoPrecio) return
    const r = await precioParaCantidad(producto, u)
    if (r) { setPrecio(String(r.precio)); setTramo(r.etiqueta) }
  }

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setMsg(null)
    const datos = new FormData(e.currentTarget)
    const form = e.currentTarget
    iniciar(async () => {
      const r = await (modoRapido ? crearVentaRapida(datos) : crearPedido(datos))
      if (r.ok) {
        form.reset()
        setCantidad('1'); setVariante(''); setPrecio(''); setEnvio(''); setTramo(null); setTocoPrecio(false)
        if (modoRapido) { setCanal('presencial'); setMetodoPago('efectivo') }
        setMsg({ tipo: 'ok', texto: r.aviso ?? (modoRapido ? 'Venta cobrada y stock descontado.' : 'Pedido creado y stock reservado.') })
        setTimeout(() => { setMsg(null); if (!modoRapido) setAbierto(false) }, 2200)
      } else {
        setMsg({ tipo: 'error', texto: r.error })
      }
    })
  }

  if (!abierto) {
    return (
      <button
        onClick={() => setAbierto(true)}
        className="inline-flex min-h-11 items-center rounded-full bg-spark px-5 text-[14px] font-medium text-white
                   transition-colors hover:bg-spark-hover"
      >
        Nuevo pedido
      </button>
    )
  }

  return (
    <form
      onSubmit={enviar}
      className="w-full rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold">{modoRapido ? 'Venta rápida presencial' : 'Nuevo pedido'}</h2>
        <button type="button" onClick={() => setAbierto(false)}
                className="text-[13px] text-gris hover:text-tinta">Cerrar</button>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-2">
        <input name="cliente_nombre" required placeholder="Nombre del cliente"
               disabled={enviando} className={campo} aria-label="Nombre del cliente" />
        <input name="cliente_fono" placeholder="Teléfono" inputMode="tel"
               disabled={enviando} className={campo} aria-label="Teléfono" />
        <input name="cliente_email" type="email" placeholder="Correo (opcional)"
               disabled={enviando} className={campo} aria-label="Correo" />
        <Selector
          name="canal"
          etiqueta="Canal"
          opciones={[
            { valor: 'whatsapp', etiqueta: 'WhatsApp' },
            { valor: 'web', etiqueta: 'Web' },
            { valor: 'presencial', etiqueta: 'Presencial' },
            { valor: 'mayorista', etiqueta: 'Mayorista' },
          ]}
          valor={canal}
          alCambiar={setCanal}
          disabled={enviando}
        />

        <Selector
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
          <div className="sm:col-span-2">
            <Selector
              id="variante-pedido"
              name="variante_id"
              etiqueta="Variante"
              placeholder="Elige la variante"
              opciones={variantesDe.map((v) => ({ valor: v.id, etiqueta: `${v.nombre} · ${v.stock} u.` }))}
              valor={variante}
              alCambiar={setVariante}
              required
              disabled={enviando}
            />
          </div>
        )}

        <input
          name="cantidad" type="number" min="1" max={stock} required
          value={cantidad}
          onChange={(e) => { setCantidad(e.target.value); sugerir(Number(e.target.value)) }}
          placeholder="Cantidad" disabled={enviando}
          className={`${campo} cifra`} aria-label="Cantidad"
        />

        <div>
          <input
            name="precio_unitario" type="text" inputMode="numeric" required
            value={precio}
            onChange={(e) => { setPrecio(e.target.value); setTocoPrecio(true) }}
            placeholder="Precio unitario" disabled={enviando}
            className={`${campo} cifra`} aria-label="Precio unitario"
          />
          {tramo && (
            <p className="mt-1 px-1 text-[12px] text-gris">
              {tramo} sugiere este precio. Puedes cambiarlo.
            </p>
          )}
        </div>

        <input
          name="envio_clp" type="text" inputMode="numeric" value={envio}
          onChange={(e) => setEnvio(e.target.value)}
          placeholder="Envío (opcional)" disabled={enviando}
          className={`${campo} cifra`} aria-label="Costo de envío"
        />

        <Selector
          name="metodo_pago"
          etiqueta="Método de pago"
          placeholder="Sin especificar"
          opciones={[
            { valor: 'transferencia', etiqueta: 'Transferencia' },
            { valor: 'mercadopago', etiqueta: 'Mercado Pago' },
            { valor: 'flow', etiqueta: 'Flow' },
            { valor: 'efectivo', etiqueta: 'Efectivo' },
          ]}
          valor={metodoPago}
          alCambiar={setMetodoPago}
          disabled={enviando}
        />

        <input name="notas" maxLength={200} placeholder="Notas (opcional)"
               disabled={enviando} className={campo} aria-label="Notas" />
      </div>

      {total > 0 && (
        <p className="mt-3 rounded-[10px] bg-papel-alt px-3.5 py-2.5 text-[14px] text-tinta-suave">
          Total: <strong className="cifra text-tinta">{clp(total)}</strong>
          {costo > 0 && unidades > 0 && (
            <span className="text-gris"> · ganancia {clp(ganancia)}</span>
          )}
        </p>
      )}

      {msg && (
        <p role={msg.tipo === 'error' ? 'alert' : 'status'}
           className={`mt-3 text-[13px] ${msg.tipo === 'error' ? 'text-rojo' : 'text-verde'}`}>
          {msg.texto}
        </p>
      )}

      <button type="submit" disabled={enviando || stock < 1}
              className="mt-4 w-full rounded-full bg-spark px-5 py-2.5 text-[14px] font-medium text-white
                         transition-colors hover:bg-spark-hover disabled:opacity-40">
        {enviando ? 'Creando…' : 'Crear y reservar stock'}
      </button>
      <p className="mt-2 text-center text-[12px] text-gris">
        Las unidades quedan reservadas hasta que se pague o se cancele.
      </p>
    </form>
  )
}
