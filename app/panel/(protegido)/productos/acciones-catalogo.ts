'use server'

import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'
import {
  BUCKET,
  MAX_POR_PRODUCTO,
  PESO_MAXIMO,
  PESO_MAXIMO_VIDEO,
  TIPOS_ACEPTADOS,
  TIPOS_VIDEO,
  esRutaDelProducto,
  esVideo,
  nombreArchivo,
  rutasDeGaleria,
  slugificar,
} from '@/lib/imagenes'
import { montoDesdeTexto } from '@/lib/monto'
import { UUID, textoOpcional } from '@/lib/catalogo'

export type { Resultado } from '@/lib/autorizacion'

function revalidar(): void {
  revalidatePath('/panel/productos')
  revalidatePath('/')
  revalidatePath('/panel')
}

/**
 * Producto tal como lo necesitan las acciones de galería.
 * Se pide siempre lo mismo, así que el tipo vive en un solo lugar.
 */
interface ProductoGaleria {
  id: string
  galeria: string[]
  imagen_url: string | null
}

/**
 * Carga un producto y normaliza su galería.
 *
 * Toda acción sobre imágenes empieza por acá: sin leer el estado real de la
 * fila no se puede decidir si la ruta que llegó del cliente es legítima.
 */
async function cargarProducto(
  supabase: SupabaseClient,
  productoId: string
): Promise<Resultado<{ producto: ProductoGaleria }>> {
  if (!UUID.test(productoId)) return fallo('Producto no válido.')

  const { data, error } = await supabase
    .from('productos')
    .select('id,galeria,imagen_url')
    .eq('id', productoId)
    .maybeSingle()

  if (error) return fallo(error.message)
  if (!data) return fallo('El producto ya no existe.')

  return {
    ok: true,
    producto: {
      id: data.id,
      galeria: rutasDeGaleria(data.galeria),
      imagen_url: data.imagen_url,
    },
  }
}

/**
 * Comprueba que una ruta pertenezca de verdad al producto.
 *
 * La ruta llega desde el navegador, así que es entrada no confiable. Sin esta
 * comprobación, cambiarla en el cliente permitía operar sobre archivos de
 * otros productos: la acción borraba del bucket lo que le pidieran.
 *
 * Se exige lo mismo por dos vías independientes — el prefijo de carpeta y la
 * pertenencia a la galería registrada — porque cada una cubre un agujero
 * distinto: la primera, rutas de otra carpeta; la segunda, archivos sueltos
 * dentro de la carpeta correcta que la fila nunca registró.
 */
function rutaLegitima(producto: ProductoGaleria, ruta: string): boolean {
  return esRutaDelProducto(ruta, producto.id) && producto.galeria.includes(ruta)
}

/* ── Catálogo ──────────────────────────────────────────────────────── */

/**
 * Crea un producto.
 *
 * SKU y slug son únicos en la tabla. El choque se resuelve acá y no se deja
 * escapar el error de Postgres: al slug, que lo genera la máquina, se le añade
 * un sufijo; el SKU lo eligió una persona, así que se devuelve para que lo
 * corrija.
 */
export async function crearProducto(
  datos: FormData
): Promise<Resultado<{ id: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const nombre = String(datos.get('nombre') ?? '').trim()
  const sku = String(datos.get('sku') ?? '').trim().toUpperCase()
  const descripcion = String(datos.get('descripcion') ?? '').trim()
  const precio = montoDesdeTexto(datos.get('precio_base')) ?? NaN
  const costoCrudo = String(datos.get('costo_unitario') ?? '').trim()
  const costo = costoCrudo === '' ? 0 : Number(costoCrudo)
  const categoriaId = String(datos.get('categoria_id') ?? '')
  const marca = textoOpcional(datos.get('marca'), 60)

  if (!nombre) return fallo('El producto necesita un nombre.')
  if (nombre.length > 120) return fallo('El nombre es demasiado largo.')
  if (!sku) return fallo('El producto necesita un SKU.')
  if (!/^[A-Z0-9][A-Z0-9-]{1,39}$/.test(sku))
    return fallo('El SKU admite letras, números y guiones, entre 2 y 40 caracteres.')
  if (descripcion.length > 2000) return fallo('La descripción es demasiado larga.')
  if (!Number.isFinite(precio) || precio <= 0)
    return fallo('El precio debe ser mayor que cero.')
  if (precio > 99_999_999) return fallo('Ese precio está fuera de rango.')
  if (!Number.isFinite(costo) || costo < 0) return fallo('El costo no puede ser negativo.')
  if (costo > 0 && costo >= precio)
    return fallo('El costo no puede ser igual o mayor que el precio: venderías a pérdida.')
  if (categoriaId && !UUID.test(categoriaId)) return fallo('Categoría no válida.')

  const { data: ocupado } = await supabase
    .from('productos')
    .select('id')
    .eq('sku', sku)
    .maybeSingle()
  if (ocupado) return fallo(`El SKU ${sku} ya está en uso.`)

  let slug = slugificar(nombre)
  const { data: slugOcupado } = await supabase
    .from('productos')
    .select('id')
    .eq('slug', slug)
    .maybeSingle()
  if (slugOcupado) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

  const { data: ultimo } = await supabase
    .from('productos')
    .select('orden')
    .order('orden', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data, error } = await supabase
    .from('productos')
    .insert({
      nombre,
      sku,
      slug,
      descripcion: descripcion || null,
      precio_base: precio,
      costo_unitario: costo || null,
      categoria_id: categoriaId || null,
      marca,
      // Nace en borrador: no aparece en la tienda ni en los canales hasta que
      // alguien lo publique a propósito, ya con fotos.
      estado: 'borrador',
      orden: Number(ultimo?.orden ?? 0) + 1,
      galeria: [],
    })
    .select('id')
    .single()

  if (error) return fallo(error.message)
  revalidar()
  return { ok: true, id: data.id }
}

