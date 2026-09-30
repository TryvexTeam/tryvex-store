import { GRUPOS_TECH, enlaceTech, whatsappTech, type ItemTech } from '@/lib/tryvex-tech'
import { TRYVEX_TECH } from '@/lib/redes'
import { IconoRed } from './icono-red'
import { FilaAcordeon } from './fila-acordeon'
import { StarBorder } from './star-border'

/**
 * Tryvex Tech: la agencia de software detrás de esta tienda, pensada para
 * captar contactos.
 *
 * Es una hoja blanca con filas separadas por líneas finas. Cada fila es un
 * `<details>` nativo (accesible por teclado y lector de pantalla, sin
 * JavaScript propio) y se vuelve negra al pasar el cursor. Lo memorable es esa
 * inversión; todo lo demás se mantiene quieto y sobrio, sin precios ni cifras.
 *
 * Qué la hace convertir:
 *  - Abre con una pregunta que se apoya en lo que el visitante tiene delante:
 *    la prueba es esta misma tienda.
 *  - Muestra todo lo que se ofrece, empezando por lo de menor compromiso.
 *  - Cada fila termina en una acción: WhatsApp con el mensaje ya escrito, que
 *    dice de dónde viene el contacto y qué le interesa.
 *  - Los enlaces a tryvex.tech llevan `utm` para medir cuántos contactos nacen aquí.
 */

const GARANTIAS = ['Llamada gratuita para empezar', 'Los primeros 90 días de mantención van incluidos', 'Pago en dos partes: la mitad al iniciar, la mitad al entregar']

function Flecha() {
  return (
    <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 8.5 8.5 3.5M4 3.5h4.5V8" />
    </svg>
  )
}

function Servicio({ item }: { item: ItemTech }) {
  return (
    <li>
      <p className="text-[16px] leading-snug font-semibold">{item.nombre}</p>
      <p className="mt-1 text-[15px] leading-snug text-[color:var(--fg-2)]">{item.texto}</p>
      {item.puntos && (
        <ul className="mt-3 grid gap-x-8 gap-y-1.5 text-[14px] leading-snug text-[color:var(--fg-2)] t:grid-cols-2">
          {item.puntos.map((p) => (
            <li key={p} className="flex gap-2.5">
              <span aria-hidden className="mt-[0.7em] h-px w-2.5 shrink-0 bg-current opacity-50" />
              {p}
            </li>
          ))}
        </ul>
      )}
      {item.ver && (
        <p className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[14px]">
          {item.ver.map((v) => (
            <a key={v.ruta} href={enlaceTech(v.ruta, `ver-${item.nombre}`)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 underline decoration-current/30 underline-offset-[3px] hover:decoration-current">
              {v.texto}
              <Flecha />
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          ))}
        </p>
      )}
    </li>
  )
}

export function SeccionTryvexTech() {
  return (
    <section id="tryvex-tech" aria-labelledby="tech-titulo" className="mx-auto w-full max-w-[1204px] scroll-mt-28 px-[22px] pt-4 pb-16 t:pb-24">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        {/* ── Propuesta: pregunta, prueba y acción ── */}
        <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
          <p className="text-[15px] font-medium text-tinta-suave">Tryvex Tech · Estudio de IA y software</p>
          <h2 id="tech-titulo" className="mt-4 max-w-[14ch] text-[38px] leading-[1.03] font-semibold tracking-titulo text-balance text-tinta t:text-[56px]">Esta tienda la hicimos nosotros. ¿Hacemos lo tuyo?</h2>
          <p className="mt-6 max-w-[46ch] text-[17px] leading-relaxed text-tinta-suave">
            Somos la agencia que diseñó y programó esta tienda. Hacemos software, automatizaciones, inteligencia artificial, páginas web y posicionamiento para negocios que quieren vender más y trabajar menos.
          </p>
          <p className="mt-4 max-w-[46ch] text-[17px] leading-relaxed text-tinta-suave">
            La IA también la hacemos nosotros: no revendemos una herramienta, construimos la solución para cada negocio.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-4">
            <StarBorder as="a" href={enlaceTech('/contacto', 'cta-principal')} target="_blank" rel="noopener noreferrer">
              Agendar llamada gratuita<span className="sr-only"> (se abre en otra pestaña)</span>
            </StarBorder>
            <a href={whatsappTech()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-[16px] font-medium text-tinta underline decoration-black/25 underline-offset-[5px] hover:decoration-black">
              Escribir por WhatsApp
              <Flecha />
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </div>

          <ul className="mt-10 max-w-[46ch] divide-y divide-black/[0.08] border-y border-black/[0.08] text-[15px] text-tinta-suave">
            {GARANTIAS.map((g) => (
              <li key={g} className="py-3">{g}</li>
            ))}
          </ul>

          <p className="mt-6 text-[15px]">
            <a href={enlaceTech('/catalogo', 'ver-proyectos')} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-medium text-tinta underline decoration-black/25 underline-offset-[5px] hover:decoration-black">
              Ver proyectos que ya hicimos
              <Flecha />
              <span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          </p>
        </div>

        {/* ── Todo lo que hacemos: hoja blanca, filas con línea fina ── */}
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-tinta-suave">Todo lo que hacemos</h3>
          <div className="mt-4 overflow-hidden rounded-[24px] bg-white ring-1 ring-black/[0.07]">
            {GRUPOS_TECH.map((g, indice) => (
              <FilaAcordeon key={g.id} grupo="servicios-tech" abierta={indice === 0}>
                <summary className="fila-tech-resumen">
                  <span className="min-w-0 flex-1">
                    <span className="block text-[19px] leading-tight font-semibold tracking-tarjeta t:text-[22px]">{g.titulo}</span>
                    <span className="mt-1.5 block text-[14px] leading-snug text-[color:var(--fg-2)] t:text-[15px]">{g.resumen}</span>
                  </span>
                  <span aria-hidden className="fila-tech-mas">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                  </span>
                </summary>

                <div className="fila-tech-contenido">
                  <ul className="grid gap-6">
                    {g.items.map((it) => <Servicio key={it.nombre} item={it} />)}
                  </ul>
                  <a href={whatsappTech(g.titulo)} target="_blank" rel="noopener noreferrer" className="fila-tech-accion">
                    Cotizar por WhatsApp
                    <Flecha />
                    <span className="sr-only"> (se abre en otra pestaña)</span>
                  </a>
                </div>
              </FilaAcordeon>
            ))}
          </div>
        </div>
      </div>

      <ul className="mt-12 flex flex-wrap gap-2 border-t border-black/[0.08] pt-6">
        {TRYVEX_TECH.redes.map((r) => (
          <li key={r.href}>
            <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-[14px] font-medium text-tinta ring-1 ring-black/[0.08] transition-colors hover:bg-black hover:text-white">
              <IconoRed red={r.red} size={16} />
              {r.usuario}
              <span className="sr-only">: {r.nombre} (se abre en otra pestaña)</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  )
}
