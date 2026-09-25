'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID, numeroOpcional, textoOpcional } from '@/lib/catalogo'
import { slugificar } from '@/lib/imagenes'

function revalidar(): void {
  revalidatePath('/panel/productos')
  revalidatePath('/')
  revalidatePath('/tienda')
  revalidatePath('/api/feed/productos')
}

/** Crea o actualiza una categoría. El slug se genera del nombre si no viene. */
export async function guardarCategoria(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const nombre = String(datos.get('nombre') ?? '').trim()
  const descripcion = textoOpcional(datos.get('descripcion'), 400)
  const orden = numeroOpcional(datos.get('orden'))
  const slugCrudo = String(datos.get('slug') ?? '').trim()
  const slug = slugificar(slugCrudo || nombre)

  if (id && !UUID.test(id)) return fallo('Categoría no válida.')
  if (!nombre) return fallo('La categoría necesita un nombre.')
  if (nombre.length > 60) return fallo('El nombre es demasiado largo.')
  if (!orden.ok || (orden.valor !== null && !Number.isInteger(orden.valor)))
    return fallo('El orden debe ser un número entero.')

  const fila = { nombre, slug, descripcion, orden: orden.valor ?? 0 }
  const { error } = id
    ? await supabase.from('categorias').update(fila).eq('id', id)
    : await supabase.from('categorias').insert(fila)

  if (error) {
    if (error.code === '23505') return fallo(`Ya existe una categoría con la dirección «${slug}».`)
    return fallo(error.message)
  }
  revalidar()
  return { ok: true }
}

/**
 * Borra una categoría solo si está vacía.
 *
 * Con productos adentro, borrarla los dejaría sin lugar en la tienda sin que
 * nadie lo note. Se pide moverlos primero, y se dice cuántos son.
 */
export async function borrarCategoria(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  if (!UUID.test(id)) return fallo('Categoría no válida.')

  const { count } = await supabase
    .from('productos')
    .select('id', { count: 'exact', head: true })
    .eq('categoria_id', id)

  if ((count ?? 0) > 0)
    return fallo(
      `Tiene ${count} ${count === 1 ? 'producto' : 'productos'}. Muévelos a otra categoría antes de borrarla.`
    )

  const { error } = await supabase.from('categorias').delete().eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

export async function alternarCategoria(id: string, activo: boolean): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Categoría no válida.')
  const { error } = await sesion.supabase.from('categorias').update({ activo }).eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}
