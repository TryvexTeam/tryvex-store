import { crearClienteAdministrador } from '@/lib/supabase/administrador'

/**
 * Configuración de la tienda: una sola fila, fuente única de los datos que
 * ve el comprador (cuenta para transferir, envío, textos legales).
 *
 * Se lee con el cliente de servicio porque la página pública no tiene sesión;
 * la tabla es de lectura pública igual, así que no se expone nada nuevo.
 */
export interface ConfiguracionTienda {
  nombre_tienda: string
  email_contacto: string | null
  whatsapp: string | null
  banco: string | null
  tipo_cuenta: string | null
  numero_cuenta: string | null
  rut: string | null
  titular: string | null
  email_pagos: string | null
  envio_tarifa_clp: number
  envio_gratis_desde_clp: number | null
  envio_plazo_texto: string | null
  retiro_habilitado: boolean
  retiro_direccion: string | null
  garantia_texto: string | null
  retracto_texto: string | null
  envio_politica_texto: string | null
  updated_at: string | null
}

export const COLUMNAS_CONFIGURACION =
  'nombre_tienda,email_contacto,whatsapp,banco,tipo_cuenta,numero_cuenta,rut,titular,email_pagos,' +
  'envio_tarifa_clp,envio_gratis_desde_clp,envio_plazo_texto,retiro_habilitado,retiro_direccion,' +
  'garantia_texto,retracto_texto,envio_politica_texto,updated_at'

export async function leerConfiguracion(): Promise<ConfiguracionTienda | null> {
  const { data } = await crearClienteAdministrador()
    .from('configuracion_tienda')
    .select(COLUMNAS_CONFIGURACION)
    .maybeSingle()
  return (data as unknown as ConfiguracionTienda | null) ?? null
}

/** Datos de transferencia listos para mostrar; «—» donde falte algo. */
export function datosDePago(c: ConfiguracionTienda | null) {
  const o = (v: string | null | undefined) => (v && v.trim() ? v : '—')
  return {
    banco: o(c?.banco),
    tipo: o(c?.tipo_cuenta),
    numero: o(c?.numero_cuenta),
    rut: o(c?.rut),
    titular: o(c?.titular),
    email: o(c?.email_pagos),
    whatsapp: (c?.whatsapp ?? '').replace(/\D/g, ''),
  }
}

export type DatosPago = ReturnType<typeof datosDePago>
