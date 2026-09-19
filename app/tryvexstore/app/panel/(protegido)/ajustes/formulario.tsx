'use client'

import { useTransition } from 'react'
import { Casilla } from '@/components/casilla'
import type { ConfiguracionTienda } from '@/lib/configuracion'
import { useAvisos } from '@/components/avisos'
import { guardarConfiguracion } from './acciones'

const campo =
  'w-full rounded-[10px] bg-papel px-3.5 py-2.5 text-[14px] text-tinta ring-1 ring-borde ' +
  'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
const rotulo = 'mb-1 block text-[12px] font-medium text-gris'

type Campo = {
  nombre: keyof ConfiguracionTienda
  etiqueta: string
  tipo?: 'text' | 'email' | 'number' | 'tel'
  ayuda?: string
  largo?: boolean
}

/** Secciones en el orden en que el comprador se encuentra cada cosa. */
const SECCIONES: { titulo: string; bajada: string; campos: Campo[] }[] = [
  {
    titulo: 'Tienda',
    bajada: 'Cómo se presenta y por dónde la contactan.',
    campos: [
      { nombre: 'nombre_tienda', etiqueta: 'Nombre' },
      { nombre: 'email_contacto', etiqueta: 'Correo de contacto', tipo: 'email' },
      { nombre: 'whatsapp', etiqueta: 'WhatsApp', tipo: 'tel', ayuda: 'Con código de país: 56912345678' },
    ],
  },
  {
    titulo: 'Transferencia',
    bajada: 'Aparece en la confirmación de cada pedido. Revísala dos veces.',
    campos: [
      { nombre: 'banco', etiqueta: 'Banco' },
      { nombre: 'tipo_cuenta', etiqueta: 'Tipo de cuenta' },
      { nombre: 'numero_cuenta', etiqueta: 'Número de cuenta' },
      { nombre: 'rut', etiqueta: 'RUT', ayuda: '76.123.456-7' },
      { nombre: 'titular', etiqueta: 'Titular' },
      { nombre: 'email_pagos', etiqueta: 'Correo para comprobantes', tipo: 'email' },
    ],
  },
  {
    titulo: 'Envío',
    bajada: 'Tarifa plana mientras no haya cotización por courier.',
    campos: [
      { nombre: 'envio_tarifa_clp', etiqueta: 'Tarifa (CLP)', tipo: 'number' },
      { nombre: 'envio_gratis_desde_clp', etiqueta: 'Gratis desde (CLP)', tipo: 'number', ayuda: 'Vacío = nunca gratis' },
      { nombre: 'envio_plazo_texto', etiqueta: 'Plazo', ayuda: 'Ej.: 2 a 4 días hábiles' },
      { nombre: 'retiro_direccion', etiqueta: 'Dirección de retiro' },
    ],
  },
  {
    titulo: 'Textos legales',
    bajada: 'Ley 19.496: garantía legal de 6 meses y retracto de 10 días en compras a distancia.',
    campos: [
      { nombre: 'garantia_texto', etiqueta: 'Garantía', largo: true },
      { nombre: 'retracto_texto', etiqueta: 'Derecho a retracto', largo: true },
      { nombre: 'envio_politica_texto', etiqueta: 'Política de envío', largo: true },
    ],
  },
]

export function FormularioAjustes({
  configuracion,
  puedeEditar,
}: {
  configuracion: ConfiguracionTienda
  puedeEditar: boolean
}) {
  const [guardando, iniciar] = useTransition()
  const avisos = useAvisos()
  const bloqueado = guardando || !puedeEditar

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const datos = new FormData(e.currentTarget)
    iniciar(async () => {
      const r = await guardarConfiguracion(datos)
      if (r.ok) avisos.ok('Ajustes guardados. La tienda ya los muestra.')
      else avisos.error(r.error)
    })
  }

  return (
    <form onSubmit={enviar} className="space-y-4">
      {!puedeEditar && (
        <p role="status" className="rounded-[12px] bg-spark-suave px-4 py-3 text-[13px] text-ambar">
          Puedes ver los ajustes, pero solo administración o finanzas los cambia.
        </p>
      )}

      {SECCIONES.map((s) => (
        <section key={s.titulo} aria-labelledby={`aj-${s.titulo}`}
                 className="rounded-[var(--radius-tarjeta)] bg-papel p-5 ring-1 ring-borde/70 sm:p-6">
          <h2 id={`aj-${s.titulo}`} className="text-[16px] font-semibold tracking-[-0.01em]">{s.titulo}</h2>
          <p className="mt-0.5 mb-4 text-[12px] text-gris">{s.bajada}</p>

          <div className="grid gap-3 sm:grid-cols-2">
            {s.campos.map((c) => {
              const id = `aj-${c.nombre}`
              const valor = configuracion[c.nombre]
              const inicial = valor === null || valor === undefined || typeof valor === 'boolean' ? '' : String(valor)
              return (
                <div key={c.nombre} className={c.largo ? 'sm:col-span-2' : ''}>
                  <label htmlFor={id} className={rotulo}>{c.etiqueta}</label>
                  {c.largo ? (
                    <textarea id={id} name={c.nombre} rows={4} defaultValue={inicial} disabled={bloqueado}
                              className={`${campo} resize-y`} />
                  ) : (
                    <input id={id} name={c.nombre} type={c.tipo ?? 'text'} defaultValue={inicial}
                           min={c.tipo === 'number' ? 0 : undefined} step={c.tipo === 'number' ? 1 : undefined}
                           disabled={bloqueado} aria-describedby={c.ayuda ? `${id}-ayuda` : undefined}
                           className={`${campo} ${c.tipo === 'number' ? 'cifra' : ''}`} />
                  )}
                  {c.ayuda && <p id={`${id}-ayuda`} className="mt-1 text-[11px] text-gris">{c.ayuda}</p>}
                </div>
              )
            })}
          </div>

          {s.titulo === 'Envío' && (
            <Casilla name="retiro_habilitado" defaultChecked={configuracion.retiro_habilitado} disabled={bloqueado} className="mt-4">
              Permitir retiro en persona
            </Casilla>
          )}
        </section>
      ))}

      {puedeEditar && (
        <div className="sticky bottom-[calc(84px+env(safe-area-inset-bottom))] md:bottom-4">
          <button type="submit" disabled={guardando}
                  className="presionable w-full rounded-[12px] bg-spark py-3.5 text-[15px] font-semibold text-white
                             shadow-[var(--shadow-alzado)] hover:bg-spark-hover disabled:opacity-60">
            {guardando ? 'Guardando…' : 'Guardar ajustes'}
          </button>
        </div>
      )}

      {configuracion.updated_at && (
        <p className="text-center text-[12px] text-gris">
          Última modificación: {new Date(configuracion.updated_at).toLocaleString('es-CL')}
        </p>
      )}
    </form>
  )
}
