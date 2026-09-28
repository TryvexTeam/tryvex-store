import 'server-only'

/**
 * ¿Está habilitado el ingreso con Google en Supabase Auth?
 *
 * Se le pregunta al propio Auth (`/auth/v1/settings`, público con la clave
 * publicable) en vez de fijarlo con una variable: así el botón aparece solo
 * el día que se configure Google en el servidor, y desaparece si se apaga.
 * Nunca se muestra un botón que termine en error.
 */
export async function googleHabilitado(): Promise<boolean> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const clave = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!url || !clave) return false
  try {
    const respuesta = await fetch(`${url}/auth/v1/settings`, {
      headers: { apikey: clave },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(4000),
    })
    if (!respuesta.ok) return false
    const datos = (await respuesta.json()) as { external?: { google?: boolean } }
    return datos.external?.google === true
  } catch {
    return false
  }
}
