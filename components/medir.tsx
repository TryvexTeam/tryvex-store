'use client'

import { useEffect } from 'react'
import { rastrear, type EventoEstandar, type ParametrosEvento } from '@/lib/meta-pixel'

/**
 * Dispara un evento de Meta al mostrarse. Sirve para páginas de servidor
 * (ficha, landing, gracias), que no pueden llamar al pixel por sí mismas.
 *
 * `unaVez`: clave para no repetir el evento al recargar la página. La compra
 * confirmada la usa con el número de pedido: recargar «gracias» no es otra
 * venta. El mismo número va como `eventID`, que es lo que necesitará la
 * Conversions API para no contar dos veces la compra del navegador y la del
 * servidor.
 */
export function Medir({ evento, parametros, eventID, unaVez }: { evento: EventoEstandar; parametros: ParametrosEvento; eventID?: string; unaVez?: string }) {
  const firma = JSON.stringify(parametros)
  useEffect(() => {
    if (unaVez) {
      try {
        const clave = `tryvex.medido.${unaVez}`
        if (localStorage.getItem(clave)) return
        localStorage.setItem(clave, '1')
      } catch {
        // Sin almacenamiento se mide igual: mejor un duplicado posible que perder la venta.
      }
    }
    rastrear(evento, JSON.parse(firma) as ParametrosEvento, eventID)
  }, [evento, firma, eventID, unaVez])
  return null
}
