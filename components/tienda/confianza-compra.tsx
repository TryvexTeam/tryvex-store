import { fraseDeLlegada, rotuloDeFechas, type Hito } from '@/lib/plazo-envio'

/**
 * Tranquilidad en el momento de pagar: cuándo llega y por qué es seguro.
 * Solo hechos que la tienda cumple y que ya dice en otras partes; sin
 * contadores, sin «quedan pocos» inventados. Sin estado: sirve en servidor y
 * en cliente (bolsa y checkout son componentes de cliente).
 */

const TRAZOS = {
  camion: 'M3 7h11v9H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4ZM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z',
  escudo: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4',
  candado: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v10H5z',
} as const

function Icono({ trazo }: { trazo: keyof typeof TRAZOS }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d={TRAZOS[trazo]} />
    </svg>
  )
}

/** «Llega entre el 5 y el 7 de octubre», con el despacho debajo. Una línea, para el resumen. */
export function LlegadaEstimada({ hitos, className = '' }: { hitos: readonly Hito[] | null; className?: string }) {
  const frase = hitos ? fraseDeLlegada(hitos) : null
  const despacho = hitos?.find((h) => h.clave === 'despacho')
  if (!frase) return null
  return (
    <div className={`flex items-start gap-3 rounded-[14px] bg-verde/10 px-3.5 py-3 ${className}`}>
      <span className="mt-0.5 text-verde"><Icono trazo="camion" /></span>
      <p className="text-[14px] leading-snug text-tinta">
        <span className="font-semibold">Llega <span className="text-verde">{frase}</span></span>
        {despacho && <span className="mt-0.5 block text-[13px] text-tinta-suave">Despachamos {rotuloDeFechas(despacho.desde, despacho.hasta)}.</span>}
      </p>
    </div>
  )
}

/** Los tres motivos para pagar tranquilo, en filas chicas junto al botón. */
export function SellosConfianza({ envioGratis, className = '' }: { envioGratis: boolean; className?: string }) {
  const sellos = [
    { trazo: 'candado', texto: 'Pago seguro con Mercado Pago o transferencia' },
    { trazo: 'escudo', texto: 'Garantía legal de 6 meses' },
    // Si hay tarifa o umbral de envío gratis, el total lo dice; acá no se contradice.
    { trazo: 'camion', texto: envioGratis ? 'Envío gratis a todo Chile' : 'Envíos a todo Chile' },
  ] as const
  return (
    <ul aria-label="Compra protegida" className={`grid gap-2 text-[13px] text-tinta-suave ${className}`}>
      {sellos.map((s) => (
        <li key={s.texto} className="flex items-center gap-2.5">
          <span className="text-verde"><Icono trazo={s.trazo} /></span>
          {s.texto}
        </li>
      ))}
    </ul>
  )
}
