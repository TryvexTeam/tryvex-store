import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { urlPublica } from '@/lib/imagenes'
import { EtiquetasPanel, type ProductoEtiqueta } from './etiquetas-panel'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Etiquetas' }

export default async function PaginaEtiquetas() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  // Los archivados no se ven en la tienda: etiquetarlos no tendría efecto.
  const { data } = await supabase
    .from('productos')
    .select('id,nombre,sku,etiqueta,estado,imagen_url,categorias(nombre)')
    .neq('estado', 'archivado')
    .order('nombre')

  type Crudo = { id: string; nombre: string; sku: string; etiqueta: string | null; estado: string; imagen_url: string | null; categorias: { nombre: string } | null }
  const productos: ProductoEtiqueta[] = ((data ?? []) as unknown as Crudo[]).map((p) => ({
    id: p.id,
    nombre: p.nombre,
    sku: p.sku,
    etiqueta: p.etiqueta,
    publicado: p.estado === 'publicado',
    imagen: p.imagen_url ? urlPublica(p.imagen_url) : null,
    categoria: p.categorias?.nombre ?? null,
  }))

  return <EtiquetasPanel productos={productos} />
}
