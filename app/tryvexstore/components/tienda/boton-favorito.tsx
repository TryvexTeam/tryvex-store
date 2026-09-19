'use client'

import { useEffect, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'
import { alternarFavorito } from '@/app/cuenta/acciones'

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
  const [aviso, setAviso] = useState<string | null>(null)

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
    setAviso(null)
    iniciar(async () => {
      const r = await alternarFavorito(productoId)
      if (r.ok) { setFavorito(r.favorito); return }
      setFavorito(previo)
      if (r.requiereCuenta) { router.push(`/cuenta/ingresar?volver=${encodeURIComponent(ruta)}`); return }
      setAviso(r.error)
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
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden fill={favorito ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" className={favorito ? 'text-spark' : ''}>
          <path d="M12 20.5s-7.5-4.6-9.2-9.2C1.6 8 3.6 4.5 7.1 4.5c2 0 3.4 1.1 4.9 3 1.5-1.9 2.9-3 4.9-3 3.5 0 5.5 3.5 4.3 6.8-1.7 4.6-9.2 9.2-9.2 9.2Z" />
        </svg>
      </button>
      <span role="status" aria-live="polite" className="sr-only">{aviso ?? ''}</span>
    </>
  )
}
