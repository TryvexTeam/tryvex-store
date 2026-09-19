'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import {
  UUID,
  esCondicion,
  esEstadoProducto,
  numeroOpcional,
  textoOpcional,
  type EstadoProducto,
} from '@/lib/catalogo'

export type { Resultado } from '@/lib/autorizacion'

// La autorización vive en `lib/autorizacion`: una Server Action es un endpoint
// público, y comprobar solo que haya sesión dejaba entrar a cualquier usuario
// autenticado de Supabase, fuera o no del equipo.

function revalidar(): void {
  revalidatePath('/panel/productos')
  revalidatePath('/')
  revalidatePath('/panel')
  revalidatePath('/api/feed/productos')
}

/**
 * Condiciones para publicar.
 *
 * Un producto publicado aparece en la tienda y en los canales (Google, Meta).
 * Sin foto, esos canales lo rechazan; sin categoría, no tiene dónde mostrarse
 * en la tienda. Se exige al pasar a «publicado», no antes: un borrador puede
 * estar incompleto a propósito.
 */
async function puedePublicar(
  supabase: SupabaseClient,
  productoId: string,
  /** Valores que el mismo guardado va a escribir: cuentan aunque aún no estén en la base. */
  pendiente: { categoriaId?: string | null } = {}
): Promise<string | null> {
  const { data } = await supabase
    .from('productos')
    .select('imagen_url,categoria_id,precio_base')
    .eq('id', productoId)
    .maybeSingle()
  if (!data) return 'El producto ya no existe.'

  const categoria = 'categoriaId' in pendiente ? pendiente.categoriaId : data.categoria_id
  const faltan: string[] = []
  if (!data.imagen_url) faltan.push('al menos una foto')
  if (!categoria) faltan.push('una categoría')
  if (!(Number(data.precio_base) > 0)) faltan.push('un precio')
  return faltan.length ? `Para publicar le falta ${faltan.join(' y ')}.` : null
}

/** Cambia el estado de publicación de un producto. */
export async function cambiarEstadoProducto(
  id: string,
  estado: EstadoProducto
): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Producto no válido.')
  if (!esEstadoProducto(estado)) return fallo('Estado no válido.')

  if (estado === 'publicado') {
    const motivo = await puedePublicar(sesion.supabase, id)
    if (motivo) return fallo(motivo)
  }

  const { error } = await sesion.supabase.from('productos').update({ estado }).eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

