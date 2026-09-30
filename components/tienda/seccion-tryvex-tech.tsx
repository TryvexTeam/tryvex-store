import { clp } from '@/lib/formato'
import { TRYVEX_TECH } from '@/lib/redes'
import { GRUPOS_TECH, enlaceTech, precioMinimo, whatsappTech, type IconoGrupo, type ItemTech } from '@/lib/tryvex-tech'
import { IconoRed } from './icono-red'

/**
 * Tryvex Tech: la agencia de software detrás de esta tienda, pensada para
 * convertir contactos.
 *
 * Qué la hace convertir, y por qué:
 *  - Abre con una pregunta que enlaza con lo que el visitante tiene delante
 *    («esta tienda la hicimos nosotros»): la prueba es la propia página.
 *  - Muestra todo lo que se ofrece con sus precios «desde» y plazos: quien
 *    escribe ya sabe el orden de magnitud, y los contactos llegan más calificados.
 *  - Empieza por lo más liviano (sprint de diagnóstico), que es la puerta de
 *    entrada de menor compromiso.
 *  - Cada panel termina en una acción: WhatsApp con el mensaje ya escrito, que
 *    dice de dónde viene el contacto y qué le interesa.
 *  - Los enlaces a tryvex.tech llevan marca de origen (utm) para medir cuántos
 *    contactos nacen aquí.
 *
 * El acordeón es `<details>` nativo: accesible por teclado y lector de pantalla,
 * sin JavaScript. Con `name` compartido solo hay un panel abierto a la vez.
 */

const TRAZOS: Record<IconoGrupo | 'check' | 'mas', string> = {
  inicio: 'M5 21V4M5 5h11l-2 3.5L16 12H5',
  ia: 'M10 3.5l1.9 5.2 5.1 1.9-5.1 1.9L10 17.7l-1.9-5.2L3 10.6l5.1-1.9L10 3.5ZM18.5 14l.9 2.3 2.3.9-2.3.9-.9 2.3-.9-2.3-2.3-.9 2.3-.9.9-2.3Z',
  automatizacion: 'M13 3 5 13h6l-1 8 8-10h-6l1-8Z',
  web: 'M3 5h18v14H3zM3 9h18M6.5 7h.01M9 7h.01',
  software: 'm8 8-4 4 4 4M16 8l4 4-4 4M13.5 6l-3 12',
  mantencion: 'M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6zM9 12l2 2 4-4',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  mas: 'M12 5v14M5 12h14',
}

function Icono({ trazo, size = 22, grosor = 1.7 }: { trazo: keyof typeof TRAZOS; size?: number; grosor?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" strokeLinejoin="round" aria-hidden className="shrink-0">
      <path d={TRAZOS[trazo]} />
    </svg>
  )
}

/** «desde $150.000», «$450.000» o «$139.000/mes». */
function etiquetaPrecio(i: { precio?: number; desde?: boolean; mensual?: boolean }, prefijo = true): string | null {
  if (i.precio === undefined) return null
  return `${i.desde && prefijo ? 'desde ' : ''}${clp(i.precio)}${i.mensual ? '/mes' : ''}`
}

function Item({ item }: { item: ItemTech }) {
  const precio = etiquetaPrecio(item)
  return (
    <li className="py-5 first:pt-0 last:pb-0">
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <p className="text-[17px] leading-tight font-semibold tracking-tarjeta">{item.nombre}</p>
        {item.recomendado && <span className="rounded-full bg-[#7fd4ff]/18 px-2.5 py-0.5 text-[11px] font-semibold tracking-etiqueta text-[#7fd4ff] uppercase">Recomendado</span>}
      </div>
      {(precio || item.plazo) && (
        <p className="cifra mt-1.5 flex flex-wrap gap-x-3 text-[14px] text-white">
          {precio && <span className="font-semibold">{precio}</span>}
          {item.plazo && <span className="text-white/60">· {item.plazo}</span>}
        </p>
      )}
      <p className="mt-2 text-[15px] leading-snug text-white/75">{item.texto}</p>
      {item.puntos && (
        <ul className="mt-3 grid gap-1.5 text-[14px] text-white/70">
          {item.puntos.map((p) => (
            <li key={p} className="flex items-start gap-2.5">
              <span className="mt-[3px] text-[#7fd4ff]"><Icono trazo="check" size={15} grosor={2.2} /></span>
              {p}
            </li>
          ))}
        </ul>
      )}
      {item.ver && (
        <p className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[14px]">
          {item.ver.map((v) => (
            <a key={v.ruta} href={enlaceTech(v.ruta, `ver-${item.nombre}`)} target="_blank" rel="noopener noreferrer" className="font-medium text-[#7fd4ff] underline-offset-2 hover:underline">
              {v.texto} ↗<span className="sr-only"> (se abre en otra pestaña)</span>
            </a>
          ))}
        </p>
      )}
    </li>
  )
}

const GARANTIAS = [
  'Llamada gratuita para empezar',
  'Primeros 90 días de mantención incluidos',
  'Pago en dos partes: 50 % al iniciar, 50 % contra entrega',
]

