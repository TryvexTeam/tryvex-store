import 'server-only'

import type { SupabaseClient } from '@supabase/supabase-js'
import { crearClienteServidor } from '@/lib/supabase/servidor'

/**
 * Autorización de las Server Actions.
 *
 * Una Server Action es un endpoint público: cualquiera que sepa su id puede
 * invocarla. Por eso la comprobación vive acá y no en el componente que dibuja
 * el botón — ocultar el botón no protege nada.
 *
 * Son tres capas, y ninguna reemplaza a las otras:
 *   1. sesión válida               — hay un usuario autenticado
 *   2. pertenencia al equipo       — ese usuario es un integrante activo
 *   3. RLS en Postgres             — la última palabra, ya en la base
 *
 * La capa 3 basta para impedir el daño, pero deja errores ilegibles y permite
 * que un extraño con cuenta de Supabase gaste trabajo del servidor. Las capas
 * 1 y 2 cortan antes y con un mensaje que se entiende.
 */

export type Fallo = { ok: false; error: string }
/** `T` son los datos que devuelve el caso de éxito; sin datos, solo `ok`. */
export type Exito<T extends object = object> = { ok: true } & T
export type Resultado<T extends object = object> = Exito<T> | Fallo

export const fallo = (error: string): Fallo => ({ ok: false, error })

export interface Autorizado {
  supabase: SupabaseClient
  integranteId: string
}

/**
 * Exige un integrante activo del equipo.
 *
 * Devuelve un `Resultado` en vez de lanzar: quien la llama decide cómo
 * comunicarlo, y una excepción sin capturar en una Server Action se convierte
 * en un error opaco para quien está usando el panel.
 */
export async function exigirIntegrante(): Promise<Resultado<Autorizado>> {
  const supabase = await crearClienteServidor()

  const {
    data: { user },
    error: errAuth,
  } = await supabase.auth.getUser()

  if (errAuth || !user) return fallo('Sesión expirada. Vuelve a entrar.')

  const { data: integrante } = await supabase
    .from('dim_integrantes')
    .select('id')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  // Sesión válida pero sin ficha activa: autenticado no es lo mismo que
  // autorizado. Es el caso de alguien con cuenta que ya no está en el equipo.
  if (!integrante) return fallo('Tu cuenta no tiene acceso al panel.')

  return { ok: true, supabase, integranteId: integrante.id }
}

/**
 * Exige además un permiso concreto, resuelto por la misma función de la base
 * que usa el RLS. No se replica la lógica de permisos en la aplicación: si un
 * día cambia, cambia en un solo lugar.
 */
export async function exigirPermiso(permiso: string): Promise<Resultado<Autorizado>> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion

  const { data, error } = await sesion.supabase.rpc('tengo_permiso', {
    p_permiso: permiso,
  })

  if (error) return fallo('No se pudo comprobar tus permisos.')
  if (data !== true) return fallo('No tienes permiso para esta acción.')

  return sesion
}
