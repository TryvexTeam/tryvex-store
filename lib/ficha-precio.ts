/**
 * Tipos y cálculo de precio de la ficha, sin nada de servidor.
 *
 * Vive aparte de `ficha.ts` a propósito: lo importan componentes de cliente
 * (ficha y checkout), y `ficha.ts` usa el cliente de Supabase con la clave de
 * servicio. Mezclarlos arrastraría código con acceso de administrador al
 * paquete del navegador.
 */

export const MAX_POR_PEDIDO = 10

export interface VarianteFicha {
  id: string
  nombre: string
  sku: string
  colorHex: string | null
  precio: number
  imagen: string | null
  /** Tope MAX_POR_PEDIDO: nunca el número real. */
  disponible: number
}

export interface TramoFicha {
  min: number
  max: number | null
  precio: number
  etiqueta: string
}

export interface FichaProducto {
  id: string
  sku: string
  slug: string
  nombre: string
  descripcion: string | null
  marca: string | null
  condicion: string
  etiqueta: string | null
  precio: number
  precioAntes: number | null
  galeria: string[]
  categoria: { nombre: string; slug: string } | null
  disponible: number
  pocas: boolean
  variantes: VarianteFicha[]
  tramos: TramoFicha[]
}

/**
 * Precio unitario para una cantidad: el mismo criterio que usa el servidor.
 *
 * `base` es el precio del panel y manda. Un tramo solo se aplica si rebaja:
 * nunca se muestra —ni se cobra— por sobre el precio publicado.
 */
export function precioPara(base: number, tramos: TramoFicha[], cantidad: number): { precio: number; tramo: TramoFicha | null } {
  const t =
    [...tramos].sort((a, b) => b.min - a.min).find((x) => cantidad >= x.min && (x.max === null || cantidad <= x.max)) ?? null
  if (!t || t.precio >= base) return { precio: base, tramo: null }
  return { precio: t.precio, tramo: t }
}
