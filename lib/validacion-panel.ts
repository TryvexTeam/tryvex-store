import { z } from 'zod'

/**
 * Validación de lo que entra a las acciones del panel.
 *
 * Revolut valida cada frontera con Zod y falla fuerte: el mismo esquema vale en
 * compilación y en producción, y un dato imposible se rechaza con un motivo
 * legible en vez de colarse a la base. Acá se aplica a las dos fronteras que
 * mueven dinero: registrar un movimiento y crear un pedido.
 *
 * Los mensajes van en español y dicen qué corregir.
 */

const CANALES = ['whatsapp', 'web', 'presencial', 'mayorista'] as const
const METODOS_PEDIDO = ['transferencia', 'mercadopago', 'flow', 'efectivo', 'tarjeta'] as const
// Mismos valores que METODOS_PAGO en lib/finanzas.ts (acá no se importa para que el módulo no dependa de nada y se pueda probar solo).
const METODOS_MOVIMIENTO = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago', 'otro'] as const
const FECHA = /^\d{4}-\d{2}-\d{2}$/

/** Texto recortado; vacío es válido solo si el campo es opcional. */
const texto = (max: number, etiqueta: string) =>
  z.string().trim().max(max, `${etiqueta} es muy largo (máximo ${max} caracteres).`)

const monto = (etiqueta: string) =>
  z.coerce
    .number({ error: `${etiqueta} no es válido.` })
    .refine(Number.isFinite, `${etiqueta} no es válido.`)

/** Primer mensaje de error, listo para mostrar. */
export function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Los datos no son válidos.'
}

/** La categoría debe corresponder al tipo: se comprueba en la acción con `categoriaFinancieraValida`. */
export const esquemaMovimiento = z.object({
    tipo: z.enum(['ingreso', 'egreso'], { error: 'Tipo inválido.' }),
    categoria: texto(80, 'La categoría'),
    descripcion: texto(200, 'La descripción').min(1, 'Falta la descripción.'),
    monto_clp: monto('El monto').refine((n) => n > 0, 'El monto debe ser mayor que cero.').refine((n) => n <= 10_000_000_000, 'El monto es demasiado alto.'),
    fecha: z.string().regex(FECHA, 'Falta la fecha.'),
    metodo_pago: z.union([z.enum(METODOS_MOVIMIENTO), z.literal('')], { error: 'Método de pago inválido.' }).default(''),
    contraparte: texto(120, 'La contraparte').default(''),
})

export type MovimientoValidado = z.infer<typeof esquemaMovimiento>

export const esquemaPedido = z.object({
  cliente_nombre: texto(120, 'El nombre').min(1, 'Falta el nombre del cliente.'),
  // El teléfono y el correo son opcionales: vacío pasa; con contenido, debe parecerse a uno.
  cliente_email: z.union([z.literal(''), z.email('El correo no es válido.').max(160, 'El correo es muy largo.')]).default(''),
  cliente_fono: z.union([z.literal(''), z.string().trim().regex(/^[+\d][\d\s().-]{5,24}$/, 'El teléfono no es válido.')]).default(''),
  canal: z.enum(CANALES, { error: 'Canal inválido.' }).default('whatsapp'),
  metodo_pago: z.union([z.literal(''), z.enum(METODOS_PEDIDO)], { error: 'Método de pago inválido.' }).default(''),
  notas: texto(200, 'La nota').default(''),
  producto_id: z.string().min(1, 'Falta el producto.'),
  cantidad: z.coerce.number({ error: 'La cantidad debe ser 1 o más.' }).int('La cantidad debe ser un número entero.').min(1, 'La cantidad debe ser 1 o más.').max(100_000, 'La cantidad es demasiado alta.'),
})

export type PedidoValidado = z.infer<typeof esquemaPedido>

/** Debe valer lo mismo que `MAX_LINEAS_VENTA` en lib/venta.ts (lo comprueba un test: acá no se importa para poder probar el módulo solo). */
export const MAX_LINEAS_VENTA = 30

export const esquemaLineasVenta = z
  .array(
    z.object({
      producto_id: z.string().min(1, 'Falta el producto.'),
      variante_id: z.union([z.string(), z.null()]).optional().transform((v) => (v ? v : null)),
      cantidad: z.coerce.number({ error: 'La cantidad debe ser 1 o más.' }).int('La cantidad debe ser un número entero.').min(1, 'La cantidad debe ser 1 o más.').max(100_000, 'La cantidad es demasiado alta.'),
      precio_unitario: monto('El precio').refine((n) => n >= 0, 'El precio no puede ser negativo.').refine((n) => n <= 1_000_000_000, 'El precio es demasiado alto.'),
    }),
    { error: 'Las líneas de la venta no son válidas.' }
  )
  .min(1, 'Agrega al menos un producto.')
  .max(MAX_LINEAS_VENTA, `Máximo ${MAX_LINEAS_VENTA} productos por venta.`)

export type LineaVentaValidada = z.infer<typeof esquemaLineasVenta>[number]

/** Encabezado de una venta con varios productos: lo del pedido, sin producto ni cantidad sueltos. */
export const esquemaEncabezadoVenta = esquemaPedido.omit({ producto_id: true, cantidad: true })
