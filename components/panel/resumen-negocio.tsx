import Link from 'next/link'
import { clp } from '@/lib/formato'
import type { ResumenNegocio as Resumen } from '@/lib/resumen-negocio'

/**
 * Lo primero de Finanzas: cuánto invertimos, cuánto hemos generado y cuánta plata hay en stock
 * sin vender. Es la foto de HOY (no depende del periodo que se esté mirando). Solo presentación:
 * los cálculos están en `lib/resumen-negocio.ts`.
 */
export interface SocioInvertido {
  nombre: string
  monto: number
}

interface Props {
  resumen: Resumen
  socios: SocioInvertido[]
  /** Desglose de lo que tenemos hoy (suma `resumen.tenemos`). */
  plataQueHay: number
  stockPropioACosto: number
  porCobrar: number
  retirado: number
  /** Compras de mercadería y traslados, para mostrar en qué se usó lo invertido. */
  mercaderiaComprada: number
  traslados: number
  unidadesEnStock: number
  productosEnStock: number
}

const corto = (nombre: string) => nombre.trim().split(/\s+/)[0]

export function ResumenDelNegocio({ resumen: r, socios, plataQueHay, stockPropioACosto, porCobrar, retirado, mercaderiaComprada, traslados, unidadesEnStock, productosEnStock }: Props) {
  const gana = r.generado >= 0
  return (
    <section aria-label="Resumen del negocio" className="mb-8">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="text-[19px] font-semibold tracking-cuerpo">Cómo vamos</h2>
        <p className="text-[12.5px] text-gris">Al día de hoy, sin importar el periodo</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* ── 1 · Invertido ─────────────────────────────────────── */}
        <article aria-labelledby="rn-invertido" className="flex flex-col rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
          <h3 id="rn-invertido" className="text-[13.5px] font-medium text-gris">Invertido</h3>
          <p className="cifra mt-2 text-[clamp(1.9rem,6vw,2.4rem)] leading-none font-semibold tracking-[-0.03em]">{clp(r.invertido)}</p>
          <p className="mt-1.5 text-[13px] text-gris">lo que pusieron los socios</p>

          <ul className="mt-4 space-y-1.5 border-t border-borde/60 pt-3.5 text-[14px]">
            {socios.map((s) => (
              <li key={s.nombre} className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{corto(s.nombre)}</span>
                <span className="cifra font-medium">{clp(s.monto)}</span>
              </li>
            ))}
          </ul>

          <p className="mt-auto pt-4 text-[12.5px] leading-snug text-gris">
            Se compró mercadería por <span className="cifra">{clp(mercaderiaComprada)}</span> y traslados por <span className="cifra">{clp(traslados)}</span>.
          </p>
        </article>

        {/* ── 2 · Generado ──────────────────────────────────────── */}
        <article aria-labelledby="rn-generado" className="flex flex-col rounded-[var(--radius-widget)] bg-tinta p-5 text-papel ring-1 ring-borde/60">
          <h3 id="rn-generado" className="text-[13.5px] font-medium text-white/60">Generado</h3>
          <p className={`cifra mt-2 text-[clamp(1.9rem,6vw,2.4rem)] leading-none font-semibold tracking-[-0.03em] ${gana ? 'text-[#7be39e]' : 'text-[#ff8a80]'}`}>
            <span aria-hidden>{gana ? '+' : '−'}</span>
            <span className="sr-only">{gana ? 'más ' : 'menos '}</span>
            {clp(Math.abs(r.generado))}
          </p>
          <p className="mt-1.5 text-[13px] text-white/60">ganancia total</p>

          <dl className="mt-4 space-y-1.5 border-t border-white/15 pt-3.5 text-[13.5px]">
            <Fila rotulo="Plata que hay" nota="cuenta + efectivo" valor={clp(plataQueHay)} />
            <Fila rotulo="Stock a costo" valor={clp(stockPropioACosto)} />
            <Fila rotulo="Nos deben" valor={clp(porCobrar)} />
            <Fila rotulo="Ya retirado por socios" valor={clp(retirado)} />
            <div className="flex justify-between gap-3 border-t border-white/15 pt-1.5 font-semibold">
              <dt>Tenemos</dt>
              <dd className="cifra">{clp(r.tenemos)}</dd>
            </div>
            <Fila rotulo="Menos lo invertido" valor={`−${clp(r.invertido)}`} />
          </dl>

          {r.sinExplicar !== 0 && (
            <p className="mt-auto pt-4 text-[12.5px] leading-snug text-[#ffd180]">
              {r.sinExplicar > 0 ? (
                <>Incluye <span className="cifra font-semibold">{clp(r.sinExplicar)}</span> de plata de más que todavía no se explica; suma a la ganancia.</>
              ) : (
                <>Descuenta <span className="cifra font-semibold">{clp(Math.abs(r.sinExplicar))}</span> que falta explicar.</>
              )}{' '}
              <Link href="#cuadre" className="font-semibold underline underline-offset-2">Ver cuadre</Link>
            </p>
          )}
        </article>

        {/* ── 3 · Stock sin vender ──────────────────────────────── */}
        <article aria-labelledby="rn-stock" className="flex flex-col rounded-[var(--radius-widget)] bg-papel p-5 ring-1 ring-borde/60">
          <h3 id="rn-stock" className="text-[13.5px] font-medium text-gris">En stock sin vender</h3>
          <p className="cifra mt-2 text-[clamp(1.9rem,6vw,2.4rem)] leading-none font-semibold tracking-[-0.03em]">{clp(r.stock.aCosto)}</p>
          <p className="mt-1.5 text-[13px] text-gris">a costo · {unidadesEnStock} {unidadesEnStock === 1 ? 'unidad' : 'unidades'} en {productosEnStock} {productosEnStock === 1 ? 'producto' : 'productos'}</p>

          <dl className="mt-4 space-y-1.5 border-t border-borde/60 pt-3.5 text-[14px]">
            <div className="flex justify-between gap-3">
              <dt className="text-gris">A precio de lista</dt>
              <dd className="cifra font-medium">{clp(r.stock.aPrecio)}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gris">Ganancia si se vende todo</dt>
              <dd className="cifra font-medium text-verde">+{clp(r.stock.gananciaPotencial)}</dd>
            </div>
          </dl>

          <p className="mt-auto pt-4 text-[12.5px] leading-snug text-gris">
            {r.stock.previo > 0 && <>Incluye <span className="cifra">{clp(r.stock.previo)}</span> de stock que Joseph ya tenía antes (no cuenta como ganancia). </>}
            Lo ya vendido y por cobrar está en «Nos deben». <Link href="/panel/stock" className="font-semibold text-spark hover:underline">Ver stock</Link>
          </p>
        </article>
      </div>
    </section>
  )
}

function Fila({ rotulo, nota, valor }: { rotulo: string; nota?: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="min-w-0 text-white/70">
        {rotulo}
        {nota && <span className="block text-[11.5px] leading-tight text-white/50">{nota}</span>}
      </dt>
      <dd className="cifra shrink-0 font-medium">{valor}</dd>
    </div>
  )
}
