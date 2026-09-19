'use client'

import { useRef, useState, useTransition } from 'react'
import { Selector } from '@/components/selector'
import { registrarMovimiento } from './acciones'

const CATEGORIAS = {
  ingreso: ['Venta', 'Venta mayorista', 'Devolución de proveedor', 'Otro ingreso'],
  egreso: ['Compra de stock', 'Importación', 'Envíos', 'Publicidad', 'Comisiones', 'Otro gasto'],
} as const

const METODOS = [
  { v: 'transferencia', t: 'Transferencia' },
  { v: 'efectivo', t: 'Efectivo' },
  { v: 'tarjeta', t: 'Tarjeta' },
  { v: 'mercadopago', t: 'Mercado Pago' },
  { v: 'otro', t: 'Otro' },
]

const campo =
  'w-full min-h-11 rounded-[10px] bg-papel px-3.5 py-2.5 text-[15px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'

export default function FormularioMovimiento() {
  const form = useRef<HTMLFormElement>(null)
  const [tipo, setTipo] = useState<'ingreso' | 'egreso'>('egreso')
  const [categoria, setCategoria] = useState('')
  const [metodoPago, setMetodoPago] = useState('')
  const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [listo, setListo] = useState(false)
  const [enviando, iniciar] = useTransition()

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setListo(false)
    const datos = new FormData(e.currentTarget)
    iniciar(async () => {
      const r = await registrarMovimiento(datos)
      if (r.ok) {
        form.current?.reset()
        setNombreArchivo(null)
        setListo(true)
        setTimeout(() => setListo(false), 2600)
      } else {
        setError(r.error)
      }
    })
  }

  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <form
      ref={form}
      onSubmit={enviar}
      className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70"
    >
      <h2 className="mb-4 text-[15px] font-semibold">Registrar movimiento</h2>

      {/* Ingreso / egreso: dos botones, no un select. Es la decisión más
          frecuente del formulario y merece ser de un solo toque. */}
      <div
        role="radiogroup"
        aria-label="Tipo de movimiento"
        className="mb-4 grid grid-cols-2 gap-2"
      >
        {(['ingreso', 'egreso'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={tipo === t}
            onClick={() => { setTipo(t); setCategoria('') }}
            className={`min-h-11 rounded-[10px] text-[14px] font-medium transition-colors ${
              tipo === t
                ? t === 'ingreso'
                  ? 'bg-verde text-white'
                  : 'bg-tinta text-white'
                : 'bg-papel-alt text-tinta-suave hover:bg-borde/40'
            }`}
          >
            {t === 'ingreso' ? 'Ingreso' : 'Egreso'}
          </button>
        ))}
      </div>
      <input type="hidden" name="tipo" value={tipo} />

      <div className="space-y-2.5">
        <div>
          <label htmlFor="monto" className="sr-only">Monto en pesos</label>
          <input
            id="monto"
            name="monto_clp"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            required
            placeholder="Monto en pesos"
            disabled={enviando}
            className={`${campo} cifra text-[18px] font-medium`}
          />
        </div>

        <div>
          <label htmlFor="descripcion" className="sr-only">Descripción</label>
          <input
            id="descripcion"
            name="descripcion"
            required
            maxLength={140}
            placeholder="Descripción"
            disabled={enviando}
            className={campo}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Selector
            id="categoria"
            name="categoria"
            etiqueta="Categoría"
            placeholder="Elige una"
            opciones={CATEGORIAS[tipo].map((c) => ({ valor: c, etiqueta: c }))}
            valor={categoria}
            alCambiar={setCategoria}
            required
            disabled={enviando}
          />
          <Selector
            id="metodo"
            name="metodo_pago"
            etiqueta="Método de pago"
            placeholder="Sin especificar"
            opciones={METODOS.map((m) => ({ valor: m.v, etiqueta: m.t }))}
            valor={metodoPago}
            alCambiar={setMetodoPago}
            disabled={enviando}
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label htmlFor="fecha" className="sr-only">Fecha</label>
            <input
              id="fecha"
              name="fecha"
              type="date"
              required
              defaultValue={hoy}
              max={hoy}
              disabled={enviando}
              className={campo}
            />
          </div>
          <div>
            <label htmlFor="contraparte" className="sr-only">Cliente o proveedor</label>
            <input
              id="contraparte"
              name="contraparte"
              maxLength={90}
              placeholder="Cliente o proveedor"
              disabled={enviando}
              className={campo}
            />
          </div>
        </div>

        {/* Comprobante: el input nativo muestra "Sin archivos seleccionados" en
            inglés según el navegador y no se puede estilar. Se oculta y se usa
            el label como control. */}
        <div>
          <input
            id="voucher"
            name="voucher"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
            disabled={enviando}
            onChange={(e) => setNombreArchivo(e.target.files?.[0]?.name ?? null)}
            className="peer sr-only"
          />
          <label
            htmlFor="voucher"
            className="flex min-h-11 cursor-pointer items-center justify-between rounded-[10px] bg-papel-alt px-3.5
                       text-[14px] text-tinta-suave transition-colors hover:bg-borde/40
                       peer-focus-visible:ring-2 peer-focus-visible:ring-spark"
          >
            <span className="truncate">{nombreArchivo ?? 'Adjuntar comprobante'}</span>
            <span aria-hidden className="ml-3 shrink-0 text-gris">
              {nombreArchivo ? 'Cambiar' : 'JPG · PNG · PDF'}
            </span>
          </label>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-[13px] text-rojo">{error}</p>
      )}
      {listo && (
        <p role="status" className="mt-3 text-[13px] text-verde">Movimiento registrado.</p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="mt-4 min-h-11 w-full rounded-full bg-spark px-5 text-[15px] font-medium text-white
                   transition-colors hover:bg-spark-hover disabled:opacity-40"
      >
        {enviando ? 'Guardando…' : 'Guardar'}
      </button>
    </form>
  )
}
