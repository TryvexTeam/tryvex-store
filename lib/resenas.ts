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
    .select('id,producto_id,cliente_nombre,texto,foto_path,created_at,productos(nombre)')
    .eq('visible', true)
    .order('created_at', { ascending: false })
    .limit(productoId ? 30 : 24)

  if (productoId) consulta = consulta.eq('producto_id', productoId)
  const { data } = await consulta

  return (data ?? []).map((r) => ({
    id: r.id,
    productoId: r.producto_id,
    producto: (r.productos as unknown as { nombre: string } | null)?.nombre ?? 'Producto Tryvex',
    cliente: r.cliente_nombre,
    texto: r.texto,
    foto: urlPublicaResena(r.foto_path),
    creadaEn: r.created_at,
  }))
}

export function nombreFotoResena(resenaId: string, original: string): string {
  const extension = original.includes('.') ? original.split('.').pop()! : 'jpg'
  const ext = extension.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  return `${resenaId}/foto.${ext}`
}
