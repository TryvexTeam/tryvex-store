'use client'

import { Boton } from '@/components/panel/ui'

/** Imprime la página; el navegador ofrece «Guardar como PDF». Ver `@media print` en globals.css. */
export function BotonImprimir({ etiqueta = 'PDF' }: { etiqueta?: string }) {
  return (
    <Boton variante="secundario" tamano="sm" onClick={() => window.print()} aria-label="Imprimir o guardar como PDF">
      {etiqueta}
    </Boton>
  )
}
