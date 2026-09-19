import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Forma que usan los formularios de Stock y Pedidos para elegir producto y,
 * si corresponde, variante. Vive aparte de `variantes.ts` porque ese módulo
 * es de servidor y este tipo lo importan componentes de cliente.
 */
export interface ProductoConVariantes {
  id: string
  nombre: string
  costo_unitario: number | null
  variantes: { id: string; nombre: string; stock: number }[]
}

/** Productos vendibles (no archivados) con sus variantes activas y su stock. */
export async function productosConVariantes(supabase: SupabaseClient): Promise<ProductoConVariantes[]> {
  const [{ data: productos }, { data: variantes }, { data: stock }] = await Promise.all([
    supabase.from('productos').select('id,nombre,costo_unitario').neq('estado', 'archivado').order('orden'),
    supabase.from('producto_variantes').select('id,producto_id,nombre').eq('activo', true).order('orden'),
    supabase.from('v_stock_variante').select('variante_id,stock'),
  ])
  const stockPor = new Map((stock ?? []).map((s) => [s.variante_id as string, Number(s.stock ?? 0)]))
  return (productos ?? []).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    costo_unitario: p.costo_unitario === null ? null : Number(p.costo_unitario),
    variantes: (variantes ?? [])
      .filter((v) => v.producto_id === p.id)
      .map((v) => ({ id: v.id, nombre: v.nombre, stock: stockPor.get(v.id) ?? 0 })),
  }))
}
