'use server'

import { crearClienteAdministrador } from '@/lib/supabase/administrador'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { crearPedidoConReserva } from '@/lib/pedidos/crear'
import { leerConfiguracion, datosDePago } from '@/lib/configuracion'
import { cotizarLineas, normalizarLineas, type LineaCotizada } from '@/lib/cotizacion'
import { esRegion } from '@/lib/chile'
import { crearOrden } from '@/lib/mercadopago'

export type Resultado =
  | {
      ok: true
      numero: number
      total: number
      envio: number
      whatsapp: string
      /** Si el pedido se paga con tarjeta: a dónde mandar al comprador. */
      checkoutUrl?: string
    }
  | { ok: false; error: string }

export type Cotizacion = { ok: true; lineas: LineaCotizada[] } | { ok: false; error: string }

const soloDigitos = (s: string) => s.replace(/\D/g, '')
const METODOS = ['transferencia', 'mercadopago'] as const

/** Vista previa del checkout: la misma cotización que se usará al cobrar. */
export async function cotizarPedido(entrada: unknown): Promise<Cotizacion> {
  const lineas = normalizarLineas(entrada)
  if (!lineas) return { ok: false, error: 'Tu bolsa tiene datos que no reconocemos. Vuelve a agregar los productos.' }
  return { ok: true, lineas: await cotizarLineas(lineas) }
}

export type CotizacionBolsa =
  | { ok: true; lineas: LineaCotizada[]; envio: { tarifa: number; gratisDesde: number | null } }
  | { ok: false; error: string }

/** La bolsa lateral: misma cotización que el checkout, más las reglas de envío del panel. */
export async function cotizarBolsa(entrada: unknown): Promise<CotizacionBolsa> {
  const lineas = normalizarLineas(entrada)
  if (!lineas) return { ok: false, error: 'Tu bolsa tiene datos que no reconocemos. Vuelve a agregar los productos.' }
  const [cotizadas, configuracion] = await Promise.all([cotizarLineas(lineas), leerConfiguracion()])
  return {
    ok: true,
    lineas: cotizadas,
    envio: { tarifa: configuracion?.envio_tarifa_clp ?? 0, gratisDesde: configuracion?.envio_gratis_desde_clp ?? null },
  }
}

/**
 * Crea el pedido del comprador, con una o varias líneas, y reserva sus unidades.
 *
 * Va con service role a propósito: la tabla `pedidos` tiene RLS solo-equipo,
 * así que el navegador nunca escribe en la base. Del formulario solo se usa
 * qué productos y cuántos; precio, tramo, stock y envío se recalculan aquí.
 * PostgreSQL crea el pedido, sus líneas y las reservas como una sola operación.
 */
