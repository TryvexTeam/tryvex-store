/**
 * Borrador de una escena del banner: lo que el panel edita, lo que la vista
 * previa dibuja y lo que el servidor valida antes de guardar.
 *
 * Desde la versión 2 rige «lo que ves es lo que hay»: un texto vacío no se
 * muestra, una imagen quitada no vuelve y la cápsula de compra que traía el
 * código aparece en la lista para poder quitarla. En la versión 1, un campo
 * vacío traía de vuelta el texto del código: el equipo borraba un titular y
 * seguía viéndolo en la tienda.
 */
import { DIVISIONES, MAX_CAPSULAS, TIPOS_DESTINO, esDivision, leerDestino, leerPosicion, type Division, type Posicion, type TipoDestino } from '@/lib/destinos-pieza'
import { ACENTOS, TEMAS_TEXTO, esHex, type Acento, type TemaTexto } from '@/lib/temas-escena'
import type { EscenaHeroe } from '@/lib/campana'

export const VERSION_ESCENA = 2

export interface DestinoBorrador { tipo: TipoDestino; valor: string }
export interface ZonaBorrador { destino: DestinoBorrador; etiqueta: string }
export interface CapsulaBorrador {
  /** Llave estable para la lista del editor; no se guarda. */
  id?: string
  texto: string
  boton: string
  destino: DestinoBorrador
  movil: Posicion
  escritorio: Posicion
}

export interface BorradorEscena {
  version: typeof VERSION_ESCENA
  etiqueta: string
  antetitulo: string
  titulo_1: string
  titulo_2: string
  bajada: string
  boton: string
  destino: DestinoBorrador
  foto_movil: string
  foto_escritorio: string
  alt: string
  video: string
  sin_texto: boolean
  /** La cifra calculada de las escenas de promoción («Hasta 38%», «$6.500 c/u»). */
  mostrar_cifra: boolean
  tema_texto: TemaTexto
  acento: Acento
  acento_libre: string | null
  division: Division
  zonas: ZonaBorrador[]
  capsulas: CapsulaBorrador[]
}

const LARGOS = { etiqueta: 40, antetitulo: 120, titulo: 80, bajada: 240, boton: 40, alt: 240, zona: 80, capsulaTexto: 60, capsulaBoton: 30 } as const

const cadena = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const destino = (v: unknown): DestinoBorrador => {
  const d = leerDestino(v)
  return d.tipo === 'ninguno' ? { tipo: 'ninguno', valor: '' } : { tipo: d.tipo, valor: d.valor.trim().slice(0, 300) }
}
/** Solo rutas del sitio o http(s): estos valores terminan en `src` y `href`. */
const url = (v: unknown): string => {
  const s = cadena(v, 1000)
  return (s.startsWith('/') && !s.startsWith('//')) || /^https?:\/\//i.test(s) ? s : ''
}

/**
 * Lo que el editor muestra al abrir una escena: lo guardado y, donde nunca se
 * guardó nada (escenas en versión 1), lo que la tienda muestra hoy. Así el
 * formulario arranca igual a la portada y nada cambia hasta que se edita.
 */
