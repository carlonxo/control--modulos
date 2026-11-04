const prefijoCache = 'control-modulos-cache'

function claveCompleta(clave) {
  return `${prefijoCache}:${clave}`
}

export function leerCacheDatos(clave, duracionMs) {
  if (typeof window === 'undefined' || !clave) return null
  try {
    const guardado = JSON.parse(window.localStorage.getItem(claveCompleta(clave)) || 'null')
    if (!guardado || typeof guardado !== 'object') return null
    if (!guardado.guardadoEn || Date.now() - guardado.guardadoEn > duracionMs) {
      window.localStorage.removeItem(claveCompleta(clave))
      return null
    }
    return guardado.datos ?? null
  } catch {
    return null
  }
}

export function guardarCacheDatos(clave, datos) {
  if (typeof window === 'undefined' || !clave) return
  try {
    window.localStorage.setItem(claveCompleta(clave), JSON.stringify({
      guardadoEn: Date.now(),
      datos,
    }))
  } catch {
    // Si el navegador no permite almacenamiento, la app continúa usando Supabase.
  }
}

export function eliminarCacheDatos(clave) {
  if (typeof window === 'undefined' || !clave) return
  try {
    window.localStorage.removeItem(claveCompleta(clave))
  } catch {
    // Sin acción: la siguiente carga volverá a consultar Supabase.
  }
}
