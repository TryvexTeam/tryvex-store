import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** Cliente para Server Components y Server Actions. Hereda la sesion por cookie. */
export async function crearClienteServidor() {
  const almacen = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => almacen.getAll(),
        setAll: (aGuardar) => {
          try {
            aGuardar.forEach(({ name, value, options }) =>
              almacen.set(name, value, options)
            )
          } catch {
            // Llamado desde un Server Component: el middleware ya refresca la sesion.
          }
        },
      },
    }
  )
}
