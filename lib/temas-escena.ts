/**
 * Colores del texto de una escena del banner, elegidos desde el panel.
 *
 * Dos decisiones separadas: el color base del texto (que depende de si la
 * imagen es clara u oscura) y el color de resalte (la segunda línea del
 * titular y el texto chico de arriba). La paleta es de la marca; el color
 * libre queda para campañas puntuales.
 */

/** Color base del texto. `claro`/`oscuro` es el tono de la escena, no del texto. */
export const TEMAS_TEXTO = [
  { valor: 'auto', etiqueta: 'Automático (el de la escena)' },
  { valor: 'blanco', etiqueta: 'Blanco, para imágenes oscuras' },
  { valor: 'negro', etiqueta: 'Negro, para imágenes claras' },
] as const
export type TemaTexto = (typeof TEMAS_TEXTO)[number]['valor']

export const ACENTOS = [
  { valor: 'auto', etiqueta: 'Automático', color: null },
  { valor: 'rojo', etiqueta: 'Rojo Tryvex', color: '#ff5a4f' },
  { valor: 'azul', etiqueta: 'Azul', color: '#0a84ff' },
  { valor: 'verde', etiqueta: 'Verde', color: '#30d158' },
  { valor: 'ambar', etiqueta: 'Ámbar', color: '#ff9f0a' },
  { valor: 'rosa', etiqueta: 'Rosa', color: '#ff375f' },
  { valor: 'blanco', etiqueta: 'Blanco', color: '#ffffff' },
  { valor: 'negro', etiqueta: 'Negro', color: '#1d1d1f' },
  { valor: 'degradado', etiqueta: 'Degradado de colores', color: null },
  { valor: 'libre', etiqueta: 'Otro color…', color: null },
] as const
export type Acento = (typeof ACENTOS)[number]['valor']

export const esHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v)

/** Tono de la escena según el color de texto elegido; `null` = el que trae la escena. */
export function tonoDeTema(tema: unknown): 'claro' | 'oscuro' | null {
  if (tema === 'blanco') return 'oscuro'
  if (tema === 'negro') return 'claro'
  return null
}

/**
 * Resalte listo para dibujar: un color CSS, `'degradado'`, o `null` para
 * dejar el de la escena. Todo lo que no sea de la paleta o un hex válido se
 * ignora: este valor termina en un `style`.
 */
export function colorDeAcento(acento: unknown, libre: unknown): string | null {
  if (acento === 'degradado') return 'degradado'
  if (acento === 'libre') return esHex(libre) ? libre : null
  return ACENTOS.find((a) => a.valor === acento)?.color ?? null
}