export function borradorDesde(c: Record<string, unknown>, codigo: EscenaHeroe | undefined): BorradorEscena {
  const v2 = c.version === VERSION_ESCENA
  // En v1 un texto vacío significaba «el del código»: se hereda al abrirla.
  const texto = (k: string, respaldo: string | undefined, max: number) => {
    const guardado = cadena(c[k], max)
    return v2 || guardado ? guardado : (respaldo ?? '')
  }
  const capsulasGuardadas = Array.isArray(c.capsulas) ? (c.capsulas as unknown[]) : null
  // La cápsula de compra que el código ponía en la escena ahora es una más de
  // la lista: se ve, se mueve y se quita como las otras.
  const capsulas = capsulasGuardadas ?? (!v2 && codigo?.productoSlug
    ? [{ texto: '', boton: 'Comprar', destino: { tipo: 'producto', valor: codigo.productoSlug }, movil: { x: 50, y: 100 }, escritorio: { x: 100, y: 100 } }]
    : [])

  return {
    version: VERSION_ESCENA,
    etiqueta: texto('etiqueta', codigo?.etiqueta, LARGOS.etiqueta),
    antetitulo: texto('antetitulo', codigo?.antetitulo, LARGOS.antetitulo),
    titulo_1: texto('titulo_1', codigo?.titulo[0], LARGOS.titulo),
    titulo_2: texto('titulo_2', codigo?.titulo[1], LARGOS.titulo),
    bajada: texto('bajada', codigo?.bajada, LARGOS.bajada),
    boton: texto('boton', codigo?.promo === 'volumen' ? 'Ver ofertas' : 'Ver la tienda', LARGOS.boton),
    destino: destino(c.destino),
    foto_movil: v2 ? url(c.foto_movil) : url(c.foto_movil) || (codigo?.fotos?.movil.src ?? ''),
    foto_escritorio: v2 ? url(c.foto_escritorio) : url(c.foto_escritorio) || (codigo?.fotos?.escritorio.src ?? ''),
    alt: texto('alt', codigo?.fotos?.movil.alt, LARGOS.alt),
    video: url(c.video),
    sin_texto: c.sin_texto === true,
    mostrar_cifra: c.mostrar_cifra !== false,
    tema_texto: TEMAS_TEXTO.find((t) => t.valor === c.tema_texto)?.valor ?? 'auto',
    acento: ACENTOS.find((a) => a.valor === c.acento)?.valor ?? 'auto',
    acento_libre: esHex(c.acento_libre) ? c.acento_libre : null,
    division: esDivision(c.division) ? c.division : 'completa',
    zonas: (Array.isArray(c.zonas) ? (c.zonas as Record<string, unknown>[]) : []).map((z) => ({ destino: destino(z?.destino), etiqueta: cadena(z?.etiqueta, LARGOS.zona) })),
    capsulas: capsulas.slice(0, MAX_CAPSULAS).map((k, i) => {
      const x = (k ?? {}) as Record<string, unknown>
      return {
        id: `c${i}`,
        texto: cadena(x.texto, LARGOS.capsulaTexto),
        boton: cadena(x.boton, LARGOS.capsulaBoton),
        destino: destino(x.destino),
        movil: leerPosicion(x.movil, { x: 50, y: 100 }),
        escritorio: leerPosicion(x.escritorio, { x: 100, y: 100 }),
      }
    }),
  }
}

/** Error legible para quien edita, con la parte que hay que corregir. */
function errorDeDestino(d: DestinoBorrador, donde: string): string | null {
  if (d.tipo === 'ninguno') return null
  if (!d.valor) return `${donde}: elegiste a dónde lleva, pero falta indicar cuál.`
  if (d.tipo === 'url' && !((d.valor.startsWith('/') && !d.valor.startsWith('//')) || /^https?:\/\//i.test(d.valor)))
    return `${donde}: la dirección debe empezar con / para este sitio, o con https://`
  return null
}

/**
 * Valida lo que llega del navegador. Nada se confía: se reconstruye campo por
 * campo con los mismos lectores del editor, y lo que no calza se descarta.
 */
export function validarBorrador(crudo: unknown): { ok: true; borrador: BorradorEscena } | { ok: false; error: string } {
  if (!crudo || typeof crudo !== 'object') return { ok: false, error: 'No llegaron los cambios. Intenta de nuevo.' }
  const c = { ...(crudo as Record<string, unknown>), version: VERSION_ESCENA }
  const b = borradorDesde(c, undefined)

  const division = b.division
  b.zonas = division === 'completa' ? [] : DIVISIONES[division].map((_, i) => b.zonas[i] ?? { destino: { tipo: 'ninguno', valor: '' }, etiqueta: '' })
  if (!TIPOS_DESTINO.includes(b.destino.tipo)) b.destino = { tipo: 'ninguno', valor: '' }

  const errores = [
    errorDeDestino(b.destino, 'El botón'),
    ...b.zonas.map((z, i) => errorDeDestino(z.destino, `Zona ${i + 1}`)),
    ...b.capsulas.map((k, i) => errorDeDestino(k.destino, `Cápsula ${i + 1}`)),
    ...b.capsulas.map((k, i) => (!k.texto && k.destino.tipo !== 'producto' ? `Cápsula ${i + 1}: escribe un texto, o haz que lleve a un producto para mostrar su precio.` : null)),
  ].filter(Boolean)
  if (errores.length) return { ok: false, error: errores[0] as string }

  // La llave de la lista es del editor, no de la tienda.
  b.capsulas = b.capsulas.map(({ id: _id, ...resto }) => resto)
  return { ok: true, borrador: b }
}
