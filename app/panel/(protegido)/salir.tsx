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
      className="ml-1 inline-flex min-h-10 items-center rounded-full px-3.5 text-[13.5px] font-medium text-gris transition-colors hover:bg-papel-alt hover:text-tinta"
    >
      Salir
    </button>
  )
}
