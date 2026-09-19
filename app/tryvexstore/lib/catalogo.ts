/**
 * Vocabulario del catálogo.
 *
 * Los valores válidos viven también como `check` en la base: esta es la copia
 * para la aplicación, que valida antes de mandar para dar un error legible en
 * vez del rechazo crudo de Postgres. Si cambian, cambian en los dos lugares.
 */

export const ESTADOS_PRODUCTO = ['borrador', 'publicado', 'archivado'] as const
export type EstadoProducto = (typeof ESTADOS_PRODUCTO)[number]

export const ROTULO_ESTADO: Record<EstadoProducto, string> = {
  borrador: 'Borrador',
  publicado: 'Publicado',
  archivado: 'Archivado',
}

/** Qué significa cada estado para quien lo elige, en una línea. */
export const AYUDA_ESTADO: Record<EstadoProducto, string> = {
  borrador: 'Solo lo ve el equipo. Sirve para prepararlo con calma.',
  publicado: 'Se ve en la tienda y en los canales conectados.',
  archivado: 'Deja de venderse. Los pedidos antiguos lo siguen mostrando.',
}

export const CONDICIONES = ['nuevo', 'reacondicionado', 'usado'] as const
export type Condicion = (typeof CONDICIONES)[number]

export const ROTULO_CONDICION: Record<Condicion, string> = {
  nuevo: 'Nuevo',
  reacondicionado: 'Reacondicionado',
  usado: 'Usado',
}

export const esEstadoProducto = (v: unknown): v is EstadoProducto =>
  typeof v === 'string' && (ESTADOS_PRODUCTO as readonly string[]).includes(v)

export const esCondicion = (v: unknown): v is Condicion =>
  typeof v === 'string' && (CONDICIONES as readonly string[]).includes(v)

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface Categoria {
  id: string
  nombre: string
  slug: string
  descripcion: string | null
  orden: number
  activo: boolean
}

export interface Variante {
  id: string
  producto_id: string
  nombre: string
  sku: string
  color_hex: string | null
  precio: number | null
  imagen_url: string | null
  orden: number
  activo: boolean
  stock: number
}

/**
 * Lee un número opcional de un formulario.
 *
 * Distingue tres casos que un `Number()` suelto confunde: campo vacío (`null`,
 * es válido), número bien formado, y texto que no es un número. Tratar el
 * tercero como cero guardaría un peso de 0 gramos sin avisar.
 */
export function numeroOpcional(
  valor: FormDataEntryValue | null
): { ok: true; valor: number | null } | { ok: false } {
  const texto = String(valor ?? '').trim()
  if (texto === '') return { ok: true, valor: null }
  const n = Number(texto)
  return Number.isFinite(n) ? { ok: true, valor: n } : { ok: false }
}

export function textoOpcional(valor: FormDataEntryValue | null, max: number): string | null {
  const t = String(valor ?? '').trim()
  return t === '' ? null : t.slice(0, max)
}

/** SKU sugerido para una variante: el del producto más el nombre de la variante. */
export function skuDeVariante(skuProducto: string, nombreVariante: string): string {
  const sufijo = nombreVariante
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20)
  return `${skuProducto}-${sufijo || 'VAR'}`.slice(0, 60)
}
