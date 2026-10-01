/**
 * Landing editable de cada producto: tipos, valores por defecto y validación.
 *
 * Sin nada de servidor a propósito: el editor del panel (cliente) y la tienda
 * (servidor) comparten estos tipos, y `normalizarLanding` corre en el servidor
 * al guardar, que es donde de verdad se confía poco en lo que llega.
 *
 * La lista se guarda entera en `productos.landing` (jsonb). Cada bloque lleva
 * `id` (para las teclas de React y el orden) y `visible` (ocultar sin borrar).
 */

export const MAX_BLOQUES = 30
export const MAX_ITEMS = 12

export type FormatoImagen = 'horizontal' | 'cuadrado' | 'vertical'
export const FORMATOS: { valor: FormatoImagen; rotulo: string }[] = [
  { valor: 'horizontal', rotulo: 'Horizontal (16:9)' },
  { valor: 'cuadrado', rotulo: 'Cuadrada (1:1)' },
  { valor: 'vertical', rotulo: 'Vertical (4:5)' },
]

type Base = { id: string; visible: boolean }

export type Bloque =
  | (Base & { tipo: 'encabezado'; antetitulo: string; titulo: string; bajada: string; imagen: string; formato: FormatoImagen })
  | (Base & { tipo: 'imagen_texto'; imagen: string; formato: FormatoImagen; lado: 'izquierda' | 'derecha'; antetitulo: string; titulo: string; texto: string; puntos: string[] })
  | (Base & { tipo: 'galeria'; titulo: string; formato: FormatoImagen; imagenes: { imagen: string; pie: string }[] })
  | (Base & { tipo: 'caracteristicas'; titulo: string; bajada: string; items: { imagen: string; titulo: string; texto: string }[] })
  | (Base & { tipo: 'banner'; imagen: string; imagenMovil: string; titulo: string; texto: string; color: 'claro' | 'oscuro' })
  | (Base & { tipo: 'preguntas'; titulo: string; items: { pregunta: string; respuesta: string }[] })

export type TipoBloque = Bloque['tipo']

export const TIPOS_BLOQUE: { tipo: TipoBloque; rotulo: string; ayuda: string }[] = [
  { tipo: 'encabezado', rotulo: 'Encabezado', ayuda: 'Título grande con una bajada y una imagen.' },
  { tipo: 'imagen_texto', rotulo: 'Imagen con texto', ayuda: 'Una imagen al lado de un título, un texto y una lista de puntos.' },
  { tipo: 'galeria', rotulo: 'Galería', ayuda: 'Varias imágenes en fila, cada una con su pie.' },
  { tipo: 'caracteristicas', rotulo: 'Características', ayuda: 'Tarjetas con imagen, título y texto breve.' },
  { tipo: 'banner', rotulo: 'Banner', ayuda: 'Una imagen ancha con texto encima.' },
  { tipo: 'preguntas', rotulo: 'Preguntas frecuentes', ayuda: 'Lista de preguntas que se abren al tocarlas.' },
]

export const ROTULO_BLOQUE: Record<TipoBloque, string> = Object.fromEntries(
  TIPOS_BLOQUE.map((t) => [t.tipo, t.rotulo]),
) as Record<TipoBloque, string>

export function idBloque(): string {
  return Math.random().toString(36).slice(2, 10)
}

/** Bloque nuevo con los campos vacíos: el equipo escribe y sube lo suyo. */
export function bloqueNuevo(tipo: TipoBloque): Bloque {
  const base = { id: idBloque(), visible: true }
  switch (tipo) {
    case 'encabezado': return { ...base, tipo, antetitulo: '', titulo: '', bajada: '', imagen: '', formato: 'horizontal' }
    case 'imagen_texto': return { ...base, tipo, imagen: '', formato: 'cuadrado', lado: 'izquierda', antetitulo: '', titulo: '', texto: '', puntos: [] }
    case 'galeria': return { ...base, tipo, titulo: '', formato: 'cuadrado', imagenes: [{ imagen: '', pie: '' }, { imagen: '', pie: '' }] }
    case 'caracteristicas': return { ...base, tipo, titulo: '', bajada: '', items: [{ imagen: '', titulo: '', texto: '' }, { imagen: '', titulo: '', texto: '' }, { imagen: '', titulo: '', texto: '' }] }
    case 'banner': return { ...base, tipo, imagen: '', imagenMovil: '', titulo: '', texto: '', color: 'claro' }
    case 'preguntas': return { ...base, tipo, titulo: '', items: [{ pregunta: '', respuesta: '' }] }
  }
}

