import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'

/**
 * Acceso a finanzas: la misma regla que `tengo_permiso()` en la base, que es
 * la que usa Tryvex Plataform. Quien tiene finanzas autorizadas en el CRM las
 * tiene también en la tienda, sin configurar nada aparte.
 */
type MarcasFinanzas = { es_superadmin?: boolean | null; ver_finanzas?: boolean | null; gestionar_finanzas?: boolean | null }

export function puedeGestionarFinanzas(i: MarcasFinanzas | null | undefined): boolean {
  return Boolean(i && (i.es_superadmin || i.gestionar_finanzas))
}

export function puedeVerFinanzas(i: MarcasFinanzas | null | undefined): boolean {
  return Boolean(i && (i.es_superadmin || i.ver_finanzas || i.gestionar_finanzas))
}

/** Negocio con que la tienda marca sus movimientos en la tabla compartida. */
export const NEGOCIO_TIENDA = 'Tryvex Store'

export type Integrante = {
  id: string
  nombre: string
  email: string
  rol_principal: string | null
  avatar_url: string | null
  es_admin: boolean
  es_superadmin: boolean
  ver_finanzas: boolean
  gestionar_finanzas: boolean
}

/**
 * Devuelve el integrante de la sesion actual, o redirige al login.
 * Los permisos salen de dim_integrantes, la misma tabla que usa Tryvex:
 * no hay un modelo de roles paralelo para la tienda.
 */
export async function integranteActual(): Promise<Integrante> {
  const supabase = await crearClienteServidor()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/panel/login')

  const { data, error } = await supabase
    .from('dim_integrantes')
    .select('id,nombre,email,rol_principal,avatar_url,es_admin,es_superadmin,ver_finanzas,gestionar_finanzas')
    .eq('auth_user_id', user.id)
    .eq('activo', true)
    .maybeSingle()

  // Sesion valida pero sin ficha de integrante activo: no es del equipo.
  if (error || !data) redirect('/panel/login?motivo=sin-acceso')

  // Las marcas quedan resueltas con la regla de la base: así cada pantalla
  // que pregunta por `ver_finanzas` o `gestionar_finanzas` decide igual que el RLS.
  const i = data as Integrante
  return { ...i, ver_finanzas: puedeVerFinanzas(i), gestionar_finanzas: puedeGestionarFinanzas(i) }
}
