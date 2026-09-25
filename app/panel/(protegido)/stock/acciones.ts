'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { exigirIntegrante } from '@/lib/autorizacion'
import { varianteValida, stockDisponible } from '@/lib/variantes'

export type Resultado = { ok: true; aviso?: string } | { ok: false; error: string }

/** Cómo afecta cada motivo al inventario. */
const SUMAN = ['ingreso', 'devolucion', 'liberacion'] as const
const RESTAN = ['venta', 'merma', 'regalo', 'uso_interno', 'reserva'] as const
const TIPOS = [...SUMAN, ...RESTAN, 'ajuste'] as const

/** Motivos que mueven dinero además de unidades. */
const CON_VALOR = ['venta', 'devolucion'] as const

/**
 * Precio unitario que corresponde a una cantidad, según los tramos.
 * Se resuelve en el servidor: si se calculara en el navegador, cualquiera
 * podría mandar el precio que quisiera.
 */
export async function precioParaCantidad(
  producto_id: string,
  cantidad: number
): Promise<{ precio: number; etiqueta: string } | null> {
  const supabase = await crearClienteServidor()
  const { data } = await supabase
    .from('precio_tramos')
    .select('min_unidades,max_unidades,precio_unitario,etiqueta')
    .eq('producto_id', producto_id)
    .eq('activo', true)
    .order('min_unidades', { ascending: false })

  const tramo = (data ?? []).find(
    (t) =>
      cantidad >= t.min_unidades &&
      (t.max_unidades === null || cantidad <= t.max_unidades)
  )
  if (tramo) return { precio: Number(tramo.precio_unitario), etiqueta: tramo.etiqueta }

  const { data: p } = await supabase
    .from('productos')
    .select('precio_base')
    .eq('id', producto_id)
    .maybeSingle()

  return p ? { precio: Number(p.precio_base), etiqueta: 'Precio de lista' } : null
}

export async function guardarStockMinimo(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const productoId = String(datos.get('producto_id') ?? '')
  const minimo = Number(datos.get('stock_minimo'))
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(productoId))
    return { ok: false, error: 'Producto no válido.' }
  if (!Number.isInteger(minimo) || minimo < 0 || minimo > 1_000_000)
    return { ok: false, error: 'El mínimo debe ser un entero entre 0 y 1.000.000.' }

  // El RLS del catálogo mantiene la última palabra sobre quién puede editarlo.
  const { error } = await sesion.supabase
    .from('productos')
    .update({ stock_minimo: minimo })
    .eq('id', productoId)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/panel/stock')
  revalidatePath('/panel')
  return { ok: true }
}

export async function registrarStock(datos: FormData): Promise<Resultado> {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a entrar.' }

  const { data: yo } = await supabase
    .from('dim_integrantes')
    .select('id, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  if (!yo) return { ok: false, error: 'No estás activo como integrante.' }

  const producto_id = String(datos.get('producto_id') ?? '')
  const tipo = String(datos.get('tipo') ?? '')
  const motivo = String(datos.get('motivo') ?? '').trim()
  const contraparte = String(datos.get('contraparte') ?? '').trim()
  const cantidadCruda = Number(datos.get('cantidad'))
  const precioCrudo = String(datos.get('precio_unitario') ?? '').trim()

  if (!producto_id) return { ok: false, error: 'Falta el producto.' }
  const variante = await varianteValida(supabase, producto_id, String(datos.get('variante_id') ?? ''))
  if (!variante.ok) return variante
  const variante_id = variante.id
  if (!TIPOS.includes(tipo as (typeof TIPOS)[number]))
    return { ok: false, error: 'Motivo inválido.' }
  if (!Number.isInteger(cantidadCruda) || cantidadCruda === 0)
    return { ok: false, error: 'La cantidad debe ser un entero distinto de cero.' }

  const magnitud = Math.abs(cantidadCruda)
  const cantidad =
    tipo === 'ajuste'
      ? cantidadCruda
      : (SUMAN as readonly string[]).includes(tipo)
        ? magnitud
        : -magnitud

  // Nunca dejar el inventario en negativo: sería vender lo que no existe.
  if (cantidad < 0) {
    const disponible = await stockDisponible(supabase, producto_id, variante_id)
    if (disponible + cantidad < 0)
      return { ok: false, error: `Solo hay ${disponible} unidades. No puedes descontar ${magnitud}.` }
  }

  // ── Valor ────────────────────────────────────────────────────────
  // El precio se toma del tramo si no se indicó uno. Se guarda copiado y no
  // por referencia: si mañana cambia el tramo, esta venta debe seguir
  // diciendo a cuánto salió realmente.
  let precio_unitario: number | null = null
  let total_clp: number | null = null
  let tramo_sugerido: string | null = null
  let precio_negociado = false

  if ((CON_VALOR as readonly string[]).includes(tipo)) {
    // El tramo se calcula siempre, aunque el vendedor ponga otro precio: sirve
    // para saber despues si la venta salio al precio de lista o negociada.
    const sugerido = await precioParaCantidad(producto_id, magnitud)
    tramo_sugerido = sugerido?.etiqueta ?? null

    if (precioCrudo !== '') {
      const p = Number(precioCrudo)
      if (!Number.isFinite(p) || p < 0)
        return { ok: false, error: 'El precio unitario no es válido.' }
      precio_unitario = p
      precio_negociado = sugerido != null && p !== sugerido.precio
    } else {
      precio_unitario = sugerido?.precio ?? null
    }

    if (precio_unitario !== null) total_clp = precio_unitario * magnitud
  }

  // ── Dinero en finanzas ───────────────────────────────────────────
  let movimiento_id: string | null = null
  let aviso: string | undefined

  if (total_clp && total_clp > 0) {
    if (yo.gestionar_finanzas) {
      const esIngreso = tipo === 'venta'
      const { data: mov, error: errMov } = await supabase
        .from('movimientos_financieros')
        .insert({
          tipo: esIngreso ? 'ingreso' : 'egreso',
          categoria: esIngreso ? 'Venta' : 'Devolución a cliente',
          descripcion:
            `${esIngreso ? 'Venta' : 'Devolución'} de ${magnitud} unidades` +
            (precio_unitario ? ` a ${Math.round(precio_unitario).toLocaleString('es-CL')} c/u` : '') +
            (precio_negociado ? ' (precio negociado)' : ''),
          monto_clp: total_clp,
          fecha: new Date().toISOString().slice(0, 10),
          contraparte: contraparte || null,
          creado_por: yo.id,
        })
        .select('id')
        .maybeSingle()

      if (errMov) {
        // El stock sí se puede registrar; solo avisamos que la plata no quedó.
        aviso = `El stock quedó registrado, pero no se pudo anotar en finanzas: ${errMov.message}`
      } else {
        movimiento_id = mov?.id ?? null
      }
    } else {
      aviso = 'Se registró el stock. El ingreso en finanzas queda pendiente: no tienes ese permiso.'
    }
  }

  const { error } = await supabase.from('stock_movimientos').insert({
    producto_id,
    variante_id,
    tipo,
    cantidad,
    motivo: motivo || null,
    precio_unitario,
    total_clp,
    tramo_sugerido,
    precio_negociado,
    movimiento_id,
    creado_por: yo.id,
  })

  if (error) {
    // Si la fila de stock no entró, el ingreso ya creado mentiría.
    if (movimiento_id) {
      await supabase.from('movimientos_financieros').delete().eq('id', movimiento_id)
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/panel/stock')
  revalidatePath('/')
  revalidatePath('/panel/finanzas')
  revalidatePath('/panel')
  return { ok: true, aviso }
}
