'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { cotizarLineas } from '@/lib/cotizacion'

/**
 * Acciones de la cuenta. Cada una se trata como un endpoint público: valida la
 * entrada, exige sesión y deja que RLS limite las filas a la propia cuenta.
 */

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const LARGO_NOMBRE = 120
const LARGO_TELEFONO = 20

export type ResultadoFavorito = { ok: true; favorito: boolean } | { ok: false; requiereCuenta?: boolean; error: string }

export async function alternarFavorito(productoId: string): Promise<ResultadoFavorito> {
  if (typeof productoId !== 'string' || !FORMATO_UUID.test(productoId)) return { ok: false, error: 'Producto no válido.' }

  const db = await crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { ok: false, requiereCuenta: true, error: 'Inicia sesión para guardar favoritos.' }

  const { data: existente } = await db
    .from('favoritos_tienda')
    .select('producto_id')
    .eq('auth_user_id', user.id)
    .eq('producto_id', productoId)
    .maybeSingle()

  const { error } = existente
    ? await db.from('favoritos_tienda').delete().eq('auth_user_id', user.id).eq('producto_id', productoId)
    : await db.from('favoritos_tienda').insert({ auth_user_id: user.id, producto_id: productoId })

  if (error) return { ok: false, error: 'No pudimos actualizar tus favoritos.' }
  revalidatePath('/cuenta')
  return { ok: true, favorito: !existente }
}

export type ResultadoPerfil = { ok: true } | { ok: false; error: string }

export async function guardarPerfil(datos: FormData): Promise<ResultadoPerfil> {
  const nombre = String(datos.get('nombre') ?? '').trim().slice(0, LARGO_NOMBRE)
  const telefono = String(datos.get('telefono') ?? '').replace(/[^\d+ ]/g, '').trim().slice(0, LARGO_TELEFONO)

  const db = await crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a ingresar.' }

  const { error } = await db
    .from('clientes_tienda')
    .upsert({ auth_user_id: user.id, nombre: nombre || null, telefono: telefono || null, updated_at: new Date().toISOString() })

  if (error) return { ok: false, error: 'No pudimos guardar tus datos.' }
  revalidatePath('/cuenta')
  return { ok: true }
}

export async function salir(): Promise<never> {
  const db = await crearClienteServidor()
  await db.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}

export interface LineaRepetida {
  sku: string
  varianteId: string | null
  cantidad: number
  slug: string
  nombre: string
  variante: string | null
  imagen: string | null
  precio: number
}

export type ResultadoRepetir =
  | { ok: true; lineas: LineaRepetida[]; avisos: string[] }
  | { ok: false; error: string }

/**
 * Prepara la bolsa para volver a comprar lo mismo.
 *
 * No se copian los precios del pedido viejo: se vuelve a cotizar contra el
 * catálogo de hoy. Un pedido de hace tres meses puede traer un producto
 * despublicado, agotado o a otro precio, y llevar eso a la bolsa terminaría en
 * un checkout que rechaza líneas sin explicar por qué.
 *
 * Lo que no se puede reponer no se calla: vuelve como aviso, para poder
 * decirle a la persona qué quedó fuera antes de que llegue a pagar.
 */
export async function repetirPedido(pedidoId: string): Promise<ResultadoRepetir> {
  if (typeof pedidoId !== 'string' || !FORMATO_UUID.test(pedidoId)) {
    return { ok: false, error: 'Pedido no válido.' }
  }

  const db = await crearClienteServidor()
  const { data: { user } } = await db.auth.getUser()
  if (!user) return { ok: false, error: 'Tu sesión expiró. Vuelve a ingresar.' }

  // RLS limita esto a los pedidos que la persona puede ver: no hace falta
  // filtrar por dueño aquí, pero tampoco se confía en el id que llegó.
  const { data: items } = await db
    .from('pedido_items')
    .select('cantidad,variante_id,productos(sku)')
    .eq('pedido_id', pedidoId)

  if (!items || items.length === 0) return { ok: false, error: 'No encontramos ese pedido.' }

  const pedidas = items.flatMap((i) => {
    const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
    const sku = producto?.sku
    if (!sku) return []
    return [{ sku, varianteId: i.variante_id ?? null, cantidad: Number(i.cantidad) }]
  })

  if (pedidas.length === 0) return { ok: false, error: 'Los productos de ese pedido ya no están disponibles.' }

  const cotizadas = await cotizarLineas(pedidas)
  const lineas: LineaRepetida[] = []
  const avisos: string[] = []

  for (const l of cotizadas) {
    if (l.error || !l.slug) {
      avisos.push(`${l.nombre}: ${l.error ?? 'ya no está disponible'}`)
      continue
    }
    lineas.push({
      sku: l.sku,
      varianteId: l.varianteId,
      cantidad: l.cantidad,
      slug: l.slug,
      nombre: l.nombre,
      variante: l.variante,
      imagen: l.imagen,
      precio: l.precio,
    })
  }

  if (lineas.length === 0) {
    return { ok: false, error: avisos[0] ?? 'Ninguno de esos productos está disponible ahora.' }
  }

  return { ok: true, lineas, avisos }
}
