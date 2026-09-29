export async function cargarSolicitantePrueba({ supabase, idSolicitante, moduloId }) {
  let solicitanteId = idSolicitante

  if (!solicitanteId && moduloId) {
    const { data: modulo, error: errorModulo } = await supabase
      .from('modulos')
      .select('solicitado_por')
      .eq('id', moduloId)
      .single()

    if (errorModulo) {
      return { data: null, error: errorModulo }
    }

    solicitanteId = modulo?.solicitado_por
  }

  if (!solicitanteId) {
    return { data: null, error: null }
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', solicitanteId)
    .single()

  return { data, error }
}

export async function obtenerNombrePerfilPorId({ supabase, idPerfil }) {
  if (!idPerfil) return { data: null, error: null }

  return supabase
    .from('perfiles')
    .select('nombre')
    .eq('id', idPerfil)
    .maybeSingle()
}

export async function cargarUsuariosBodega({ supabase }) {
  const resultadoAdministrativo = await invocarAdministracionUsuarios({
    supabase,
    accion: 'listar',
  })

  if (!resultadoAdministrativo.error) {
    return { data: resultadoAdministrativo.data?.usuarios || [], error: null }
  }

  // Compatibilidad temporal mientras se publica la Edge Function.
  const consultaCompleta = await supabase
    .from('perfiles')
    .select('id, nombre, rol, bodega_asignada, planta_asignada')
    .order('nombre', { ascending: true })

  if (!consultaCompleta.error) {
    return { data: consultaCompleta.data || [], error: null }
  }

  if (!String(consultaCompleta.error.message || '').includes('planta_asignada')) {
    return { data: [], error: consultaCompleta.error }
  }

  const consultaSinPlanta = await supabase
    .from('perfiles')
    .select('id, nombre, rol, bodega_asignada')
    .order('nombre', { ascending: true })

  return {
    data: (consultaSinPlanta.data || []).map((usuario) => ({
      ...usuario,
      planta_asignada: null,
    })),
    error: consultaSinPlanta.error,
  }
}

export async function crearUsuarioAdministrado({ supabase, usuario }) {
  return invocarAdministracionUsuarios({
    supabase,
    accion: 'crear',
    payload: usuario,
  })
}

export async function actualizarUsuarioAdministrado({ supabase, usuarioId, cambios }) {
  const resultado = await invocarAdministracionUsuarios({
    supabase,
    accion: 'actualizar',
    payload: { usuarioId, ...cambios },
  })

  if (!resultado.error) return resultado

  // Conserva la edición de perfiles durante la publicación inicial de la función.
  const { error } = await supabase
    .from('perfiles')
    .update(cambios)
    .eq('id', usuarioId)

  return { data: error ? null : { ok: true }, error }
}

export async function cambiarEstadoUsuarioAdministrado({ supabase, usuarioId, bloquear }) {
  return invocarAdministracionUsuarios({
    supabase,
    accion: bloquear ? 'bloquear' : 'reactivar',
    payload: { usuarioId },
  })
}

async function invocarAdministracionUsuarios({ supabase, accion, payload = {} }) {
  const { data, error } = await supabase.functions.invoke('administrar-usuarios', {
    body: { accion, ...payload },
  })

  if (!error && data?.error) {
    return { data: null, error: new Error(data.error) }
  }

  return { data, error }
}

export async function actualizarBodegaAsignadaUsuario({
  supabase,
  usuarioId,
  bodegaAsignada,
}) {
  if (!usuarioId) return { error: new Error('Falta usuario para actualizar') }

  const { error } = await supabase
    .from('perfiles')
    .update({ bodega_asignada: bodegaAsignada || null })
    .eq('id', usuarioId)

  return { error }
}

export async function actualizarPlantaAsignadaUsuario({
  supabase,
  usuarioId,
  plantaAsignada,
}) {
  if (!usuarioId) return { error: new Error('Falta usuario para actualizar') }

  const { error } = await supabase
    .from('perfiles')
    .update({ planta_asignada: plantaAsignada || null })
    .eq('id', usuarioId)

  return { error }
}
