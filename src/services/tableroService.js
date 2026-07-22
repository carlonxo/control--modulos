export async function cargarPerfilUsuario({ supabase, usuarioId }) {
  if (!usuarioId) return { data: null, error: null }

  return supabase
    .from('perfiles')
    .select('*')
    .eq('id', usuarioId)
    .maybeSingle()
}

export async function cargarDatosTablero({ supabase, esSolicitudPruebaActiva }) {
  const { data: tableroData, error: tableroError } = await supabase
    .from('tablero')
    .select('*')
    .order('linea')
    .order('posicion')

  if (tableroError) {
    return { data: [], error: tableroError }
  }

  let { data: modulosData, error: modulosError } = await supabase
    .from('modulos')
    .select('id, nota, observacion_alerta, fecha_prueba_electrica')

  if (modulosError?.message?.includes('observacion_alerta')) {
    ;({ data: modulosData, error: modulosError } = await supabase
      .from('modulos')
      .select('id, nota, fecha_prueba_electrica'))
  }

  if (modulosError) {
    return { data: [], error: modulosError }
  }

  const modulosMap = new Map((modulosData || []).map((item) => [item.id, item]))
  const data = (tableroData || []).map((row) => ({
    ...row,
    nota: row.nota || modulosMap.get(row.id)?.nota || '',
    observacion_alerta: row.observacion_alerta || modulosMap.get(row.id)?.observacion_alerta || '',
    fecha_prueba_electrica: row.fecha_prueba_electrica || modulosMap.get(row.id)?.fecha_prueba_electrica || null,
    solicitud_prueba: esSolicitudPruebaActiva(row.solicitud_prueba),
  }))

  return { data, error: null }
}

export async function cargarSolicitantesPruebaPendiente({ supabase, idsModulos }) {
  if (!idsModulos?.length) {
    return { data: {}, error: null }
  }

  const { data: modulos, error: errorModulos } = await supabase
    .from('modulos')
    .select('id, solicitado_por')
    .in('id', idsModulos)

  if (errorModulos) {
    return { data: {}, error: errorModulos }
  }

  const idsPerfiles = [...new Set(
    (modulos || []).map((modulo) => modulo.solicitado_por).filter(Boolean)
  )]

  if (idsPerfiles.length === 0) {
    return { data: {}, error: null }
  }

  const { data: perfiles, error: errorPerfiles } = await supabase
    .from('perfiles')
    .select('id, nombre')
    .in('id', idsPerfiles)

  if (errorPerfiles) {
    return { data: {}, error: errorPerfiles }
  }

  const nombresPorPerfil = new Map(
    (perfiles || []).map((perfilSolicitante) => [perfilSolicitante.id, perfilSolicitante.nombre])
  )

  return {
    data: Object.fromEntries(
      (modulos || []).map((modulo) => [
        modulo.id,
        nombresPorPerfil.get(modulo.solicitado_por) || 'No disponible',
      ])
    ),
    error: null,
  }
}
