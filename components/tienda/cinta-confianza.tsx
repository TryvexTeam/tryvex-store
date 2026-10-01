/**
 * Cinta de confianza: una franja que recorre lo que tranquiliza justo antes de
 * las reseñas (envío, garantía, retracto, pago).
 *
 * Solo lleva hechos que la tienda cumple y que ya se dicen en otros lugares de
 * la ficha; nada de contadores ni «personas viendo ahora». La lista la arma la
 * página con la configuración real, y acá solo se dibuja.
 *
 * El recorrido es CSS puro: el grupo se repite dos veces y la pista avanza la
 * mitad de su ancho, así que el bucle no tiene salto. Se pausa con el cursor o
 * el foco encima. Con `prefers-reduced-motion` no se mueve: queda una fila
 * estática que envuelve, sin la copia, para que no se lea dos veces.
 */
export function CintaConfianza({ items }: { items: string[] }) {
  if (items.length === 0) return null

  const grupo = (copia: boolean) => (
    <ul aria-hidden={copia || undefined} className={`cinta-grupo ${copia ? 'cinta-copia' : ''}`}>
      {items.map((texto) => (
        <li key={texto} className="flex shrink-0 items-center gap-2.5">
          <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-verde">
            <path d="m5 12.5 4.5 4.5L19 7.5" />
          </svg>
          {texto}
        </li>
      ))}
    </ul>
  )

  return (
    <section aria-label="Por qué comprar en Tryvex" className="cinta overflow-hidden border-y border-borde/70 bg-papel py-3.5 text-[13px] font-semibold tracking-[0.08em] text-tinta uppercase">
      <div className="cinta-pista">
        {grupo(false)}
        {grupo(true)}
      </div>
    </section>
  )
}
