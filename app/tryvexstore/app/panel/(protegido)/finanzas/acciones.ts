'use server'

import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'

export type Resultado = { ok: true } | { ok: false; error: string }

const TIPOS = ['ingreso', 'egreso'] as const
const METODOS = ['transferencia', 'efectivo', 'tarjeta', 'mercadopago', 'otro'] as const

/**
 * Registra un movimiento y, si viene un comprobante, lo sube al bucket privado.
 *
 * El orden importa: primero se sube el archivo, después se inserta la fila. Si
 * fuera al revés y la subida fallara, quedaría un movimiento diciendo que tiene
 * comprobante cuando no lo tiene. Al revés, un archivo huérfano no miente.
 */
export async function registrarMovimiento(datos: FormData): Promise<Resultado> {
  const supabase = await crearClienteServidor()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: 'Sesión expirada. Vuelve a entrar.' }

  const { data: yo } = await supabase
    .from('dim_integrantes')
    .select('id, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  // Se comprueba aquí además del RLS: así el usuario recibe un motivo legible
  // en vez de un error de base de datos.
  if (!yo?.gestionar_finanzas) {
    return { ok: false, error: 'No tienes permiso para registrar movimientos.' }
  }

  const tipo = String(datos.get('tipo') ?? '')
  const categoria = String(datos.get('categoria') ?? '').trim()
  const descripcion = String(datos.get('descripcion') ?? '').trim()
  const monto = Number(datos.get('monto_clp'))
  const fecha = String(datos.get('fecha') ?? '')
  const metodo = String(datos.get('metodo_pago') ?? '')
  const contraparte = String(datos.get('contraparte') ?? '').trim()

  if (!TIPOS.includes(tipo as (typeof TIPOS)[number]))
    return { ok: false, error: 'Tipo inválido.' }
  if (!descripcion) return { ok: false, error: 'Falta la descripción.' }
  if (!categoria) return { ok: false, error: 'Falta la categoría.' }
  if (!Number.isFinite(monto) || monto <= 0)
    return { ok: false, error: 'El monto debe ser mayor que cero.' }
  if (!fecha) return { ok: false, error: 'Falta la fecha.' }
  if (metodo && !METODOS.includes(metodo as (typeof METODOS)[number]))
    return { ok: false, error: 'Método de pago inválido.' }

  // ── Comprobante (opcional) ──────────────────────────────────────
  let voucher_path: string | null = null
  let voucher_nombre: string | null = null

  const archivo = datos.get('voucher')
  if (archivo instanceof File && archivo.size > 0) {
    if (archivo.size > 10 * 1024 * 1024)
      return { ok: false, error: 'El comprobante supera los 10 MB.' }

    const ext = (archivo.name.split('.').pop() || 'bin').toLowerCase()
    const ruta = `${fecha.slice(0, 7)}/${crypto.randomUUID()}.${ext}`

    const { error: errSubida } = await supabase.storage
      .from('vouchers')
      .upload(ruta, archivo, { contentType: archivo.type, upsert: false })

    if (errSubida)
      return { ok: false, error: `No se pudo subir el comprobante: ${errSubida.message}` }

    voucher_path = ruta
    voucher_nombre = archivo.name
  }

  const { error } = await supabase.from('movimientos_financieros').insert({
    tipo,
    categoria,
    descripcion,
    monto_clp: monto,
    fecha,
    metodo_pago: metodo || null,
    contraparte: contraparte || null,
    voucher_path,
    voucher_nombre,
    creado_por: yo.id,
  })

  if (error) {
    // La fila no entró: el archivo subido quedaría huérfano ocupando espacio.
    if (voucher_path) {
      await supabase.storage.from('vouchers').remove([voucher_path])
    }
    return { ok: false, error: error.message }
  }

  revalidatePath('/panel/finanzas')
  revalidatePath('/panel')
  return { ok: true }
}

/**
 * URL temporal para ver un comprobante. El bucket es privado: no hay URL
 * pública que se pueda compartir por error.
 */
export async function urlComprobante(ruta: string): Promise<string | null> {
  const supabase = await crearClienteServidor()

  // Una Server Action es un endpoint invocable desde fuera: sin esta guarda,
  // cualquiera que conociera su identificador podia pedir una URL firmada de
  // un comprobante de pago del bucket privado pasando una ruta arbitraria.
  // El middleware no protege las Server Actions, por eso se revalida aqui.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: yo } = await supabase
    .from('dim_integrantes')
    .select('id, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  if (!yo?.gestionar_finanzas) return null

  const { data } = await supabase.storage
    .from('vouchers')
    .createSignedUrl(ruta, 60 * 5)
  return data?.signedUrl ?? null
}
