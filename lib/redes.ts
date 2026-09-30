/**
 * Redes de Tryvex Store y de Tryvex Tech, el estudio de desarrollo.
 * Son de marca, no de configuración: cambian casi nunca y con un despliegue basta.
 */
export interface EstadisticasRed {
  seguidores: string
  meGusta: string
  /** Fecha de la captura: las cifras son de esa fecha, no en vivo. */
  al: string
}

export interface Red {
  red: 'tiktok' | 'instagram' | 'web'
  nombre: string
  usuario: string
  href: string
  estadisticas?: EstadisticasRed
}

export const REDES_TIENDA: readonly Red[] = [
  { red: 'instagram', nombre: 'Instagram', usuario: '@tryvexstore.cl', href: 'https://www.instagram.com/tryvexstore.cl/' },
  // Cifras tomadas del perfil el 2026-09-30 (107,9 K seguidores y 405,4 K me gusta).
  // No se consultan en vivo: TikTok no ofrece una API pública sin credenciales.
  // Actualizarlas a mano cuando cambien de forma visible.
  {
    red: 'tiktok',
    nombre: 'TikTok',
    usuario: '@tryvexstore',
    href: 'https://www.tiktok.com/@tryvexstore',
    estadisticas: { seguidores: '107,9 K', meGusta: '405,4 K', al: '30 sep 2026' },
  },
]

export const TRYVEX_TECH = {
  sitio: 'https://www.tryvex.tech/',
  redes: [
    { red: 'web', nombre: 'Sitio web', usuario: 'tryvex.tech', href: 'https://www.tryvex.tech/' },
    { red: 'web', nombre: 'Todos los enlaces', usuario: 'tryvex.tech/links', href: 'https://www.tryvex.tech/links/' },
    { red: 'instagram', nombre: 'Instagram', usuario: '@tryvex.tech', href: 'https://www.instagram.com/tryvex.tech/' },
  ] satisfies Red[],
} as const
