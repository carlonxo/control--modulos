import { createClient } from 'npm:@supabase/supabase-js@2'
import { sendPushBatch } from 'npm:@mmmike/web-push@1.0.1/send'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const rolesPorTipo: Record<string, string[]> = {
  solicitud_prueba: ['admin', 'control_calidad', 'operador'],
  solicitud_material: ['admin', 'operador', 'analista', 'bodega'],
  traspaso_bodega: ['bodega'],
}

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
    if (req.method !== 'POST') return responder({ error: 'Método no permitido' }, 405)

    try {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')
      const serviceRoleKey = obtenerClaveAdministrativa()
      const authorization = req.headers.get('Authorization') || ''
      const jwt = authorization.replace(/^Bearer\s+/i, '')
      const vapidPublicKey = Deno.env.get('PUSH_VAPID_PUBLIC_KEY')
      const vapidPrivateKey = Deno.env.get('PUSH_VAPID_PRIVATE_KEY')

      if (!supabaseUrl || !serviceRoleKey || !vapidPublicKey || !vapidPrivateKey) {
        return responder({ error: 'Falta configuración segura del servidor' }, 500)
      }
      if (!jwt) return responder({ error: 'Sesión requerida' }, 401)

      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { data: autenticacion, error: errorAutenticacion } = await admin.auth.getUser(jwt)
      const usuarioId = autenticacion?.user?.id
      if (errorAutenticacion || !usuarioId) return responder({ error: 'Sesión inválida' }, 401)

      const cuerpo = await req.json().catch(() => ({}))
      const tipo = String(cuerpo.tipo || '')
      const recursoId = String(cuerpo.recurso_id || '')
      if (!rolesPorTipo[tipo] || !recursoId) return responder({ error: 'Aviso inválido' }, 400)

      const { data: perfil } = await admin.from('perfiles').select('rol, nombre').eq('id', usuarioId).maybeSingle()
      const aviso = await prepararAviso({ admin, tipo, recursoId, usuarioId, rol: perfil?.rol || '' })
      if (!aviso) return responder({ error: 'El evento no existe o no pertenece al usuario' }, 403)
      const { targetBodega, ...contenidoAviso } = aviso as Record<string, any>

      const { data: eventoExistente } = await admin
        .from('push_eventos')
        .select('id')
        .eq('tipo', tipo)
        .eq('recurso_id', recursoId)
        .maybeSingle()
      if (eventoExistente) return responder({ ok: true, duplicado: true })

      const { data: perfiles, error: errorPerfiles } = await admin
        .from('perfiles')
        .select('id, bodega_asignada')
        .in('rol', rolesPorTipo[tipo])
      if (errorPerfiles) throw errorPerfiles

      const idsDestinatarios = (perfiles || [])
        .filter((item) => !targetBodega || normalizarBodega(item.bodega_asignada) === normalizarBodega(targetBodega))
        .map((item) => item.id)
        .filter((id) => id !== usuarioId)
      const { data: suscripciones, error: errorSuscripciones } = idsDestinatarios.length
        ? await admin
          .from('push_suscripciones')
          .select('endpoint, p256dh, auth')
          .in('usuario_id', idsDestinatarios)
          .eq('activa', true)
        : { data: [], error: null }
      if (errorSuscripciones) throw errorSuscripciones

      const destinos = (suscripciones || []).map((item) => ({
        endpoint: item.endpoint,
        keys: { p256dh: item.p256dh, auth: item.auth },
      }))

      let entregadas = 0
      if (destinos.length) {
        const resultado = await sendPushBatch(destinos, contenidoAviso, {
          publicKey: vapidPublicKey,
          privateKey: vapidPrivateKey,
          subject: 'https://control-modulos.vercel.app',
        }, {
          ttl: 86400,
          urgency: 'high',
          concurrency: 20,
        })
        entregadas = resultado.delivered

        const vencidas = resultado.gone
          .map((item) => typeof item === 'string' ? item : item.endpoint)
          .filter((endpoint): endpoint is string => Boolean(endpoint))
        if (vencidas.length) {
          await admin.from('push_suscripciones').delete().in('endpoint', vencidas)
        }
      }

      await admin.from('push_eventos').insert({
        tipo,
        recurso_id: recursoId,
        creado_por: usuarioId,
        destinatarios: destinos.length,
        entregadas,
      })

      return responder({ ok: true, destinatarios: destinos.length, entregadas })
    } catch (error) {
      console.error('enviar-notificacion-push', error)
      return responder({ error: error instanceof Error ? error.message : 'Error inesperado' }, 500)
    }
  },
}

async function prepararAviso({ admin, tipo, recursoId, usuarioId, rol }: any) {
  if (tipo === 'solicitud_prueba') {
    const { data: modulo } = await admin
      .from('modulos')
      .select('id, serie, linea, solicitud_prueba, solicitado_por')
      .eq('id', recursoId)
      .maybeSingle()
    if (!modulo?.solicitud_prueba || (modulo.solicitado_por !== usuarioId && rol !== 'admin')) return null
    return {
      title: 'Prueba eléctrica pendiente',
      body: `Línea ${modulo.linea || '-'} · Serie ${modulo.serie || '-'}`,
      url: '/?push=prueba',
      tag: `prueba-${modulo.id}`,
    }
  }

  if (tipo === 'solicitud_material') {
    if (!['admin', 'operador', 'electrico'].includes(rol)) return null
    const { data: vale } = await admin
      .from('vales_bodega')
      .select('id, serie, solicitante_nombre, tipo_ingreso, estado_bodega')
      .eq('id', recursoId)
      .maybeSingle()
    if (!vale || vale.tipo_ingreso !== 'pedido_app' || !['solicitado', 'pendiente'].includes(vale.estado_bodega)) return null
    return {
      title: 'Nueva solicitud de material',
      body: `${vale.solicitante_nombre || 'Solicitante'} · Serie ${vale.serie || '-'}`,
      url: '/?push=material',
      tag: `material-${vale.id}`,
    }
  }

  if (tipo === 'traspaso_bodega') {
    if (!['admin', 'analista', 'bodega'].includes(rol)) return null
    const { data: despacho } = await admin
      .from('bodega_despachos')
      .select('id, documento, bodega, bodega_destino, destino_tipo, estado_traspaso')
      .eq('id', recursoId)
      .maybeSingle()
    if (!despacho || despacho.destino_tipo !== 'bodega' || despacho.estado_traspaso !== 'pendiente') return null
    return {
      title: 'Traspaso de material pendiente',
      body: `${nombreBodega(despacho.bodega)} → ${nombreBodega(despacho.bodega_destino)} · Documento ${despacho.documento || '-'}`,
      url: `/?push=traspaso&traspaso=${encodeURIComponent(despacho.id)}`,
      tag: `traspaso-${despacho.id}`,
      targetBodega: despacho.bodega_destino,
    }
  }

  return null
}

function normalizarBodega(valor: unknown) {
  return String(valor || '').trim().toLocaleLowerCase('es')
}

function nombreBodega(valor: unknown) {
  const codigo = normalizarBodega(valor)
  return codigo ? `Bodega ${codigo.charAt(0).toLocaleUpperCase('es')}${codigo.slice(1)}` : 'Bodega'
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
