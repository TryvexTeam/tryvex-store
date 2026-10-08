import 'server-only'

import { normalizarLanding, type Bloque } from '@/lib/landing-producto'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * Bloques de la landing de un producto, solo los visibles y ya validados.
 *
 * Nunca rompe la ficha: si la columna todavía no existe (migración sin aplicar)
 * o la lectura falla, devuelve una lista vacía y la ficha se ve como siempre.
 */
export async function leerLanding(productoId: string): Promise<Bloque[]> {
  try {
    const db = crearClienteAdministrador()
    const { data, error } = await db.from('productos').select('landing').eq('id', productoId).maybeSingle()
    if (error || !data) return []
    return normalizarLanding(data.landing, productoId).filter((b) => b.visible)
  } catch {
    return []
  }
}