/** Datos del producto: precio, costo, catálogo, envío y estado. */
export async function guardarProducto(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const nombre = String(datos.get('nombre') ?? '').trim()
  const descripcion = String(datos.get('descripcion') ?? '').trim()
  const precio = Number(datos.get('precio_base'))
  const costo = Number(datos.get('costo_unitario'))
  const estado = String(datos.get('estado') ?? '')
  const categoriaId = String(datos.get('categoria_id') ?? '')
  const condicion = String(datos.get('condicion') ?? 'nuevo')
  const marca = textoOpcional(datos.get('marca'), 60)
  const etiqueta = textoOpcional(datos.get('etiqueta'), 24)
  const gtin = textoOpcional(datos.get('gtin'), 14)
  const precioAntes = numeroOpcional(datos.get('precio_antes'))
  const peso = numeroOpcional(datos.get('peso_gramos'))
  const largo = numeroOpcional(datos.get('largo_cm'))
  const ancho = numeroOpcional(datos.get('ancho_cm'))
  const alto = numeroOpcional(datos.get('alto_cm'))

  if (!UUID.test(id)) return fallo('Falta el producto.')
  if (!nombre) return fallo('El nombre no puede quedar vacío.')
  if (nombre.length > 120) return fallo('El nombre es demasiado largo.')
  if (descripcion.length > 2000) return fallo('La descripción es demasiado larga.')
  if (!Number.isFinite(precio) || precio <= 0) return fallo('El precio debe ser mayor que cero.')
  if (!Number.isFinite(costo) || costo < 0) return fallo('El costo no puede ser negativo.')
  if (costo >= precio)
    return fallo('El costo no puede ser igual o mayor que el precio: venderías a pérdida.')
  if (!esEstadoProducto(estado)) return fallo('Estado no válido.')
  if (categoriaId && !UUID.test(categoriaId)) return fallo('Categoría no válida.')
  if (!esCondicion(condicion)) return fallo('Condición no válida.')
  if (gtin && !/^\d{8,14}$/.test(gtin))
    return fallo('El código de barras (GTIN) son solo números, entre 8 y 14.')

  for (const [campo, r] of [
    ['precio anterior', precioAntes],
    ['peso', peso],
    ['largo', largo],
    ['ancho', ancho],
    ['alto', alto],
  ] as const) {
    if (!r.ok) return fallo(`El ${campo} no es un número.`)
    if (r.valor !== null && r.valor <= 0) return fallo(`El ${campo} debe ser mayor que cero.`)
  }
  if (precioAntes.ok && precioAntes.valor !== null && precioAntes.valor <= precio)
    return fallo('El precio anterior debe ser mayor que el actual; si no, el descuento sería falso.')
  if (peso.ok && peso.valor !== null && !Number.isInteger(peso.valor))
    return fallo('El peso va en gramos enteros.')

  // Se valida contra el estado que QUEDARÍA, no contra el actual: publicar y
  // editar en un mismo guardado debe cumplir las mismas condiciones.
  if (estado === 'publicado') {
    const motivo = await puedePublicar(supabase, id, { categoriaId: categoriaId || null })
    if (motivo) return fallo(motivo)
  }

  const { error } = await supabase
    .from('productos')
    .update({
      nombre,
      descripcion: descripcion || null,
      precio_base: precio,
      costo_unitario: costo,
      estado,
      categoria_id: categoriaId || null,
      condicion,
      marca,
      etiqueta,
      gtin,
      precio_antes: precioAntes.ok ? precioAntes.valor : null,
      peso_gramos: peso.ok ? peso.valor : null,
      largo_cm: largo.ok ? largo.valor : null,
      ancho_cm: ancho.ok ? ancho.valor : null,
      alto_cm: alto.ok ? alto.valor : null,
    })
    .eq('id', id)

  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

/** Crea o actualiza un tramo de precio por volumen. */
export async function guardarTramo(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const id = String(datos.get('id') ?? '')
  const producto_id = String(datos.get('producto_id') ?? '')
  const etiqueta = String(datos.get('etiqueta') ?? '').trim()
  const min = Number(datos.get('min_unidades'))
  const maxCrudo = String(datos.get('max_unidades') ?? '').trim()
  const max = maxCrudo === '' ? null : Number(maxCrudo)
  const precio = Number(datos.get('precio_unitario'))

  if (!UUID.test(producto_id)) return fallo('Falta el producto.')
  if (id && !UUID.test(id)) return fallo('Tramo no válido.')
  if (!etiqueta) return fallo('El tramo necesita una etiqueta.')
  if (!Number.isInteger(min) || min < 1) return fallo('El mínimo debe ser 1 o más.')
  if (max !== null && (!Number.isInteger(max) || max < min))
    return fallo('El máximo no puede ser menor que el mínimo.')
  if (!Number.isFinite(precio) || precio <= 0) return fallo('El precio debe ser mayor que cero.')

  // Vender bajo costo es un error caro y silencioso: se avisa antes de guardar.
  const { data: prod } = await supabase
    .from('productos')
    .select('costo_unitario')
    .eq('id', producto_id)
    .maybeSingle()

  const costo = Number(prod?.costo_unitario ?? 0)
  if (costo > 0 && precio <= costo)
    return fallo(`A ${precio} vendes bajo el costo de ${costo}. Revisa el tramo.`)

  const fila = { producto_id, etiqueta, min_unidades: min, max_unidades: max, precio_unitario: precio }

  const { error } = id
    ? await supabase.from('precio_tramos').update(fila).eq('id', id)
    : await supabase.from('precio_tramos').insert(fila)

  if (error) {
    if (error.code === '23505') return fallo(`Ya existe un tramo que empieza en ${min} unidades.`)
    return fallo(error.message)
  }

  revalidar()
  return { ok: true }
}

export async function borrarTramo(id: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return fallo('Tramo no válido.')

  const { error } = await sesion.supabase.from('precio_tramos').delete().eq('id', id)
  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}
