export async function cargarCodigosBarraBodega({ supabase }) {
  const { data, error } = await supabase
    .from('bodega_codigos_barra')
    .select('id, codigo_bodega, codigo_barra, descripcion, created_at')
    .order('codigo_bodega', { ascending: true })
    .order('codigo_barra', { ascending: true })

  if (error) {
    return { codigos: [], error }
  }

  return {
    codigos: (data || []).map(normalizarCodigoBarraBodega),
    error: null,
  }
}

export async function guardarCodigoBarraBodega({
  supabase,
  codigoBodega,
  codigoBarra,
  descripcion = '',
}) {
  const codigoBodegaLimpio = String(codigoBodega || '').trim()
  const codigoBarraLimpio = String(codigoBarra || '').trim()

  if (!codigoBodegaLimpio || !codigoBarraLimpio) {
    return { data: null, error: new Error('Debes indicar código bodega y código de barra.') }
  }

  const payload = {
    codigo_bodega: codigoBodegaLimpio,
    codigo_barra: codigoBarraLimpio,
    descripcion: String(descripcion || '').trim() || null,
  }

  const { error } = await supabase
    .from('bodega_codigos_barra')
    .upsert(payload, { onConflict: 'codigo_barra' })

  return {
    data: normalizarCodigoBarraBodega(payload),
    error,
  }
}

export async function eliminarCodigoBarraBodega({ supabase, id }) {
  if (!id) return { error: new Error('No se encontró el código de barra para eliminar.') }

  return supabase
    .from('bodega_codigos_barra')
    .delete()
    .eq('id', id)
}

function normalizarCodigoBarraBodega(item = {}) {
  return {
    id: item.id,
    codigoBodega: item.codigo_bodega || '',
    codigoBarra: item.codigo_barra || '',
    descripcion: item.descripcion || '',
    createdAt: item.created_at || '',
  }
}
