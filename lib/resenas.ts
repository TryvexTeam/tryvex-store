import 'server-only'

import { crearClienteAdministrador } from '@/lib/supabase/administrador'

export const BUCKET_RESENAS = 'resenas'
export const TIPOS_FOTO_RESENA = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
] as const
export const PESO_MAXIMO_FOTO_RESENA = 5 * 1024 * 1024

export type ResenaPublica = {
  id: string
  productoId: string
  producto: string
  cliente: string
  texto: string
  calificacion: number
  /** true solo si la reseña nace de un pedido real (pedido_id presente). */
  verificada: boolean
  foto: string | null
  creadaEn: string
}

export function urlPublicaResena(ruta: string | null): string | null {
  if (!ruta) return null
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  return `${base}/storage/v1/object/public/${BUCKET_RESENAS}/${ruta.replace(/^\/+/, '')}`
}

/** Reseñas que se pueden mostrar a cualquier visitante. */
export async function leerResenas(productoId?: string): Promise<ResenaPublica[]> {
  const db = crearClienteAdministrador()
  let consulta = db
    .from('resenas_tienda')
    .select('id,producto_id,pedido_id,cliente_nombre,texto,calificacion,foto_path,created_at,productos(nombre)')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    // La ficha pagina en el cliente («Ver más reseñas»), así que trae holgura; la portada, solo el carrusel.
    .limit(productoId ? 200 : 24)

  if (productoId) consulta = consulta.eq('producto_id', productoId)
  const { data } = await consulta

  return (data ?? []).map((r) => ({
    id: r.id,
    productoId: r.producto_id,
    producto: (r.productos as unknown as { nombre: string } | null)?.nombre ?? 'Producto Tryvex',
    cliente: r.cliente_nombre,
    texto: r.texto,
    calificacion: r.calificacion,
    verificada: r.pedido_id !== null,
    foto: urlPublicaResena(r.foto_path),
    creadaEn: r.created_at,
  }))
}

/**
 * Promedio, total y cuántas son de 4 o 5 estrellas, de TODAS las reseñas visibles (del producto, si se indica).
 * Va aparte de leerResenas porque esa lista está recortada a 24/30 tarjetas para
 * el carrusel: calcular el resumen sobre ella daría un total y un promedio falsos
 * en cuanto haya más reseñas que tarjetas. Solo trae la columna de la nota.
 */
export type ResumenResenas = {
  promedio: number
  total: number
  positivas: number
  /** Cuántas reseñas hay de 5, 4, 3, 2 y 1 estrella, en ese orden. */
  distribucion: [number, number, number, number, number]
}

export async function leerResumenResenas(productoId?: string): Promise<ResumenResenas> {
  const db = crearClienteAdministrador()
  let consulta = db.from('resenas_tienda').select('calificacion').eq('visible', true)
  if (productoId) consulta = consulta.eq('producto_id', productoId)
  const { data } = await consulta

  const total = data?.length ?? 0
  if (!data || total === 0) return { promedio: 0, total: 0, positivas: 0, distribucion: [0, 0, 0, 0, 0] }
  const promedio = data.reduce((suma, r) => suma + r.calificacion, 0) / total
  const positivas = data.filter((r) => r.calificacion >= 4).length
  const distribucion = [5, 4, 3, 2, 1].map((n) => data.filter((r) => r.calificacion === n).length) as ResumenResenas['distribucion']
  return { promedio: Math.round(promedio * 100) / 100, total, positivas, distribucion }
}

export function nombreFotoResena(resenaId: string, original: string): string {
  const extension = original.includes('.') ? original.split('.').pop()! : 'jpg'
  const ext = extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${resenaId}/foto.${ext}`
}
