import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refresca la sesion en cada request y cierra /panel a quien no sea del equipo.
 * La comprobacion fuerte vive en RLS; esto es para no renderizar el panel a un
 * desconocido y para mandarlo al login con un destino de vuelta.
 */
export async function middleware(request: NextRequest) {
  let respuesta = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (aGuardar) => {
          aGuardar.forEach(({ name, value }) => request.cookies.set(name, value))
          respuesta = NextResponse.next({ request })
          aGuardar.forEach(({ name, value, options }) =>
            respuesta.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // getUser() revalida contra el servidor de Auth. getSession() solo lee la
  // cookie y es falsificable: no sirve para decidir accesos.
  const { data: { user } } = await supabase.auth.getUser()

  const ruta = request.nextUrl.pathname
  const esPanel = ruta.startsWith('/panel')
  const esLogin = ruta === '/panel/login'

  if (esPanel && !esLogin && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/panel/login'
    url.searchParams.set('volver', ruta)
    return NextResponse.redirect(url)
  }

  if (esLogin && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/panel'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return respuesta
}

export const config = {
  matcher: ['/panel/:path*'],
}
