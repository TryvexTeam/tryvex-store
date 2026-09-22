'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { varianteValida, stockDisponible } from '@/lib/variantes'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { correoPedidoEnCamino } from '@/lib/correo'
import { urlDeSeguimiento } from '@/lib/seguimiento'

export type Resultado = { ok: true; aviso?: string; id?: string } | { ok: false; error: string }

/**
 * Máquina de estados de un pedido.
 *
 * El stock se compromete al crear el pedido (reserva) y se convierte en venta
 * al pagarse. Así dos personas no pueden vender la misma unidad mientras una
 * espera la transferencia, que es el error clásico de las tiendas chicas.
 *
 *   pendiente ──pagar──▶ pagado ──▶ preparando ──▶ enviado ──▶ entregado
 *       │                   │
 *       └──cancelar─────────┴──▶ cancelado   (devuelve el stock reservado)
 */
const TRANSICIONES: Record<string, string[]> = {
  pendiente: ['pagado', 'cancelado'],
  pagado: ['preparando', 'enviado', 'cancelado'],
  preparando: ['enviado', 'cancelado'],
  enviado: ['entregado'],
  entregado: [],
  cancelado: [],
}

// Aquí vivía `export const ESTADOS = Object.keys(TRANSICIONES)`. Un archivo
// `'use server'` solo puede exportar funciones async, así que ese arreglo
// rompía el módulo entero —y con él todo el panel de pedidos—, con un error
// que ni siquiera apunta a esa línea. No lo usaba nadie: se eliminó.
// Las transiciones permitidas se consultan con `siguientesEstados()`.

async function contexto() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { supabase, yo: null, error: 'Sesión expirada. Vuelve a entrar.' as const }

  const { data: yo } = await supabase
    .from('dim_integrantes')
    .select('id, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  if (!yo) return { supabase, yo: null, error: 'No estás activo como integrante.' as const }
  return { supabase, yo, error: null }
}

/** Cada hito del pedido deja su hora: es lo que después se le muestra al cliente. */
function marcaDeTiempo(estado: string): Record<string, string> {
  const ahora = new Date().toISOString()
  if (estado === 'pagado') return { pagado_at: ahora }
  if (estado === 'enviado') return { enviado_at: ahora }
  if (estado === 'entregado') return { entregado_at: ahora }
  return {}
}

function revalidar() {
  revalidatePath('/panel/pedidos')
  revalidatePath('/panel/stock')
  revalidatePath('/')
  revalidatePath('/panel/finanzas')
  revalidatePath('/panel')
}

