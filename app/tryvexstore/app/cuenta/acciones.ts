'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'

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
