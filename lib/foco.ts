/**
 * Escena en foco de la portada («Diseñados para acompañarte»).
 *
 * Se edita desde el panel, en Portada, y vive en la fila `foco` de
 * `secciones_landing`. Antes el producto salía solo (el primero disponible
 * de la vitrina) y las frases estaban escritas en el código.
 *
 * Si la fila no existe o viene incompleta, cada campo cae a lo que la escena
 * mostraba antes: la portada nunca depende de que la ranura esté llena.
 */

export const CLAVE_FOCO = 'foco'

/** Con el scroll: el video avanza y retrocede con la página. En bucle: corre solo. */
export type ModoFoco = 'scroll' | 'bucle'
export const MODOS_FOCO: readonly ModoFoco[] = ['bucle', 'scroll']

export interface FraseFoco {
  antes: string
  resaltado: string
}

export interface EscenaFoco {
  /** Slug del producto al que lleva el botón. `null` = el primero disponible. */
  producto: string | null
  /** URL pública del video. Si hay video, reemplaza a la foto del producto. */
  video: string | null
  modo: ModoFoco
  /** Siempre tres. Una vacía toma la frase por defecto de su lugar. */
  frases: [FraseFoco, FraseFoco, FraseFoco]
}

/** Largo máximo de cada mitad de frase: son titulares, no párrafos. */
export const LARGO_FRASE = 60

export const FRASES_POR_DEFECTO: [FraseFoco, FraseFoco, FraseFoco] = [
  { antes: 'Diseñados para', resaltado: 'acompañarte.' },
  { antes: 'Precios claros,', resaltado: 'sin sorpresas.' },
  { antes: 'Envío a todo', resaltado: 'Chile.' },
]

const texto = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** Lee el `contenido` guardado sin confiar en su forma. */
export function escenaFocoDe(contenido: Record<string, unknown> | null | undefined): EscenaFoco {
  const c = contenido ?? {}
  const crudas = Array.isArray(c.frases) ? c.frases : []
  const frases = FRASES_POR_DEFECTO.map((defecto, i) => {
    const f = (crudas[i] ?? {}) as Record<string, unknown>
    const antes = texto(f.antes, LARGO_FRASE)
    const resaltado = texto(f.resaltado, LARGO_FRASE)
    return antes || resaltado ? { antes, resaltado } : defecto
  }) as [FraseFoco, FraseFoco, FraseFoco]

  const video = texto(c.video, 500)
  return {
    producto: texto(c.producto, 120) || null,
    // Solo http(s): una URL mal cargada no puede terminar en el src del video.
    video: /^https?:\/\//i.test(video) ? video : null,
    modo: c.modo === 'scroll' ? 'scroll' : 'bucle',
    frases,
  }
}
