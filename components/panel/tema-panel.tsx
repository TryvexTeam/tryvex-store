'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * Tema claro u oscuro del panel.
 *
 * Los colores del panel son tokens (`--color-papel`, `--color-tinta`…), así que
 * oscurecerlo es redefinir esos tokens bajo `[data-tema='oscuro']` (ver
 * globals.css). La elección vive en una cookie para que el servidor pinte el
 * tema correcto en la primera respuesta: guardarla en localStorage dejaría ver
 * un destello blanco antes de que corra el JavaScript.
 */
export type Tema = 'claro' | 'oscuro'

const COOKIE = 'panel-tema'
const Contexto = createContext<{ tema: Tema; alternar: () => void }>({ tema: 'claro', alternar: () => {} })

export const leerTema = (valor: string | undefined): Tema => (valor === 'oscuro' ? 'oscuro' : 'claro')

export function TemaPanel({ inicial, children }: { inicial: Tema; children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(inicial)

  // El fondo detrás de la página (rebote de scroll, barra del navegador) también
  // debe oscurecerse; vive fuera del contenedor, así que se marca en <html>.
  useEffect(() => {
    document.documentElement.dataset.temaPanel = tema
    return () => {
      delete document.documentElement.dataset.temaPanel
    }
  }, [tema])

  function alternar() {
    const siguiente: Tema = tema === 'oscuro' ? 'claro' : 'oscuro'
    document.cookie = `${COOKIE}=${siguiente}; path=/panel; max-age=31536000; samesite=lax`
    setTema(siguiente)
  }

  return (
    <Contexto.Provider value={{ tema, alternar }}>
      <div data-tema={tema} className="min-h-dvh bg-papel-alt text-tinta">
        {children}
      </div>
    </Contexto.Provider>
  )
}

export function BotonTema() {
  const { tema, alternar } = useContext(Contexto)
  const oscuro = tema === 'oscuro'
  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={oscuro}
      aria-label="Tema oscuro"
      title={oscuro ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'}
      className="presionable grid size-11 place-items-center rounded-full text-tinta-suave hover:bg-papel-alt hover:text-tinta"
    >
      {oscuro ? (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
        </svg>
      ) : (
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7Z" />
        </svg>
      )}
    </button>
  )
}
