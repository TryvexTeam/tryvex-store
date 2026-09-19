'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { crearClienteNavegador } from '@/lib/supabase/cliente'

type Modo = 'entrar' | 'crear'

const LARGO_MINIMO_CLAVE = 8

/**
 * Ingreso y registro con la clave publicable: Supabase Auth valida y limita
 * intentos. Los mensajes de error son genéricos a propósito, para no revelar
 * qué correos tienen cuenta.
 */
export function FormularioIngreso({ volver }: { volver: string }) {
  const router = useRouter()
  const [modo, setModo] = useState<Modo>('entrar')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const correo = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return setError('Escribe un correo válido.')
    if (clave.length < LARGO_MINIMO_CLAVE) return setError(`La contraseña debe tener al menos ${LARGO_MINIMO_CLAVE} caracteres.`)

    setEnviando(true)
    const db = crearClienteNavegador()

    if (modo === 'entrar') {
      const { error: fallo } = await db.auth.signInWithPassword({ email: correo, password: clave })
      setEnviando(false)
      if (fallo) return setError('Correo o contraseña incorrectos.')
      router.replace(volver)
      router.refresh()
      return
    }

    const { error: fallo } = await db.auth.signUp({
      email: correo,
      password: clave,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(volver)}`,
        data: { nombre: nombre.trim().slice(0, 120) },
      },
    })
    setEnviando(false)
    if (fallo) return setError('No pudimos crear la cuenta. Revisa los datos e intenta de nuevo.')
    setEnviado(true)
  }

  if (enviado) {
    return (
      <div role="status" className="mt-8 rounded-[22px] bg-papel p-6 text-center ring-1 ring-borde/70">
        <p className="text-[19px] font-semibold">Revisa tu correo.</p>
        <p className="mt-2 text-[15px] text-tinta-suave">Te enviamos un enlace a <strong className="text-tinta">{email.trim()}</strong> para confirmar tu cuenta.</p>
      </div>
    )
  }

  const campo = 'w-full rounded-[12px] bg-papel px-4 py-3.5 text-[16px] text-tinta ring-1 ring-borde placeholder:text-gris focus:ring-2 focus:ring-spark focus:outline-none disabled:opacity-60'
  const pestaña = (m: Modo) => `flex-1 rounded-full py-2.5 text-[15px] font-semibold transition-colors ${modo === m ? 'bg-tinta text-white' : 'text-tinta-suave hover:text-tinta'}`

  return (
    <form onSubmit={enviar} noValidate className="mt-8 rounded-[22px] bg-papel p-5 ring-1 ring-borde/70 t:p-7">
      <div role="tablist" aria-label="Ingresar o crear cuenta" className="flex gap-1 rounded-full bg-papel-alt p-1">
        <button type="button" role="tab" aria-selected={modo === 'entrar'} className={pestaña('entrar')} onClick={() => { setModo('entrar'); setError(null) }}>Ingresar</button>
        <button type="button" role="tab" aria-selected={modo === 'crear'} className={pestaña('crear')} onClick={() => { setModo('crear'); setError(null) }}>Crear cuenta</button>
      </div>

      <div className="mt-5 space-y-3">
        {modo === 'crear' && (
          <div>
            <label htmlFor="nombre" className="mb-1.5 block text-[13px] font-semibold text-tinta-suave">Nombre</label>
            <input id="nombre" autoComplete="name" value={nombre} onChange={(e) => setNombre(e.target.value)} disabled={enviando} className={campo} maxLength={120} />
          </div>
        )}
        <div>
          <label htmlFor="email" className="mb-1.5 block text-[13px] font-semibold text-tinta-suave">Correo</label>
          <input id="email" type="email" inputMode="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={enviando} className={campo} />
        </div>
        <div>
          <label htmlFor="clave" className="mb-1.5 block text-[13px] font-semibold text-tinta-suave">Contraseña</label>
          <input id="clave" type="password" autoComplete={modo === 'entrar' ? 'current-password' : 'new-password'} required minLength={LARGO_MINIMO_CLAVE} value={clave} onChange={(e) => setClave(e.target.value)} disabled={enviando} className={campo} />
        </div>
      </div>

      {error && <p role="alert" className="mt-4 text-[14px] text-rojo">{error}</p>}

      <button type="submit" disabled={enviando} className="tienda-boton mt-6 w-full justify-center bg-tinta text-white hover:bg-tinta/90 disabled:opacity-60">
        {enviando ? 'Un momento…' : modo === 'entrar' ? 'Ingresar' : 'Crear cuenta'}
      </button>
      <p className="mt-4 text-center text-[12px] text-gris">Si eres del equipo Tryvex, ingresa con tu cuenta del CRM para ver el Panel.</p>
    </form>
  )
}
