import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import { destinoDe, hrefDeDestino, textoDe, type PiezaLanding } from '@/lib/secciones'
import { Carrusel } from './carrusel'

/**
 * «Explora la colección», en la fila deslizable de «Lo último» de
 * apple.com/cl/store: cards de 400 × 500 (309 × 450 en teléfono) con la foto
 * a sangre y el texto arriba a la izquierda, a 28 px del borde.
 *
 * Las cards salen de las franjas editoriales del panel (Portada → Franjas):
 * misma foto vertical, título, bajada y destino. Así no hay una segunda
 * lista de fotos escrita en el código que se desactualice sola. Si la tabla
 * no trae franjas, quedan las piezas de siempre.
 */

interface CardColeccion {
  clave: string
  /** El aviso chico de arriba, como el «Nuevo» de Apple. */
  etiqueta: string
  foto: string
  titulo: string
  bajada: string | null
  href: string
  /** Foto clara: texto oscuro. Foto oscura: texto blanco. */
  claro: boolean
}

const RESPALDO: CardColeccion[] = [
  { clave: 'flanco', etiqueta: 'Audio', foto: '/tienda/campana/banners/flanco-movil.webp', titulo: 'Audio a todo color.', bajada: null, href: '/tienda', claro: true },
  { clave: 'watch', etiqueta: 'Correas', foto: '/tienda/campana/banners/watch-movil.webp', titulo: 'Tu reloj, tu estilo.', bajada: null, href: '/tienda', claro: true },
  { clave: 'fundas', etiqueta: 'Fundas', foto: '/tienda/campana/banners/fundas-iphone17pm-movil.webp', titulo: 'Protección transparente.', bajada: null, href: '/tienda', claro: false },
  { clave: 'relojes', etiqueta: 'Correas', foto: '/tienda/campana/banners/relojes-movil.webp', titulo: 'Correas tejidas.', bajada: null, href: '/tienda', claro: true },
  { clave: 'fila', etiqueta: 'Estuches', foto: '/tienda/campana/banners/fila-movil.webp', titulo: 'Tu favorito, en tu color.', bajada: null, href: '/tienda', claro: false },
]

function cardsDe(piezas: Map<string, PiezaLanding>): CardColeccion[] {
  const cards = [...piezas.values()]
    .filter((p) => p.clave.startsWith('editorial-') && p.visible)
    .sort((a, b) => a.orden - b.orden)
    .flatMap((p): CardColeccion[] => {
      const foto = textoDe(p.contenido, 'foto_movil')
      const titulo = textoDe(p.contenido, 'titulo')
      if (!foto || !titulo) return []
      return [{
        clave: p.clave,
        // El panel puede fijar su propia etiqueta; si no, se usa el nombre
        // de la franja (lo que va después del «·» en su título interno).
        etiqueta: textoDe(p.contenido, 'etiqueta') ?? p.titulo?.split('·').pop()?.trim() ?? 'Colección',
        foto,
        titulo,
        bajada: textoDe(p.contenido, 'bajada'),
        // Una franja sin destino igual lleva a la tienda: una card que no
        // se puede tocar en una fila de cards se siente rota.
        href: hrefDeDestino(destinoDe(p.contenido)) ?? '/tienda',
        claro: p.contenido.claro !== false,
      }]
    })
  return cards.length ? cards : RESPALDO
}

export function ExploraColeccion({ piezas }: { piezas: Map<string, PiezaLanding> }) {
  const cards = cardsDe(piezas)

  return (
    <section aria-labelledby="coleccion-titulo" className="pt-10 t:pt-16">
      <h2 id="coleccion-titulo" className="revela px-[var(--canal)] text-[28px] leading-[1.1] font-semibold tracking-seccion t:text-[36px]">
        Explora la colección. <span className="text-gris">Ideas para combinar.</span>
      </h2>
      <div className="mt-3">
        <Carrusel etiqueta="Explora la colección">
          {cards.map((c, i) => (
            <div key={c.clave} className="revela-escala" style={{ '--i': `${i * 4}%` } as CSSProperties}>
              <Link
                href={c.href}
                className={`tienda-card tienda-card-grande relative block h-[450px] overflow-hidden rounded-[18px] d:h-[500px] ${c.claro ? 'bg-papel text-tinta' : 'bg-black text-white'}`}
              >
                <Image src={c.foto} alt="" fill sizes="(min-width: 1069px) 400px, 309px" className="tienda-card-objeto object-cover" />
                {/* Orden de «Lo último» (Apple): aviso 12/600 a 28 px, título
                    28/600 a 52, frase 14/600 y una línea 14/400 al cierre. */}
                <div className="relative z-10 px-7 pt-7">
                  <p className={`text-[12px] leading-4 font-semibold uppercase tracking-[0.02em] ${c.claro ? 'text-vino' : 'text-[#ff7a6e]'}`}>{c.etiqueta}</p>
                  <h3 className="mt-2 text-[24px] leading-[1.15] font-semibold tracking-tarjeta text-balance d:text-[28px] d:leading-8">{c.titulo}</h3>
                  {c.bajada && <p className="mt-2.5 max-w-[34ch] text-[14px] leading-[18px] font-semibold">{c.bajada}</p>}
                  <p className="mt-1.5 text-[14px] leading-[18px]">
                    Explorar <span aria-hidden>→</span>
                  </p>
                </div>
              </Link>
            </div>
          ))}
        </Carrusel>
      </div>
    </section>
  )
}
