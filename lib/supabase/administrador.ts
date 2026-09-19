import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con service role. SALTA RLS.
 * Uso exclusivo: checkout publico (pedidos tiene RLS solo-equipo a proposito).
 * Nunca importar esto desde un componente de cliente.
 */
export function crearClienteAdministrador() {
  const clave = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!clave) {
    throw new Error(
      'Falta SUPABASE_SERVICE_ROLE_KEY. El checkout publico no puede escribir pedidos sin ella.'
    )
  }
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, clave, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
