self.addEventListener('push', (event) => {
  let mensaje
  try {
    mensaje = event.data?.json() || {}
  } catch {
    mensaje = { title: 'Control de Módulos', body: event.data?.text() || 'Tienes un nuevo aviso.' }
  }

  const titulo = mensaje.title || 'Control de Módulos'
  const opciones = {
    body: mensaje.body || 'Tienes un nuevo aviso.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: mensaje.tag || 'control-modulos',
    renotify: true,
    data: { url: mensaje.url || '/?push=avisos' },
  }

  event.waitUntil(self.registration.showNotification(titulo, opciones))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const destino = new URL(event.notification.data?.url || '/', self.location.origin).href

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (ventanas) => {
      const ventana = ventanas.find((cliente) => cliente.url.startsWith(self.location.origin))
      if (ventana) {
        await ventana.navigate(destino)
        return ventana.focus()
      }
      return self.clients.openWindow(destino)
    })
  )
})