/* ── Imágenes ──────────────────────────────────────────────────────── */

/**
 * Sube una imagen y la agrega a la galería.
 *
 * El archivo se valida acá aunque el bucket también lo haga: el error del
 * Storage llega como «mime type not supported», que no le dice nada a quien
 * está subiendo fotos desde el teléfono.
 *
 * La primera imagen queda de portada sola. Nadie quiere subir una foto y
 * tener que declarar además que sí, que esa es la que se muestra.
 */
export async function subirImagen(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const productoId = String(datos.get('producto_id') ?? '')
  const archivo = datos.get('archivo')

  if (!(archivo instanceof File) || archivo.size === 0)
    return fallo('No llegó ninguna imagen.')
  if (!TIPOS_ACEPTADOS.includes(archivo.type as (typeof TIPOS_ACEPTADOS)[number]))
    return fallo('Formato no admitido. Usa JPG, PNG, WebP, AVIF o HEIC.')
  if (archivo.size > PESO_MAXIMO)
    return fallo(
      `La imagen pesa ${(archivo.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`
    )

  const cargado = await cargarProducto(supabase, productoId)
  if (!cargado.ok) return cargado
  const { producto } = cargado

  if (producto.galeria.length >= MAX_POR_PRODUCTO)
    return fallo(`Ya hay ${MAX_POR_PRODUCTO} imágenes. Borra alguna antes de subir otra.`)

  // El nombre lo genera el servidor a partir del id del producto: el del
  // archivo que llega solo aporta la extensión, ya saneada.
  const ruta = nombreArchivo(producto.id, archivo.name)

  const { error: errSubida } = await supabase.storage
    .from(BUCKET)
    .upload(ruta, archivo, { cacheControl: '31536000', upsert: false })

  if (errSubida) return fallo(`No se pudo subir: ${errSubida.message}`)

  const { error: errUpdate } = await supabase
    .from('productos')
    .update({
      galeria: [...producto.galeria, ruta],
      imagen_url: producto.imagen_url || ruta,
      updated_at: new Date().toISOString(),
    })
    .eq('id', producto.id)

  // Si la fila no se actualiza, el archivo quedaría ocupando espacio sin que
  // nada lo referencie. Se limpia para no dejar basura invisible.
  if (errUpdate) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo(errUpdate.message)
  }

  revalidar()
  return { ok: true }
}

/**
 * Primer paso para subir un video: el servidor valida y entrega una URL
 * firmada de un solo uso para esa ruta exacta. El navegador sube el archivo
 * directo al bucket (Vercel corta los envíos de más de 4,5 MB) y después
 * llama a `confirmarVideo`, que recién ahí lo suma a la galería.
 */
export async function pedirSubidaVideo(
  productoId: string,
  nombre: string,
  tipo: string,
  peso: number
): Promise<Resultado<{ ruta: string; token: string }>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  if (!TIPOS_VIDEO.includes(tipo as (typeof TIPOS_VIDEO)[number]))
    return fallo('Formato de video no admitido. Usa MP4 o WebM.')
  if (!Number.isFinite(peso) || peso <= 0) return fallo('El video llegó vacío.')
  if (peso > PESO_MAXIMO_VIDEO)
    return fallo(`El video pesa ${(peso / 1024 / 1024).toFixed(1)} MB y el máximo son 30 MB.`)

  const cargado = await cargarProducto(supabase, productoId)
  if (!cargado.ok) return cargado
  const { producto } = cargado
  if (producto.galeria.length >= MAX_POR_PRODUCTO)
    return fallo(`Ya hay ${MAX_POR_PRODUCTO} archivos. Borra alguno antes de subir otro.`)

  // La extensión sale del tipo validado, no del nombre que manda el cliente.
  const extension = tipo === 'video/webm' ? 'webm' : 'mp4'
  const ruta = nombreArchivo(producto.id, `${String(nombre).replace(/\.[^.]*$/, '')}.${extension}`)

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(ruta)
  if (error || !data) return fallo(`No se pudo preparar la subida: ${error?.message ?? 'sin respuesta'}`)
  return { ok: true, ruta, token: data.token }
}

