import Link from 'next/link'
import type { ItemAtencion } from '@/lib/atencion'
import { clp } from '@/lib/formato'

const PUNTO = { rojo: 'bg-rojo', ambar: 'bg-ambar', neutro: 'bg-gris' } as const

/** «Requiere atención»: lo pendiente, antes que los números. Si no hay nada, no ocupa lugar. */
export function AtencionPanel({ items }: { items: ItemAtencion[] }) {
  if (items.length === 0) return null
  return (
    <section aria-label="Requiere atención" className="entra mt-7">
      <h2 className="mb-3 text-[19px] font-semibold tracking-cuerpo">Requiere atención</h2>
      <ul className="divide-y divide-borde/50 overflow-hidden rounded-[var(--radius-widget)] bg-papel ring-1 ring-borde/60">
        {items.map((i) => (
          <li key={i.clave}>
            <Link href={i.href} className="presionable flex min-h-14 items-center gap-3.5 px-4 py-3 transition-colors hover:bg-papel-alt/60">
              <span aria-hidden className={`size-2.5 shrink-0 rounded-full ${PUNTO[i.tono]}`} />
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium">{i.titulo}</span>
                <span className="mt-0.5 block text-[12.5px] text-gris">{i.detalle}</span>
              </span>
              {i.monto !== undefined && <span className="cifra shrink-0 text-[14px] font-medium">{clp(i.monto)}</span>}
              <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gris"><path d="m9 6 6 6-6 6" /></svg>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
