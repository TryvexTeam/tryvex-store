import type { SupabaseClient } from '@supabase/supabase-js'
import { UUID } from '@/lib/catalogo'

type VarianteResuelta = { ok: true; id: string | null } | { ok: false; error: string }

/**
 * Resuelve la variante de un movimiento o de una línea de pedido.
 *
 * Reglas, en el servidor porque el formulario se puede manipular:
 *  - si el producto tiene variantes activas, elegir una es obligatorio
 *    (si no, el stock quedaría cargado a «ninguna» y nunca cuadraría);
 *  - la variante tiene que pertenecer a ese producto y estar activa.
 */
export async function varianteValida(
  supabase: SupabaseClient,
  productoId: string,
  varianteId: string
): Promise<VarianteResuelta> {
  const { data: activas } = await supabase
    .from('producto_variantes')
    .select('id')
    .eq('producto_id', productoId)
    .eq('activo', true)

  const ids = (activas ?? []).map((v) => v.id as string)
  if (ids.length === 0) return { ok: true, id: null }
  if (!varianteId) return { ok: false, error: 'Elige la variante: este producto tiene varias.' }
  if (!UUID.test(varianteId) || !ids.includes(varianteId))
    return { ok: false, error: 'La variante no corresponde a este producto.' }
  return { ok: true, id: varianteId }
}

/** Unidades libres del producto, o de una variante si se indica. */
export async function stockDisponible(
  supabase: SupabaseClient,
  productoId: string,
  varianteId: string | null
): Promise<number> {
  const { data } = varianteId
    ? await supabase.from('v_stock_variante').select('stock').eq('variante_id', varianteId).maybeSingle()
    : await supabase.from('v_stock_actual').select('stock').eq('producto_id', productoId).maybeSingle()
  return Number(data?.stock ?? 0)
}
