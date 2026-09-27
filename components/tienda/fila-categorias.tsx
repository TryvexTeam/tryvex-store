import Link from 'next/link'
import Image from 'next/image'
import { Estrella } from '@/app/marca'
import type { CategoriaTienda } from '@/lib/tienda'

/**
 * Fila de familias, medida sobre la de apple.com/cl/store: cada ítem mide
 * 146 × 148, la foto 120 × 78 a 18 px del borde y el nombre 14/600 con
 * interlineado 20 a 112 px. Sin caja ni borde: el objeto se reconoce solo.
 *
 * Arranca en el canal de la página, como el título, y se desliza con el
 * dedo o la rueda. La familia activa se marca con el nombre en negro y
 * subrayado; las demás van en gris.
 *
 * `conTodo` agrega al inicio «Todo», para volver al catálogo completo desde
 * la tienda (en la portada no hace falta).
 */
export function FilaCategorias({
  categorias,
  activa,
  conTodo = false,
}: {
  categorias: CategoriaTienda[]
  activa: string | null
  conTodo?: boolean
}) {
  if (categorias.length === 0) return null

  const items = [
    ...(conTodo ? [{ clave: 'todo', nombre: 'Todo', href: '/tienda', foto: null as string | null, activa: activa === null }] : []),
    ...categorias.map((c) => ({
      clave: c.id,
      nombre: c.nombre,
      href: `/tienda?cat=${encodeURIComponent(c.slug)}`,
      foto: c.productos.find((p) => p.imagen)?.imagen ?? null,
      activa: activa === c.slug,
    })),
  ]

  return (
    <nav aria-label="Familias de productos">
      <ul className="sin-barra flex snap-x overflow-x-auto px-[var(--canal)] py-2 [scroll-padding-inline:var(--canal)]">
        {items.map((it) => (
          <li key={it.clave} className="shrink-0 snap-start">
            <Link
              href={it.href}
              aria-current={it.activa ? 'page' : undefined}
              className="tienda-familia group relative block h-[148px] w-[124px] text-center focus-visible:outline-2 focus-visible:outline-offset-[-2px] t:w-[146px]"
            >
              <span className="absolute top-[18px] left-1/2 h-[78px] w-[120px] -translate-x-1/2">
                {it.foto ? (
                  <Image src={it.foto} alt="" fill sizes="120px" className="tienda-card-objeto object-contain" />
                ) : (
                  <span aria-hidden className={`grid size-full place-items-center ${it.activa ? 'text-tinta' : 'text-gris'}`}>
                    {/* «Todo»: cuatro puntos, el catálogo entero. */}
                    {it.clave === 'todo' ? (
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="8" height="8" rx="2" /><rect x="13" y="3" width="8" height="8" rx="2" /><rect x="3" y="13" width="8" height="8" rx="2" /><rect x="13" y="13" width="8" height="8" rx="2" /></svg>
                    ) : (
                      <Estrella size={34} />
                    )}
                  </span>
                )}
              </span>
              <span
                className={`absolute inset-x-1 top-[112px] line-clamp-2 text-[14px] leading-5 font-semibold tracking-[-0.016em] ${
                  it.activa ? 'text-tinta underline decoration-2 underline-offset-[5px]' : 'text-tinta-suave group-hover:text-tinta'
                }`}
              >
                {it.nombre}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
