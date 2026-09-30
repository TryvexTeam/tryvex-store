/**
 * Redes de Tryvex Store y de Tryvex Tech, el estudio de desarrollo.
 * Son de marca, no de configuración: cambian casi nunca y con un despliegue basta.
 */
export interface Red {
  red: 'tiktok' | 'instagram' | 'web'
  nombre: string
  usuario: string
  href: string
}

export const REDES_TIENDA: readonly Red[] = [
  { red: 'instagram', nombre: 'Instagram', usuario: '@tryvexstore.cl', href: 'https://www.instagram.com/tryvexstore.cl/' },
  { red: 'tiktok', nombre: 'TikTok', usuario: '@tryvexstore', href: 'https://www.tiktok.com/@tryvexstore' },
]

export const TRYVEX_TECH = {
  sitio: 'https://www.tryvex.tech/',
  redes: [
    { red: 'web', nombre: 'Sitio web', usuario: 'tryvex.tech', href: 'https://www.tryvex.tech/' },
    { red: 'web', nombre: 'Todos los enlaces', usuario: 'tryvex.tech/links', href: 'https://www.tryvex.tech/links/' },
    { red: 'instagram', nombre: 'Instagram', usuario: '@tryvex.tech', href: 'https://www.instagram.com/tryvex.tech/' },
  ] satisfies Red[],
} as const
