import type { ProductoTienda } from '@/lib/tienda'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { CYBER_MAX_PRODUCTOS, CYBER_MIN_PRODUCTOS, CYBER_SLUGS, PRECIO_MINIMO_REAL } from '@/lib/cyber'

/** Lo que una campaña paga puede mostrar: con stock, con foto y con un precio que no sea de prueba. */
export function vendibleEnCampana(p: ProductoTienda): boolean {
  return !p.agotado && p.imagen !== null && p.precio >= PRECIO_MINIMO_REAL
}

/**
 * Productos de «Top ofertas Cyber»: primero los elegidos en `CYBER_SLUGS`, en
 * ese orden; si no alcanzan el mínimo, se completa con productos disponibles
 * con rebaja real (precio anterior mayor), de mayor a menor descuento.
 * `faltantes` lista los slugs omitidos (no existen, agotados o precio de prueba).
 */
export function productosCyber(productos: ProductoTienda[]): { lista: ProductoTienda[]; faltantes: string[] } {
  const porSlug = new Map(productos.map((p) => [p.slug, p]))
  const lista: ProductoTienda[] = []
  const faltantes: string[] = []
  for (const slug of CYBER_SLUGS) {
    const p = porSlug.get(slug)
    if (p && vendibleEnCampana(p)) lista.push(p)
    else faltantes.push(slug)
  }

  if (lista.length < CYBER_MIN_PRODUCTOS) {
    const ya = new Set(lista.map((p) => p.id))
    const relleno = productos
      .filter((p) => !ya.has(p.id) && vendibleEnCampana(p) && p.precioAntes !== null)
      .sort((a, b) => (b.precioAntes! - b.precio) / b.precioAntes! - (a.precioAntes! - a.precio) / a.precioAntes!)
    lista.push(...relleno.slice(0, CYBER_MIN_PRODUCTOS - lista.length))
  }
  return { lista: lista.slice(0, CYBER_MAX_PRODUCTOS), faltantes }
}

/**
 * Desde cuántas unidades hay precio por cantidad, mirando los tramos activos
 * de productos publicados. Es el dato honesto para «precios por cantidad desde
 * N unidades» (el tramo más barato suele ser el de 100+, que no es la entrada).
 */
export async function leerMinimoMayorista(): Promise<number | null> {
  const db = crearClienteAdministrador()
  const { data } = await db
    .from('precio_tramos')
    .select('min_unidades,productos!inner(estado)')
    .eq('activo', true)
    .eq('productos.estado', 'publicado')
    .gt('min_unidades', 1)
    .order('min_unidades', { ascending: true })
    .limit(1)
  const minimo = Number(data?.[0]?.min_unidades)
  return Number.isInteger(minimo) && minimo > 1 ? minimo : null
}
