import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { urlPublica } from '@/lib/imagenes'
import { MAX_LINEAS, MAX_UNIDADES_LINEA } from '@/lib/carrito'

/**
 * Cotización de un pedido, en el servidor.
 *
 * Es la única fuente del precio: recibe solo qué producto, qué opción y
 * cuántas unidades, y lee de la base todo lo demás (precio, tramo por
 * volumen, stock). La usan tanto la vista previa del checkout como la
 * creación del pedido, así que lo que el cliente ve es lo que se cobra.
 */

const FORMATO_SKU = /^[A-Z0-9][A-Z0-9-]{1,39}$/i
const FORMATO_UUID = /^[0-9a-f-]{36}$/i

export interface LineaPedida {
  sku: string
  varianteId: string | null
  cantidad: number
}

export interface LineaCotizada extends LineaPedida {
  clave: string
  productoId: string | null
  slug: string | null
  nombre: string
  variante: string | null
  imagen: string | null
  precioBase: number
  precio: number
  tramo: string | null
  subtotal: number
  /** Tope MAX_UNIDADES_LINEA: nunca el stock real. */
  disponible: number
  /** Próximo tramo más barato que se alcanza sumando unidades en esta misma línea. */
  siguienteTramo: { faltan: number; precio: number; etiqueta: string } | null
  error: string | null
}

/** Valida lo que llega del navegador y junta líneas repetidas. `null` si algo no calza. */
export function normalizarLineas(entrada: unknown): LineaPedida[] | null {
  if (!Array.isArray(entrada) || entrada.length === 0 || entrada.length > MAX_LINEAS) return null
  const mapa = new Map<string, LineaPedida>()
  for (const x of entrada) {
    if (!x || typeof x !== 'object') return null
    const o = x as Record<string, unknown>
    const sku = typeof o.sku === 'string' ? o.sku : ''
    const varianteId = o.varianteId === null || o.varianteId === undefined || o.varianteId === '' ? null : String(o.varianteId)
    const cantidad = Number(o.cantidad)
    if (!FORMATO_SKU.test(sku) || (varianteId !== null && !FORMATO_UUID.test(varianteId))) return null
    if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > MAX_UNIDADES_LINEA) return null
    const clave = `${sku}::${varianteId ?? ''}`
    const previa = mapa.get(clave)?.cantidad ?? 0
    mapa.set(clave, { sku, varianteId, cantidad: Math.min(MAX_UNIDADES_LINEA, previa + cantidad) })
  }
  return [...mapa.values()]
}

export async function cotizarLineas(lineas: LineaPedida[]): Promise<LineaCotizada[]> {
  const db = crearClienteAdministrador()
  const skus = [...new Set(lineas.map((l) => l.sku))]
  const { data: productos } = await db
    .from('productos')
    .select('id,sku,slug,nombre,precio_base,imagen_url')
    .in('sku', skus)
    .eq('estado', 'publicado')

  const ids = (productos ?? []).map((p) => p.id as string)
  const vacio = { data: [] as never[] }
  const [{ data: variantes }, { data: stockVar }, { data: stockProd }, { data: tramos }] = ids.length
    ? await Promise.all([
        db.from('producto_variantes').select('id,producto_id,nombre,precio,imagen_url').in('producto_id', ids).eq('activo', true),
        db.from('v_stock_variante').select('variante_id,stock').in('producto_id', ids),
        db.from('v_stock_actual').select('producto_id,stock').in('producto_id', ids),
        db.from('precio_tramos').select('producto_id,min_unidades,max_unidades,precio_unitario,etiqueta').in('producto_id', ids).eq('activo', true),
      ])
    : [vacio, vacio, vacio, vacio]

  const stockV = new Map((stockVar ?? []).map((s) => [s.variante_id as string, Number(s.stock ?? 0)]))
  const stockP = new Map((stockProd ?? []).map((s) => [s.producto_id as string, Number(s.stock ?? 0)]))

  return lineas.map((l): LineaCotizada => {
    const base: LineaCotizada = {
      ...l,
      clave: `${l.sku}::${l.varianteId ?? ''}`,
      productoId: null,
      slug: null,
      nombre: 'Producto no disponible',
      variante: null,
      imagen: null,
      precioBase: 0,
      precio: 0,
      tramo: null,
      subtotal: 0,
      disponible: 0,
      siguienteTramo: null,
      error: null,
    }
    const p = (productos ?? []).find((x) => x.sku === l.sku)
    if (!p) return { ...base, error: 'Este producto ya no está disponible.' }

    const opciones = (variantes ?? []).filter((v) => v.producto_id === p.id)
    const v = opciones.find((x) => x.id === l.varianteId) ?? null
    const conProducto = {
      ...base,
      productoId: p.id,
      slug: p.slug,
      nombre: p.nombre,
      imagen: p.imagen_url ? urlPublica(p.imagen_url) : null,
    }
    if (opciones.length > 0 && !l.varianteId) return { ...conProducto, error: 'Elige una opción de este producto.' }
    if (opciones.length > 0 && !v) return { ...conProducto, error: 'Esa opción ya no está disponible.' }

    const stock = v ? stockV.get(v.id) ?? 0 : stockP.get(p.id) ?? 0
    const precioBase = Number(v?.precio ?? p.precio_base)
    const delProducto = (tramos ?? []).filter((t) => t.producto_id === p.id)
    const tramo =
      [...delProducto]
        .sort((a, b) => b.min_unidades - a.min_unidades)
        .find((t) => l.cantidad >= t.min_unidades && (t.max_unidades === null || l.cantidad <= t.max_unidades)) ?? null
    // El tramo manda: es la escala de precios por volumen que define el negocio
    // (1-4 a $25.000, 5-9 a $23.490 … 30+ a $19.990). `precio_base` solo se usa
    // cuando no hay ningún tramo que cubra esa cantidad.
    //
    // OJO al publicar el catálogo: lo que se muestra en la grilla tiene que ser
    // este mismo precio, no `precio_base`. Ver `precioVitrina` en lib/tienda.ts.
    const precio = Number(tramo?.precio_unitario ?? precioBase)
    const disponible = Math.max(0, Math.min(MAX_UNIDADES_LINEA, stock))
    // Solo se ofrece un tramo que la línea puede alcanzar de verdad: dentro del tope y del stock.
    const proximo =
      [...delProducto]
        .sort((a, b) => a.min_unidades - b.min_unidades)
        .find((t) => t.min_unidades > l.cantidad && t.min_unidades <= disponible && Number(t.precio_unitario) < precio) ?? null
    const siguienteTramo = proximo
      ? { faltan: proximo.min_unidades - l.cantidad, precio: Number(proximo.precio_unitario), etiqueta: proximo.etiqueta }
      : null

    const cotizada: LineaCotizada = {
      ...conProducto,
      varianteId: v ? v.id : null,
      variante: v?.nombre ?? null,
      imagen: v?.imagen_url ? urlPublica(v.imagen_url) : conProducto.imagen,
      precioBase,
      precio,
      // Un tramo de 1 unidad es el precio normal: no se anuncia como descuento.
      tramo: tramo && tramo.min_unidades > 1 ? tramo.etiqueta : null,
      subtotal: precio * l.cantidad,
      disponible,
      siguienteTramo,
    }
    if (stock <= 0) return { ...cotizada, error: 'Agotado por ahora.' }
    if (l.cantidad > stock) return { ...cotizada, error: `Solo quedan ${disponible} de esta opción.` }
    return cotizada
  })
}
