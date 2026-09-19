import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { urlPublica, rutasDeGaleria } from '@/lib/imagenes'
import type { ProductoTienda } from '@/lib/tienda'
import { MAX_POR_PEDIDO, type FichaProducto } from '@/lib/ficha-precio'

export { MAX_POR_PEDIDO, precioPara } from '@/lib/ficha-precio'
export type { FichaProducto, VarianteFicha, TramoFicha } from '@/lib/ficha-precio'

/**
 * Ficha de producto para la tienda pública.
 *
 * Igual que la vitrina: solo lo publicado y solo columnas de vitrina. El
 * stock exacto no sale al navegador: se entrega tope a MAX_POR_PEDIDO,
 * suficiente para el selector de cantidad y para avisar «quedan pocas».
 */

const POCAS_UNIDADES = 5
export const FORMATO_SLUG = /^[a-z0-9][a-z0-9-]{0,79}$/

const tope = (n: number) => Math.max(0, Math.min(MAX_POR_PEDIDO, n))

export async function leerFicha(slug: string): Promise<FichaProducto | null> {
  if (!FORMATO_SLUG.test(slug)) return null
  const db = crearClienteAdministrador()

  const { data: p } = await db
    .from('productos')
    .select('id,sku,slug,nombre,descripcion,marca,condicion,etiqueta,precio_base,precio_antes,imagen_url,galeria,categorias(nombre,slug)')
    .eq('slug', slug)
    .eq('estado', 'publicado')
    .maybeSingle()
  if (!p) return null

  const [{ data: variantes }, { data: stockVar }, { data: stock }, { data: tramos }] = await Promise.all([
    db.from('producto_variantes').select('id,nombre,sku,color_hex,precio,imagen_url').eq('producto_id', p.id).eq('activo', true).order('orden'),
    db.from('v_stock_variante').select('variante_id,stock').eq('producto_id', p.id),
    db.from('v_stock_actual').select('stock').eq('producto_id', p.id).maybeSingle(),
    db.from('precio_tramos').select('min_unidades,max_unidades,precio_unitario,etiqueta').eq('producto_id', p.id).eq('activo', true).order('min_unidades'),
  ])

  const precio = Number(p.precio_base)
  const antes = p.precio_antes === null ? null : Number(p.precio_antes)
  const stockPor = new Map((stockVar ?? []).map((s) => [s.variante_id as string, Number(s.stock ?? 0)]))
  const total = Number(stock?.stock ?? 0)

  // La portada va primero; el resto de la galería conserva su orden.
  const rutas = rutasDeGaleria(p.galeria)
  const orden = p.imagen_url ? [p.imagen_url, ...rutas.filter((r) => r !== p.imagen_url)] : rutas

  return {
    id: p.id,
    sku: p.sku,
    slug: p.slug,
    nombre: p.nombre,
    descripcion: p.descripcion,
    marca: p.marca,
    condicion: p.condicion,
    etiqueta: p.etiqueta,
    precio,
    precioAntes: antes !== null && antes > precio ? antes : null,
    galeria: orden.map(urlPublica),
    // La relación es muchos-a-uno: PostgREST devuelve un objeto aunque el
    // cliente la tipe como lista.
    categoria: (p.categorias as unknown as { nombre: string; slug: string } | null) ?? null,
    disponible: tope(total),
    pocas: total > 0 && total <= POCAS_UNIDADES,
    variantes: (variantes ?? []).map((v) => ({
      id: v.id,
      nombre: v.nombre,
      sku: v.sku,
      colorHex: v.color_hex,
      precio: v.precio === null ? precio : Number(v.precio),
      imagen: v.imagen_url ? urlPublica(v.imagen_url) : null,
      disponible: tope(stockPor.get(v.id) ?? 0),
    })),
    tramos: (tramos ?? []).map((t) => ({
      min: t.min_unidades,
      max: t.max_unidades,
      precio: Number(t.precio_unitario),
      etiqueta: t.etiqueta,
    })),
  }
}

/** Relacionados: primero de la misma categoría, luego lo más reciente. */
export function relacionados(ficha: FichaProducto, vitrina: ProductoTienda[], cuantos = 8): ProductoTienda[] {
  const propia = vitrina.find((p) => p.id === ficha.id)?.categoriaId ?? null
  const otros = vitrina.filter((p) => p.id !== ficha.id)
  const misma = propia ? otros.filter((p) => p.categoriaId === propia) : []
  return [...new Set([...misma, ...otros])].slice(0, cuantos)
}
