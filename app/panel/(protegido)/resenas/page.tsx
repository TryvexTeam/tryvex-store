import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { urlPublicaResena } from '@/lib/resenas'
import { ResenasPanel, type ResenaPanel } from './resenas-panel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Reseñas' }

export default async function PaginaResenas() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data: productos }, { data: resenas }] = await Promise.all([
    supabase.from('productos').select('id,nombre').eq('activo', true).order('nombre'),
    supabase
      .from('resenas_tienda')
      .select('id,producto_id,cliente_nombre,texto,calificacion,foto_path,visible,created_at,auth_user_id,pedidos(numero),productos(nombre)')
      // Ocultas primero (ahí están las por aprobar): con 500+ reseñas, el límite no puede dejarlas fuera.
      .order('visible', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(150),
  ])

  type ResenaCruda = Omit<ResenaPanel, 'foto' | 'pedidoNumero' | 'producto' | 'porAprobar'> & {
    auth_user_id: string | null
    foto_path: string | null
    pedidos: { numero: number } | null
    productos: { nombre: string } | null
  }

  const opciones = (productos ?? []).map((p) => ({ productoId: p.id, producto: p.nombre }))
  const lista: ResenaPanel[] = ((resenas ?? []) as unknown as ResenaCruda[]).map((r) => ({
    ...r,
    pedidoNumero: r.pedidos?.numero ?? null,
    producto: r.productos?.nombre ?? 'Producto',
    foto: urlPublicaResena(r.foto_path),
    porAprobar: r.auth_user_id !== null && !r.visible,
  }))
  // Las que esperan aprobación van primero: es lo que el equipo tiene que mirar.
  lista.sort((a, b) => Number(b.porAprobar) - Number(a.porAprobar))

  return <ResenasPanel opciones={opciones} resenas={lista} />
}
