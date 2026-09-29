'use client'

/** Abre el diálogo de impresión del navegador: ahí se imprime o se guarda como PDF. */
export function BotonImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="presionable inline-flex min-h-11 items-center gap-2 rounded-full bg-tinta px-5 text-[14px] font-medium text-white hover:bg-tinta/85"
    >
      <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V3h12v6M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <path d="M6 14h12v7H6z" />
      </svg>
      Imprimir o guardar PDF
    </button>
  )
}
