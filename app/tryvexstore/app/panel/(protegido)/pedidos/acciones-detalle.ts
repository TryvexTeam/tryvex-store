'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID } from '@/lib/catalogo'

/** Campos de despacho, pago y boleta que el equipo completa a mano. */
const CAMPOS: Record<string, number> = {
  region: 60,
  comuna: 60,
  envio_courier: 60,
  envio_seguimiento: 80,
  envio_url_seguimiento: 300,
  pago_referencia: 120,
  boleta_folio: 40,
  boleta_url: 300,
}

const URLS = ['envio_url_seguimiento', 'boleta_url']

/** Solo https: un enlace que se le manda al cliente no puede ser javascript: ni http. */
function urlSegura(v: string): boolean {
  try {
    return new URL(v).protocol === 'https:'
  } catch {
    return false
  }
}

export async function guardarDetallePedido(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const id = String(datos.get('id') ?? '')
  if (!UUID.test(id)) return fallo('Pedido inválido.')

  const cambios: Record<string, string | null> = {}
  for (const [campo, max] of Object.entries(CAMPOS)) {
    const v = String(datos.get(campo) ?? '').trim()
    if (v.length > max) return fallo('Uno de los campos es demasiado largo.')
    if (v && URLS.includes(campo) && !urlSegura(v)) return fallo('Los enlaces deben empezar con https://')
    cambios[campo] = v || null
  }

  const { error, count } = await sesion.supabase
    .from('pedidos')
    .update({ ...cambios, updated_at: new Date().toISOString() }, { count: 'exact' })
    .eq('id', id)

  if (error) return fallo('No se pudo guardar el pedido.')
  if (!count) return fallo('El pedido no existe o no tienes acceso.')

  revalidatePath('/panel/pedidos')
  return { ok: true }
}
