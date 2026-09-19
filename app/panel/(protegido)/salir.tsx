'use client'

import { useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

export default function BotonSalir() {
  const router = useRouter()

  async function salir() {
    await crearClienteNavegador().auth.signOut()
    router.replace('/panel/login')
    router.refresh()
  }

  return (
    <button
      onClick={salir}
      className="inline-flex min-h-11 items-center rounded-full px-3.5 text-[14px] text-gris transition-colors hover:bg-papel-alt hover:text-tinta"
    >
      Salir
    </button>
  )
}
