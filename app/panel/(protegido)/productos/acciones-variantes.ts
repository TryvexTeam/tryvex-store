'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import { UUID, numeroOpcional, textoOpcional } from '@/lib/catalogo'
import { BUCKET, PESO_MAXIMO, TIPOS_ACEPTADOS, nombreArchivo } from '@/lib/imagenes'

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

type DatosVariante = {
  productoId: string
  nombre: string
  sku: string
  color: string | null
  precio: number | null
  orden: number
}

function validarDatosVariante(datos: FormData): Resultado<DatosVariante> {
  const productoId = String(datos.get('producto_id') ?? '')
  const nombre = String(datos.get('nombre') ?? '').trim()
  const sku = String(datos.get('sku') ?? '').trim().toUpperCase()
  const color = textoOpcional(datos.get('color_hex'), 7)
  const precio = numeroOpcional(datos.get('precio'))
  const orden = numeroOpcional(datos.get('orden'))

  if (!UUID.test(productoId)) return fallo('Falta el producto.')
  if (!nombre) return fallo('La variante necesita un nombre, por ejemplo «Negro» o «Talla M».')
  if (nombre.length > 40) return fallo('El nombre de la variante es demasiado largo.')
  if (!SKU.test(sku)) return fallo('El SKU admite letras, números y guiones, entre 2 y 60 caracteres.')
  if (color && !COLOR.test(color)) return fallo('El color debe ser un código como #1D1D1F.')
  if (!precio.ok || (precio.valor !== null && precio.valor <= 0))
    return fallo('El precio de la variante debe ser mayor que cero, o quedar vacío para usar el del producto.')
  if (!orden.ok) return fallo('El orden debe ser un número.')

  return { ok: true, productoId, nombre, sku, color, precio: precio.valor, orden: orden.valor ?? 0 }
}

