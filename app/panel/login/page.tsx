import FormularioLogin from './formulario'
import { Marca } from '@/app/marca'

export const metadata = {
  title: 'Entrar al panel',
  robots: { index: false, follow: false },
}

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ volver?: string; motivo?: string }>
}) {
  const { volver, motivo } = await searchParams

  return (
    <main className="grid min-h-dvh place-items-center bg-papel-alt px-6 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-10 text-center">
          <Marca size={34} className="justify-center" />
          <p className="mt-2 text-[15px] text-gris">Panel del equipo</p>
        </div>

        {motivo === 'sin-acceso' && (
          <p
            role="alert"
            className="mb-6 rounded-[10px] bg-white px-4 py-3 text-[13px] leading-relaxed text-rojo ring-1 ring-borde"
          >
            Tu cuenta existe pero no está activa como integrante del equipo.
            Pídele acceso a un administrador.
          </p>
        )}

        <FormularioLogin volver={volver ?? '/panel'} />

        <p className="mt-8 text-center text-[12px] text-gris">
          Acceso restringido al equipo de Tryvex.
        </p>
      </div>
    </main>
  )
}
