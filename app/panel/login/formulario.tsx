'use client'

import { useState } from 'react'
import { rutaInterna } from '@/lib/rutas'
import { useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

export default function FormularioLogin({ volver }: { volver: string }) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setEnviando(true)

    const supabase = crearClienteNavegador()
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: clave,
    })

    if (error) {
      // Mensaje genérico a propósito: distinguir "no existe" de "clave mala"
      // le regala a un atacante la lista de correos del equipo.
      setError('Correo o contraseña incorrectos.')
      setEnviando(false)
      return
    }

    // rutaInterna descarta destinos externos: sin esto, /panel/login?volver=<sitio ajeno>
    // llevaba al integrante fuera del sitio justo despues de autenticarse.
    router.replace(rutaInterna(volver, '/panel'))
    router.refresh()
  }

  const campo =
    'w-full rounded-[10px] bg-white px-4 py-3 text-[15px] text-tinta ring-1 ring-borde ' +
    'placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none ' +
    'transition-shadow disabled:opacity-60'

  return (
    <form onSubmit={entrar} className="space-y-3" noValidate>
      <div>
        <label htmlFor="email" className="sr-only">
          Correo
        </label>
        <input
          id="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          autoFocus
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={enviando}
          className={campo}
        />
      </div>

      <div>
        <label htmlFor="clave" className="sr-only">
          Contraseña
        </label>
        <input
          id="clave"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Contraseña"
          value={clave}
          onChange={(e) => setClave(e.target.value)}
          disabled={enviando}
          className={campo}
        />
      </div>

      {error && (
        <p role="alert" className="px-1 text-[13px] text-rojo">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || !email || !clave}
        className="w-full rounded-full bg-spark px-6 py-3 text-[15px] font-medium text-white
                   transition-colors hover:bg-spark-hover disabled:cursor-not-allowed disabled:opacity-40"
      >
        {enviando ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}
