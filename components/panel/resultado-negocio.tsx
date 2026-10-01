import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { Resultado } from '@/lib/resultado'

/**
 * Lo que el dueño quiere ver apenas entra a Finanzas: cuánto se ganó, cuánto nos
 * deben y cuánto vale lo que hay en bodega. Solo presentación.
 */

/** Ganancia sobre lo vendido, con el desglose que la explica y las pérdidas aparte. */
export function ResultadoNegocio({ resultado, etiquetaPeriodo }: { resultado: Resultado; etiquetaPeriodo: string }) {
  const r = resultado
  return (
    <section aria-label="Ganancia" className="rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Ganancia sobre lo vendido</h2>
        <p className="text-[12.5px] text-gris">{etiquetaPeriodo}</p>
      </div>
      <p className={`cifra mt-3 text-[clamp(2rem,7vw,2.75rem)] leading-none font-semibold tracking-[-0.03em] ${r.ganancia < 0 ? 'text-rojo' : ''}`}>
        {r.ganancia < 0 && <span aria-hidden>−</span>}
        {r.ganancia < 0 && <span className="sr-only">menos </span>}
        {clp(Math.abs(r.ganancia))}
      </p>
      {r.margenPct !== null && <p className="mt-1.5 text-[13px] text-gris">{String(r.margenPct).replace('.', ',')} % de lo vendido</p>}

      <dl className="mt-5 space-y-2 border-t border-borde/60 pt-4 text-[14px]">
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Vendido ({r.unidadesVendidas} {r.unidadesVendidas === 1 ? 'unidad' : 'unidades'})</dt>
          <dd className="cifra font-medium">{clp(r.ventas)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-gris">Lo que costó</dt>
          <dd className="cifra font-medium">−{clp(r.costoVendido)}</dd>
        </div>
        {r.perdidas > 0 && (
          <div className="flex justify-between gap-3 border-t border-borde/50 pt-2">
            <dt className="text-gris">Perdido en rotos, muestras y diferencias ({r.unidadesPerdidas} u.)</dt>
            <dd className="cifra font-medium text-rojo">−{clp(r.perdidas)}</dd>
          </div>
        )}
      </dl>
      {r.perdidas > 0 && <p className="mt-3 text-[12px] leading-snug text-gris">Lo perdido va aparte: no se resta de la ganancia para que se vean los dos números.</p>}
    </section>
  )
}

export interface PedidoPorCobrar {
  numero: number | string
  cliente: string
  total: number
}

/** «Nos deben»: quién, cuánto y por qué pedido. Cada fila abre el pedido. */
export function NosDeben({ pedidos }: { pedidos: PedidoPorCobrar[] }) {
  const total = pedidos.reduce((a, p) => a + p.total, 0)
  return (
    <section aria-label="Nos deben" className="rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Nos deben</h2>
        <Link href="/panel/cobranza" className="text-[13px] font-medium text-spark hover:underline">Ver cobranza</Link>
      </div>
      {pedidos.length === 0 ? (
        <p className="mt-3 text-[14px] text-gris">Nadie nos debe nada.</p>
      ) : (
        <>
          <p className="cifra mt-3 text-[clamp(1.6rem,6vw,2.1rem)] leading-none font-semibold tracking-[-0.02em]">{clp(total)}</p>
          <ul className="mt-4 divide-y divide-borde/50">
            {pedidos.map((p) => (
              <li key={p.numero}>
                <Link href={`/panel/pedidos#pedido-${p.numero}`} className="flex min-h-11 items-center justify-between gap-3 py-2 text-[14px] transition-colors hover:text-spark">
                  <span className="min-w-0 truncate"><span className="cifra text-gris">#{p.numero}</span> · {p.cliente}</span>
                  <span className="cifra shrink-0 font-medium">{clp(p.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  )
}

/** Lo que hay en bodega, a costo (lo que costó) y a precio de lista (lo que valdría vendido). */
export function ValorStock({ unidades, aCosto, aPrecio, productos }: { unidades: number; aCosto: number; aPrecio: number; productos: number }) {
  return (
    <section aria-label="Stock en bodega" className="rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[15px] font-semibold">Stock en bodega</h2>
        <Link href="/panel/stock" className="text-[13px] font-medium text-spark hover:underline">Ver stock</Link>
      </div>
      <p className="cifra mt-3 text-[clamp(1.6rem,6vw,2.1rem)] leading-none font-semibold tracking-[-0.02em]">{clp(aCosto)}</p>
      <p className="mt-1.5 text-[13px] text-gris">a costo · {unidades} {unidades === 1 ? 'unidad' : 'unidades'} en {productos} {productos === 1 ? 'producto' : 'productos'}</p>
      <p className="cifra mt-3 text-[13.5px] text-tinta-suave">Vendido a precio de lista: <strong className="font-semibold text-tinta">{clp(aPrecio)}</strong></p>
    </section>
  )
}
