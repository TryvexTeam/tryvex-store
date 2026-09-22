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
  /** Código que dio el courier. Se muestra en nuestra web, no obliga a salir a la suya. */
  codigoSeguimiento: string | null
  courier: string | null
  pagadoEn: string | null
  enviadoEn: string | null
  entregadoEn: string | null
  items: ItemPedidoCuenta[]
}

const LIMITE_PEDIDOS = 50

/** Lo que devuelve la consulta de pedidos, antes de darle forma para la vista. */
interface FilaPedidoBruta {
  id: string
  numero: number | string
  created_at: string
  estado: string
  total_clp: number | string
  envio_url_seguimiento: string | null
  envio_seguimiento: string | null
  envio_courier: string | null
  pagado_at: string | null
  enviado_at: string | null
  entregado_at: string | null
  pedido_items:
    | {
        cantidad: number | string
        subtotal_clp: number | string
        productos: { nombre: string; slug: string | null; imagen_url: string | null } | { nombre: string; slug: string | null; imagen_url: string | null }[] | null
      }[]
    | null
}

/**
 * Pedidos de esta cuenta, y solo de esta cuenta.
 *
 * El filtro va explícito en la consulta aunque RLS ya proteja la tabla, porque
 * las dos cosas responden preguntas distintas: RLS decide qué *puede* ver esta
 * sesión, y aquí se decide qué *corresponde* mostrar en «Mis compras».
 *
 * La diferencia se ve con una cuenta del equipo: la política «equipo gestiona
 * pedidos» le da acceso a todos los pedidos de la tienda, así que sin este
 * filtro un integrante abría su cuenta y veía el historial de los demás
 * clientes, con sus nombres y direcciones.
 *
 * Se incluyen los pedidos hechos con el mismo correo antes de crear la cuenta,
 * pero solo si el correo está confirmado: si no, bastaría registrarse con el
 * correo de otra persona para ver sus compras.
 */
export async function leerMisPedidos(): Promise<PedidoCuenta[]> {
  const cuenta = await cuentaActual()
  if (!cuenta) return []

  const db = await crearClienteServidor()
  const COLUMNAS =
    'id,numero,created_at,estado,total_clp,envio_url_seguimiento,envio_seguimiento,envio_courier,' +
    'pagado_at,enviado_at,entregado_at,pedido_items(cantidad,subtotal_clp,productos(nombre,slug,imagen_url))'

  // Dos consultas en vez de un `.or()` con el correo interpolado: ese texto
  // viaja dentro de la sintaxis del filtro, y una coma o un paréntesis en el
  // valor cambiarían la condición. Los parámetros de `.eq()` no tienen ese
  // problema.
  const [propios, porCorreo] = await Promise.all([
    db.from('pedidos').select(COLUMNAS).eq('cliente_auth_id', cuenta.id).order('created_at', { ascending: false }).limit(LIMITE_PEDIDOS),
    cuenta.emailConfirmado
      ? db.from('pedidos').select(COLUMNAS).eq('cliente_email', cuenta.email).order('created_at', { ascending: false }).limit(LIMITE_PEDIDOS)
      : null,
  ])

  // Un pedido puede venir por ambas vías; se deduplica por id y se reordena.
  const filas = [
    ...((propios.data ?? []) as unknown as FilaPedidoBruta[]),
    ...((porCorreo?.data ?? []) as unknown as FilaPedidoBruta[]),
  ]
  const unicos = new Map<string, FilaPedidoBruta>()
  for (const p of filas) unicos.set(p.id, p)
  const data = [...unicos.values()]
    .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
    .slice(0, LIMITE_PEDIDOS)

  return (data ?? []).map((p) => ({
    id: p.id,
    numero: Number(p.numero),
    fecha: p.created_at,
    estado: p.estado,
    total: Number(p.total_clp),
    // Solo enlaces https: un valor escrito a mano no debe abrir otro esquema.
    seguimiento: typeof p.envio_url_seguimiento === 'string' && p.envio_url_seguimiento.startsWith('https://') ? p.envio_url_seguimiento : null,
    codigoSeguimiento: p.envio_seguimiento ?? null,
    courier: p.envio_courier ?? null,
    pagadoEn: p.pagado_at ?? null,
    enviadoEn: p.enviado_at ?? null,
    entregadoEn: p.entregado_at ?? null,
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