export async function crearPedidoPublico(datos: FormData): Promise<Resultado> {
  // Campo trampa: invisible para personas, los bots lo llenan.
  if (String(datos.get('sitio_web') ?? '')) return { ok: false, error: 'No pudimos registrar tu pedido.' }

  const texto = (k: string, max: number) => String(datos.get(k) ?? '').trim().slice(0, max)
  const nombre = texto('nombre', 90)
  const fono = texto('fono', 20)
  const email = texto('email', 120)
  // Tres formas de entrega, y el envío es gratis en todas. La diferencia es
  // operativa: a domicilio se despacha, en sucursal el comprador retira.
  const pedida = texto('entrega', 12)
  const entrega: 'envio' | 'sucursal' | 'retiro' =
    pedida === 'retiro' ? 'retiro' : pedida === 'sucursal' ? 'sucursal' : 'envio'
  const region = texto('region', 60)
  const comuna = texto('comuna', 60)
  const direccion = texto('direccion', 160)
  const sucursal = texto('sucursal', 120)
  const metodo = texto('metodo_pago', 20)

  if (nombre.length < 3) return { ok: false, error: 'Escribe tu nombre y apellido.' }
  if (soloDigitos(fono).length < 8) return { ok: false, error: 'Revisa tu teléfono: necesitamos al menos 8 dígitos.' }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { ok: false, error: 'Revisa el formato de tu correo.' }
  if (!(METODOS as readonly string[]).includes(metodo)) return { ok: false, error: 'Elige cómo quieres pagar.' }
  if (entrega === 'envio') {
    if (!esRegion(region)) return { ok: false, error: 'Elige tu región.' }
    if (comuna.length < 2) return { ok: false, error: 'Escribe tu comuna.' }
    if (direccion.length < 5) return { ok: false, error: 'Escribe la dirección de entrega.' }
  }
  if (entrega === 'sucursal') {
    // Sin región y comuna no se puede saber a qué sucursal despachar, y sin
    // sucursal el paquete no tiene destino.
    if (!esRegion(region)) return { ok: false, error: 'Elige tu región.' }
    if (comuna.length < 2) return { ok: false, error: 'Escribe tu comuna.' }
    if (sucursal.length < 3) return { ok: false, error: 'Dinos en qué sucursal quieres retirar.' }
  }

  let entrada: unknown
  try {
    entrada = JSON.parse(texto('lineas', 5000))
  } catch {
    return { ok: false, error: 'No pudimos leer tu pedido. Vuelve a intentarlo.' }
  }
  const pedidas = normalizarLineas(entrada)
  if (!pedidas) return { ok: false, error: 'No pudimos leer tu pedido. Vuelve a intentarlo.' }

  const configuracion = await leerConfiguracion()
  if (entrega === 'retiro' && !configuracion?.retiro_habilitado)
    return { ok: false, error: 'El retiro en persona no está disponible por ahora.' }

  const lineas = await cotizarLineas(pedidas)
  const conProblema = lineas.find((l) => l.error)
  if (conProblema) return { ok: false, error: `${conProblema.nombre}${conProblema.variante ? ` (${conProblema.variante})` : ''}: ${conProblema.error}` }

  const subtotal = lineas.reduce((a, l) => a + l.subtotal, 0)
  const tarifa = configuracion?.envio_tarifa_clp ?? 0
  const gratisDesde = configuracion?.envio_gratis_desde_clp ?? null
  // El envío no se cobra: va incluido en el precio del producto. La tarifa
  // configurada solo aplicaría si alguna vez se decide cobrarlo aparte.
  const envio =
    entrega === 'retiro' || entrega === 'sucursal' || (gratisDesde !== null && subtotal >= gratisDesde) ? 0 : tarifa
  const total = subtotal + envio

  // La cuenta sale de la sesión validada contra Auth, nunca del formulario:
  // así nadie puede colgar un pedido en la cuenta de otra persona.
  const { data: { user } } = await (await crearClienteServidor()).auth.getUser()

  // PostgreSQL bloquea el inventario, comprueba la disponibilidad y escribe el
  // encabezado, las líneas y las reservas dentro de una sola transacción.
  const creado = await crearPedidoConReserva({
    encabezado: {
      clienteAuthId: user?.id ?? null,
      clienteNombre: nombre,
      clienteEmail: email || null,
      clienteFono: fono,
      canal: 'web',
      metodoPago: metodo,
      subtotalClp: subtotal,
      envioClp: envio,
      totalClp: total,
      region: entrega === 'retiro' ? null : region,
      comuna: entrega === 'retiro' ? null : comuna,
      direccion: {
        entrega,
        direccion: entrega === 'envio' ? direccion : null,
        sucursal: entrega === 'sucursal' ? sucursal : null,
      },
      notas: lineas.some((l) => l.tramo) ? `Tramos: ${lineas.filter((l) => l.tramo).map((l) => `${l.nombre} ${l.tramo}`).join('; ')}` : null,
    },
    items: lineas.map((l) => ({
      productoId: l.productoId!,
      varianteId: l.varianteId,
      cantidad: l.cantidad,
      precioUnitario: l.precio,
      tramoAplicado: l.tramo,
      subtotalClp: l.subtotal,
    })),
  })
  if (!creado.ok) {
    const disponibles = typeof creado.disponible === 'number' ? ` Solo quedan ${creado.disponible} unidades.` : ''
    return { ok: false, error: `${creado.error}.${disponibles}` }
  }
  const pedido = creado
  const db = crearClienteAdministrador()

  const detalle = lineas.map((l) => `${l.cantidad} × ${l.nombre}${l.variante ? ` (${l.variante})` : ''}`).join(', ')
  const mensaje = `Hola, soy ${nombre}. Hice el pedido #${pedido.numero} en Tryvex Store: ${detalle}. Total $${total.toLocaleString('es-CL')}.`
  const { whatsapp } = datosDePago(configuracion)

  // Con tarjeta: se abre la orden de cobro y el comprador sigue en Mercado Pago.
  // Si algo falla aquí, el pedido igual quedó tomado: se le ofrece transferencia
  // en vez de perder la venta y hacerle repetir todo el formulario.
  let checkoutUrl: string | undefined
  if (metodo === 'mercadopago') {
    try {
      const orden = await crearOrden({
        total,
        items: [
          ...lineas.map((l) => ({
            titulo: `${l.nombre}${l.variante ? ` (${l.variante})` : ''}`,
            cantidad: l.cantidad,
            precioUnitario: l.precio,
          })),
          // El envío viaja como una línea más: la API exige que el total sea
          // exactamente la suma de los ítems, y así cuadra por construcción.
          ...(envio > 0 ? [{ titulo: 'Envío', cantidad: 1, precioUnitario: envio }] : []),
        ],
        emailComprador: email || 'comprador@tryvex.tech',
        referenciaExterna: String(pedido.numero),
        // Estable por pedido: si el comprador recarga, no se abre una segunda orden.
        claveIdempotencia: `pedido-${pedido.id}`,
        urlBase: (process.env.NEXT_PUBLIC_URL_TIENDA ?? 'https://www.tryvex.tech').replace(/\/$/, ''),
      })
      checkoutUrl = orden.checkoutUrl
      await db.from('pedidos').update({ pago_proveedor: 'mercadopago', pago_referencia: orden.id }).eq('id', pedido.id)
    } catch (e) {
      console.error('[comprar] no se pudo abrir el pago con tarjeta', e)
    }
  }

  return {
    ok: true,
    numero: pedido.numero,
    total,
    envio,
    whatsapp: `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`,
    checkoutUrl,
  }
}

