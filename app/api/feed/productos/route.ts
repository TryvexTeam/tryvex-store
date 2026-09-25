import { timingSafeEqual } from 'node:crypto'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { urlPublica } from '@/lib/imagenes'

/**
 * Feed de productos para Google Merchant Center y el catálogo de Meta.
 *
 * Solo sale lo publicado: el borrador y lo archivado no existen para el
 * exterior. Cada variante es un ítem propio agrupado por `item_group_id`,
 * que es como ambos servicios esperan los colores y tallas.
 *
 * Es un endpoint de integración, no un catálogo público: siempre exige
 * `?token=`, comparado en tiempo constante para no filtrar el valor por
 * latencia. La respuesta lleva stock, por lo que tampoco puede guardarse en
 * una caché pública.
 */
export const dynamic = 'force-dynamic'

function tokenValido(recibido: string | null): boolean {
  const esperado = process.env.FEED_TOKEN
  if (!esperado || !recibido) return false
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

function basePublica(): string | null {
  const cruda = process.env.NEXT_PUBLIC_URL_TIENDA?.trim()
  if (!cruda) return null
  try {
    const url = new URL(cruda)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.origin : null
  } catch {
    return null
  }
}

const disponibilidad = (stock: number) => (stock > 0 ? 'in_stock' : 'out_of_stock')
const precio = (clp: number) => `${Math.round(clp)} CLP`
const CONDICION: Record<string, string> = { nuevo: 'new', reacondicionado: 'refurbished', usado: 'used' }

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get('token')
  if (!process.env.FEED_TOKEN)
    return Response.json({ error: 'El feed no está configurado.' }, { status: 503 })
  if (!tokenValido(token)) return Response.json({ error: 'No autorizado.' }, { status: 401 })

  const base = basePublica()
  if (!base)
    return Response.json({ error: 'Falta o no es válida NEXT_PUBLIC_URL_TIENDA.' }, { status: 503 })

  const supabase = crearClienteAdministrador()
  const [{ data: productos, error }, { data: variantes }, { data: stock }, { data: stockVar }, { data: tramos }] =
    await Promise.all([
      supabase
        .from('productos')
        .select('id,sku,slug,nombre,descripcion,precio_base,precio_antes,imagen_url,marca,condicion,gtin,peso_gramos,categorias(nombre)')
        .eq('estado', 'publicado'),
      supabase.from('producto_variantes').select('id,producto_id,nombre,sku,precio,imagen_url,color_hex').eq('activo', true),
      supabase.from('v_stock_actual').select('producto_id,stock'),
      supabase.from('v_stock_variante').select('variante_id,stock'),
      supabase.from('precio_tramos').select('producto_id,min_unidades,max_unidades,precio_unitario').eq('activo', true),
    ])

  if (error) return Response.json({ error: 'No se pudo leer el catálogo.' }, { status: 500 })

  const sProd = new Map((stock ?? []).map((s) => [s.producto_id, Number(s.stock ?? 0)]))
  const sVar = new Map((stockVar ?? []).map((s) => [s.variante_id, Number(s.stock ?? 0)]))
  const precioUnitario = new Map<string, number>()
  for (const tramo of tramos ?? []) {
    const min = Number(tramo.min_unidades)
    const max = tramo.max_unidades === null ? Infinity : Number(tramo.max_unidades)
    if (min <= 1 && 1 <= max) precioUnitario.set(tramo.producto_id, Number(tramo.precio_unitario))
  }

  const items = (productos ?? []).flatMap((p) => {
    const precioBase = precioUnitario.get(p.id) ?? Number(p.precio_base)
    const baseItem = {
      title: p.nombre,
      description: p.descripcion ?? p.nombre,
      link: `${base}/producto/${encodeURIComponent(p.slug)}`,
      brand: p.marca ?? 'Tryvex',
      condition: CONDICION[p.condicion] ?? 'new',
      gtin: p.gtin ?? undefined,
      product_type: (p.categorias as { nombre?: string } | null)?.nombre,
      shipping_weight: p.peso_gramos ? `${p.peso_gramos} g` : undefined,
    }
    // Con precio anterior honesto, el precio vigente va como sale_price.
    const conOferta = (actual: number) =>
      p.precio_antes && Number(p.precio_antes) > actual
        ? { price: precio(Number(p.precio_antes)), sale_price: precio(actual) }
        : { price: precio(actual) }

    const propias = (variantes ?? []).filter((v) => v.producto_id === p.id)
    if (propias.length === 0)
      return [{
        ...baseItem,
        id: p.sku,
        image_link: p.imagen_url ? urlPublica(p.imagen_url) : undefined,
        availability: disponibilidad(sProd.get(p.id) ?? 0),
        ...conOferta(precioBase),
      }]

    return propias.map((v) => ({
      ...baseItem,
      id: v.sku,
      item_group_id: p.sku,
      title: `${p.nombre} · ${v.nombre}`,
      color: v.nombre,
      image_link: urlPublica(v.imagen_url ?? p.imagen_url ?? '') || undefined,
      availability: disponibilidad(sVar.get(v.id) ?? 0),
      ...conOferta(Number(v.precio ?? precioBase)),
    }))
  })

  return Response.json(
    { generado: new Date().toISOString(), total: items.length, items },
    { headers: { 'Cache-Control': 'private, no-store' } }
  )
}
