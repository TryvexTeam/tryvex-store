import Image from 'next/image'
import Link from 'next/link'
import type { CSSProperties } from 'react'
import type { ProductoTienda } from '@/lib/tienda'

/**
 * Una frase con los productos dentro del texto: «Tecnología [foto] para el día
 * a día, [foto] para regalar…». Cada foto es una cápsula que lleva a su ficha
 * y entra en cascada con el movimiento de lectura de la tienda (`revela-escala`).
 *
 * Las fotos del catálogo vienen sin fondo, así que la cápsula es papel con un
 * borde fino. Las partes pueden ir en tinta (lo importante) o en gris (los
 * conectores), igual que «Explora la colección. Ideas para combinar.».
 */
export type ParteFrase = string | { tono: 'gris'; texto: string } | { producto: ProductoTienda }

export function FraseProductos({ id, partes, className = '' }: { id: string; partes: ParteFrase[]; className?: string }) {
  let indice = 0
  return (
    <section aria-labelledby={id} className={`px-[var(--canal)] ${className}`}>
      <h2
        id={id}
        className="revela mx-auto max-w-[1100px] text-[30px] leading-[1.3] font-semibold tracking-seccion text-balance text-tinta t:text-[44px] t:leading-[1.25] d:text-[56px]"
      >
        {partes.map((parte, i) => {
          if (typeof parte === 'string') return <span key={i}>{parte}</span>
          if ('texto' in parte) return <span key={i} className="text-gris">{parte.texto}</span>
          const p = parte.producto
          const estilo = { '--i': `${indice++ * 5}%` } as CSSProperties
          return (
            <Link
              key={i}
              href={p.href}
              aria-label={p.nombre}
              style={estilo}
              className="revela-escala group relative mx-[0.12em] inline-block h-[1.05em] w-[1.9em] top-[0.16em] overflow-hidden rounded-full bg-papel align-baseline shadow-sutil ring-1 ring-borde focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-spark motion-reduce:transition-none"
            >
              {p.imagen && (
                <Image src={p.imagen} alt="" fill sizes="128px" className="scale-[1.35] object-contain transition-transform duration-300 ease-salida group-hover:scale-[1.5] motion-reduce:transition-none" />
              )}
            </Link>
          )
        })}
      </h2>
    </section>
  )
}

/** Primer producto vendible (con stock y foto) de cada categoría pedida, en orden. */
export function productosPorCategoria(productos: ProductoTienda[], categorias: { id: string; slug: string }[], slugs: string[]): ProductoTienda[] {
  const idDe = new Map(categorias.map((c) => [c.slug, c.id]))
  const usados = new Set<string>()
  return slugs.flatMap((slug) => {
    const id = idDe.get(slug)
    const p = productos.find((x) => x.categoriaId === id && !x.agotado && x.imagen && !usados.has(x.id))
    if (!p) return []
    usados.add(p.id)
    return [p]
  })
}
