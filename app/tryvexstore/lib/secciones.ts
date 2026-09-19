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

/** A dónde lleva una pieza cuando el visitante la toca. */
export type DestinoPieza =
  | { tipo: 'ninguno' }
  /** Una dirección completa, para campañas o redes. */
  | { tipo: 'url'; valor: string }
  /** Una sección de la propia portada, por ancla. */
  | { tipo: 'seccion'; valor: string }
  /** Un producto, por slug. */
  | { tipo: 'producto'; valor: string }
  /** Una familia del catálogo, por slug. */
  | { tipo: 'categoria'; valor: string }

export interface PiezaLanding {
  clave: string
  titulo: string | null
  visible: boolean
  orden: number
  contenido: Record<string, unknown>
}

/**
 * Convierte el destino guardado en una dirección utilizable.
 * Devuelve `null` cuando la pieza no debe enlazar a ninguna parte: así quien
 * la dibuja decide entre renderizar un enlace o una imagen quieta.
 */
export function hrefDeDestino(destino: DestinoPieza | null | undefined): string | null {
  if (!destino || destino.tipo === 'ninguno') return null
  switch (destino.tipo) {
    case 'url': {
      const v = destino.valor?.trim()
      if (!v) return null
      // Solo direcciones internas o http(s). Sin esto, una pieza mal cargada
      // podría inyectar `javascript:` en un enlace de la portada.
      if (v.startsWith('/')) return v
      return /^https?:\/\//i.test(v) ? v : null
    }
    case 'seccion': {
      const v = destino.valor?.trim().replace(/^#/, '')
      return v ? `/#${v}` : null
    }
    case 'producto': {
      const v = destino.valor?.trim()
      return v ? `/producto/${encodeURIComponent(v)}` : null
    }
    case 'categoria': {
      const v = destino.valor?.trim()
      return v ? `/tienda?cat=${encodeURIComponent(v)}` : null
    }
    default:
      return null
  }
}

/** Lee el destino de una pieza, tolerando contenido incompleto o malformado. */
export function destinoDe(contenido: Record<string, unknown> | undefined): DestinoPieza {
  const d = contenido?.destino as { tipo?: string; valor?: string } | undefined
  if (!d?.tipo) return { tipo: 'ninguno' }
  const tipos = ['ninguno', 'url', 'seccion', 'producto', 'categoria'] as const
  const tipo = tipos.find((t) => t === d.tipo)
  if (!tipo || tipo === 'ninguno') return { tipo: 'ninguno' }
  return { tipo, valor: String(d.valor ?? '') } as DestinoPieza
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
