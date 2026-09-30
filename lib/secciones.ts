import 'server-only'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * Piezas editables de la portada.
 *
 * Hasta ahora las imágenes del héroe y de las franjas editoriales vivían
 * escritas a mano en `lib/campana.ts` y `components/tienda/editorial.tsx`:
 * cambiar un banner obligaba a tocar código y volver a desplegar. Aquí cada
 * pieza pasa a ser una fila de `secciones_landing`, identificada por su
 * `clave`, con la imagen, los textos y el destino guardados en `contenido`.
 *
 * Regla de oro de esta capa: **si la tabla no tiene la pieza, la portada usa
 * lo que ya tenía**. La migración es progresiva y nunca deja un hueco: el
 * panel puede ir llenando ranuras de a una sin romper la página.
 */

export { destinoDe, hrefDeDestino, type DestinoPieza } from '@/lib/destinos-pieza'

export interface PiezaLanding {
  clave: string
  titulo: string | null
  visible: boolean
  orden: number
  contenido: Record<string, unknown>
}

/** Texto de `contenido`, o `null` si no está cargado. */
export function textoDe(contenido: Record<string, unknown> | undefined, campo: string): string | null {
  const v = contenido?.[campo]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/**
 * Todas las piezas visibles, indexadas por clave.
 *
 * Una sola consulta por render: la portada pide el mapa completo y cada
 * componente busca su ranura. Si la tabla no existe o falla la consulta se
 * devuelve un mapa vacío, que es exactamente el caso «usa lo de siempre».
 */
export async function leerPiezas(): Promise<Map<string, PiezaLanding>> {
  try {
    const db = crearClienteAdministrador()
    const { data, error } = await db
      .from('secciones_landing')
      .select('clave,titulo,visible,orden,contenido')
      .eq('visible', true)
      .order('orden')
    if (error || !data) return new Map()
    return new Map(
      data.map((f) => [
        f.clave as string,
        {
          clave: f.clave as string,
          titulo: (f.titulo as string) ?? null,
          visible: Boolean(f.visible),
          orden: Number(f.orden ?? 0),
          contenido: (f.contenido ?? {}) as Record<string, unknown>,
        },
      ]),
    )
  } catch {
    // La portada nunca cae por un problema de esta tabla: sin piezas, se
    // dibuja el contenido que trae el código.
    return new Map()
  }
}
