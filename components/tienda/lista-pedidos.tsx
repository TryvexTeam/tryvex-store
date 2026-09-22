'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { PedidoCuenta } from '@/lib/cuenta'
import { PedidoEnCuenta, enCurso } from '@/components/tienda/pedido-cuenta'

/**
 * El historial, con filtro y búsqueda.
 *
 * Con tres compras sobra una lista. Con treinta, encontrar «el de los audífonos
 * negros de marzo» es el trabajo real, y por eso se puede filtrar por estado y
 * buscar por número o por producto.
 *
 * Los filtros solo aparecen cuando hay suficientes pedidos para que sirvan: en
 * una lista de dos, una barra de herramientas es ruido.
 */

type Filtro = 'todos' | 'curso' | 'entregados' | 'cancelados'

const FILTROS: { id: Filtro; texto: string }[] = [
  { id: 'todos', texto: 'Todos' },
  { id: 'curso', texto: 'En curso' },
  { id: 'entregados', texto: 'Entregados' },
  { id: 'cancelados', texto: 'Cancelados' },
]

const DESDE_CUANDO_FILTRAR = 4

function calza(pedido: PedidoCuenta, filtro: Filtro): boolean {
  if (filtro === 'todos') return true
  if (filtro === 'curso') return enCurso(pedido.estado)
  if (filtro === 'entregados') return pedido.estado === 'entregado'
  return pedido.estado === 'cancelado'
}

export function ListaPedidos({ pedidos }: { pedidos: PedidoCuenta[] }) {
  const [filtro, setFiltro] = useState<Filtro>('todos')
  const [busca, setBusca] = useState('')

  const conHerramientas = pedidos.length >= DESDE_CUANDO_FILTRAR

  const visibles = useMemo(() => {
    const texto = busca.trim().toLowerCase()
    return pedidos.filter((p) => {
      if (!calza(p, filtro)) return false
      if (!texto) return true
      // Se busca por número —con o sin almohadilla— y por lo que se compró.
      const enNumero = String(p.numero).includes(texto.replace('#', ''))
      const enProductos = p.items.some((i) => i.nombre.toLowerCase().includes(texto))
      return enNumero || enProductos
    })
  }, [pedidos, filtro, busca])

  const cuantos = (f: Filtro) => pedidos.filter((p) => calza(p, f)).length

  return (
    <>
      {conHerramientas && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar pedidos por estado">
            {FILTROS.map((f) => {
              const activo = filtro === f.id
              const n = cuantos(f.id)
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setFiltro(f.id)}
                  aria-pressed={activo}
                  disabled={n === 0 && f.id !== 'todos'}
                  className={[
                    'rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                    activo
                      ? 'bg-tinta text-white'
                      : 'text-tinta ring-1 ring-borde ring-inset hover:bg-papel-alt disabled:opacity-40 disabled:hover:bg-transparent',
                  ].join(' ')}
                >
                  {f.texto}
                  <span className={`cifra ml-1.5 ${activo ? 'opacity-70' : 'text-tinta-suave'}`}>{n}</span>
                </button>
              )
            })}
          </div>

          <label className="ml-auto min-w-[180px] flex-1 t:max-w-[260px] t:flex-none">
            <span className="sr-only">Buscar en mis pedidos</span>
            <input
              type="search"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por número o producto"
              className="w-full rounded-full bg-papel-alt px-4 py-2 text-[14px] ring-1 ring-borde ring-inset placeholder:text-tinta-suave focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark"
            />
          </label>
        </div>
      )}

      {visibles.length === 0 ? (
        <p className="mt-5 rounded-[16px] bg-papel-alt px-4 py-5 text-center text-[14px] text-tinta-suave">
          Ningún pedido calza con lo que buscas.{' '}
          <button
            type="button"
            onClick={() => {
              setFiltro('todos')
              setBusca('')
            }}
            className="font-semibold text-spark hover:underline"
          >
            Ver todos
          </button>
        </p>
      ) : (
        <ul className="mt-5 grid gap-3">
          {visibles.map((p) => (
            <li key={p.id}>
              <PedidoEnCuenta pedido={p} abierto={visibles.length === 1} />
            </li>
          ))}
        </ul>
      )}

      {conHerramientas && visibles.length > 0 && visibles.length < pedidos.length && (
        <p className="mt-3 text-[13px] text-tinta-suave">
          Mostrando {visibles.length} de {pedidos.length} pedidos.
        </p>
      )}

      {pedidos.length === 0 && (
        <div className="mt-4 text-[15px] text-tinta-suave">
          <p>Todavía no tienes compras.</p>
          <Link href="/tienda" className="mt-4 inline-block font-semibold text-spark hover:underline">
            Explorar la tienda →
          </Link>
        </div>
      )}
    </>
  )
}
