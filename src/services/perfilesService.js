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
