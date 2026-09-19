'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID, numeroOpcional, textoOpcional } from '@/lib/catalogo'

/**
 * Variantes de un producto: color, talla o cualquier opción con stock propio.
 *
 * Son opcionales. Un producto sin variantes opera exactamente igual que antes:
 * su stock es la suma de sus movimientos. Con variantes, cada una lleva el suyo
 * y el del producto sigue siendo la suma de todo.
 */

function revalidar(): void {
  revalidatePath('/panel/productos')
  revalidatePath('/')
  revalidatePath('/panel/stock')
  revalidatePath('/panel/pedidos')
  revalidatePath('/api/feed/productos')
}

const SKU = /^[A-Z0-9][A-Z0-9-]{1,59}$/
const COLOR = /^#[0-9a-fA-F]{6}$/

export async function guardarVariante(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const productoId = String(datos.get('producto_id') ?? '')
  const nombre = String(datos.get('nombre') ?? '').trim()
  const sku = String(datos.get('sku') ?? '').trim().toUpperCase()
  const color = textoOpcional(datos.get('color_hex'), 7)
  const precio = numeroOpcional(datos.get('precio'))
  const orden = numeroOpcional(datos.get('orden'))

  if (!UUID.test(productoId)) return fallo('Falta el producto.')
  if (id && !UUID.test(id)) return fallo('Variante no válida.')
  if (!nombre) return fallo('La variante necesita un nombre, por ejemplo «Negro» o «Talla M».')
  if (nombre.length > 40) return fallo('El nombre de la variante es demasiado largo.')
  if (!SKU.test(sku)) return fallo('El SKU admite letras, números y guiones, entre 2 y 60 caracteres.')
  if (color && !COLOR.test(color)) return fallo('El color debe ser un código como #1D1D1F.')
  if (!precio.ok || (precio.valor !== null && precio.valor <= 0))
    return fallo('El precio de la variante debe ser mayor que cero, o quedar vacío para usar el del producto.')
  if (!orden.ok) return fallo('El orden debe ser un número.')

  // El precio de una variante tampoco puede quedar bajo el costo del producto.
  if (precio.valor !== null) {
    const { data: prod } = await supabase
      .from('productos')
      .select('costo_unitario')
      .eq('id', productoId)
      .maybeSingle()
    const costo = Number(prod?.costo_unitario ?? 0)
    if (costo > 0 && precio.valor <= costo)
      return fallo(`A ${precio.valor} esta variante se vende bajo el costo de ${costo}.`)
  }

  const fila = {
    producto_id: productoId,
    nombre,
    sku,
    color_hex: color,
    precio: precio.valor,
    orden: orden.valor ?? 0,
  }

  const { error } = id
    ? await supabase.from('producto_variantes').update(fila).eq('id', id).eq('producto_id', productoId)
    : await supabase.from('producto_variantes').insert(fila)

  if (error) {
    if (error.code === '23505')
      return fallo(
        error.message.includes('sku')
          ? `El SKU ${sku} ya lo usa otra variante.`
          : `Este producto ya tiene una variante llamada «${nombre}».`
      )
    return fallo(error.message)
  }

  revalidar()
  return { ok: true }
}

/**
 * Quita una variante.
 *
 * Si ya tiene movimientos de stock o aparece en pedidos, no se borra: se
 * desactiva. Borrarla dejaría ventas pasadas apuntando a algo que no existe.
 */
export async function quitarVariante(id: string): Promise<Resultado<{ desactivada: boolean }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  if (!UUID.test(id)) return fallo('Variante no válida.')

  const [{ count: movimientos }, { count: lineas }] = await Promise.all([
    supabase.from('stock_movimientos').select('id', { count: 'exact', head: true }).eq('variante_id', id),
    supabase.from('pedido_items').select('id', { count: 'exact', head: true }).eq('variante_id', id),
  ])

  if ((movimientos ?? 0) > 0 || (lineas ?? 0) > 0) {
    const { error } = await supabase.from('producto_variantes').update({ activo: false }).eq('id', id)
    if (error) return fallo(error.message)
    revalidar()
    return { ok: true, desactivada: true }
  }

  const { error } = await supabase.from('producto_variantes').delete().eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true, desactivada: false }
}

export async function reactivarVariante(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Variante no válida.')
  const { error } = await sesion.supabase.from('producto_variantes').update({ activo: true }).eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}
