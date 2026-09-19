'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

type Estado = { conSesion: boolean; esIntegrante: boolean }

/**
 * Ícono de cuenta y botón Panel. El botón es solo un atajo visual: el panel
 * sigue protegido en el servidor (middleware + integranteActual + RLS), así que
 * mostrarlo por error no abriría nada.
 */
export function EnlaceCuenta({ alCerrar }: { alCerrar: () => void }) {
  const [estado, setEstado] = useState<Estado>({ conSesion: false, esIntegrante: false })

  useEffect(() => {
    const db = crearClienteNavegador()
    let vigente = true
    async function leer() {
      const { data: { user } } = await db.auth.getUser()
      if (!user) { if (vigente) setEstado({ conSesion: false, esIntegrante: false }); return }
      const { data } = await db.from('dim_integrantes').select('id').eq('auth_user_id', user.id).eq('activo', true).maybeSingle()
      if (vigente) setEstado({ conSesion: true, esIntegrante: Boolean(data) })
    }
    leer()
    const { data: { subscription } } = db.auth.onAuthStateChange(() => { leer() })
    return () => { vigente = false; subscription.unsubscribe() }
  }, [])

  return (
    <>
      {estado.esIntegrante && (
        <Link href="/panel" onClick={alCerrar} className="mr-1 hidden rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 ring-current/30 ring-inset hover:ring-current t:inline-block">
          Panel
        </Link>
      )}
      <Link
        href={estado.conSesion ? '/cuenta' : '/cuenta/ingresar'}
        onClick={alCerrar}
        aria-label={estado.conSesion ? 'Mi cuenta' : 'Ingresar o crear cuenta'}
        className="relative grid size-11 place-items-center rounded-full"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
        </svg>
        {estado.conSesion && <span aria-hidden className="absolute top-2.5 right-2.5 size-2 rounded-full bg-spark" />}
      </Link>
    </>
  )
}