/** URL pública de las imágenes del bucket `productos` bajo la carpeta de un producto. */
export function prefijoImagenes(productoId: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/storage/v1/object/public/productos/${productoId}/`
}

const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/**
 * Solo se aceptan imágenes que viven en la carpeta de ESTE producto. El valor
 * llega del navegador, así que no se puede confiar en que sea una URL propia:
 * sin esta regla, un bloque podría apuntar a cualquier sitio.
 */
function imagen(v: unknown, productoId: string): string {
  const url = texto(v, 500)
  if (!url) return ''
  const prefijo = prefijoImagenes(productoId)
  return url.startsWith(prefijo) && !url.includes('..') && url.length > prefijo.length ? url : ''
}

const formato = (v: unknown): FormatoImagen => (v === 'horizontal' || v === 'vertical' || v === 'cuadrado' ? v : 'horizontal')
const lista = (v: unknown, max = MAX_ITEMS): unknown[] => (Array.isArray(v) ? v.slice(0, max) : [])
const objeto = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {})

/**
 * Deja la lista con la forma exacta que espera la tienda: descarta lo que no
 * reconoce, recorta los textos y vacía las imágenes que no son del producto.
 * Nunca lanza: lo inservible simplemente no pasa.
 */
export function normalizarLanding(crudo: unknown, productoId: string): Bloque[] {
  const salida: Bloque[] = []
  for (const item of lista(crudo, MAX_BLOQUES)) {
    const b = objeto(item)
    const base = { id: texto(b.id, 20) || idBloque(), visible: b.visible !== false }
    switch (b.tipo) {
      case 'encabezado':
        salida.push({ ...base, tipo: 'encabezado', antetitulo: texto(b.antetitulo, 80), titulo: texto(b.titulo, 140), bajada: texto(b.bajada, 400), imagen: imagen(b.imagen, productoId), formato: formato(b.formato) })
        break
      case 'imagen_texto':
        salida.push({
          ...base, tipo: 'imagen_texto', imagen: imagen(b.imagen, productoId), formato: formato(b.formato),
          lado: b.lado === 'derecha' ? 'derecha' : 'izquierda',
          antetitulo: texto(b.antetitulo, 80), titulo: texto(b.titulo, 140), texto: texto(b.texto, 1500),
          puntos: lista(b.puntos).map((p) => texto(p, 160)).filter(Boolean),
        })
        break
      case 'galeria':
        salida.push({
          ...base, tipo: 'galeria', titulo: texto(b.titulo, 140), formato: formato(b.formato),
          imagenes: lista(b.imagenes).map((i) => ({ imagen: imagen(objeto(i).imagen, productoId), pie: texto(objeto(i).pie, 140) })),
        })
        break
      case 'caracteristicas':
        salida.push({
          ...base, tipo: 'caracteristicas', titulo: texto(b.titulo, 140), bajada: texto(b.bajada, 400),
          items: lista(b.items).map((i) => ({ imagen: imagen(objeto(i).imagen, productoId), titulo: texto(objeto(i).titulo, 100), texto: texto(objeto(i).texto, 400) })),
        })
        break
      case 'banner':
        salida.push({ ...base, tipo: 'banner', imagen: imagen(b.imagen, productoId), imagenMovil: imagen(b.imagenMovil, productoId), titulo: texto(b.titulo, 140), texto: texto(b.texto, 400), color: b.color === 'oscuro' ? 'oscuro' : 'claro' })
        break
      case 'preguntas':
        salida.push({
          ...base, tipo: 'preguntas', titulo: texto(b.titulo, 140),
          items: lista(b.items).map((i) => ({ pregunta: texto(objeto(i).pregunta, 200), respuesta: texto(objeto(i).respuesta, 1000) })),
        })
        break
    }
  }
  return salida
}