/** Crea el pedido y reserva las unidades. */
export async function crearPedido(datos: FormData): Promise<Resultado> {
  const { supabase, yo, error: errSesion } = await contexto()
  if (errSesion || !yo) return { ok: false, error: errSesion ?? 'Sin sesión.' }

  const cliente_nombre = String(datos.get('cliente_nombre') ?? '').trim()
  const cliente_email = String(datos.get('cliente_email') ?? '').trim()
  const cliente_fono = String(datos.get('cliente_fono') ?? '').trim()
  const canal = String(datos.get('canal') ?? 'whatsapp')
  const metodo_pago = String(datos.get('metodo_pago') ?? '')
  const notas = String(datos.get('notas') ?? '').trim()
  const producto_id = String(datos.get('producto_id') ?? '')
  const cantidad = Number(datos.get('cantidad'))
  const precio_unitario = Number(datos.get('precio_unitario'))
  const envio = Number(datos.get('envio_clp') || 0)

  if (!cliente_nombre) return { ok: false, error: 'Falta el nombre del cliente.' }
  if (!producto_id) return { ok: false, error: 'Falta el producto.' }
  if (!Number.isInteger(cantidad) || cantidad < 1)
    return { ok: false, error: 'La cantidad debe ser 1 o más.' }
  if (!Number.isFinite(precio_unitario) || precio_unitario < 0)
    return { ok: false, error: 'El precio unitario no es válido.' }
  if (!Number.isFinite(envio) || envio < 0)
    return { ok: false, error: 'El envío no es válido.' }

  const variante = await varianteValida(supabase, producto_id, String(datos.get('variante_id') ?? ''))
  if (!variante.ok) return variante
  const variante_id = variante.id

  // No comprometer unidades que no existen.
  const stock = await stockDisponible(supabase, producto_id, variante_id)
  if (cantidad > stock)
    return { ok: false, error: `Solo hay ${stock} unidades disponibles.` }

  const subtotal = cantidad * precio_unitario
  const total = subtotal + envio

  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .insert({
      cliente_nombre,
      cliente_email: cliente_email || null,
      cliente_fono: cliente_fono || null,
      canal,
      metodo_pago: metodo_pago || null,
      subtotal_clp: subtotal,
      envio_clp: envio,
      total_clp: total,
      notas: notas || null,
      atendido_por: yo.id,
    })
    .select('id, numero')
    .maybeSingle()

  if (errPedido || !pedido) return { ok: false, error: errPedido?.message ?? 'No se pudo crear.' }

  const { error: errItem } = await supabase.from('pedido_items').insert({
    pedido_id: pedido.id,
    producto_id,
    variante_id,
    cantidad,
    precio_unitario,
    subtotal_clp: subtotal,
  })

  if (errItem) {
    // Un pedido sin líneas no sirve para nada y ensucia la lista.
    await supabase.from('pedidos').delete().eq('id', pedido.id)
    return { ok: false, error: errItem.message }
  }

  // Reserva: las unidades quedan comprometidas aunque aún no esté pagado.
  const { error: errStock } = await supabase.from('stock_movimientos').insert({
    producto_id,
    variante_id,
    tipo: 'reserva',
    cantidad: -cantidad,
    motivo: `Pedido #${pedido.numero} · ${cliente_nombre}`,
    pedido_id: pedido.id,
    creado_por: yo.id,
  })

  const aviso = errStock
    ? `Pedido creado, pero no se reservó el stock: ${errStock.message}`
    : undefined

  revalidar()
  return { ok: true, id: pedido.id, aviso }
}

