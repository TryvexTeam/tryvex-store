import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { correoPagoConfirmado } from '@/lib/correo'
import { urlDeSeguimiento } from '@/lib/seguimiento'
import { urlPublica } from '@/lib/imagenes'
import { avisarAlEquipo } from '@/lib/push'

/**
 * Da un pedido por pagado cuando la pasarela confirmó el cobro.
 *
 * El trabajo ocurre dentro de `confirmar_pago_pedido`, una función de la base
 * que corre en una sola transacción con la fila del pedido bloqueada. No es un
 * detalle de estilo: antes esto vivía aquí, leyendo el pedido, anotando el
 * ingreso en finanzas, moviendo el stock y recién al final cambiando el estado
 * con un filtro `estado = 'pendiente'`.
 *
 * Ese filtro impedía dejar el pedido pagado dos veces, pero no impedía que dos
 * avisos simultáneos llegaran hasta ahí habiendo insertado ya su ingreso y su
 * descuento de stock. El resultado habría sido un pedido pagado, dos ingresos
 * en finanzas y doble descuento de inventario. Mercado Pago manda varias
 * notificaciones por pago y reintenta hasta recibir un 200, así que no era una
 * hipótesis.
 *
 * Con el bloqueo, el segundo aviso espera, entra, ve que el pedido ya no está
 * pendiente y se va sin tocar nada.
 */
export type ResultadoConfirmacion =
  | { ok: true; aplicado: boolean; numero: number; correo?: EstadoCorreo; destinatario?: string }
  | { ok: false; error: string }

/**
 * Qué pasó con el aviso al comprador. Viaja en la respuesta del webhook, que
 * Mercado Pago guarda en su panel: así un correo que no salió se ve, en vez
 * de perderse en un log que Vercel borra en una hora.
 */
export type EstadoCorreo = 'enviado' | 'sin-correo' | 'fallo'

export async function confirmarPagoDePedido(params: {
  referenciaExterna: string
  proveedor: string
  referenciaPago: string
  totalPagado: number | null
}): Promise<ResultadoConfirmacion> {
  const { referenciaExterna, proveedor, referenciaPago, totalPagado } = params

  const numero = Number(referenciaExterna)
  if (!Number.isSafeInteger(numero) || numero <= 0) {
    return { ok: false, error: `Referencia externa ilegible: ${referenciaExterna}` }
  }

  const { data, error } = await crearClienteAdministrador().rpc('confirmar_pago_pedido', {
    p_numero: numero,
    p_proveedor: proveedor,
    p_referencia: referenciaPago,
    p_total: totalPagado,
  })

  if (error) {
    // El índice único sobre (proveedor, referencia) rebota un pago que ya
    // quedó anotado en otro pedido. Es una defensa, no una falla que haya que
    // reintentar: el cobro ya está registrado donde corresponde.
    if (error.code === '23505') {
      return { ok: true, aplicado: false, numero }
    }
    console.error('[confirmar-pago] la transacción falló', { numero, error: error.message })
    return { ok: false, error: error.message }
  }

  const r = data as { ok: boolean; aplicado?: boolean; numero?: number; error?: string } | null
  if (!r?.ok) return { ok: false, error: r?.error ?? 'No se pudo confirmar el pago' }

  // Los avisos van solo cuando el pago se aplicó de verdad. Un segundo webhook
  // del mismo pago no vuelve a escribirle al comprador ni a sonar en el equipo.
  if (!r.aplicado) return { ok: true, aplicado: false, numero: r.numero ?? numero }

  const avisos = await avisarPagoConfirmado(numero)
  return { ok: true, aplicado: true, numero: r.numero ?? numero, correo: avisos.correo, destinatario: avisos.destinatario }
}

/** `jo•••@gmail.com`: suficiente para reconocer la dirección sin exponerla entera. */
function enmascarar(correo: string): string {
  const [usuario, dominio] = correo.split('@')
  if (!dominio) return '•••'
  return `${usuario.slice(0, 2)}•••@${dominio}`
}

