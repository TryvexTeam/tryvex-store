'use server'

import { revalidatePath, updateTag } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID } from '@/lib/catalogo'

export type { Resultado } from '@/lib/autorizacion'

/** Mismo largo que permite el editor de producto. */
const LARGO_ETIQUETA = 24
const MAXIMO_POR_VEZ = 500

function revalidar(): void {
  updateTag('portada')
  revalidatePath('/')
  revalidatePath('/tienda')
  revalidatePath('/cyber')
  revalidatePath('/panel/productos')
  revalidatePath('/panel/etiquetas')
  revalidatePath('/api/feed/productos')
}

function leerIds(datos: FormData): string[] | null {
  const ids = [...new Set(datos.getAll('ids').map(String))]
  if (ids.length === 0 || ids.length > MAXIMO_POR_VEZ || !ids.every((id) => UUID.test(id))) return null
  return ids
}

/**
 * Pone la misma etiqueta («Cyber», «Nuevo»…) en varios productos a la vez.
 * Es la misma columna `productos.etiqueta` que edita la ficha del producto:
 * un producto tiene una sola etiqueta, así que esta reemplaza la anterior.
 */
export async function ponerEtiqueta(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const ids = leerIds(datos)
  if (!ids) return fallo('Elige al menos un producto.')
  const etiqueta = String(datos.get('etiqueta') ?? '').trim().replace(/\s+/g, ' ')
  if (!etiqueta) return fallo('Escribe la etiqueta.')
  if (etiqueta.length > LARGO_ETIQUETA) return fallo(`La etiqueta puede tener hasta ${LARGO_ETIQUETA} caracteres.`)

  const { error } = await sesion.supabase.from('productos').update({ etiqueta }).in('id', ids)
  if (error) return fallo('No se pudo guardar la etiqueta.')
  revalidar()
  return { ok: true }
}

/** Quita la etiqueta de los productos elegidos (vuelven a mostrar descuento o «Últimas unidades» solos). */
export async function quitarEtiqueta(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const ids = leerIds(datos)
  if (!ids) return fallo('Elige al menos un producto.')

  const { error } = await sesion.supabase.from('productos').update({ etiqueta: null }).in('id', ids)
  if (error) return fallo('No se pudo quitar la etiqueta.')
  revalidar()
  return { ok: true }
}
