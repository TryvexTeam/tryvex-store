/**
 * Enlace de WhatsApp con mensaje precargado. El número sale de la
 * configuración de la tienda (Panel → Ajustes), igual que en el resto del
 * sitio; sin número configurado devuelve `null` y quien lo usa decide el
 * respaldo (por ejemplo, /contacto).
 */
export function enlaceWhatsapp(numero: string | null | undefined, texto?: string): string | null {
  const digitos = numero?.replace(/\D/g, '') ?? ''
  if (!digitos) return null
  return texto ? `https://wa.me/${digitos}?text=${encodeURIComponent(texto)}` : `https://wa.me/${digitos}`
}
