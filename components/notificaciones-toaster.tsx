'use client'

import { useEffect } from 'react'
import { Toaster } from 'sileo'
import 'sileo/styles.css'
import { toasterMontado } from '@/lib/notificar'

/**
 * El toaster de Sileo. Vive en su propio archivo para que Next lo parta del
 * paquete inicial: solo se descarga cuando hay algo que avisar
 * (ver `lib/notificar.ts` y `ContenedorNotificaciones`).
 */
export default function ToasterTryvex() {
  useEffect(() => {
    toasterMontado()
  }, [])
  return <Toaster position="bottom-center" theme="dark" />
}
