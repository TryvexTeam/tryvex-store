import 'server-only'

import { cache } from 'react'
import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { urlPublica } from '@/lib/imagenes'

/**
 * Capa de acceso de la cuenta del cliente.
 *
 * Todo pasa por el cliente de servidor con la sesión de la cookie: RLS decide
 * qué filas ve cada persona (sus pedidos, sus favoritos, su perfil). Aquí no se
 * usa la clave de servicio, así un error de código no puede mostrar datos de
 * otra cuenta.
 */

export interface Cuenta {
  id: string
  email: string
  emailConfirmado: boolean
  nombre: string | null
  telefono: string | null
  /** Integrante activo del CRM: habilita el botón Panel. */
  esIntegrante: boolean
}

export const cuentaActual = cache(async (): Promise<Cuenta | null> => {
  const db = await crearClienteServidor()
  // getUser() revalida contra Auth; getSession() solo lee la cookie.
  const { data: { user } } = await db.auth.getUser()
  if (!user?.email) return null

  const [{ data: perfil }, { data: integrante }] = await Promise.all([
    db.from('clientes_tienda').select('nombre,telefono').eq('auth_user_id', user.id).maybeSingle(),
    db.from('dim_integrantes').select('id').eq('auth_user_id', user.id).eq('activo', true).maybeSingle(),
  ])

  return {
    id: user.id,
    email: user.email,
    emailConfirmado: Boolean(user.email_confirmed_at),
    nombre: perfil?.nombre ?? (typeof user.user_metadata?.nombre === 'string' ? user.user_metadata.nombre : null),
    telefono: perfil?.telefono ?? null,
    esIntegrante: Boolean(integrante),
  }
})

/** Para páginas que solo existen con sesión. */
export async function exigirCuenta(): Promise<Cuenta> {
  const cuenta = await cuentaActual()
  if (!cuenta) redirect('/cuenta/ingresar')
  return cuenta
}

export interface ItemPedidoCuenta {
  nombre: string
  slug: string | null
  imagen: string | null
  cantidad: number
  subtotal: number
}

export interface PedidoCuenta {
  id: string
  numero: number
  fecha: string
  estado: string
  total: number
  seguimiento: string | null
  items: ItemPedidoCuenta[]
}

const LIMITE_PEDIDOS = 50

/** Pedidos de la cuenta: por cuenta o por correo confirmado (lo decide RLS). */
export async function leerMisPedidos(): Promise<PedidoCuenta[]> {
  const db = await crearClienteServidor()
  const { data } = await db
    .from('pedidos')
    .select('id,numero,created_at,estado,total_clp,envio_url_seguimiento,pedido_items(cantidad,subtotal_clp,productos(nombre,slug,imagen_url))')
    .order('created_at', { ascending: false })
    .limit(LIMITE_PEDIDOS)

  return (data ?? []).map((p) => ({
    id: p.id,
    numero: Number(p.numero),
    fecha: p.created_at,
    estado: p.estado,
    total: Number(p.total_clp),
    // Solo enlaces https: un valor escrito a mano no debe abrir otro esquema.
    seguimiento: typeof p.envio_url_seguimiento === 'string' && p.envio_url_seguimiento.startsWith('https://') ? p.envio_url_seguimiento : null,
    items: (p.pedido_items ?? []).map((i) => {
      const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
      return {
        nombre: producto?.nombre ?? 'Producto',
        slug: producto?.slug ?? null,
        imagen: producto?.imagen_url ? urlPublica(producto.imagen_url) : null,
        cantidad: Number(i.cantidad),
        subtotal: Number(i.subtotal_clp),
      }
    }),
  }))
}

export interface FavoritoCuenta {
  productoId: string
  nombre: string
  href: string
  imagen: string | null
  precio: number
}

/** Favoritos vigentes: un producto despublicado desaparece solo de la lista. */
export async function leerMisFavoritos(): Promise<FavoritoCuenta[]> {
  const db = await crearClienteServidor()
  const { data } = await db
    .from('favoritos_tienda')
    .select('producto_id,created_at,productos(nombre,slug,precio_base,imagen_url,estado)')
    .order('created_at', { ascending: false })

  return (data ?? []).flatMap((f) => {
    const p = Array.isArray(f.productos) ? f.productos[0] : f.productos
    if (!p || p.estado !== 'publicado' || !p.slug) return []
    return [{
      productoId: f.producto_id,
      nombre: p.nombre,
      href: `/producto/${p.slug}`,
      imagen: p.imagen_url ? urlPublica(p.imagen_url) : null,
      precio: Number(p.precio_base),
    }]
  })
}
