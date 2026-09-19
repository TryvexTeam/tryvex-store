'use client'

import { useActionState } from 'react'
import { guardarPerfil, type ResultadoPerfil } from './acciones'

type Estado = ResultadoPerfil | null

export function FormularioPerfil({ nombre, telefono }: { nombre: string; telefono: string }) {
  const [estado, accion, pendiente] = useActionState<Estado, FormData>((_previo, datos) => guardarPerfil(datos), null)
  const campo = 'w-full rounded-[12px] bg-papel-alt px-4 py-3 text-[16px] text-tinta ring-1 ring-borde/70 focus:ring-2 focus:ring-spark focus:outline-none'

  return (
    <form action={accion} className="mt-4 space-y-3">
      <div>
        <label htmlFor="perfil-nombre" className="mb-1.5 block text-[13px] font-semibold text-tinta-suave">Nombre</label>
        <input id="perfil-nombre" name="nombre" autoComplete="name" defaultValue={nombre} maxLength={120} className={campo} />
      </div>
      <div>
        <label htmlFor="perfil-telefono" className="mb-1.5 block text-[13px] font-semibold text-tinta-suave">Teléfono</label>
        <input id="perfil-telefono" name="telefono" type="tel" inputMode="tel" autoComplete="tel" defaultValue={telefono} maxLength={20} className={campo} />
      </div>
      <button type="submit" disabled={pendiente} className="tienda-boton w-full justify-center bg-tinta text-white hover:bg-tinta/90 disabled:opacity-60">
        {pendiente ? 'Guardando…' : 'Guardar'}
      </button>
      <p role="status" aria-live="polite" className={`text-[14px] ${estado && !estado.ok ? 'text-rojo' : 'text-verde'}`}>
        {estado ? (estado.ok ? 'Datos guardados.' : estado.error) : ''}
      </p>
    </form>
  )
}
