'use server'

import { revalidatePath } from 'next/cache'
import { cuentaActual } from '@/lib/cuenta'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { UUID } from '@/lib/catalogo'
import { fallo, type Resultado } from '@/lib/autorizacion'
import { BUCKET_RESENAS, nombreFotoResena, PESO_MAXIMO_FOTO_RESENA, TIPOS_FOTO_RESENA } from '@/lib/resenas'

const TEXTO_MIN = 10
const TEXTO_MAX = 1200
const NOMBRE_MAX = 40

/**
 * Reseña escrita por un cliente con sesión, desde la ficha del producto.
 *
 * Queda oculta hasta que el equipo la apruebe en Panel → Reseñas. Todo se
 * valida aquí: el formulario del navegador no es de fiar. Si el cliente tiene
 * un pedido entregado de este producto, la reseña queda ligada a él y la tienda
 * le pone «Compra verificada»; si no, sale como reseña de cliente.
 */
export async function enviarResenaCliente(datos: FormData): Promise<Resultado> {
  const cuenta = await cuentaActual()
  if (!cuenta) return fallo('Inicia sesión para dejar tu reseña.')

  const productoId = String(datos.get('producto_id') ?? '')
  const nombre = String(datos.get('nombre') ?? '').trim().replace(/\s+/g, ' ')
  const texto = String(datos.get('texto') ?? '').trim()
  const calificacion = Number(datos.get('calificacion'))
  const foto = datos.get('foto')

  if (!UUID.test(productoId)) return fallo('Producto no válido.')
  if (!Number.isInteger(calificacion) || calificacion < 1 || calificacion > 5) return fallo('Elige de 1 a 5 estrellas.')
  if (nombre.length < 2 || nombre.length > NOMBRE_MAX) return fallo(`Escribe tu nombre (hasta ${NOMBRE_MAX} letras).`)
  if (texto.length < TEXTO_MIN) return fallo(`Cuéntanos un poco más: al menos ${TEXTO_MIN} letras.`)
  if (texto.length > TEXTO_MAX) return fallo(`La reseña puede tener hasta ${TEXTO_MAX} letras.`)
  const conFoto = foto instanceof File && foto.size > 0
  if (conFoto && !(TIPOS_FOTO_RESENA as readonly string[]).includes(foto.type)) return fallo('La foto tiene que ser JPG, PNG, WebP, AVIF o HEIC.')
  if (conFoto && foto.size > PESO_MAXIMO_FOTO_RESENA) return fallo(`La foto pesa ${(foto.size / 1024 / 1024).toFixed(1)} MB y el máximo son 5 MB.`)

  // Clave de servicio solo después de saber quién es: la fila lleva su id y nada más que lo validado arriba.
  const db = crearClienteAdministrador()
  const { data: producto } = await db.from('productos').select('id,slug').eq('id', productoId).eq('estado', 'publicado').maybeSingle()
  if (!producto) return fallo('Este producto ya no está disponible.')

  const { data: previa } = await db.from('resenas_tienda').select('id').eq('auth_user_id', cuenta.id).eq('producto_id', productoId).maybeSingle()
  if (previa) return fallo('Ya dejaste una reseña de este producto. ¡Gracias!')

  // ¿Lo compró y le llegó? Entonces es compra verificada.
  const { data: compra } = await db
    .from('pedido_items')
    .select('pedido_id,pedidos!inner(estado,cliente_auth_id)')
    .eq('producto_id', productoId)
    .eq('pedidos.cliente_auth_id', cuenta.id)
    .eq('pedidos.estado', 'entregado')
    .limit(1)
    .maybeSingle()

  const { data: creada, error } = await db
    .from('resenas_tienda')
    .insert({
      producto_id: productoId,
      pedido_id: compra?.pedido_id ?? null,
      auth_user_id: cuenta.id,
      cliente_nombre: nombre,
      texto,
      calificacion,
      visible: false,
    })
    .select('id')
    .single()
  if (error || !creada) {
    // El índice único cubre dos envíos simultáneos que pasaron la revisión de arriba.
    if (error?.code === '23505') return fallo('Ya dejaste una reseña de este producto. ¡Gracias!')
    return fallo('No pudimos guardar tu reseña. Inténtalo de nuevo en un momento.')
  }

  if (conFoto) {
    const ruta = nombreFotoResena(creada.id, foto.name)
    const { error: errorFoto } = await db.storage.from(BUCKET_RESENAS).upload(ruta, foto, { cacheControl: '31536000', contentType: foto.type })
    // La reseña ya quedó guardada: si la foto falla, no se pierde el texto.
    if (errorFoto) return fallo('Guardamos tu reseña, pero la foto no se pudo subir. Puedes enviarla por WhatsApp.')
    await db.from('resenas_tienda').update({ foto_path: ruta }).eq('id', creada.id)
  }

  revalidatePath('/panel/resenas')
  return { ok: true }
}
