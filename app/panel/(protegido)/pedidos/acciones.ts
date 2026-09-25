'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { crearPedidoConReserva } from '@/lib/pedidos/crear'
import { confirmarPagoDePedido } from '@/lib/confirmar-pago'
import { correoPedidoEnCamino, correoPedidoEntregado } from '@/lib/correo'
import { montoDesdeTexto, montoDesdeTextoODefecto } from '@/lib/monto'
import { urlDeSeguimiento } from '@/lib/seguimiento'
import { urlPublica } from '@/lib/imagenes'

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
  const precio_unitario = montoDesdeTexto(datos.get('precio_unitario')) ?? NaN
  const envio = montoDesdeTextoODefecto(datos.get('envio_clp'))

  if (!cliente_nombre) return { ok: false, error: 'Falta el nombre del cliente.' }
  if (!producto_id) return { ok: false, error: 'Falta el producto.' }
  if (!Number.isInteger(cantidad) || cantidad < 1)
    return { ok: false, error: 'La cantidad debe ser 1 o más.' }
  if (!Number.isFinite(precio_unitario) || precio_unitario < 0)
    return { ok: false, error: 'El precio unitario no es válido.' }
  if (!Number.isFinite(envio) || envio < 0)
    return { ok: false, error: 'El envío no es válido.' }

  const subtotal = cantidad * precio_unitario
  const total = subtotal + envio
  const creado = await crearPedidoConReserva({
    encabezado: {
      clienteNombre: cliente_nombre,
      clienteEmail: cliente_email || null,
      clienteFono: cliente_fono || null,
      canal,
      metodoPago: metodo_pago || null,
      subtotalClp: subtotal,
      envioClp: envio,
      totalClp: total,
      notas: notas || null,
      atendidoPor: yo.id,
    },
    items: [{
      productoId: producto_id,
      varianteId: String(datos.get('variante_id') ?? '') || null,
      cantidad,
      precioUnitario: precio_unitario,
      subtotalClp: subtotal,
    }],
  })

  if (!creado.ok) {
    const disponibles = typeof creado.disponible === 'number' ? ` Solo hay ${creado.disponible} unidades disponibles.` : ''
    return { ok: false, error: `${creado.error}.${disponibles}` }
  }

  revalidar()
  return { ok: true, id: creado.id }
}

/**
 * Venta presencial de una sola línea.
 *
 * Primero se crea la reserva como cualquier pedido y luego se confirma por la
 * RPC transaccional usada por Mercado Pago. La referencia local única hace que
 * un reintento no pueda duplicar ni el ingreso ni la salida de inventario.
 */
export async function crearVentaRapida(datos: FormData): Promise<Resultado> {
  datos.set('canal', 'presencial')
  const creado = await crearPedido(datos)
  if (!creado.ok || !creado.id) return creado
  if (creado.aviso) return { ok: false, error: creado.aviso }

  const { supabase, error: errSesion } = await contexto()
  if (errSesion) return { ok: false, error: `La venta quedó creada pero requiere confirmar pago: ${errSesion}` }

  const { data: pedido, error: errPedido } = await supabase
    .from('pedidos')
    .select('numero,total_clp,metodo_pago')
    .eq('id', creado.id)
    .maybeSingle()
  if (errPedido || !pedido)
    return { ok: false, error: 'La venta quedó creada pero requiere confirmar pago. Abre el pedido y márcalo como pagado.' }

  const proveedor = pedido.metodo_pago || 'presencial'
  const pagado = await confirmarPagoDePedido({
    referenciaExterna: String(pedido.numero),
    proveedor,
    referenciaPago: `presencial-${pedido.numero}-${crypto.randomUUID()}`,
    totalPagado: Number(pedido.total_clp),
  })
  if (!pagado.ok)
    return { ok: false, error: `La venta quedó creada pero requiere confirmar pago: ${pagado.error}` }

  revalidar()
  return { ok: true, id: creado.id }
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

  // La confirmación de pago modifica pedido, finanzas y stock como una sola
  // transacción. No se replica aquí con operaciones separadas.
  if (nuevo === 'pagado') {
    const pagado = await confirmarPagoDePedido({
      referenciaExterna: String(pedido.numero),
      proveedor: pedido.metodo_pago || 'manual',
      referenciaPago: `manual-${pedido.numero}-${crypto.randomUUID()}`,
      totalPagado: Number(pedido.total_clp),
    })
    if (!pagado.ok) return { ok: false, error: pagado.error }

    revalidar()
    return { ok: true }
  }

  const { data: items } = await supabase
    .from('pedido_items')
    .select('producto_id,variante_id,cantidad,precio_unitario')
    .eq('pedido_id', pedido_id)

  let aviso: string | undefined

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
  if (nuevo === 'enviado' || nuevo === 'entregado') {
    const enviado = await avisarAlCliente(pedido_id, nuevo)
    if (!enviado) aviso = aviso ?? `Pedido marcado como ${nuevo}. El correo al cliente no salió: avísale tú.`
  }

  revalidar()
  return { ok: true, aviso }
}

/**
 * Le escribe al comprador según lo que acaba de pasar con su pedido.
 *
 * `false` si no se pudo, para que el panel avise al equipo y alguien escriba
 * a mano. Nunca lanza: el pedido ya cambió de estado y eso no se deshace por
 * un correo.
 */
async function avisarAlCliente(pedido_id: string, estado: 'enviado' | 'entregado'): Promise<boolean> {
  try {
    const db = crearClienteAdministrador()
    const { data } = await db
      .from('pedidos')
      .select('numero,cliente_nombre,cliente_email,total_clp,token_seguimiento,envio_courier,envio_seguimiento,pedido_items(cantidad,subtotal_clp,productos(nombre,imagen_url))')
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
      pedido_items: { cantidad: number; subtotal_clp: number | string; productos: { nombre: string; imagen_url: string | null } | { nombre: string; imagen_url: string | null }[] | null }[] | null
    } | null

    // El correo es opcional al comprar: sin él no hay a quién escribirle, y eso
    // no es una falla que reportar.
    if (!p?.cliente_email) return true

    const comunes = {
      para: p.cliente_email,
      nombre: p.cliente_nombre,
      numero: p.numero,
      total: Number(p.total_clp),
      items: (p.pedido_items ?? []).map((i) => {
        const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
        return {
          nombre: producto?.nombre ?? 'Producto',
          cantidad: Number(i.cantidad),
          subtotal: Number(i.subtotal_clp),
          imagen: producto?.imagen_url ? urlPublica(producto.imagen_url) : null,
        }
      }),
      urlSeguimiento: urlDeSeguimiento(p.token_seguimiento),
    }

    return estado === 'entregado'
      ? await correoPedidoEntregado(comunes)
      : await correoPedidoEnCamino({ ...comunes, courier: p.envio_courier, codigo: p.envio_seguimiento })
  } catch (e) {
    console.error('[pedidos] el pedido cambió de estado, el aviso al comprador no salió', { pedido_id, estado, e })
    return false
  }
}

export async function siguientesEstados(estado: string): Promise<string[]> {
  return TRANSICIONES[estado] ?? []
}