/**
 * Le escribe al comprador que su pago entró y le avisa al equipo por push.
 *
 * Nada de lo que pase aquí puede voltear una venta ya cobrada: si algo falla,
 * se anota y se sigue. No propaga errores, solo informa qué pasó.
 */
async function avisarPagoConfirmado(numero: number): Promise<{ correo: EstadoCorreo; destinatario?: string }> {
  try {
    const db = crearClienteAdministrador()
    const { data, error } = await db
      .from('pedidos')
      .select('id,numero,cliente_nombre,cliente_email,total_clp,token_seguimiento,metodo_pago,pedido_items(cantidad,subtotal_clp,productos(nombre,imagen_url))')
      .eq('numero', numero)
      .maybeSingle()

    if (error || !data) {
      console.error('[confirmar-pago] no se pudo leer el pedido para avisar', { numero, error: error?.message })
      return { correo: 'fallo' }
    }

    const p = data as unknown as {
      id: string
      numero: number
      cliente_nombre: string | null
      cliente_email: string | null
      total_clp: number | string
      token_seguimiento: string
      metodo_pago: string | null
      pedido_items: { cantidad: number; subtotal_clp: number | string; productos: { nombre: string; imagen_url: string | null } | { nombre: string; imagen_url: string | null }[] | null }[] | null
    }

    const items = (p.pedido_items ?? []).map((i) => {
      const producto = Array.isArray(i.productos) ? i.productos[0] : i.productos
      return {
        nombre: producto?.nombre ?? 'Producto',
        cantidad: Number(i.cantidad),
        subtotal: Number(i.subtotal_clp),
        imagen: producto?.imagen_url ? urlPublica(producto.imagen_url) : null,
      }
    })

    const [correo] = await Promise.all([
      escribirAlComprador(p, items),
      avisarAlEquipo(avisoDeVenta(p.numero, p.cliente_nombre, Number(p.total_clp), items)),
    ])
    return { correo, destinatario: p.cliente_email ? enmascarar(p.cliente_email) : undefined }
  } catch (e) {
    console.error('[confirmar-pago] el pago quedó bien, los avisos no salieron', { numero, e })
    return { correo: 'fallo' }
  }
}

type ItemAviso = { nombre: string; cantidad: number; subtotal: number; imagen: string | null }

async function escribirAlComprador(
  p: { numero: number; cliente_nombre: string | null; cliente_email: string | null; total_clp: number | string; token_seguimiento: string },
  items: ItemAviso[],
): Promise<EstadoCorreo> {
  // Sin correo no hay a quién escribirle.
  if (!p.cliente_email) {
    console.warn('[confirmar-pago] pedido pagado sin correo: nadie recibe el aviso', { numero: p.numero })
    return 'sin-correo'
  }
  const enviado = await correoPagoConfirmado({
    para: p.cliente_email,
    nombre: p.cliente_nombre,
    numero: p.numero,
    total: Number(p.total_clp),
    items,
    urlSeguimiento: urlDeSeguimiento(p.token_seguimiento),
  })
  return enviado ? 'enviado' : 'fallo'
}

/**
 * El aviso de venta, al estilo de Shopify: el monto manda en el título, y el
 * cuerpo dice quién compró y qué, para decidir sin abrir el panel.
 */
function avisoDeVenta(numero: number, cliente: string | null, total: number, items: ItemAviso[]) {
  const unidades = items.reduce((a, i) => a + i.cantidad, 0)
  const primero = items[0]
  const detalle = !primero
    ? ''
    : items.length === 1
      ? `${primero.nombre}${primero.cantidad > 1 ? ` ×${primero.cantidad}` : ''}`
      : `${primero.nombre} y ${unidades - primero.cantidad} más`
  return {
    titulo: `Nuevo pedido pagado · $${total.toLocaleString('es-CL')}`,
    cuerpo: [`#${numero}`, cliente?.trim() || 'Cliente', detalle].filter(Boolean).join(' · '),
    url: `/panel/pedidos#pedido-${numero}`,
    etiqueta: `pedido-${numero}`,
  }
}
