import { crearClienteServidor } from '@/lib/supabase/servidor'
import { integranteActual } from '@/lib/sesion'
import { COLUMNAS_CONFIGURACION, type ConfiguracionTienda } from '@/lib/configuracion'
import { FormularioAjustes } from './formulario'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Ajustes' }

export default async function Ajustes() {
  await integranteActual()
  const supabase = await crearClienteServidor()

  const [{ data }, { data: admin }, { data: finanzas }] = await Promise.all([
    supabase.from('configuracion_tienda').select(COLUMNAS_CONFIGURACION).maybeSingle(),
    supabase.rpc('es_admin_tienda'),
    supabase.rpc('tengo_permiso', { p_permiso: 'gestionar_finanzas' }),
  ])

  const configuracion = data as unknown as ConfiguracionTienda | null
  const puedeEditar = admin === true || finanzas === true

  return (
    <>
      <header className="mb-6">
        <h1 className="text-[26px] leading-tight font-semibold tracking-[-0.022em] sm:text-[2.2rem]">Ajustes</h1>
        <p className="mt-1 text-[14px] text-gris sm:text-[15px]">
          Lo que el comprador ve al pagar y recibir: cuenta, envío y textos legales.
        </p>
      </header>

      {!configuracion ? (
        <p className="rounded-[var(--radius-tarjeta)] bg-papel p-6 text-[14px] text-gris ring-1 ring-borde/70">
          No se encontró la configuración de la tienda.
        </p>
      ) : (
        <FormularioAjustes configuracion={configuracion} puedeEditar={puedeEditar} />
      )}
    </>
  )
}
