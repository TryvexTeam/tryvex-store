import { crearClienteServidor } from '@/lib/supabase/servidor'
import { redirect } from 'next/navigation'

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

  return data as Integrante
}
