'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { ColorTienda, ProductoTienda } from '@/lib/tienda'
import { AgregarRapido } from './agregar-rapido'
import { Foto, MAX_MUESTRAS, Precio, avisoDe } from './card-producto-partes'

/**
 * Card de producto, medida sobre la fila «Accesorios» de apple.com/cl/store
 * (313 × 500, margen de 28 a los lados):
 *
 *   foto 230 × 230 a 69 del borde · colores centrados a 324 ·
 *   aviso 12/600 a 360 · nombre 17/600 con dos líneas reservadas a 381 ·
 *   precio 14/400 a 451.
 *
 * Los colores son círculos de 22 px con 11 de separación, como los de
 * dunedragon.cl: cada uno es el color de la variante o su muestra (una
 * imagen chica, para diseños de dos tonos o texturas). Tocar uno cambia la
 * foto de la card por la de esa variante, y la card lleva a la ficha con ese
 * color ya elegido.
 *
 * El enlace va «estirado» sobre la card (cubre todo, por encima del
 * contenido) y los círculos y el + quedan un nivel más arriba: un botón
 * dentro de un enlace no es válido, y así los círculos viven en su lugar
 * natural sin posiciones calculadas a mano.
 *
 * `fluida`:
 *   · `false` (por defecto): 313 × 500, la card de la portada.
 *   · `'movil'`: igual a la de la portada desde tablet; en el teléfono toma
 *     el ancho de su columna (dos por fila en /tienda).
 *   · `true`: siempre el ancho de su columna.
 * Con consultas de contenedor, en columnas angostas achica márgenes, foto,
 * círculos y letra.
 */
export function CardProducto({
  producto,
  transicion = true,
  fluida = false,
}: {
  producto: ProductoTienda
  transicion?: boolean
  fluida?: boolean | 'movil'
}) {
  const { nombre, imagen, agotado, colores, href } = producto
  const aviso = avisoDe(producto)
  const [elegido, setElegido] = useState<ColorTienda | null>(null)

  const foto = elegido?.imagen ?? imagen
  const destino = elegido ? `${href}?v=${encodeURIComponent(elegido.id)}` : href
  const visibles = colores.slice(0, MAX_MUESTRAS)

  const card = (
    <div
      className={`@container tienda-card tienda-card-producto group/card relative flex flex-col overflow-hidden rounded-[18px] bg-papel px-7 @max-[260px]:px-3.5 ${
        fluida === true
          ? 'tienda-card-fluida h-full'
          : fluida === 'movil'
            ? 'tienda-card-fluida-movil h-[450px] max-t:h-full d:h-[500px]'
            : 'h-[450px] d:h-[500px]'
      }`}
    >
      <div
        className={`relative mx-auto shrink-0 ${
          fluida === true
            ? 'mt-12 aspect-square w-full max-w-[230px] @max-[260px]:mt-10'
            : fluida === 'movil'
              ? 'mt-[52px] size-[200px] max-t:aspect-square max-t:size-auto max-t:w-full max-t:max-w-[230px] @max-[260px]:mt-10 d:mt-[69px] d:size-[230px]'
              : 'mt-[52px] size-[200px] d:mt-[69px] d:size-[230px]'
        }`}
      >
        <Foto
          key={foto ?? 'sin-foto'}
          src={foto}
          // La transición hacia la ficha solo con la foto principal: la de
          // una variante no es la que la ficha abre primero.
          slug={elegido?.imagen ? `${producto.slug}-${elegido.id}` : producto.slug}
          sizes="(min-width: 1069px) 230px, 45vw"
          className={`tienda-card-objeto object-contain ${agotado ? 'opacity-60' : ''}`}
          transicion={transicion && !elegido?.imagen}
        />
      </div>

      {/* Franja de colores: el mismo alto aunque no haya, para que el texto
          de todas las cards de la fila quede a la misma altura. */}
      <div className="relative z-[2] flex h-[48px] shrink-0 items-center justify-center d:h-[58px] @max-[260px]:h-[40px]">
        {visibles.length > 0 && (
          <ul role="radiogroup" aria-label={`Colores de ${nombre}`} className="flex flex-wrap items-center justify-center gap-[11px] @max-[260px]:gap-2">
            {visibles.map((c) => {
              const activo = elegido?.id === c.id
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activo}
                    aria-label={c.nombre}
                    title={c.nombre}
                    onClick={() => setElegido(activo ? null : c)}
                    className={`relative block size-[22px] rounded-full transition-[box-shadow] duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta @max-[260px]:size-[18px] ${
                      activo ? 'shadow-[0_0_0_2px_var(--color-papel),0_0_0_3.5px_var(--color-tinta)]' : 'hover:shadow-[0_0_0_2px_var(--color-papel),0_0_0_3px_var(--color-gris)]'
                    }`}
                    style={
                      c.muestra
                        ? { backgroundImage: `url("${c.muestra}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
                        : { background: c.hex ?? 'var(--color-papel-alt)' }
                    }
                  >
                    {/* Borde fino por dentro: un círculo blanco sobre fondo blanco igual se ve. */}
                    <span aria-hidden className="absolute inset-0 rounded-full ring-1 ring-black/10 ring-inset" />
                  </button>
                </li>
              )
            })}
            {colores.length > MAX_MUESTRAS && <li className="text-[12px] text-gris">+{colores.length - MAX_MUESTRAS}</li>}
          </ul>
        )}
      </div>

      <p className={`mt-[3px] h-4 truncate text-[12px] leading-4 font-semibold tracking-[-0.01em] @max-[260px]:text-[10.5px] @max-[260px]:tracking-[-0.02em] ${agotado ? 'text-tinta-suave' : 'text-vino'}`}>{aviso}</p>
      <h3 className="mt-[5px] line-clamp-2 h-[42px] text-[17px] leading-[21px] font-semibold tracking-[-0.022em] @max-[260px]:h-[38px] @max-[260px]:text-[15px] @max-[260px]:leading-[19px]">
        {nombre}
      </h3>
      <p className={`text-[14px] leading-[18px] tracking-[-0.016em] text-tinta @max-[260px]:text-[13px] @max-[260px]:[&_.line-through]:ml-0 @max-[260px]:[&_.line-through]:block ${fluida === true ? 'mt-4 pb-7 @max-[260px]:pb-5' : fluida === 'movil' ? 'mt-auto pb-[33px] max-t:mt-4 max-t:pb-5' : 'mt-auto pb-[33px]'}`}>
        <Precio producto={producto} />
        {elegido && <span className="ml-1.5 text-tinta-suave @max-[260px]:block @max-[260px]:ml-0">· {elegido.nombre}</span>}
      </p>

      {/* Enlace estirado: toda la card lleva a la ficha. */}
      <Link
        href={destino}
        aria-label={elegido ? `${nombre}, ${elegido.nombre}` : nombre}
        className="absolute inset-0 z-[1] rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tinta"
      />

      <div className="absolute top-4 right-4 z-[2] @max-[260px]:top-2 @max-[260px]:right-2 @max-[260px]:origin-top-right @max-[260px]:scale-[0.8]">
        <AgregarRapido producto={producto} />
      </div>
    </div>
  )

  // En una grilla la card toma el ancho de su columna y se ajusta a él con
  // consultas de contenedor. El contenedor tiene que envolverla: una
  // consulta no puede leer el ancho del mismo elemento que la declara. En el
  // carrusel (tamaño fijo) no se envuelve: un contenedor dentro de un ítem
  // que se mide por su contenido colapsaría la fila.
  return fluida ? <div className="@container h-full">{card}</div> : card
}
