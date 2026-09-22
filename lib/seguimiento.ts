import 'server-only'

import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { urlPublica } from '@/lib/imagenes'
import type { PedidoCuenta } from '@/lib/cuenta'

/**
 * Seguimiento por enlace, para quien compró sin crear cuenta.
 *
 * Quien tiene el enlace ve ese pedido. Por eso el token es un uuid aleatorio y
 * no el número de pedido: con `/seguimiento/15` cualquiera recorrería 14, 13,
 * 12 y leería los datos de otras personas.
 *
 * Se devuelve lo mínimo para seguir el envío. La dirección, el teléfono y el
 * correo del comprador **no** salen de aquí: el enlace puede terminar reenviado
 * por WhatsApp a cualquiera, y nadie necesita esos datos para saber dónde va su
 * paquete.
 */

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface SeguimientoPublico {
  pedido: PedidoCuenta
  /** Solo el primer nombre, para saludar sin exponer el nombre completo. */
  saludo: string | null
}

export async function leerSeguimientoPorToken(token: string): Promise<SeguimientoPublico | null> {
  if (!FORMATO_UUID.test(token)) return null

  const { data } = await crearClienteAdministrador()
    .from('pedidos')
    .select(
      'id,numero,created_at,estado,total_clp,envio_url_seguimiento,envio_seguimiento,envio_courier,' +
        'pagado_at,enviado_at,entregado_at,cliente_nombre,' +
        'pedido_items(cantidad,subtotal_clp,productos(nombre,slug,imagen_url))'
    )
    .eq('token_seguimiento', token)
    .maybeSingle()

  if (!data) return null

  const p = data as unknown as {
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
    cliente_nombre: string | null
    pedido_items:
      | { cantidad: number | string; subtotal_clp: number | string; productos: { nombre: string; slug: string | null; imagen_url: string | null } | { nombre: string; slug: string | null; imagen_url: string | null }[] | null }[]
      | null
  }

  return {
    saludo: p.cliente_nombre?.trim().split(/\s+/)[0] ?? null,
    pedido: {
      id: p.id,
      numero: Number(p.numero),
      fecha: p.created_at,
      estado: p.estado,
      total: Number(p.total_clp),
      seguimiento:
        typeof p.envio_url_seguimiento === 'string' && p.envio_url_seguimiento.startsWith('https://')
          ? p.envio_url_seguimiento
          : null,
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
    },
  }
}

/** Enlace que se le manda al comprador por WhatsApp o correo. */
export function urlDeSeguimiento(token: string, base?: string): string {
  const raiz = (base ?? process.env.NEXT_PUBLIC_URL_TIENDA ?? 'https://www.tryvex.tech').replace(/\/$/, '')
  return `${raiz}/seguimiento/${token}`
}
