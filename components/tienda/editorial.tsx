import { getImageProps } from 'next/image'
import Link from 'next/link'
import styles from './editorial.module.css'
import { destinoDe, hrefDeDestino, textoDe, type PiezaLanding } from '@/lib/secciones'

const base = '/tienda/campana/banners/'

/** Mapa de piezas editables, tal como lo entrega `leerPiezas()`. */
export type Piezas = Map<string, PiezaLanding> | undefined

/**
 * Una franja editorial de la portada.
 *
 * Cada franja tiene una `clave` que la liga a una fila de `secciones_landing`.
 * Si esa fila existe, manda: su imagen, sus textos y su destino. Si no existe
 * —o si la consulta falló— se usan los valores que vienen por props, que son
 * los que la portada tuvo siempre. Así el panel puede ir tomando control de
 * las franjas de a una, sin que la página quede nunca a medio camino.
 */
function Pieza({ clave, asset, titulo, bajada, claro = false, formato = 'doble', piezas }: {
  clave: string
  asset: string
  titulo: string
  bajada: string
  claro?: boolean
  formato?: 'doble' | 'ancho' | 'alto' | 'bajo'
  piezas?: Piezas
}) {
  const cfg = piezas?.get(clave)?.contenido
  const tit = textoDe(cfg, 'titulo') ?? titulo
  const baj = textoDe(cfg, 'bajada') ?? bajada
  const alt = textoDe(cfg, 'alt') ?? ''
  const srcMovil = textoDe(cfg, 'foto_movil') ?? `${base}${asset}-movil.webp`
  const srcEscritorio = textoDe(cfg, 'foto_escritorio') ?? `${base}${asset}-escritorio.webp`

  // Destino configurable. Sin destino cargado, la franja sigue llevando al
  // catálogo completo, que es su comportamiento histórico.
  const href = hrefDeDestino(destinoDe(cfg)) ?? '/tienda'
  const externo = /^https?:\/\//i.test(href)

  const sizes = formato === 'ancho'
    ? '(min-width: 1204px) 1160px, calc(100vw - 44px)'
    : '(min-width: 1204px) 572px, (min-width: 1069px) calc((100vw - 60px) / 2), calc(100vw - 44px)'
  const movil = getImageProps({ src: srcMovil, alt, width: 1122, height: 1402, sizes, loading: 'lazy' }).props
  const escritorio = getImageProps({ src: srcEscritorio, alt, width: 1930, height: 815, sizes, loading: 'lazy' }).props

  return (
    <article className={`revela ${styles.pieza} ${styles[formato]} ${claro ? styles.claro : ''}`}>
      <picture>
        {/* Tiles casi cuadradas o altas usan la composición vertical: la horizontal recortaba los productos. */}
        {(formato === 'ancho' || formato === 'bajo') && <source media="(min-width: 1069px)" srcSet={escritorio.srcSet} sizes={sizes} />}
        <img {...movil} alt={alt} className={styles.imagen} />
      </picture>
      <div className={styles.copy}>
        <h2>{tit}</h2>
        <p>{baj}</p>
        {externo ? (
          <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${tit} (se abre en otra pestaña)`} className={styles.cta}>
            Ver más <span aria-hidden>→</span>
          </a>
        ) : (
          <Link href={href} aria-label={`Explorar: ${tit}`} className={styles.cta}>
            Explorar la tienda <span aria-hidden>→</span>
          </Link>
        )}
      </div>
    </article>
  )
}

export function BannerDoble({ piezas }: { piezas?: Piezas }) {
  // Pastel sin halos (rechazo del señor Ignacio a los bordes rojos de cargadores y tablet).
  return <section aria-label="Audio y relojes" className={`${styles.seccion} ${styles.dobleGrid}`}>
    <Pieza piezas={piezas} clave="editorial-flanco" asset="flanco" titulo="Escucha a todo color." bajada="Fundas y accesorios para tus audífonos." claro />
    <Pieza piezas={piezas} clave="editorial-watch" asset="watch" titulo="Cambia de estilo en segundos." bajada="Correas deportivas y metálicas para tu reloj." claro />
  </section>
}

export function BannerAncho({ piezas }: { piezas?: Piezas }) {
  return <section aria-label="Protección para tu iPhone" className={styles.seccion}>
    <Pieza piezas={piezas} clave="editorial-fundas-iphone17pm" asset="fundas-iphone17pm" titulo="Protección para tu iPhone." bajada="Hazlo tuyo, hasta en los detalles. Revisa la compatibilidad en cada producto." formato="ancho" />
  </section>
}

export function MosaicoCampana({ piezas }: { piezas?: Piezas }) {
  return <section aria-label="Más formas de vivir Tryvex" className={`${styles.seccion} ${styles.mosaico}`}>
    <Pieza piezas={piezas} clave="editorial-relojes" asset="relojes" titulo="Tu tiempo. Tu estilo." bajada="Detalles que van contigo a todas partes." claro formato="alto" />
    <Pieza piezas={piezas} clave="editorial-fila" asset="fila" titulo="Tu favorito, en tu color." bajada="Estuches y fundas para cada estilo." formato="bajo" />
    <Pieza piezas={piezas} clave="editorial-esquinas" asset="esquinas" titulo="Pequeños detalles. Más posibilidades." bajada="Explora todo lo que Tryvex tiene para ti." formato="bajo" />
  </section>
}
