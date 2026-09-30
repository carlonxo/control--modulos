import serviceWorkerUrl from '../pushNotificationsSw.js?url&no-inline'

const VAPID_PUBLIC_KEY = 'BARe9X_YDTNxgJ4dP3ScsTzyDTfFCTLm1MeKUg1k8Mt1zOU97YqwVIx1WOBwhi90ou30BjZaGVVXFA0KqhjTffM'

export function navegadorAdmiteNotificacionesPush() {
  return Boolean(
    window.isSecureContext &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

export async function consultarEstadoNotificacionesPush() {
  if (!navegadorAdmiteNotificacionesPush()) return 'no-compatible'
  if (Notification.permission === 'denied') return 'denegada'
  if (Notification.permission !== 'granted') return 'inactiva'

  try {
    const registro = await registrarServicioNotificaciones()
    const suscripcion = await registro.pushManager.getSubscription()
    return suscripcion ? 'activa' : 'inactiva'
  } catch (error) {
    console.error('No se pudo consultar la suscripción push.', error)
    return 'error'
  }
}

export async function activarNotificacionesPush({ supabase, usuarioId }) {
  if (!usuarioId) return { estado: 'error', error: new Error('No se pudo identificar al usuario.') }
  if (!navegadorAdmiteNotificacionesPush()) {
    return { estado: 'no-compatible', error: new Error('Este navegador no admite notificaciones push.') }
  }

  const permiso = await Notification.requestPermission()
  if (permiso !== 'granted') {
    return {
      estado: permiso === 'denied' ? 'denegada' : 'inactiva',
      error: permiso === 'denied' ? new Error('El teléfono bloqueó las notificaciones para este sitio.') : null,
    }
  }

  try {
    const registro = await registrarServicioNotificaciones()
    let suscripcion = await registro.pushManager.getSubscription()

    if (suscripcion && !coincideClaveAplicacion(suscripcion.options?.applicationServerKey, VAPID_PUBLIC_KEY)) {
      await suscripcion.unsubscribe()
      suscripcion = null
    }

    if (!suscripcion) {
      suscripcion = await registro.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertirBase64Url(VAPID_PUBLIC_KEY),
      })
    }

    const serializada = suscripcion.toJSON()
    const { error } = await supabase.rpc('registrar_suscripcion_push', {
      p_endpoint: serializada.endpoint,
      p_p256dh: serializada.keys?.p256dh || '',
      p_auth: serializada.keys?.auth || '',
      p_dispositivo: navigator.userAgent.slice(0, 500),
    })

    if (error) throw error
    return { estado: 'activa', error: null }
  } catch (error) {
    return { estado: 'error', error }
  }
}

export async function desactivarNotificacionesPush({ supabase }) {
  if (!navegadorAdmiteNotificacionesPush()) return { estado: 'no-compatible', error: null }

  try {
    const registro = await registrarServicioNotificaciones()
    const suscripcion = await registro.pushManager.getSubscription()
    if (suscripcion) {
      await supabase.rpc('eliminar_suscripcion_push', { p_endpoint: suscripcion.endpoint })
      await suscripcion.unsubscribe()
    }
    return { estado: 'inactiva', error: null }
  } catch (error) {
    return { estado: 'error', error }
  }
}

export async function enviarEventoPush({ supabase, tipo, recursoId }) {
  if (!tipo || !recursoId) return { error: null }
  const { error } = await supabase.functions.invoke('enviar-notificacion-push', {
    body: { tipo, recurso_id: recursoId },
  })
  if (error) console.warn('El registro se guardó, pero no se pudo enviar la notificación móvil.', error)
  return { error }
}

async function registrarServicioNotificaciones() {
  const registro = await navigator.serviceWorker.register(serviceWorkerUrl)
  const trabajador = registro.installing || registro.waiting
  if (!registro.active && trabajador) {
    await new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('El servicio de notificaciones tardó demasiado en activarse.')), 10000)
      trabajador.addEventListener('statechange', () => {
        if (trabajador.state !== 'activated') return
        window.clearTimeout(timeout)
        resolve()
      })
    })
  }
  return registro
}

function convertirBase64Url(valor) {
  const relleno = '='.repeat((4 - (valor.length % 4)) % 4)
  const base64 = (valor + relleno).replace(/-/g, '+').replace(/_/g, '/')
  const binario = window.atob(base64)
  return Uint8Array.from(binario, (caracter) => caracter.charCodeAt(0))
}

function coincideClaveAplicacion(claveActual, claveEsperada) {
  if (!claveActual) return true
  const actual = new Uint8Array(claveActual)
  const esperada = convertirBase64Url(claveEsperada)
  return actual.length === esperada.length && actual.every((valor, indice) => valor === esperada[indice])
}
