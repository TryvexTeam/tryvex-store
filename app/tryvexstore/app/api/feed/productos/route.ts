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
 * Si FEED_TOKEN está definido, se exige `?token=`; comparado en tiempo
 * constante para no filtrar el valor por latencia.
 */
export const dynamic = 'force-dynamic'

const BASE = process.env.NEXT_PUBLIC_URL_TIENDA ?? 'https://tryvexstore.cl'

function tokenValido(recibido: string | null): boolean {
  const esperado = process.env.FEED_TOKEN
  if (!esperado) return true
  if (!recibido) return false
  const a = Buffer.from(recibido)
  const b = Buffer.from(esperado)
  return a.length === b.length && timingSafeEqual(a, b)
}

const disponibilidad = (stock: number) => (stock > 0 ? 'in_stock' : 'out_of_stock')
const precio = (clp: number) => `${Math.round(clp)} CLP`
const CONDICION: Record<string, string> = { nuevo: 'new', reacondicionado: 'refurbished', usado: 'used' }

export async function GET(req: Request) {
  if (!tokenValido(new URL(req.url).searchParams.get('token')))
    return Response.json({ error: 'No autorizado.' }, { status: 401 })

  const supabase = crearClienteAdministrador()
  const [{ data: productos, error }, { data: variantes }, { data: stock }, { data: stockVar }] =
    await Promise.all([
      supabase
        .from('productos')
        .select('id,sku,nombre,descripcion,precio_base,precio_antes,imagen_url,marca,condicion,gtin,peso_gramos,categorias(nombre)')
        .eq('estado', 'publicado'),
      supabase.from('producto_variantes').select('id,producto_id,nombre,sku,precio,imagen_url,color_hex').eq('activo', true),
      supabase.from('v_stock_actual').select('producto_id,stock'),
      supabase.from('v_stock_variante').select('variante_id,stock'),
    ])

  if (error) return Response.json({ error: 'No se pudo leer el catálogo.' }, { status: 500 })

  const sProd = new Map((stock ?? []).map((s) => [s.producto_id, Number(s.stock ?? 0)]))
  const sVar = new Map((stockVar ?? []).map((s) => [s.variante_id, Number(s.stock ?? 0)]))

  const items = (productos ?? []).flatMap((p) => {
    const base = {
      title: p.nombre,
      description: p.descripcion ?? p.nombre,
      link: `${BASE}/comprar?sku=${encodeURIComponent(p.sku)}`,
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
        ...base,
        id: p.sku,
        image_link: p.imagen_url ? urlPublica(p.imagen_url) : undefined,
        availability: disponibilidad(sProd.get(p.id) ?? 0),
        ...conOferta(Number(p.precio_base)),
      }]

    return propias.map((v) => ({
      ...base,
      id: v.sku,
      item_group_id: p.sku,
      title: `${p.nombre} · ${v.nombre}`,
      color: v.nombre,
      image_link: urlPublica(v.imagen_url ?? p.imagen_url ?? '') || undefined,
      availability: disponibilidad(sVar.get(v.id) ?? 0),
      ...conOferta(Number(v.precio ?? p.precio_base)),
    }))
  })

  return Response.json(
    { generado: new Date().toISOString(), total: items.length, items },
    { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
  )
}
