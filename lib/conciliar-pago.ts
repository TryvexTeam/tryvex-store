import 'server-only'

import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { consultarOrden } from '@/lib/mercadopago'
import { confirmarPagoDePedido } from '@/lib/confirmar-pago'

/**
 * Confirmar un pago sin esperar el aviso de Mercado Pago.
 *
 * El webhook es el camino principal, pero no es confiable por sí solo: entre
 * el 22 y el 27 de septiembre de 2026 los avisos dejaron de llegar y tres
 * pedidos cobrados quedaron pendientes hasta que alguien los marcó a mano.
 * Mercado Pago igual tenía la order acreditada; solo faltaba preguntarle.
 *
 * Aquí se le pregunta. La respuesta de la API es la misma fuente de verdad que
 * usa el webhook (`processed` + `accredited`), y la confirmación pasa por la
 * misma función transaccional: si el webhook y la conciliación llegan a la
 * vez, el pedido se confirma una sola vez y se avisa una sola vez.
 *
 * Se usa en dos lugares: al volver el comprador desde Mercado Pago (su pedido)
 * y en la pasada periódica de pg_cron (todos los pendientes recientes).
 */

export type EstadoConciliacion = 'pagado' | 'pendiente' | 'sin-orden' | 'error'

interface PedidoPendiente {
  numero: number
  estado: string
  pago_referencia: string | null
}

async function conciliar(p: PedidoPendiente): Promise<EstadoConciliacion> {
  if (p.estado !== 'pendiente') return p.estado === 'cancelado' ? 'sin-orden' : 'pagado'
  // Solo las orders de Checkout Pro (Orders API) tienen id `ORD…`. Una
  // referencia manual o de otro medio no se puede consultar.
  if (!p.pago_referencia?.startsWith('ORD')) return 'sin-orden'

  const orden = await consultarOrden(p.pago_referencia)
  if (!orden) return 'error'
  if (!orden.pagada) return 'pendiente'
  // Una order que dice ser de otro pedido no confirma este: sería un cruce.
  if (orden.referenciaExterna !== String(p.numero)) {
    console.error('[conciliar] la order no corresponde al pedido', { numero: p.numero, order: orden.id, referencia: orden.referenciaExterna })
    return 'error'
  }

  const r = await confirmarPagoDePedido({
    referenciaExterna: String(p.numero),
    proveedor: 'mercadopago',
    referenciaPago: orden.id,
    totalPagado: orden.total,
  })
  if (!r.ok) {
    console.error('[conciliar] pago acreditado que no se pudo confirmar', { numero: p.numero, error: r.error })
    return 'error'
  }
  return 'pagado'
}

/** Concilia un pedido puntual. Barato si ya está pagado: no llama a la API. */
export async function conciliarPedido(numero: number): Promise<EstadoConciliacion> {
  const { data, error } = await crearClienteAdministrador()
    .from('pedidos')
    .select('numero,estado,pago_referencia')
    .eq('numero', numero)
    .maybeSingle()
  if (error || !data) return 'error'
  return conciliar(data as PedidoPendiente)
}

/**
 * Pasada periódica sobre los pedidos de Mercado Pago que siguen pendientes.
 *
 * Solo mira los de los últimos días: una order vence a las 24 horas
 * (`expiration_time: P1D`) y los pedidos abandonados se cancelan solos, así
 * que más atrás no hay nada que pueda acreditarse. Con tope, para que una
 * acumulación rara no dispare cientos de consultas a la API de una vez.
 */
export async function conciliarPendientes({ dias = 3, maximo = 30 } = {}) {
  const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await crearClienteAdministrador()
    .from('pedidos')
    .select('numero,estado,pago_referencia')
    .eq('estado', 'pendiente')
    .like('pago_referencia', 'ORD%')
    .gte('created_at', desde)
    .order('created_at', { ascending: true })
    .limit(maximo)

  if (error) {
    console.error('[conciliar] no se pudieron leer los pendientes', { error: error.message })
    return { revisados: 0, confirmados: [] as number[], errores: 1 }
  }

  const confirmados: number[] = []
  let errores = 0
  // En serie: son pocos y así no se golpea la API con ráfagas.
  for (const p of (data ?? []) as PedidoPendiente[]) {
    const estado = await conciliar(p)
    if (estado === 'pagado') confirmados.push(p.numero)
    if (estado === 'error') errores += 1
  }
  return { revisados: data?.length ?? 0, confirmados, errores }
}