/** Segundo paso: el video ya está en el bucket y se suma a la galería. */
export async function confirmarVideo(productoId: string, ruta: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const cargado = await cargarProducto(supabase, productoId)
  if (!cargado.ok) return cargado
  const { producto } = cargado

  // La ruta vuelve del navegador: se exige carpeta y extensión correctas, y
  // que el archivo exista de verdad en el bucket.
  if (!esRutaDelProducto(ruta, producto.id) || !esVideo(ruta)) return fallo('Ese video no es de este producto.')
  if (producto.galeria.includes(ruta)) return { ok: true }

  const carpeta = ruta.slice(0, ruta.lastIndexOf('/'))
  const archivo = ruta.slice(ruta.lastIndexOf('/') + 1)
  const { data: encontrados, error: errLista } = await supabase.storage.from(BUCKET).list(carpeta, { search: archivo })
  if (errLista) return fallo(errLista.message)
  if (!encontrados?.some((o) => o.name === archivo)) return fallo('El video no terminó de subirse. Inténtalo de nuevo.')

  const { error } = await supabase
    .from('productos')
    .update({ galeria: [...producto.galeria, ruta], updated_at: new Date().toISOString() })
    .eq('id', producto.id)

  if (error) {
    await supabase.storage.from(BUCKET).remove([ruta])
    return fallo(error.message)
  }

  revalidar()
  return { ok: true }
}

/** Quita una imagen de la galería y del bucket. */
export async function borrarImagen(productoId: string, ruta: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase } = sesion

  const cargado = await cargarProducto(supabase, productoId)
  if (!cargado.ok) return cargado
  const { producto } = cargado

  if (!rutaLegitima(producto, ruta)) return fallo('Esa imagen no es de este producto.')

  const galeria = producto.galeria.filter((r) => r !== ruta)
  // Si cae la portada, la siguiente ocupa su lugar: dejar el campo apuntando
  // a un archivo que ya no existe deja un hueco en la grilla y en la tienda.
  const portada = producto.imagen_url === ruta ? (galeria.find((r) => !esVideo(r)) ?? null) : producto.imagen_url

  const { error } = await supabase
    .from('productos')
    .update({ galeria, imagen_url: portada, updated_at: new Date().toISOString() })
    .eq('id', producto.id)

  if (error) return fallo(error.message)

  // El archivo se borra después de la fila. Si esto falla queda un archivo
  // suelto, que es molesto pero invisible; al revés quedaría una imagen rota
  // a la vista, que sí se nota.
  await supabase.storage.from(BUCKET).remove([ruta])

  revalidar()
  return { ok: true }
}

/** Marca cuál de las imágenes es la portada. */
export async function fijarPortada(productoId: string, ruta: string): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const cargado = await cargarProducto(sesion.supabase, productoId)
  if (!cargado.ok) return cargado
  const { producto } = cargado

  if (!rutaLegitima(producto, ruta)) return fallo('Esa imagen no es de este producto.')
  // La portada sale en la grilla y en las tarjetas, que muestran imágenes.
  if (esVideo(ruta)) return fallo('Un video no puede ser la portada. Elige una foto.')

  const { error } = await sesion.supabase
    .from('productos')
    .update({ imagen_url: ruta, updated_at: new Date().toISOString() })
    .eq('id', producto.id)

  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}

/** Mueve una imagen dentro de la galería. Ese orden es el que ve la tienda. */
export async function moverImagen(
  productoId: string,
  ruta: string,
  direccion: 'izquierda' | 'derecha'
): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  if (direccion !== 'izquierda' && direccion !== 'derecha')
    return fallo('Movimiento no válido.')

  const cargado = await cargarProducto(sesion.supabase, productoId)
  if (!cargado.ok) return cargado
  const { producto } = cargado

  if (!rutaLegitima(producto, ruta)) return fallo('Esa imagen no es de este producto.')

  const galeria = [...producto.galeria]
  const desde = galeria.indexOf(ruta)
  const hasta = direccion === 'izquierda' ? desde - 1 : desde + 1
  if (hasta < 0 || hasta >= galeria.length) return { ok: true } // ya está en el extremo
  ;[galeria[desde], galeria[hasta]] = [galeria[hasta], galeria[desde]]

  const { error } = await sesion.supabase
    .from('productos')
    .update({ galeria, updated_at: new Date().toISOString() })
    .eq('id', producto.id)

  if (error) return fallo(error.message)
  revalidar()
  return { ok: true }
}
