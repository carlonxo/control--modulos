import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Falta configurar VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en el entorno de publicación.')
}

validarUrlSupabase(supabaseUrl)

if (obtenerRolJwt(supabaseKey) === 'service_role') {
  throw new Error('Configuración insegura: nunca se debe publicar una clave service_role dentro de la aplicación.')
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)

function obtenerRolJwt(token = '') {
  try {
    const segmento = String(token).split('.')[1]
    if (!segmento) return ''
    const base64 = segmento.replace(/-/g, '+').replace(/_/g, '/')
    return JSON.parse(window.atob(base64)).role || ''
  } catch {
    return ''
  }
}

function validarUrlSupabase(valor) {
  try {
    const url = new URL(valor)
    const esLocal = ['localhost', '127.0.0.1'].includes(url.hostname)
    if (url.protocol !== 'https:' && !esLocal) throw new Error('protocolo inseguro')
  } catch {
    throw new Error('VITE_SUPABASE_URL no es una dirección válida o segura.')
  }
}
