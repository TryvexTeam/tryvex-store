'use server'

import type { SupabaseClient } from '@supabase/supabase-js'
import { puedeGestionarFinanzas, NEGOCIO_TIENDA } from '@/lib/sesion'
import { revalidatePath } from 'next/cache'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { categoriaFinancieraValida, etiquetaCategoria } from '@/lib/finanzas'
import { esquemaMovimiento, esquemaEfectivo, esquemaConteoEfectivo, esquemaSaldoCuenta, primerError } from '@/lib/validacion-panel'
import { saldosDeEfectivo, puedeDepositar, borrarDejaNegativo } from '@/lib/efectivo'
import { UUID } from '@/lib/catalogo'

export type Resultado = { ok: true } | { ok: false; error: string }

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
    .select('id, es_superadmin, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  // Se comprueba aquí además del RLS: así el usuario recibe un motivo legible
  // en vez de un error de base de datos.
  if (!yo || !puedeGestionarFinanzas(yo)) {
    return { ok: false, error: 'No tienes permiso para registrar movimientos.' }
  }

  // La frontera se valida con un esquema: un dato imposible se rechaza acá, con motivo.
  const analizado = esquemaMovimiento.safeParse({
    tipo: datos.get('tipo'),
    categoria: datos.get('categoria') ?? '',
    descripcion: datos.get('descripcion') ?? '',
    monto_clp: datos.get('monto_clp'),
    fecha: datos.get('fecha') ?? '',
    metodo_pago: datos.get('metodo_pago') ?? '',
    contraparte: datos.get('contraparte') ?? '',
  })
  if (!analizado.success) return { ok: false, error: primerError(analizado.error) }
  const { tipo, categoria, descripcion, monto, fecha, metodo_pago: metodo, contraparte } = { ...analizado.data, monto: analizado.data.monto_clp }
  if (!categoriaFinancieraValida(categoria, tipo)) return { ok: false, error: 'La categoría no corresponde al tipo de movimiento.' }

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
    // La columna existente conserva una etiqueta legible. La migración agrega
    // categoria_codigo para reportes estables sin exigirla antes de aplicarse.
    categoria: etiquetaCategoria(categoria),
    descripcion,
    monto_clp: monto,
    fecha,
    metodo_pago: metodo || null,
    contraparte: contraparte || null,
    voucher_path,
    voucher_nombre,
    creado_por: yo.id,
    negocio: NEGOCIO_TIENDA,
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
    .select('id, es_superadmin, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  if (!puedeGestionarFinanzas(yo)) return null

  const { data } = await supabase.storage
    .from('vouchers')
    .createSignedUrl(ruta, 60 * 5)
  return data?.signedUrl ?? null
}

// ── Cuadre de caja: efectivo por depositar y saldo de la cuenta ───────────────

/** Sesión + permiso para registrar dinero; el RLS de la tabla mantiene la última palabra. */
async function exigirGestion() {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { ok: false as const, error: 'Sesión expirada. Vuelve a entrar.' }
  const { data: yo } = await supabase
    .from('dim_integrantes')
    .select('id, es_superadmin, gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()
  if (!yo || !puedeGestionarFinanzas(yo)) return { ok: false as const, error: 'No tienes permiso para registrar movimientos de dinero.' }
  return { ok: true as const, supabase, yoId: yo.id as string }
}

function revalidarCuadre() {
  revalidatePath('/panel/finanzas')
  revalidatePath('/panel')
}

/** La persona tiene que ser un integrante activo: el efectivo se asocia a alguien del panel. */
async function personaActiva(supabase: SupabaseClient, id: string) {
  if (!UUID.test(id)) return null
  const { data } = await supabase.from('dim_integrantes').select('id,nombre').eq('id', id).eq('activo', true).maybeSingle()
  return data as { id: string; nombre: string } | null
}

async function movimientosDeEfectivo(supabase: SupabaseClient, integranteId?: string) {
  let q = supabase.from('efectivo_por_depositar').select('id,integrante_id,tipo,monto_clp').limit(5000)
  if (integranteId) q = q.eq('integrante_id', integranteId)
  const { data } = await q
  return (data ?? []) as { id: string; integrante_id: string; tipo: string; monto_clp: number }[]
}

const nombreCorto = (nombre: string) => nombre.trim().split(/\s+/)[0]
const pesos = (n: number) => `$${Math.round(n).toLocaleString('es-CL')}`

/** «Recibió» o «Depositó» efectivo. Nadie puede depositar más de lo que tiene en la mano. */
export async function registrarEfectivo(datos: FormData): Promise<Resultado> {
  const sesion = await exigirGestion()
  if (!sesion.ok) return sesion
  const a = esquemaEfectivo.safeParse({
    integrante_id: datos.get('integrante_id') ?? '',
    tipo: datos.get('tipo'),
    monto_clp: datos.get('monto_clp') ?? '',
    fecha: datos.get('fecha') ?? '',
    nota: datos.get('nota') ?? '',
  })
  if (!a.success) return { ok: false, error: primerError(a.error) }
  const { integrante_id, tipo, monto_clp, fecha, nota } = a.data

  const persona = await personaActiva(sesion.supabase, integrante_id)
  if (!persona) return { ok: false, error: 'La persona no es un integrante activo del equipo.' }

  if (tipo === 'deposita') {
    const chequeo = puedeDepositar(saldosDeEfectivo(await movimientosDeEfectivo(sesion.supabase, integrante_id)), integrante_id, monto_clp)
    if (!chequeo.ok)
      return { ok: false, error: `${nombreCorto(persona.nombre)} solo tiene ${pesos(chequeo.tiene)} en efectivo por depositar: no puede depositar ${pesos(monto_clp)}.` }
  }

  const { error } = await sesion.supabase.from('efectivo_por_depositar').insert({ integrante_id, tipo, monto_clp, fecha, nota: nota || null, creado_por: sesion.yoId })
  if (error) return { ok: false, error: error.message }
  revalidarCuadre()
  return { ok: true }
}

export type ResultadoConteoEfectivo = { ok: true; resumen: string } | { ok: false; error: string }

/**
 * «Tiene ahora»: el efectivo que alguien dice tener en la mano. Se registra la
 * diferencia contra lo que figura: si tiene más, «recibió»; si tiene menos,
 * «depositó» (el efectivo salió de su mano). Así el historial explica el saldo.
 */
export async function fijarEfectivo(datos: FormData): Promise<ResultadoConteoEfectivo> {
  const sesion = await exigirGestion()
  if (!sesion.ok) return sesion
  const a = esquemaConteoEfectivo.safeParse({
    integrante_id: datos.get('integrante_id') ?? '',
    real: datos.get('real') ?? '',
    fecha: datos.get('fecha') ?? '',
    nota: datos.get('nota') ?? '',
  })
  if (!a.success) return { ok: false, error: primerError(a.error) }
  const { integrante_id, real, fecha, nota } = a.data

  const persona = await personaActiva(sesion.supabase, integrante_id)
  if (!persona) return { ok: false, error: 'La persona no es un integrante activo del equipo.' }

  const antes = Math.max(0, saldosDeEfectivo(await movimientosDeEfectivo(sesion.supabase, integrante_id))[0]?.saldo ?? 0)
  const delta = real - antes
  if (delta === 0) return { ok: true, resumen: `${nombreCorto(persona.nombre)} ya figuraba con ${pesos(antes)}: no hay cambios.` }

  const { error } = await sesion.supabase.from('efectivo_por_depositar').insert({
    integrante_id,
    tipo: delta > 0 ? 'recibe' : 'deposita',
    monto_clp: Math.abs(delta),
    fecha,
    nota: nota || `Conteo: tiene ${pesos(real)} (antes figuraba ${pesos(antes)})`,
    creado_por: sesion.yoId,
  })
  if (error) return { ok: false, error: error.message }
  revalidarCuadre()
  return { ok: true, resumen: `${nombreCorto(persona.nombre)} tiene ${pesos(real)} en efectivo.` }
}

/** Borra un movimiento de efectivo cargado por error, si no deja a nadie con saldo negativo. */
export async function borrarEfectivo(id: string): Promise<Resultado> {
  const sesion = await exigirGestion()
  if (!sesion.ok) return sesion
  if (!UUID.test(id)) return { ok: false, error: 'Movimiento no válido.' }
  const todos = await movimientosDeEfectivo(sesion.supabase)
  if (borrarDejaNegativo(todos, id)) return { ok: false, error: 'No se puede borrar: esa persona ya depositó ese efectivo y quedaría con saldo negativo. Borra primero el depósito.' }
  const { error } = await sesion.supabase.from('efectivo_por_depositar').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidarCuadre()
  return { ok: true }
}

/** Declara cuánto hay hoy en la cuenta. Es una foto manual; la más reciente es la vigente. */
export async function declararSaldoCuenta(datos: FormData): Promise<Resultado> {
  const sesion = await exigirGestion()
  if (!sesion.ok) return sesion
  const a = esquemaSaldoCuenta.safeParse({ monto_clp: datos.get('monto_clp') ?? '', fecha: datos.get('fecha') ?? '', nota: datos.get('nota') ?? '' })
  if (!a.success) return { ok: false, error: primerError(a.error) }
  const { error } = await sesion.supabase.from('saldo_cuenta').insert({ monto_clp: a.data.monto_clp, fecha: a.data.fecha, nota: a.data.nota || null, creado_por: sesion.yoId })
  if (error) return { ok: false, error: error.message }
  revalidarCuadre()
  return { ok: true }
}