export type ResultadoDeclaracion = { ok: true } | { ok: false; error: string }

/**
 * El comprador avisa que ya transfirió.
 *
 * No marca el pedido como pagado: eso lo hace el equipo tras ver la cuenta.
 * Solo deja constancia de que el cliente dice haber pagado, para que el panel
 * sepa a quién revisar primero. Confundir una cosa con otra sería entregar
 * mercadería contra una afirmación sin verificar.
 *
 * Es una acción pública, así que se protege sola: exige el número de pedido
 * MÁS un dato que solo tiene quien lo hizo (su teléfono o su correo). Sin eso,
 * cualquiera podría recorrer números de pedido marcándolos como pagados y
 * ensuciar la cola de trabajo del equipo.
 */
export async function declararPago(datos: FormData): Promise<ResultadoDeclaracion> {
  const numero = Number(String(datos.get('numero') ?? '').trim())
  const contacto = String(datos.get('contacto') ?? '').trim().slice(0, 120)
  const referencia = String(datos.get('referencia') ?? '').trim().slice(0, 60)

  if (!Number.isSafeInteger(numero) || numero <= 0) return { ok: false, error: 'Número de pedido inválido.' }
  if (contacto.length < 6) return { ok: false, error: 'Indica el correo o teléfono con el que hiciste el pedido.' }

  const db = crearClienteAdministrador()
  const { data: pedido } = await db
    .from('pedidos')
    .select('id, estado, cliente_email, cliente_fono, pago_declarado_at')
    .eq('numero', numero)
    .maybeSingle()

  // Mismo mensaje para «no existe» y «no coincide»: decir cuál de los dos es
  // permitiría averiguar qué números de pedido existen.
  const normal = (v: unknown) => String(v ?? '').toLowerCase().replace(/[^a-z0-9@.]/g, '')
  const coincide =
    normal(pedido?.cliente_email) === normal(contacto) ||
    (normal(pedido?.cliente_fono).length > 5 && normal(pedido?.cliente_fono) === normal(contacto))

  if (!pedido || !coincide) return { ok: false, error: 'No encontramos ese pedido con esos datos.' }
  if (pedido.estado !== 'pendiente') return { ok: true }
  if (pedido.pago_declarado_at) return { ok: true }

  const { error } = await db
    .from('pedidos')
    .update({
      pago_declarado_at: new Date().toISOString(),
      pago_referencia: referencia || null,
    })
    .eq('id', pedido.id)

  if (error) return { ok: false, error: 'No pudimos registrar tu aviso. Escríbenos y lo resolvemos.' }
  return { ok: true }
}
