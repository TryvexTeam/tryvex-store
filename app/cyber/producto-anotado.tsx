import Image from 'next/image'
import type { ProductoTienda } from '@/lib/tienda'
import { clp } from '@/lib/formato'
import { EnlaceMedido } from './rastreo'

/**
 * La oferta más grande de la selección, sobre negro, con sus datos alrededor
 * unidos por líneas finas que se dibujan al llegar (como una ficha técnica).
 * Todos los datos son reales: descuento, precio, colores y garantía.
 *
 * En escritorio: dato · línea · producto · línea · dato. En el teléfono las
 * líneas sobran: el producto arriba y los datos en dos columnas debajo.
 */
type Dato = { valor: string; etiqueta: string; acento?: boolean }

/**
 * Fotos preparadas para fondo negro, por slug. Algunas fotos del catálogo
 * traen zonas blancas encerradas (el hueco de una correa) que en la tienda,
 * sobre blanco, no se notan, pero sobre negro se ven como una mancha. La
 * copia limpia se hace con `scripts/herramientas/quitar-blanco.py`.
 */
const FOTO_SOBRE_NEGRO: Record<string, string> = {
  'reloj-ultra-3-49mm': '/tienda/cyber/reloj-ultra-3-49mm-sobre-negro.webp',
}

function Anotacion({ dato, lado }: { dato: Dato; lado: 'izquierda' | 'derecha' }) {
  return (
    <div className={`flex items-center gap-4 ${lado === 'izquierda' ? 'flex-row' : 'flex-row-reverse'}`}>
      <div className={lado === 'izquierda' ? 'text-right' : 'text-left'}>
        <p className={`cifra text-[34px] leading-none font-semibold tracking-seccion ${dato.acento ? 'text-spark' : 'text-white'}`}>{dato.valor}</p>
        <p className="mt-2 max-w-[22ch] text-[13px] leading-snug text-white/60">{dato.etiqueta}</p>
      </div>
      {/* Línea que se dibuja desde el dato hacia el producto, con un punto al final. */}
      <span aria-hidden className={`anotado-linea relative hidden h-px min-w-12 flex-1 bg-white/35 d:block ${lado === 'izquierda' ? 'origin-left' : 'origin-right'}`}>
        <span className={`absolute top-1/2 size-1.5 -translate-y-1/2 rounded-full bg-white ${lado === 'izquierda' ? 'right-0' : 'left-0'}`} />
      </span>
    </div>
  )
}

export function ProductoAnotado({ producto }: { producto: ProductoTienda }) {
  const descuento = producto.precioAntes ? Math.floor((1 - producto.precio / producto.precioAntes) * 100) : null
  const datos: Dato[] = [
    descuento ? { valor: `${descuento}%`, etiqueta: 'de descuento sobre el precio anterior', acento: true } : { valor: clp(producto.precio), etiqueta: 'precio Cyber' },
    producto.precioAntes ? { valor: clp(producto.precio), etiqueta: `antes ${clp(producto.precioAntes)}` } : { valor: 'Stock', etiqueta: 'sujeto a disponibilidad' },
    producto.colores.length > 1 ? { valor: String(producto.colores.length), etiqueta: 'colores para elegir' } : { valor: 'Envío', etiqueta: 'a todo Chile' },
    { valor: '6 meses', etiqueta: 'de garantía por fallas de fábrica' },
  ]

  return (
    <section aria-labelledby="anotado-titulo" className="px-[var(--canal)] pt-16 t:pt-24">
      <div className="relative isolate mx-auto max-w-[1204px] overflow-hidden rounded-[28px] bg-black px-6 py-12 text-white t:px-10 t:py-16">
        <span aria-hidden className="heroe-luz heroe-luz-cierre pointer-events-none absolute -z-10" />
        <div className="revela text-center">
          <h2 id="anotado-titulo" className="mx-auto max-w-[20ch] text-[30px] leading-[1.08] font-semibold tracking-seccion text-balance t:text-[44px]">
            La oferta más grande de esta selección.
          </h2>
          <p className="mt-3 text-[16px] text-white/70 t:text-[17px]">{producto.nombre}</p>
        </div>

        <div className="mt-10 grid items-center gap-8 d:grid-cols-[1fr_minmax(0,420px)_1fr] d:gap-0">
          <div className="hidden flex-col gap-16 d:flex">
            <Anotacion dato={datos[0]} lado="izquierda" />
            <Anotacion dato={datos[1]} lado="izquierda" />
          </div>
          <div className="revela-escala relative mx-auto aspect-square w-full max-w-[420px]">
            {producto.imagen && <Image src={FOTO_SOBRE_NEGRO[producto.slug] ?? producto.imagen} alt={producto.nombre} fill sizes="(min-width: 1069px) 420px, 80vw" loading="lazy" className="object-contain" />}
          </div>
          <div className="hidden flex-col gap-16 d:flex">
            <Anotacion dato={datos[2]} lado="derecha" />
            <Anotacion dato={datos[3]} lado="derecha" />
          </div>
          {/* Teléfono y tableta: los cuatro datos en una grilla, sin líneas. */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 d:hidden">
            {datos.map((d) => (
              <div key={d.etiqueta}>
                <dt className="sr-only">{d.etiqueta}</dt>
                <dd>
                  <p className={`cifra text-[28px] leading-none font-semibold ${d.acento ? 'text-spark' : 'text-white'}`}>{d.valor}</p>
                  <p className="mt-1.5 text-[13px] leading-snug text-white/60">{d.etiqueta}</p>
                </dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="mt-10 flex justify-center">
          <EnlaceMedido
            href={producto.href}
            evento="CyberFeatured_Click"
            parametros={{ content_ids: [producto.sku], content_name: producto.nombre, content_type: 'product', value: producto.precio }}
            className="tienda-boton !min-h-[52px] bg-white px-8 text-[16px] font-semibold text-black hover:bg-white/85"
          >
            Ver producto
          </EnlaceMedido>
        </div>
      </div>
    </section>
  )
}