export function SeccionTryvexTech() {
  return (
    <section id="tryvex-tech" aria-labelledby="tech-titulo" className="mx-auto w-full max-w-[1204px] scroll-mt-28 px-[22px] pb-16 t:pb-24">
      <div className="relative isolate overflow-hidden rounded-[32px] bg-black p-5 text-white t:p-12 lg:p-14">
        <span aria-hidden className="absolute -top-28 -right-24 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(90_200_250/42%),transparent)]" />
        <span aria-hidden className="absolute -bottom-32 -left-20 -z-10 size-[420px] rounded-full bg-[radial-gradient(closest-side,rgb(175_82_222/34%),transparent)]" />

        <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-14">
          {/* ── Propuesta: pregunta, prueba y acción ── */}
          <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
            <p className="text-[13px] font-semibold tracking-etiqueta text-[#7fd4ff] uppercase">Tryvex Tech · Estudio de IA y software</p>
            <h2 id="tech-titulo" className="mt-4 max-w-[15ch] text-[34px] leading-[1.04] font-semibold tracking-seccion text-balance t:text-[52px]">Esta tienda la hicimos nosotros. ¿Hacemos lo tuyo?</h2>
            <p className="mt-5 max-w-[44ch] text-[16px] leading-relaxed text-white/75 t:text-[18px]">
              Somos la agencia que diseñó y programó esta tienda. Hacemos software, automatizaciones, inteligencia artificial, páginas web y posicionamiento para negocios que quieren vender más y trabajar menos.
            </p>
            <p className="mt-4 max-w-[44ch] text-[16px] leading-relaxed text-white/75 t:text-[18px]">
              La IA también la hacemos nosotros: no revendemos una herramienta, construimos la solución para cada negocio.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a href={enlaceTech('/contacto', 'cta-principal')} target="_blank" rel="noopener noreferrer" className="tienda-boton !min-h-[52px] bg-white !text-[17px] text-black hover:bg-white/85">
                Agendar llamada gratuita<span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
              <a href={whatsappTech()} target="_blank" rel="noopener noreferrer" className="tienda-boton !min-h-[52px] !text-[17px] text-white ring-1 ring-white/30 ring-inset hover:bg-white/10">
                Escribir por WhatsApp<span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            </div>

            <ul className="mt-7 grid gap-2.5 text-[14px] text-white/75">
              {GARANTIAS.map((g) => (
                <li key={g} className="flex items-start gap-2.5">
                  <span className="mt-[2px] text-[#7fd4ff]"><Icono trazo="check" size={16} grosor={2.2} /></span>
                  {g}
                </li>
              ))}
            </ul>

            <p className="mt-7 text-[15px]">
              <a href={enlaceTech('/catalogo', 'ver-proyectos')} target="_blank" rel="noopener noreferrer" className="font-medium text-[#7fd4ff] underline-offset-2 hover:underline">
                Ver proyectos reales que ya hicimos ↗<span className="sr-only"> (se abre en otra pestaña)</span>
              </a>
            </p>
          </div>

          {/* ── Todo lo que ofrecemos, en acordeón ── */}
          <div className="min-w-0">
            <h3 className="text-[13px] font-semibold tracking-etiqueta text-white/60 uppercase">Todo lo que hacemos</h3>
            <p className="mt-1.5 text-[14px] text-white/60">Precios «desde» y plazos de tryvex.tech. Cada proyecto se cotiza a medida.</p>
            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-3">
              {GRUPOS_TECH.map((g, indice) => {
                const minimo = precioMinimo(g)
                return (
                  <details key={g.id} name="servicios-tech" open={indice === 0} className="tech-panel group rounded-[22px] bg-white/[0.06] ring-1 ring-white/12 backdrop-blur-sm open:bg-white/[0.09] open:ring-[#7fd4ff]/35">
                    <summary className="flex cursor-pointer list-none items-center gap-3 p-3.5 t:gap-4 t:p-5 [&::-webkit-details-marker]:hidden">
                      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/12 text-[#7fd4ff] t:size-11"><Icono trazo={g.icono} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[16px] leading-tight font-semibold tracking-tarjeta t:text-[19px]">{g.titulo}</span>
                        <span className="mt-1 block text-[13px] leading-snug text-white/60 t:text-[14px]">{g.resumen}</span>
                      </span>
                      {minimo && (
                        <span className="cifra hidden shrink-0 text-right text-[13px] leading-tight text-white/60 t:block">
                          {minimo.desde ? 'desde' : ''}
                          <span className="block text-[15px] font-semibold text-white">{clp(minimo.precio)}{minimo.mensual ? '/mes' : ''}</span>
                        </span>
                      )}
                      <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-white transition-transform duration-300 group-open:rotate-45"><Icono trazo="mas" size={16} grosor={2} /></span>
                    </summary>

                    <div className="tech-contenido px-3.5 pb-5 t:px-5 t:pb-6">
                      <ul className="divide-y divide-white/10 border-t border-white/10 pt-5">
                        {g.items.map((it) => <Item key={it.nombre} item={it} />)}
                      </ul>
                      <a
                        href={whatsappTech(g.titulo)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="tienda-boton mt-6 w-full bg-[#7fd4ff] text-black hover:bg-[#9ddcff] t:w-auto"
                      >
                        Cotizar esto por WhatsApp<span className="sr-only"> (se abre en otra pestaña)</span>
                      </a>
                    </div>
                  </details>
                )
              })}
            </div>
          </div>
        </div>

        <ul className="mt-10 flex flex-wrap gap-2 border-t border-white/15 pt-6">
          {TRYVEX_TECH.redes.map((r) => (
            <li key={r.href}>
              <a href={r.href} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white/10 px-4 text-[14px] font-medium text-white hover:bg-white/20">
                <IconoRed red={r.red} size={16} />
                {r.usuario}
                <span className="sr-only">: {r.nombre} (se abre en otra pestaña)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
