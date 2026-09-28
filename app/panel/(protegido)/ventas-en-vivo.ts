'use server'

import { crearClienteServidor } from '@/lib/supabase/servidor'

/**
 * La última venta pagada, para que el panel abierto suene cuando entra una
 * nueva. Pasa por la sesión del integrante (RLS): quien no es del equipo no
 * ve nada.
 */
export interface UltimaVenta {
  numero: number
  total: number
  cliente: string | null
  pagadoEn: string
}

export async function ultimaVenta(): Promise<UltimaVenta | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('pedidos')
    .select('numero,total_clp,cliente_nombre,pagado_at')
    .not('pagado_at', 'is', null)
    .order('pagado_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (!data?.pagado_at) return null
  return {
    numero: Number(data.numero),
    total: Number(data.total_clp),
    cliente: data.cliente_nombre ?? null,
    pagadoEn: data.pagado_at,
  }
}
