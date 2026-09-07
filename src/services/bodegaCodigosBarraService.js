export async function cargarCodigosBarraBodega({ supabase }) {
  let respuesta = await supabase
    .from('bodega_codigos_barra')
    .select('id, codigo_bodega, codigo_barra, descripcion, cantidad_por_escaneo, created_at')
    .order('codigo_bodega', { ascending: true })
    .order('codigo_barra', { ascending: true })

  if (respuesta.error?.message?.includes('cantidad_por_escaneo')) {
    respuesta = await supabase
      .from('bodega_codigos_barra')
      .select('id, codigo_bodega, codigo_barra, descripcion, created_at')
      .order('codigo_bodega', { ascending: true })
      .order('codigo_barra', { ascending: true })
  }

  if (respuesta.error) {
    return { codigos: [], error: respuesta.error }
  }

  return {
    codigos: (respuesta.data || []).map(normalizarCodigoBarraBodega),
    error: null,
  }
}

export async function guardarCodigoBarraBodega({
  supabase,
  id = '',
  codigoBodega,
  codigoBarra,
  descripcion = '',
  cantidadPorEscaneo = 1,
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
    cantidad_por_escaneo: normalizarCantidadPorEscaneo(cantidadPorEscaneo),
  }

  const respuesta = id
    ? await supabase
      .from('bodega_codigos_barra')
      .update(payload)
      .eq('id', id)
    : await supabase
      .from('bodega_codigos_barra')
      .upsert(payload, { onConflict: 'codigo_barra' })

  return {
    data: normalizarCodigoBarraBodega({ id, ...payload }),
    error: respuesta.error,
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
    cantidadPorEscaneo: normalizarCantidadPorEscaneo(item.cantidad_por_escaneo),
    createdAt: item.created_at || '',
  }
}

function normalizarCantidadPorEscaneo(valor) {
  const numero = Number(String(valor ?? 1).replace(',', '.'))
  return Number.isFinite(numero) && numero > 0 ? numero : 1
}
