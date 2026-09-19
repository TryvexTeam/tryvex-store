import { NextResponse, type NextRequest } from 'next/server'
import { crearClienteServidor } from '@/lib/supabase/servidor'
import { rutaInterna } from '@/lib/rutas'

/**
 * Punto de retorno de Supabase Auth: enlaces mágicos, invitaciones y
 * recuperación de contraseña llegan aquí con un `code` que hay que canjear
 * por una sesión. Sin esta ruta, esos flujos dejan al usuario en el login.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const destino = searchParams.get('next') ?? '/panel'
  // Clientes de la tienda vuelven a su ingreso; el equipo, al login del panel.
  const ingreso = destino.startsWith('/panel') ? '/panel/login' : '/cuenta/ingresar'

  if (!code) {
    return NextResponse.redirect(`${origin}${ingreso}?motivo=enlace-invalido`)
  }

  const supabase = await crearClienteServidor()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    return NextResponse.redirect(`${origin}${ingreso}?motivo=enlace-vencido`)
  }

  // Solo rutas internas: `//x` o `/\x` serían un redirect abierto.
  const seguro = rutaInterna(destino, '/panel')
  return NextResponse.redirect(`${origin}${seguro}`)
}
