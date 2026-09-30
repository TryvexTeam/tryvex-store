/**
 * Espera a que el service worker de ESTE registro esté activo.
 *
 * Reemplaza a `navigator.serviceWorker.ready`, que solo se resuelve si alguna
 * registración cubre la URL de la página actual. El panel registra su worker con
 * alcance `/panel/` (con barra final) pero su portada vive en `/panel` (sin barra,
 * Next quita la barra final), que queda fuera: ahí `ready` no se resuelve nunca y
 * el botón «Activar avisos» se quedaba cargando hasta el límite de tiempo.
 * Comprobado en un navegador real: fuera del alcance `ready` se cuelga; dentro, no.
 *
 * Esperar el worker del propio registro no depende de en qué página se esté.
 */
export function esperarWorkerActivo(registro: ServiceWorkerRegistration, limiteMs = 10_000): Promise<ServiceWorker> {
  return new Promise((resolver, rechazar) => {
    const worker = registro.installing ?? registro.waiting ?? registro.active
    if (!worker) {
      rechazar(new Error('sin-worker'))
      return
    }
    if (worker.state === 'activated') {
      resolver(worker)
      return
    }

    const terminar = () => {
      clearTimeout(reloj)
      worker.removeEventListener('statechange', alCambiar)
    }
    const alCambiar = () => {
      if (worker.state === 'activated') {
        terminar()
        resolver(worker)
      } else if (worker.state === 'redundant') {
        terminar()
        rechazar(new Error('worker-redundante'))
      }
    }
    const reloj = setTimeout(() => {
      terminar()
      rechazar(new Error('worker-tiempo'))
    }, limiteMs)

    worker.addEventListener('statechange', alCambiar)
  })
}

/**
 * Explica en una frase qué falló al activar los avisos, según lo que el
 * navegador informó. «Hubo un error» no le sirve a quien tiene que arreglarlo.
 */
export function explicarFalloDeAvisos(e: unknown): string {
  const nombre = e instanceof DOMException || e instanceof Error ? e.name : ''
  const mensaje = e instanceof Error ? e.message : ''

  if (mensaje === 'tiempo')
    return 'El servicio de avisos del navegador no respondió. Suele ser la red (un filtro o firewall que bloquea las notificaciones de Google, Apple o Mozilla). Prueba con otra conexión, como los datos del teléfono.'
  if (mensaje === 'worker-tiempo' || mensaje === 'worker-redundante' || mensaje === 'sin-worker')
    return 'No se pudo preparar la app de avisos en este navegador. Recarga la página e intenta de nuevo.'
  if (nombre === 'NotAllowedError') return 'El navegador bloqueó el permiso de notificaciones. Habilítalo en los ajustes del sitio y vuelve a intentar.'
  if (nombre === 'AbortError')
    return 'El navegador no pudo conectarse al servicio de avisos. En Brave hay que activar «Usar servicios de Google para mensajes push» en los ajustes; en otros navegadores, revisa que la red no lo bloquee.'
  if (nombre === 'InvalidAccessError' || nombre === 'InvalidCharacterError')
    return 'La clave de los avisos no es válida en este entorno. Avísale al equipo de desarrollo.'
  return 'Este navegador no permitió activar los avisos.'
}
