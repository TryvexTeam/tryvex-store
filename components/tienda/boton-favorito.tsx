'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { alternarFavorito } from '@/app/cuenta/acciones'
import { notificar } from '@/lib/notificar'

/**
 * Corazón de favorito. Lee su estado con la sesión del navegador (RLS: solo
 * los favoritos propios) y escribe por la acción del servidor. Sin sesión,
 * lleva a ingresar y vuelve a la misma página.
 */
export function BotonFavorito({ productoId, nombre, className = '' }: { productoId: string; nombre: string; className?: string }) {
  const router = useRouter()
  const ruta = usePathname()
  const [favorito, setFavorito] = useState(false)
  const [pendiente, iniciar] = useTransition()
  // El corazón se contrae, cambia de color en su punto más pequeño (a los 190 ms)
  // y vuelve con rebote, como PulseHeart de React Bits. Solo late cuando la
  // persona lo toca: `pintado` es lo que se ve, y sigue a `favorito` sin animar
  // cuando el estado llega de otro lado (por ejemplo, al cargar la página).
  const [pintado, setPintado] = useState(false)
  const [latido, setLatido] = useState(0)
  const animando = useRef(false)
  const favoritoActual = useRef(favorito)
  favoritoActual.current = favorito
  useEffect(() => {
    if (!animando.current) setPintado(favorito)
  }, [favorito])

  useEffect(() => {
    let vigente = true
    const db = crearClienteNavegador()
    db.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || !vigente) return
      const { data } = await db.from('favoritos_tienda').select('producto_id').eq('producto_id', productoId).maybeSingle()
      if (vigente) setFavorito(Boolean(data))
    })
    return () => { vigente = false }
  }, [productoId])

  function alternar() {
    const previo = favorito
    setFavorito(!previo)
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      animando.current = true
      setLatido((n) => n + 1)
      // En el punto más pequeño cambia de color; al terminar se asegura de quedar
      // como esté el estado real (si el servidor rechaza el cambio, vuelve atrás).
      setTimeout(() => setPintado(!previo), 190)
      setTimeout(() => {
        animando.current = false
        setPintado(favoritoActual.current)
      }, 600)
    }
    iniciar(async () => {
      const r = await alternarFavorito(productoId)
      if (r.ok) {
        setFavorito(r.favorito)
        void notificar.ok(r.favorito ? 'Guardado en favoritos' : 'Quitado de favoritos', nombre)
        return
      }
      setFavorito(previo)
      if (r.requiereCuenta) { router.push(`/cuenta/ingresar?volver=${encodeURIComponent(ruta)}`); return }
      void notificar.error('No se pudo actualizar tus favoritos', r.error)
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={alternar}
        disabled={pendiente}
        aria-pressed={favorito}
        aria-label={favorito ? `Quitar ${nombre} de favoritos` : `Guardar ${nombre} en favoritos`}
        className={`boton-favorito grid size-11 place-items-center rounded-full bg-papel/90 text-tinta ring-1 ring-borde/70 backdrop-blur transition-transform active:scale-95 disabled:opacity-60 ${className}`}
      >
        <svg key={latido} width="20" height="20" viewBox="0 0 24 24" aria-hidden fill={pintado ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={`${pintado ? 'text-spark' : ''} ${latido ? 'corazon-late' : ''}`}>
          <path d="M12 20.5s-7.5-4.6-9.2-9.2C1.6 8 3.6 4.5 7.1 4.5c2 0 3.4 1.1 4.9 3 1.5-1.9 2.9-3 4.9-3 3.5 0 5.5 3.5 4.3 6.8-1.7 4.6-9.2 9.2-9.2 9.2Z" />
        </svg>
      </button>
    </>
  )
}
