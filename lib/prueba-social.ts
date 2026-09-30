import 'server-only'

import { crearClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * Prueba social de la ficha: cuánta gente COMPRÓ este producto de verdad.
 *
 * Es un conteo real de pedidos pagados, nunca un número inventado ni aleatorio:
 * decir que hay gente comprando cuando no la hay es publicidad engañosa (Ley del
 * Consumidor, art. 28) y, además, el primer cliente que lo note deja de creer
 * todo lo demás de la tienda. Por eso mismo no se muestra nada hasta que el
 * número sea creíble: un «1 persona compró esto» no convence a nadie.
 *
 * Se cuentan compradores distintos (la misma persona comprando dos veces cuenta
 * una), con los mismos estados que el reporte de ventas.
 */
const VENDIDOS = ['pagado', 'preparando', 'enviado', 'entregado', 'completado']
/** Mínimo de compradores para mostrar el aviso. */
export const MINIMO_PRUEBA_SOCIAL = 3

export type PruebaSocial = { personas: number; periodo: 'esta semana' | 'este mes' }

export async function leerPruebaSocial(productoId: string): Promise<PruebaSocial | null> {
  try {
    const db = crearClienteAdministrador()
    const hace = (dias: number) => Date.now() - dias * 86_400_000
    const { data, error } = await db
      .from('pedido_items')
      .select('pedido_id,pedidos!inner(estado,created_at,cliente_auth_id,cliente_email)')
      .eq('producto_id', productoId)
      .in('pedidos.estado', VENDIDOS)
      .gte('pedidos.created_at', new Date(hace(30)).toISOString())
    if (error || !data) return null

    type Pedido = { created_at: string; cliente_auth_id: string | null; cliente_email: string | null }
    const compradoresDesde = (limite: number): number => {
      const claves = new Set<string>()
      for (const fila of data) {
        const p = fila.pedidos as unknown as Pedido | null
        if (!p || new Date(p.created_at).getTime() < limite) continue
        claves.add(p.cliente_auth_id ?? p.cliente_email?.trim().toLowerCase() ?? fila.pedido_id)
      }
      return claves.size
    }

    const semana = compradoresDesde(hace(7))
    if (semana >= MINIMO_PRUEBA_SOCIAL) return { personas: semana, periodo: 'esta semana' }
    const mes = compradoresDesde(hace(30))
    if (mes >= MINIMO_PRUEBA_SOCIAL) return { personas: mes, periodo: 'este mes' }
    return null
  } catch {
    return null
  }
}
