import type { SileoPosition } from 'sileo'

/**
 * Notificaciones de la tienda y del panel, sobre Sileo.
 *
 * Sileo + su librería de animación pesan ~47 KB comprimidos: demasiado para
 * cargarlos en cada página solo por si alguna vez hay algo que avisar. Por eso
 * NO se importa en el paquete inicial: `notificar.*` carga Sileo la primera vez
 * que se usa y monta el contenedor en ese momento (`ContenedorNotificaciones`).
 *
 * También anuncia cada aviso en una región viva para lectores de pantalla: una
 * confirmación que solo existe como forma y color en pantalla no existe para
 * quien no la ve.
 *
 * Solo para componentes de cliente.
 */

export interface Notificacion {
  titulo: string
  descripcion?: string
  /** Un botón de acción (por ejemplo «Ver bolsa»). */
  accion?: { titulo: string; alPulsar: () => void }
  /** Milisegundos; `null` = no se cierra sola. */
  duracion?: number | null
  posicion?: SileoPosition
}

type Tipo = 'success' | 'error' | 'warning' | 'info' | 'action'

/** Posición por defecto: abajo al centro en la tienda, arriba al centro en el panel. */
function posicionPorDefecto(): SileoPosition {
  return typeof location !== 'undefined' && location.pathname.startsWith('/panel') ? 'top-center' : 'bottom-center'
}

let montar: (() => void) | null = null
let anunciar: ((texto: string) => void) | null = null
let avisarMontado: (() => void) | null = null
let carga: Promise<typeof import('sileo')> | null = null
/** Alguien pidió montar el toaster antes de que el contenedor estuviera conectado. */
let montajePendiente = false

/** La usa ContenedorNotificaciones para que `notificar` pueda pedirle que monte Sileo. */
export function conectarContenedor(api: { montar: () => void; anunciar: (texto: string) => void } | null): void {
  montar = api?.montar ?? null
  anunciar = api?.anunciar ?? null
  // Un aviso lanzado durante la hidratación pidió montar cuando nadie escuchaba: se atiende ahora.
  // Sin esto, la promesa de montaje no se resolvía nunca y ningún aviso salía en esa sesión.
  if (api && montajePendiente) {
    montajePendiente = false
    api.montar()
  }
}

/** La llama el toaster cuando ya está en pantalla. */
export function toasterMontado(): void {
  avisarMontado?.()
}

function cargar(): Promise<typeof import('sileo')> {
  if (!carga) {
    const montado = new Promise<void>((resolver) => {
      avisarMontado = resolver
    })
    if (montar) montar()
    else montajePendiente = true
    carga = Promise.all([import('sileo'), montado]).then(([modulo]) => modulo)
    // Si algo falla (sin red para bajar el código), la próxima vez se reintenta.
    carga.catch(() => {
      carga = null
    })
  }
  return carga
}

async function emitir(tipo: Tipo, n: Notificacion): Promise<void> {
  anunciar?.(n.descripcion ? `${n.titulo}. ${n.descripcion}` : n.titulo)
  try {
    const { sileo } = await cargar()
    sileo[tipo]({
      title: n.titulo,
      description: n.descripcion,
      position: n.posicion ?? posicionPorDefecto(),
      duration: n.duracion,
      button: n.accion ? { title: n.accion.titulo, onClick: n.accion.alPulsar } : undefined,
    })
  } catch {
    // Un aviso que no se puede mostrar nunca debe romper la acción que lo originó.
  }
}

export const notificar = {
  ok: (titulo: string, descripcion?: string) => emitir('success', { titulo, descripcion, duracion: 3200 }),
  /** Un error se lee más despacio que una confirmación. */
  error: (titulo: string, descripcion?: string) => emitir('error', { titulo, descripcion, duracion: 6500 }),
  aviso: (titulo: string, descripcion?: string) => emitir('warning', { titulo, descripcion, duracion: 5000 }),
  info: (titulo: string, descripcion?: string) => emitir('info', { titulo, descripcion, duracion: 4000 }),
  /** Con botón: por ejemplo «Agregado a tu bolsa · Ver bolsa». */
  accion: (n: Notificacion) => emitir('action', { duracion: 5000, ...n }),
}
