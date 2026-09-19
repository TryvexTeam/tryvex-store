import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { cuentaActual } from '@/lib/cuenta'
import { rutaInterna } from '@/lib/rutas'
import { leerVitrina } from '@/lib/tienda'
import { Cabecera } from '@/components/tienda/cabecera'
import { destinosMenu } from '@/components/tienda/destinos'
import { FranjaAnuncio } from '@/components/tienda/franja-anuncio'
import { PieTienda } from '@/components/tienda/pie-tienda'
import { FormularioIngreso } from './formulario'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Ingresar o crear cuenta',
  robots: { index: false, follow: false },
}

const MOTIVOS: Record<string, string> = {
  'enlace-vencido': 'El enlace de confirmación venció o ya se usó. Ingresa o pide uno nuevo.',
  'enlace-invalido': 'El enlace no es válido.',
}

export default async function Ingresar(props: PageProps<'/cuenta/ingresar'>) {
  const q = await props.searchParams
  const volver = rutaInterna(typeof q.volver === 'string' ? q.volver : undefined, '/cuenta')
  if (await cuentaActual()) redirect(volver)

  const motivo = typeof q.motivo === 'string' ? MOTIVOS[q.motivo] : undefined
  const { categorias, configuracion } = await leerVitrina()

  return (
    <div className="tienda flex min-h-dvh min-w-0 flex-col bg-papel-alt">
      <FranjaAnuncio configuracion={configuracion} />
      <Cabecera destinos={destinosMenu(categorias, '/')} ayuda={null} />
      <main className="grid flex-1 place-items-center px-[22px] py-12 t:py-20">
        <div className="w-full max-w-[420px]">
          <h1 className="text-center text-[34px] leading-[1.05] font-semibold tracking-titulo t:text-[40px]">Tu cuenta Tryvex.</h1>
          <p className="mt-3 text-center text-[16px] text-tinta-suave">Revisa tus compras, guarda favoritos y compra más rápido.</p>
          {motivo && <p role="alert" className="mt-6 rounded-[14px] bg-papel px-4 py-3 text-[14px] text-rojo ring-1 ring-borde">{motivo}</p>}
          <FormularioIngreso volver={volver} />
        </div>
      </main>
      <PieTienda
        nombre={configuracion?.nombre_tienda ?? 'Tryvex'}
        email={configuracion?.email_contacto ?? null}
        whatsapp={configuracion?.whatsapp ?? null}
        garantia={configuracion?.garantia_texto ?? null}
        retracto={configuracion?.retracto_texto ?? null}
      />
    </div>
  )
}