/** Mueve el pedido de estado y aplica los efectos de ese cambio. */
export async function cambiarEstado(pedido_id: string, nuevo: string): Promise<Resultado> {
  const { supabase, yo, error: errSesion } = await contexto()
  if (errSesion || !yo) return { ok: false, error: errSesion ?? 'Sin sesión.' }

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id,numero,estado,cliente_nombre,total_clp,subtotal_clp,metodo_pago,venta_id')
    .eq('id', pedido_id)
    .maybeSingle()

  if (!pedido) return { ok: false, error: 'El pedido no existe.' }

  const permitidos = TRANSICIONES[pedido.estado] ?? []
  if (!permitidos.includes(nuevo))
    return {
      ok: false,
      error: `Un pedido ${pedido.estado} no puede pasar a ${nuevo}.`,
    }

  const { data: items } = await supabase
    .from('pedido_items')
    .select('producto_id,variante_id,cantidad,precio_unitario')
    .eq('pedido_id', pedido_id)

  let aviso: string | undefined

  // ── Pagado: la reserva se convierte en venta y entra la plata ──────
  if (nuevo === 'pagado') {
    let movimiento_id: string | null = null

    if (yo.gestionar_finanzas) {
      const { data: mov, error: errMov } = await supabase
        .from('movimientos_financieros')
        .insert({
          tipo: 'ingreso',
          categoria: 'Venta',
          descripcion: `Pedido #${pedido.numero} · ${pedido.cliente_nombre}`,
          monto_clp: Number(pedido.total_clp),
          fecha: new Date().toISOString().slice(0, 10),
          metodo_pago: pedido.metodo_pago ?? null,
          contraparte: pedido.cliente_nombre,
          creado_por: yo.id,
        })
        .select('id')
        .maybeSingle()

      if (errMov) aviso = `Pedido marcado pagado, pero no se anotó en finanzas: ${errMov.message}`
      else movimiento_id = mov?.id ?? null
    } else {
      aviso = 'Pedido pagado. El ingreso en finanzas queda pendiente: no tienes ese permiso.'
    }

    // Se libera la reserva y se registra la venta. Dos filas en vez de una
    // para que el historial cuente lo que pasó de verdad.
    for (const it of items ?? []) {
      await supabase.from('stock_movimientos').insert([
        {
          producto_id: it.producto_id,
          variante_id: it.variante_id,
          tipo: 'liberacion',
          cantidad: it.cantidad,
          motivo: `Pedido #${pedido.numero} pagado`,
          pedido_id: pedido.id,
          creado_por: yo.id,
        },
        {
          producto_id: it.producto_id,
          variante_id: it.variante_id,
          tipo: 'venta',
          cantidad: -it.cantidad,
          precio_unitario: it.precio_unitario,
          total_clp: it.cantidad * Number(it.precio_unitario),
          motivo: `Pedido #${pedido.numero} · ${pedido.cliente_nombre}`,
          pedido_id: pedido.id,
          movimiento_id,
          creado_por: yo.id,
        },
      ])
    }
  }

  // ── Cancelado: las unidades vuelven a estar disponibles ────────────
  if (nuevo === 'cancelado') {
    const yaPagado = pedido.estado !== 'pendiente'

    for (const it of items ?? []) {
      await supabase.from('stock_movimientos').insert({
        producto_id: it.producto_id,
        variante_id: it.variante_id,
        tipo: 'liberacion',
        cantidad: it.cantidad,
        motivo: `Pedido #${pedido.numero} cancelado`,
        pedido_id: pedido.id,
        creado_por: yo.id,
      })
    }

    if (yaPagado)
      aviso =
        'El stock volvió a bodega. Si ya se había cobrado, registra la devolución del dinero en Finanzas.'
  }

  const { error } = await supabase
    .from('pedidos')
    .update({ estado: nuevo, updated_at: new Date().toISOString(), ...marcaDeTiempo(nuevo) })
    .eq('id', pedido_id)

  if (error) return { ok: false, error: error.message }

  // Al despachar se le avisa al comprador, con su enlace de seguimiento. Si el
  // correo falla no se deshace nada: el pedido ya salió, y eso es lo que
  // importa. El equipo se entera por el aviso.
  if (nuevo === 'enviado') {
    const enviado = await avisarDespacho(pedido_id)
    if (!enviado) aviso = aviso ?? 'Pedido marcado como enviado. El correo al cliente no salió: avísale tú.'
  }

  revalidar()
  return { ok: true, aviso }
}

/** Le escribe al comprador que su pedido salió. `false` si no se pudo. */
async function avisarDespacho(pedido_id: string): Promise<boolean> {
  try {
    const db = crearClienteAdministrador()
    const { data } = await db
      .from('pedidos')
      .select('numero,cliente_nombre,cliente_email,total_clp,token_seguimiento,envio_courier,envio_seguimiento,pedido_items(cantidad,subtotal_clp,productos(nombre))')
      .eq('id', pedido_id)
      .maybeSingle()

    const p = data as unknown as {
      numero: number
      cliente_nombre: string | null
      cliente_email: string | null
      total_clp: number | string
      token_seguimiento: string
      envio_courier: string | null
      envio_seguimiento: string | null
      pedido_items: { cantidad: number; subtotal_clp: number | string; productos: { nombre: string } | { nombre: string }[] | null }[] | null
    } | null

    // El correo es opcional al comprar: sin él no hay a quién escribirle, y eso
    // no es una falla que reportar.
    if (!p?.cliente_email) return true

    return await correoPedidoEnCamino({
      para: p.cliente_email,
      nombre: p.cliente_nombre,
      numero: p.numero,
      total: Number(p.total_clp),
      courier: p.envio_courier,
      codigo: p.envio_seguimiento,
      items: (p.pedido_items ?? []).map((i) => {
        const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
        return { nombre: producto?.nombre ?? 'Producto', cantidad: Number(i.cantidad), subtotal: Number(i.subtotal_clp) }
      }),
      urlSeguimiento: urlDeSeguimiento(p.token_seguimiento),
    })
  } catch (e) {
    console.error('[pedidos] el pedido salió, el aviso al comprador no', { pedido_id, e })
    return false
  }
}

export async function siguientesEstados(estado: string): Promise<string[]> {
  return TRANSICIONES[estado] ?? []
}
