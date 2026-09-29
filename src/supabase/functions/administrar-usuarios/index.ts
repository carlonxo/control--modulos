import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rolesPermitidos = new Set([
  'admin',
  'operador',
  'colaborador',
  'control_calidad',
  'electrico',
  'analista',
  'bodega',
  'supervisor',
  'visor',
])

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = obtenerClaveAdministrativa()
      const authorization = req.headers.get('Authorization') || ''
      const jwt = authorization.replace(/^Bearer\s+/i, '')

      if (!supabaseUrl || !serviceRoleKey) return responder({ error: 'Falta configuración segura del servidor' }, 500)
      if (!jwt) return responder({ error: 'Sesión requerida' }, 401)

      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: autenticacion, error: errorAutenticacion } = await admin.auth.getUser(jwt)
      const administradorId = autenticacion?.user?.id
      if (errorAutenticacion || !administradorId) return responder({ error: 'Sesión inválida' }, 401)

      const { data: perfilAdministrador, error: errorPerfil } = await admin
        .from('perfiles')
        .select('rol')
        .eq('id', administradorId)
        .maybeSingle()

      if (errorPerfil || perfilAdministrador?.rol !== 'admin') {
        return responder({ error: 'Solo un administrador puede gestionar usuarios' }, 403)
      }

      const cuerpo = await req.json().catch(() => ({}))

      if (cuerpo.accion === 'listar') {
      const [{ data: perfiles, error: errorPerfiles }, { data: usuariosAuth, error: errorAuth }] = await Promise.all([
        admin.from('perfiles').select('id, nombre, rol, bodega_asignada, planta_asignada').order('nombre'),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ])

      if (errorPerfiles) throw errorPerfiles
      if (errorAuth) throw errorAuth

      const authPorId = new Map((usuariosAuth?.users || []).map((usuario) => [usuario.id, usuario]))
      const perfilesPorId = new Map((perfiles || []).map((perfil) => [perfil.id, perfil]))
      const ids = new Set([...authPorId.keys(), ...perfilesPorId.keys()])
      const ahora = Date.now()
      const usuarios = [...ids].map((id) => {
        const perfil = perfilesPorId.get(id) || {}
        const cuenta = authPorId.get(id)
        const vencimientoBloqueo = cuenta?.banned_until ? new Date(cuenta.banned_until).getTime() : 0
        return {
          id,
          nombre: perfil.nombre || cuenta?.user_metadata?.nombre || cuenta?.user_metadata?.name || '',
          email: cuenta?.email || '',
          rol: perfil.rol || 'visor',
          bodega_asignada: perfil.bodega_asignada || null,
          planta_asignada: perfil.planta_asignada || null,
          bloqueado: vencimientoBloqueo > ahora,
          ultimo_ingreso: cuenta?.last_sign_in_at || null,
          creado_en: cuenta?.created_at || null,
        }
      }).sort((a, b) => String(a.nombre || a.email).localeCompare(String(b.nombre || b.email), 'es'))

        return responder({ usuarios })
      }

      if (cuerpo.accion === 'crear') {
      const nombre = String(cuerpo.nombre || '').trim()
      const email = String(cuerpo.email || '').trim().toLowerCase()
      const password = String(cuerpo.password || '')
      const rol = validarRol(cuerpo.rol)
      if (!nombre || !email || password.length < 8) {
        return responder({ error: 'Nombre, correo y contraseña temporal de al menos 8 caracteres son obligatorios' }, 400)
      }

      const { data: nuevaCuenta, error: errorCreacion } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nombre },
      })
      if (errorCreacion || !nuevaCuenta.user) throw errorCreacion || new Error('No se pudo crear la cuenta')

      const { error: errorPerfilNuevo } = await admin.from('perfiles').upsert({
        id: nuevaCuenta.user.id,
        nombre,
        rol,
        bodega_asignada: valorOpcional(cuerpo.bodega_asignada),
        planta_asignada: valorOpcional(cuerpo.planta_asignada),
      })

      if (errorPerfilNuevo) {
        await admin.auth.admin.deleteUser(nuevaCuenta.user.id)
        throw errorPerfilNuevo
      }

        return responder({ usuarioId: nuevaCuenta.user.id }, 201)
      }

      if (cuerpo.accion === 'actualizar') {
      const usuarioId = String(cuerpo.usuarioId || '')
      if (!usuarioId) return responder({ error: 'Falta identificar al usuario' }, 400)
      if (usuarioId === administradorId && cuerpo.rol && cuerpo.rol !== 'admin') {
        return responder({ error: 'No puedes retirar tu propio rol de administrador' }, 400)
      }

      const cambios: Record<string, string | null> = {}
      if ('rol' in cuerpo) cambios.rol = validarRol(cuerpo.rol)
      if ('bodega_asignada' in cuerpo) cambios.bodega_asignada = valorOpcional(cuerpo.bodega_asignada)
      if ('planta_asignada' in cuerpo) cambios.planta_asignada = valorOpcional(cuerpo.planta_asignada)
      if ('nombre' in cuerpo) cambios.nombre = String(cuerpo.nombre || '').trim()

      const { error } = await admin.from('perfiles').update(cambios).eq('id', usuarioId)
      if (error) throw error
        return responder({ ok: true })
      }

      if (cuerpo.accion === 'bloquear' || cuerpo.accion === 'reactivar') {
      const usuarioId = String(cuerpo.usuarioId || '')
      if (!usuarioId) return responder({ error: 'Falta identificar al usuario' }, 400)
      if (usuarioId === administradorId) return responder({ error: 'No puedes bloquear tu propia cuenta' }, 400)

      const bloquear = cuerpo.accion === 'bloquear'
      const { error } = await admin.auth.admin.updateUserById(usuarioId, {
        ban_duration: bloquear ? '876000h' : 'none',
      })
      if (error) throw error
        return responder({ ok: true, bloqueado: bloquear })
      }

      return responder({ error: 'Acción desconocida' }, 400)
    } catch (error) {
      console.error('administrar-usuarios', error)
      return responder({ error: error instanceof Error ? error.message : 'Error inesperado' }, 500)
    }
  },
}

function validarRol(valor: unknown) {
  const rol = String(valor || 'visor')
  if (!rolesPermitidos.has(rol)) throw new Error('El rol indicado no es válido')
  return rol
}

function valorOpcional(valor: unknown) {
  const texto = String(valor || '').trim()
  return texto || null
}

function obtenerClaveAdministrativa() {
  const clavesNuevas = Deno.env.get('SUPABASE_SECRET_KEYS')
  if (clavesNuevas) {
    try {
      const claves = JSON.parse(clavesNuevas)
      if (claves?.default) return claves.default
    } catch {
      console.warn('SUPABASE_SECRET_KEYS no contiene JSON válido; se usará la clave heredada')
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
}

function responder(contenido: unknown, estado = 200) {
  return new Response(JSON.stringify(contenido), {
    status: estado,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  })
}
