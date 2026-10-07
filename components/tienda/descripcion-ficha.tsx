/**
 * «Sobre este producto» con estructura, a partir del texto plano del panel.
 *
 * Reglas de lectura (así se escriben las descripciones): bloques separados por
 * una línea vacía; un bloque cuyas líneas empiezan con «·», «-» o «•» es una
 * lista. El primer bloque, si es texto, va como entradilla. Cualquier otro
 * texto se muestra tal cual: una descripción vieja sin formato sigue viéndose bien.
 */
const VINETA = /^\s*[·•-]\s+/

type Bloque = { tipo: 'lista'; items: string[] } | { tipo: 'parrafo'; texto: string }

function leerBloques(texto: string): Bloque[] {
  return texto
    .split(/\n\s*\n/)
    .map((b) => b.trim())
    .filter(Boolean)
    .map((b): Bloque => {
      const lineas = b.split('\n').map((l) => l.trim()).filter(Boolean)
      return lineas.every((l) => VINETA.test(l))
        ? { tipo: 'lista', items: lineas.map((l) => l.replace(VINETA, '')) }
        : { tipo: 'parrafo', texto: lineas.join(' ') }
    })
}

export function DescripcionFicha({ texto }: { texto: string }) {
  const bloques = leerBloques(texto)
  return (
    <div className="mt-3 max-w-[580px]">
      {bloques.map((b, i) =>
        b.tipo === 'lista' ? (
          <ul key={i} className="mt-4 grid gap-2 rounded-[18px] bg-papel p-4 t:p-5">
            {b.items.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[16px] leading-snug text-tinta">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden className="mt-0.5 shrink-0 text-verde"><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ) : i === 0 && bloques.length > 1 ? (
          <p key={i} className="text-[21px] leading-[1.3] font-semibold tracking-tarjeta text-tinta text-balance">{b.texto}</p>
        ) : (
          <p key={i} className="mt-4 text-[17px] leading-relaxed text-tinta-suave">{b.texto}</p>
        ),
      )}
    </div>
  )
}