export async function guardarVariante(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const validada = validarDatosVariante(datos)
  if (!validada.ok) return validada
  const { productoId, nombre, sku, color, precio, orden } = validada
  if (id && !UUID.test(id)) return fallo('Variante no válida.')

  // El precio de una variante tampoco puede quedar bajo el costo del producto.
  if (precio !== null) {
    const { data: prod } = await supabase
      .from('productos')
      .select('costo_unitario')
      .eq('id', productoId)
      .maybeSingle()
    const costo = Number(prod?.costo_unitario ?? 0)
    if (costo > 0 && precio <= costo)
      return fallo(`A ${precio} esta variante se vende bajo el costo de ${costo}.`)
  }

  const fila = {
    producto_id: productoId,
    nombre,
    sku,
    color_hex: color,
    precio,
    orden,
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

/** Crea varias variantes en una sola mutación; evita carreras y refrescos por fila. */
export async function crearVariantesEnLote(datos: FormData): Promise<Resultado<{ creadas: number }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const productoId = String(datos.get('producto_id') ?? '')
  let crudas: unknown
  try {
    crudas = JSON.parse(String(datos.get('variantes') ?? '[]'))
  } catch {
    return fallo('El lote de variantes no se pudo leer.')
  }
  if (!UUID.test(productoId)) return fallo('Falta el producto.')
  if (!Array.isArray(crudas) || crudas.length === 0 || crudas.length > 30)
    return fallo('Agrega entre 1 y 30 variantes.')

  const filas: { producto_id: string; nombre: string; sku: string; color_hex: string | null; precio: number | null; orden: number }[] = []
  const nombres = new Set<string>()
  const skus = new Set<string>()
  for (let i = 0; i < crudas.length; i += 1) {
    const cruda = crudas[i]
    if (!cruda || typeof cruda !== 'object') return fallo('Una variante del lote no es válida.')
    const v = cruda as Record<string, unknown>
    const nombre = String(v.nombre ?? '').trim()
    const sku = String(v.sku ?? '').trim().toUpperCase()
    const color = v.color_hex === null || v.color_hex === undefined || v.color_hex === '' ? null : String(v.color_hex)
    const precio = v.precio === null || v.precio === undefined || v.precio === '' ? null : Number(v.precio)
    if (!nombre || nombre.length > 40 || !SKU.test(sku) || (color && !COLOR.test(color)) || (precio !== null && (!Number.isFinite(precio) || precio <= 0)))
      return fallo(`Revisa la variante ${i + 1}: nombre, SKU, color o precio no son válidos.`)
    if (nombres.has(nombre.toLocaleLowerCase('es-CL')) || skus.has(sku))
      return fallo('No repitas nombres ni SKU dentro del lote.')
    nombres.add(nombre.toLocaleLowerCase('es-CL'))
    skus.add(sku)
    filas.push({ producto_id: productoId, nombre, sku, color_hex: color, precio, orden: Number(v.orden) || i })
  }

  const { data: producto } = await sesion.supabase
    .from('productos')
    .select('costo_unitario')
    .eq('id', productoId)
    .maybeSingle()
  const costo = Number(producto?.costo_unitario ?? 0)
  const bajoCosto = filas.find((fila) => fila.precio !== null && costo > 0 && fila.precio <= costo)
  if (bajoCosto) return fallo(`«${bajoCosto.nombre}» queda bajo el costo unitario de ${costo}.`)

  const { error } = await sesion.supabase.from('producto_variantes').insert(filas)
  if (error) {
    if (error.code === '23505') return fallo('Uno de los SKU o nombres ya existe. Ajusta el lote y vuelve a intentarlo.')
    return fallo(error.message)
  }
  revalidar()
  return { ok: true, creadas: filas.length }
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

/** Qué imagen de la variante se toca: el círculo o la foto. */
type ArchivoVariante = 'muestra' | 'foto'
const COLUMNA: Record<ArchivoVariante, 'muestra_url' | 'imagen_url'> = { muestra: 'muestra_url', foto: 'imagen_url' }
const CARPETA: Record<ArchivoVariante, string> = { muestra: 'muestras', foto: 'variantes' }

/**
 * Sube la muestra (el círculo de color o diseño) o la foto de una variante.
 *
 * Va al bucket bajo `<producto_id>/muestras/` o `<producto_id>/variantes/`:
 * dentro de la carpeta del producto, así que la cubren las mismas reglas de
 * escritura del equipo. La imagen anterior se borra después de guardar la
 * nueva, para no dejar la variante apuntando a un archivo que ya no existe.
 */
export async function subirArchivoVariante(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const tipo = String(datos.get('tipo') ?? '') as ArchivoVariante
  const archivo = datos.get('archivo')
  if (!UUID.test(id)) return fallo('Variante no válida.')
  if (!(tipo in COLUMNA)) return fallo('No se sabe qué imagen de la variante cambiar.')
  if (!(archivo instanceof File) || archivo.size === 0) return fallo('No llegó ninguna imagen.')
  if (!TIPOS_ACEPTADOS.includes(archivo.type as (typeof TIPOS_ACEPTADOS)[number]))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO)
    return fallo(`La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  const columna = COLUMNA[tipo]
  const { data: v, error: errLectura } = await supabase
    .from('producto_variantes')
    .select(`producto_id,${columna}`)
    .eq('id', id)
    .maybeSingle()
  if (errLectura) return fallo(errLectura.message)
  if (!v) return fallo('La variante ya no existe.')

  const productoId = (v as Record<string, unknown>).producto_id as string
  const anterior = ((v as Record<string, unknown>)[columna] as string | null) ?? null
  const ruta = nombreArchivo(`${productoId}/${CARPETA[tipo]}`, archivo.name)

  const { error: errSubida } = await supabase.storage.from(BUCKET).upload(ruta, archivo, { cacheControl: '31536000', upsert: false })
  if (errSubida) return fallo(`No se pudo subir: ${errSubida.message}`)

  const { error } = await supabase.from('producto_variantes').update({ [columna]: ruta }).eq('id', id)
  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo(error.message)
  }
  // Solo se borra lo que vive en su carpeta: una foto de la galería que se
  // hubiera usado como foto de la variante no se toca.
  if (anterior && anterior.startsWith(`${productoId}/${CARPETA[tipo]}/`)) await supabase.storage.from(BUCKET).remove([anterior])

  revalidar()
  revalidatePath('/tienda')
  return { ok: true }
}

/** Quita la muestra o la foto: el círculo vuelve a su color y la card a la foto del producto. */
export async function quitarArchivoVariante(id: string, tipo: ArchivoVariante): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion
  if (!UUID.test(id)) return fallo('Variante no válida.')
  if (!(tipo in COLUMNA)) return fallo('No se sabe qué imagen de la variante quitar.')

  const columna = COLUMNA[tipo]
  const { data: v } = await supabase.from('producto_variantes').select(`producto_id,${columna}`).eq('id', id).maybeSingle()
  const { error } = await supabase.from('producto_variantes').update({ [columna]: null }).eq('id', id)
  if (error) return fallo(error.message)
  const productoId = ((v as Record<string, unknown> | null)?.producto_id as string | undefined) ?? ''
  const anterior = ((v as Record<string, unknown> | null)?.[columna] as string | null | undefined) ?? null
  if (anterior && productoId && anterior.startsWith(`${productoId}/${CARPETA[tipo]}/`)) await supabase.storage.from(BUCKET).remove([anterior])

  revalidar()
  revalidatePath('/tienda')
  return { ok: true }
}
