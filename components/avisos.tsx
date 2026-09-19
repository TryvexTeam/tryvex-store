'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

type Tono = 'ok' | 'error'

interface Aviso {
  id: number
  texto: string
  tono: Tono
  estado: 'entrando' | 'visible' | 'saliendo'
}

interface ApiAvisos {
  ok: (texto: string) => void
  error: (texto: string) => void
}

const Contexto = createContext<ApiAvisos | null>(null)

/**
 * Avisos flotantes.
 *
 * Sustituyen a los mensajes en línea, que empujaban el contenido al aparecer
 * y desaparecer —el botón que acabas de tocar se movía de sitio— y que
 * además quedaban fuera de la vista si la acción ocurría con la página
 * desplazada.
 *
 * Cada aviso se anuncia en una región viva: para quien usa lector de
 * pantalla, una confirmación que solo existe como color y posición no existe.
 */
export function ProveedorAvisos({ children }: { children: React.ReactNode }) {
  const [avisos, setAvisos] = useState<Aviso[]>([])
  const siguienteId = useRef(1)
  const relojes = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const cerrar = useCallback((id: number) => {
    setAvisos((lista) =>
      lista.map((a) => (a.id === id ? { ...a, estado: 'saliendo' } : a))
    )
    // Se espera a que termine la transición antes de sacarlo del DOM; si se
    // quitara de inmediato, desaparecería de golpe.
    const t = setTimeout(
      () => setAvisos((lista) => lista.filter((a) => a.id !== id)),
      220
    )
    relojes.current.set(-id, t)
  }, [])

  const mostrar = useCallback(
    (texto: string, tono: Tono) => {
      const id = siguienteId.current++
      setAvisos((lista) => [...lista.slice(-2), { id, texto, tono, estado: 'entrando' }])

      // Un fotograma después se pasa a `visible`: la transición necesita que
      // el elemento exista primero en su estado inicial para poder animar.
      requestAnimationFrame(() =>
        requestAnimationFrame(() =>
          setAvisos((lista) =>
            lista.map((a) => (a.id === id ? { ...a, estado: 'visible' } : a))
          )
        )
      )

      // Un error se lee más despacio que una confirmación.
      const t = setTimeout(() => cerrar(id), tono === 'error' ? 5200 : 2800)
      relojes.current.set(id, t)
    },
    [cerrar]
  )

  useEffect(() => {
    const pendientes = relojes.current
    return () => pendientes.forEach(clearTimeout)
  }, [])

  const api = useMemo<ApiAvisos>(
    () => ({
      ok: (texto) => mostrar(texto, 'ok'),
      error: (texto) => mostrar(texto, 'error'),
    }),
    [mostrar]
  )

  return (
    <Contexto.Provider value={api}>
      {children}

      <div
        // `polite` y no `assertive`: un aviso de guardado no debe cortar lo
        // que el lector de pantalla esté diciendo.
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(72px+env(safe-area-inset-bottom))]
                   z-[70] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {avisos.map((a) => (
          <div
            key={a.id}
            data-estado={a.estado}
            role={a.tono === 'error' ? 'alert' : 'status'}
            className={`toast pointer-events-auto flex w-full max-w-[26rem] items-start gap-2.5 rounded-[14px]
                        px-4 py-3 text-[14px] leading-snug shadow-[var(--shadow-alzado)] ${
                          a.tono === 'error'
                            ? 'bg-rojo text-white'
                            : 'bg-tinta text-papel'
                        }`}
          >
            <span aria-hidden className="mt-[3px] shrink-0">
              {a.tono === 'error' ? <IconoAlerta /> : <IconoTic />}
            </span>
            <span className="min-w-0 flex-1">{a.texto}</span>
            <button
              type="button"
              onClick={() => cerrar(a.id)}
              aria-label="Descartar aviso"
              className="-mr-1 -mt-0.5 shrink-0 rounded-md p-1 opacity-60 transition-opacity hover:opacity-100"
            >
              <IconoEquis />
            </button>
          </div>
        ))}
      </div>
    </Contexto.Provider>
  )
}

/**
 * Si algún día un componente queda fuera del proveedor, es mejor que no haga
 * nada a que reviente la pantalla por un mensaje de confirmación.
 */
export function useAvisos(): ApiAvisos {
  const ctx = useContext(Contexto)
  return ctx ?? { ok: () => {}, error: () => {} }
}

function IconoTic() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m5 12.5 4.5 4.5L19 7.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconoAlerta() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 7.5v6M12 17h.01"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function IconoEquis() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}
