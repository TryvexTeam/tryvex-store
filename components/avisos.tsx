'use client'

import { notificar } from '@/lib/notificar'

/**
 * Avisos del panel.
 *
 * Mantienen la interfaz de siempre (`useAvisos().ok/error`) para que los ~14
 * lugares que los usan no cambien, pero ahora se muestran con Sileo
 * (`lib/notificar.ts`), que además los anuncia a lectores de pantalla.
 *
 * Sustituyeron antes a los mensajes en línea, que empujaban el contenido al
 * aparecer y desaparecer —el botón que acabas de tocar se movía de sitio— y
 * que quedaban fuera de la vista si la acción ocurría con la página
 * desplazada.
 */

interface ApiAvisos {
  ok: (texto: string) => void
  error: (texto: string) => void
}

/** Sileo muestra un título y, debajo, una descripción: un mensaje largo va a la descripción. */
const LARGO_DE_TITULO = 56

const api: ApiAvisos = {
  ok: (texto) => {
    void (texto.length > LARGO_DE_TITULO ? notificar.ok('Listo', texto) : notificar.ok(texto))
  },
  error: (texto) => {
    void (texto.length > LARGO_DE_TITULO ? notificar.error('No se pudo completar', texto) : notificar.error(texto))
  },
}

/** Se conserva como envoltorio para no tocar el layout del panel. */
export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

/** Fuera del proveedor funciona igual: es mejor un aviso de más que una pantalla rota. */
export function useAvisos(): ApiAvisos {
  return api
}
