'use client'

import { useCallback, useState } from 'react'
import { Hoja } from '@/components/hoja'
import { Selector } from '@/components/selector'
import { Casilla } from '@/components/casilla'

type Props = { cat?: string; busqueda: string; disponibles: boolean; ofertas: boolean; min?: number; max?: number; orden: string; resultados: number }

export function FiltrosColeccion(props: Props) {
  const [abierta, setAbierta] = useState(false)
  const [orden, setOrden] = useState(props.orden)
  const cerrar = useCallback(() => setAbierta(false), [])
  const n = Number(props.disponibles) + Number(props.ofertas) + Number(props.min !== undefined || props.max !== undefined) + Number(props.orden !== 'recientes')
  const ORDENES = [
    { valor: 'recientes', etiqueta: 'Más recientes' },
    { valor: 'menor-precio', etiqueta: 'Menor precio' },
    { valor: 'mayor-precio', etiqueta: 'Mayor precio' },
  ]

  /**
   * `nativo` dibuja los controles del navegador en vez de los de la casa.
   * Se usa solo en la copia dentro de <noscript>, cuya razón de ser es
   * funcionar sin JavaScript: ahí un componente con estado no serviría de nada
   * y dejaría al visitante sin poder filtrar.
   */
  function formulario(id: string, nativo = false) {
    return <form action="/tienda" method="get" className="flex flex-wrap items-end gap-4">
      {props.cat && <input type="hidden" name="cat" value={props.cat} />}
      {props.busqueda && <input type="hidden" name="q" value={props.busqueda} />}
      {nativo ? (
        <>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="disponibles" value="1" defaultChecked={props.disponibles} />Disponibles</label>
          <label className="flex min-h-11 items-center gap-2"><input type="checkbox" name="ofertas" value="1" defaultChecked={props.ofertas} />Ofertas</label>
        </>
      ) : (
        <>
          <Casilla name="disponibles" defaultChecked={props.disponibles}>Disponibles</Casilla>
          <Casilla name="ofertas" defaultChecked={props.ofertas}>Ofertas</Casilla>
        </>
      )}
      {(['min', 'max'] as const).map((campo) => <label key={campo} htmlFor={`${id}-${campo}`} className="grid gap-1 text-sm">{campo === 'min' ? 'Precio mínimo (CLP)' : 'Precio máximo (CLP)'}<input id={`${id}-${campo}`} name={campo} type="number" inputMode="numeric" min="0" step="1" defaultValue={props[campo]} className="min-h-11 w-36 max-w-full rounded-xl bg-papel px-3 ring-1 ring-borde" /></label>)}
      {nativo ? (
        <label htmlFor={`${id}-orden`} className="grid gap-1 text-sm">Ordenar<select id={`${id}-orden`} name="orden" defaultValue={props.orden} className="min-h-11 rounded-xl bg-papel px-3 ring-1 ring-borde">{ORDENES.map((o) => <option key={o.valor} value={o.valor}>{o.etiqueta}</option>)}</select></label>
      ) : (
        <div className="min-w-[180px]">
          <Selector id={`${id}-orden`} name="orden" etiqueta="Ordenar" opciones={ORDENES} valor={orden} alCambiar={setOrden} />
        </div>
      )}
      <button type="submit" className="tienda-boton bg-tinta text-white">Ver {props.resultados} {props.resultados === 1 ? 'resultado' : 'resultados'}</button>
    </form>
  }
  return <>
    <div className="hidden n:block">{formulario('linea')}</div>
    <div className="n:hidden">
      <button type="button" aria-haspopup="dialog" aria-expanded={abierta} className="tienda-boton bg-papel ring-1 ring-borde" onClick={() => setAbierta(true)}>Filtrar ({n})</button>
      <Hoja abierta={abierta} onCerrar={cerrar} titulo="Filtrar productos">{formulario('hoja')}</Hoja>
      <noscript><div className="mt-4">{formulario('sin-js', true)}</div></noscript>
    </div>
  </>
}
