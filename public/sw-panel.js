/*
 * Service worker de la app del panel.
 *
 * Solo hace dos cosas: mostrar los avisos push que manda el servidor (una
 * venta pagada, un aviso de prueba) y, al tocarlos, llevar al lugar del panel
 * que corresponde. No guarda nada en caché: el panel muestra datos vivos y una
 * copia vieja de un pedido sería peor que no mostrar nada.
 *
 * Se registra con alcance `/panel/`, así que no toca la tienda.
 */

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))

self.addEventListener('push', (evento) => {
  let aviso = {}
  try {
    aviso = evento.data ? evento.data.json() : {}
  } catch {
    aviso = { cuerpo: evento.data ? evento.data.text() : '' }
  }

  const titulo = aviso.titulo || 'Tryvex'
  evento.waitUntil(
    self.registration.showNotification(titulo, {
      body: aviso.cuerpo || '',
      icon: '/app-panel/icono-192.png',
      badge: '/app-panel/insignia-96.png',
      // Foto del producto vendido: Android la muestra al expandir el aviso.
      // Solo https, para que un aviso no pueda apuntar a cualquier cosa.
      image: typeof aviso.imagen === 'string' && aviso.imagen.startsWith('https://') ? aviso.imagen : undefined,
      // Botón directo al pedido (Android y escritorio; iPhone no muestra botones).
      actions: [{ action: 'ver', title: 'Ver pedido' }],
      tag: aviso.etiqueta || undefined,
      // Una venta nueva con la misma etiqueta vuelve a sonar en vez de
      // reemplazarse en silencio.
      renotify: Boolean(aviso.etiqueta),
      vibrate: [80, 40, 80, 40, 160],
      timestamp: Date.now(),
      data: { url: aviso.url || '/panel' },
    })
  )
})

// Tocar el aviso o su botón «Ver pedido» lleva al mismo lugar: el pedido.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()
  // Solo rutas del propio panel: el aviso no puede mandar a otro sitio.
  const pedida = (evento.notification.data && evento.notification.data.url) || '/panel'
  const destino = new URL(pedida.startsWith('/panel') ? pedida : '/panel', self.location.origin).href

  evento.waitUntil(
    (async () => {
      const ventanas = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const abierta = ventanas.find((v) => new URL(v.url).pathname.startsWith('/panel'))
      if (abierta) {
        await abierta.focus()
        return abierta.navigate(destino)
      }
      return self.clients.openWindow(destino)
    })()
  )
})
