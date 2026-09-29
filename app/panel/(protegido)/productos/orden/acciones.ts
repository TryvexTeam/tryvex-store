'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID } from '@/lib/catalogo'
import { MAX_LO_NUEVO } from '@/lib/orden-coleccion'
const MAX_CATALOGO = 2000

function validos(ids: unknown, maximo: number): string[] | null {
  if (!Array.isArray(ids) || ids.length > maximo) return null
  if (!ids.every((id) => typeof id === 'string' && UUID.test(id))) return null
  return new Set(ids).size === ids.length ? (ids as string[]) : null
}

// La portada y /tienda guardan su vitrina 5 minutos: se invalidan para que el
// orden nuevo se vea al tiro.
function revalidar(): void {
  revalidatePath('/')
  revalidatePath('/tienda')
  revalidatePath('/panel/productos/orden')
}

/** Orden completo de /tienda: la lista entera, de primero a último. */
export async function guardarOrdenTienda(ids: string[]): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const lista = validos(ids, MAX_CATALOGO)
  if (!lista) return fallo('La lista de productos no es válida.')

  const { error } = await sesion.supabase.rpc('ordenar_vitrina', { p_ids: lista })
  if (error) return fallo(`No se pudo guardar el orden: ${error.message}`)
  revalidar()
  return { ok: true }
}

/** Qué productos van en «Todo lo nuevo» y en qué orden. Los que no estén, salen. */
export async function guardarLoNuevo(ids: string[]): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const lista = validos(ids, MAX_LO_NUEVO)
  if (!lista) return fallo(`«Todo lo nuevo» admite hasta ${MAX_LO_NUEVO} productos.`)

  const { error } = await sesion.supabase.rpc('ordenar_lo_nuevo', { p_ids: lista })
  if (error) return fallo(`No se pudo guardar «Todo lo nuevo»: ${error.message}`)
  revalidar()
  return { ok: true }
}
