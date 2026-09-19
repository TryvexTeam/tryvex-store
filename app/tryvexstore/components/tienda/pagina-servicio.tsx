import type { ReactNode } from 'react'

/** Marco legible y común para las páginas públicas de información. */
export function PaginaServicio({
  etiqueta,
  titulo,
  descripcion,
  children,
}: {
  etiqueta: string
  titulo: string
  descripcion: string
  children: ReactNode
}) {
  return (
    <main className="flex-1 py-10 t:py-14 d:py-20">
      <div className="mx-auto w-full max-w-[1204px] px-[22px]">
        <header className="max-w-[65ch]">
          <p className="text-[14px] font-semibold tracking-etiqueta text-spark uppercase">{etiqueta}</p>
          <h1 className="mt-3 text-[40px] leading-[1.04] font-semibold tracking-titulo t:text-[56px]">
            {titulo}
          </h1>
          <p className="mt-5 text-[17px] leading-relaxed text-tinta-suave t:text-[19px]">{descripcion}</p>
        </header>
        <div className="mt-10 max-w-[65ch] text-[16px] leading-relaxed text-tinta-suave t:text-[17px]">{children}</div>
      </div>
    </main>
  )
}
