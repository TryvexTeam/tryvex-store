'use client'

import { useEffect, useState, useTransition } from 'react'
import { fijarStock } from '@/app/panel/(protegido)/stock/acciones'
import { notificar } from '@/lib/notificar'
import { Boton } from '@/components/panel/ui'

/**
 * «Tengo N»: pone el stock disponible en el número que se contó.
 *
 * Es la acción principal de cada producto. Antes el campo numérico de la tarjeta
 * era el MÍNIMO para alertar, y quien escribía ahí el stock real veía que el
 * producto seguía en cero. Acá el campo se llama por lo que hace, parte con el
 * valor actual y solo ofrece «Guardar» cuando el número cambió.
 *
 * Con variantes, cada una se cuenta por separado y se guarda todo junto.
 */
interface Linea {
  variante_id: string | null
  nombre: string | null
  stock: number
}

export function ContarStock({ productoId, nombreProducto, stock, variantes }: { productoId: string; nombreProducto: string; stock: number; variantes: { id: string; nombre: string; stock: number }[] }) {
  const lineas: Linea[] = variantes.length > 0 ? variantes.map((v) => ({ variante_id: v.id, nombre: v.nombre, stock: v.stock })) : [{ variante_id: null, nombre: null, stock }]
  // El valor escrito por línea; se reinicia cuando el servidor trae un stock nuevo.
  const firma = lineas.map((l) => `${l.variante_id}:${l.stock}`).join('|')
  const [valores, setValores] = useState<Record<string, string>>(() => Object.fromEntries(lineas.map((l) => [l.variante_id ?? '', String(l.stock)])))
  useEffect(() => {
    setValores(Object.fromEntries(lineas.map((l) => [l.variante_id ?? '', String(l.stock)])))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firma])
  const [guardando, iniciar] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const clave = (l: Linea) => l.variante_id ?? ''
  const valida = (l: Linea) => /^\d+$/.test(valores[clave(l)] ?? '')
  const cambiadas = lineas.filter((l) => valida(l) && Number(valores[clave(l)]) !== l.stock)
  const hayInvalida = lineas.some((l) => !valida(l))

  const poner = (l: Linea, n: number) => setValores((v) => ({ ...v, [clave(l)]: String(Math.max(0, n)) }))

  function guardar() {
    setError(null)
    const datos = new FormData()
    datos.set('producto_id', productoId)
    datos.set('lineas', JSON.stringify(cambiadas.map((l) => ({ variante_id: l.variante_id, real: Number(valores[clave(l)]) }))))
    iniciar(async () => {
      const r = await fijarStock(datos)
      if (r.ok) {
        const resumen = cambiadas.map((l) => `${l.nombre ? `${l.nombre}: ` : ''}${l.stock} → ${valores[clave(l)]}`).join(' · ')
        notificar.ok('Stock actualizado', `${nombreProducto} · ${resumen}`)
      } else {
        setError(r.error)
        notificar.error('No se pudo guardar el stock', r.error)
      }
    })
  }

  return (
    <div>
      <p className="mb-2 text-[12.5px] font-medium text-tinta-suave" id={`etq-${productoId}`}>
        {variantes.length > 0 ? 'Stock por variante' : 'Stock disponible'}
      </p>
      <ul className="space-y-2" aria-labelledby={`etq-${productoId}`}>
        {lineas.map((l) => (
          <li key={clave(l)} className="flex items-center justify-between gap-3">
            {l.nombre && <span className="min-w-0 truncate text-[13.5px]">{l.nombre}</span>}
            <div className={`flex items-center rounded-full bg-papel-alt ${l.nombre ? '' : 'w-full max-w-[220px]'}`}>
              <button type="button" aria-label={`Una unidad menos${l.nombre ? ` de ${l.nombre}` : ''}`} disabled={guardando || Number(valores[clave(l)]) <= 0} onClick={() => poner(l, Number(valores[clave(l)] || 0) - 1)} className="presionable grid size-11 shrink-0 place-items-center text-[20px] disabled:opacity-30">−</button>
              <input
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label={`Stock real${l.nombre ? ` de ${l.nombre}` : ` de ${nombreProducto}`}`}
                value={valores[clave(l)] ?? ''}
                onChange={(e) => setValores((v) => ({ ...v, [clave(l)]: e.target.value.replace(/\D/g, '') }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && cambiadas.length > 0 && !hayInvalida) {
                    e.preventDefault()
                    guardar()
                  }
                }}
                disabled={guardando}
                className="cifra h-11 min-w-0 flex-1 bg-transparent text-center text-[18px] font-semibold focus-visible:outline-2 focus-visible:outline-tinta"
              />
              <button type="button" aria-label={`Una unidad más${l.nombre ? ` de ${l.nombre}` : ''}`} disabled={guardando} onClick={() => poner(l, Number(valores[clave(l)] || 0) + 1)} className="presionable grid size-11 shrink-0 place-items-center text-[20px] disabled:opacity-30">+</button>
            </div>
          </li>
        ))}
      </ul>
      {error && <p role="alert" className="mt-2 text-[12.5px] text-rojo">{error}</p>}
      {hayInvalida && <p className="mt-2 text-[12.5px] text-ambar">Escribe un número entero (0 o más).</p>}
      {cambiadas.length > 0 && !hayInvalida && (
        <div className="mt-3 flex items-center gap-2">
          <Boton tamano="md" onClick={guardar} disabled={guardando} className="flex-1">
            {guardando ? 'Guardando…' : 'Guardar stock'}
          </Boton>
          <Boton variante="suave" tamano="md" disabled={guardando} onClick={() => setValores(Object.fromEntries(lineas.map((l) => [clave(l), String(l.stock)])))}>
            Deshacer
          </Boton>
        </div>
      )}
    </div>
  )
}
