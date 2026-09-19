'use server'

import { revalidatePath } from 'next/cache'
import { exigirIntegrante, fallo, type Resultado } from '@/lib/autorizacion'

const TEXTO_MAX = 2000
const CORTO_MAX = 120

/** Campos de texto editables y su largo máximo. Lo que no está aquí no se escribe. */
const TEXTOS: Record<string, number> = {
  nombre_tienda: CORTO_MAX,
  email_contacto: CORTO_MAX,
  whatsapp: 20,
  banco: CORTO_MAX,
  tipo_cuenta: CORTO_MAX,
  numero_cuenta: 40,
  rut: 12,
  titular: CORTO_MAX,
  email_pagos: CORTO_MAX,
  envio_plazo_texto: CORTO_MAX,
  retiro_direccion: 240,
  garantia_texto: TEXTO_MAX,
  retracto_texto: TEXTO_MAX,
  envio_politica_texto: TEXTO_MAX,
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const RUT = /^\d{1,2}\.?\d{3}\.?\d{3}-[\dkK]$/

/**
 * Guarda la configuración de la tienda.
 *
 * Quién puede lo decide el RLS (admin de tienda o gestionar_finanzas); aquí
 * se pregunta antes solo para devolver un mensaje claro en vez de un update
 * que no afecta filas.
 */
export async function guardarConfiguracion(datos: FormData): Promise<Resultado> {
  const sesion = await exigirIntegrante()
  if (!sesion.ok) return sesion
  const { supabase, integranteId } = sesion

  const { data: puede } = await supabase.rpc('es_admin_tienda')
  const { data: finanzas } = await supabase.rpc('tengo_permiso', { p_permiso: 'gestionar_finanzas' })
  if (puede !== true && finanzas !== true) return fallo('Solo administración o finanzas pueden cambiar los ajustes.')

  const cambios: Record<string, string | number | boolean | null> = {}
  for (const [campo, max] of Object.entries(TEXTOS)) {
    const v = String(datos.get(campo) ?? '').trim()
    if (v.length > max) return fallo(`«${campo.replace(/_/g, ' ')}» supera ${max} caracteres.`)
    cambios[campo] = v || null
  }

  if (!cambios.nombre_tienda) return fallo('La tienda necesita un nombre.')
  for (const c of ['email_contacto', 'email_pagos'])
    if (cambios[c] && !EMAIL.test(String(cambios[c]))) return fallo('Revisa el formato de los correos.')
  if (cambios.rut && !RUT.test(String(cambios.rut))) return fallo('El RUT debe verse como 76.123.456-7.')
  if (cambios.whatsapp) cambios.whatsapp = String(cambios.whatsapp).replace(/\D/g, '')

  const tarifa = Number(datos.get('envio_tarifa_clp') || 0)
  const gratisCrudo = String(datos.get('envio_gratis_desde_clp') ?? '').trim()
  const gratis = gratisCrudo === '' ? null : Number(gratisCrudo)
  if (!Number.isInteger(tarifa) || tarifa < 0) return fallo('La tarifa de envío debe ser un entero sin decimales.')
  if (gratis !== null && (!Number.isInteger(gratis) || gratis < 1))
    return fallo('«Envío gratis desde» debe ser un monto entero o quedar vacío.')

  const retiro = datos.get('retiro_habilitado') === 'on'
  if (retiro && !cambios.retiro_direccion) return fallo('Si hay retiro, indica la dirección.')

  const { error, count } = await supabase
    .from('configuracion_tienda')
    .update(
      {
        ...cambios,
        envio_tarifa_clp: tarifa,
        envio_gratis_desde_clp: gratis,
        retiro_habilitado: retiro,
        updated_at: new Date().toISOString(),
        updated_by: integranteId,
      },
      { count: 'exact' }
    )
    .eq('id', true)

  if (error) return fallo('No se pudo guardar. Intenta de nuevo.')
  if (!count) return fallo('No tienes permiso para cambiar los ajustes.')

  revalidatePath('/panel/ajustes')
  revalidatePath('/comprar')
  revalidatePath('/')
  return { ok: true }
}
