export async function cargarDespachosBodegaRango({
  supabase,
  fechaInicio,
  fechaFin,
  bodega = 'bayona',
  limite = 800,
}) {
  let consulta = supabase
    .from('bodega_despachos')
    .select('id, fecha, documento, bodega, usuario_nombre, creado_en, destino_tipo, bodega_destino, obra_destino, estado_traspaso, recibido_en, recibido_por, recepcion_id')
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(limite)

  if (bodega) consulta = consulta.eq('bodega', bodega)
  if (fechaInicio) consulta = consulta.gte('fecha', fechaInicio)
  if (fechaFin) consulta = consulta.lt('fecha', fechaFin)

  const { data: despachos, error } = await consulta

  if (error) {
    return { despachos: [], error }
  }

  const ids = (despachos || []).map((despacho) => despacho.id).filter(Boolean)
  if (ids.length === 0) {
    return { despachos: [], error: null }
  }

  const { data: items, error: errorItems } = await supabase
    .from('bodega_despacho_items')
    .select('id, despacho_id, codigo_bodega, descripcion, unidad, cantidad, creado_en')
    .in('despacho_id', ids)

  if (errorItems) {
    return {
      despachos: (despachos || []).map((despacho) => ({ ...despacho, items: [] })),
      error: errorItems,
    }
  }

  const itemsPorDespacho = (items || []).reduce((mapa, item) => {
    mapa[item.despacho_id] = [...(mapa[item.despacho_id] || []), item]
    return mapa
  }, {})

  return {
    despachos: (despachos || []).map((despacho) => ({
      ...despacho,
      items: itemsPorDespacho[despacho.id] || [],
    })),
    error: null,
  }
}

export async function cargarTraspasosPendientesBodega({
  supabase,
  bodegaDestino,
  limite = 100,
}) {
  if (!bodegaDestino) return { traspasos: [], error: null }

  const { data: resultadoSeguro, error: errorSeguro } = await supabase.rpc(
    'cargar_traspasos_pendientes_bodega',
    {
      p_bodega_destino: bodegaDestino,
      p_limite: limite,
    }
  )

  if (!errorSeguro) {
    return {
      traspasos: (resultadoSeguro?.traspasos || []).map((despacho) => ({
        ...despacho,
        tipo_ingreso: 'traspaso_bodega',
        items: despacho.items || [],
      })),
      error: null,
    }
  }

  if (errorSeguro.code !== 'PGRST202' && !String(errorSeguro.message || '').includes('cargar_traspasos_pendientes_bodega')) {
    return { traspasos: [], error: errorSeguro }
  }

  const { data: despachos, error } = await supabase
    .from('bodega_despachos')
    .select('id, fecha, documento, bodega, usuario_nombre, creado_en, destino_tipo, bodega_destino, estado_traspaso')
    .eq('destino_tipo', 'bodega')
    .eq('bodega_destino', bodegaDestino)
    .eq('estado_traspaso', 'pendiente')
    .order('creado_en', { ascending: false })
    .limit(limite)

  if (error) return { traspasos: [], error }

  const ids = (despachos || []).map((despacho) => despacho.id).filter(Boolean)
  if (ids.length === 0) return { traspasos: [], error: null }

  const { data: items, error: errorItems } = await supabase
    .from('bodega_despacho_items')
    .select('id, despacho_id, codigo_bodega, descripcion, unidad, cantidad, creado_en')
    .in('despacho_id', ids)

  if (errorItems) return { traspasos: [], error: errorItems }

  const itemsPorDespacho = (items || []).reduce((mapa, item) => {
    mapa[item.despacho_id] = [...(mapa[item.despacho_id] || []), item]
    return mapa
  }, {})

  return {
    traspasos: (despachos || []).map((despacho) => ({
      ...despacho,
      tipo_ingreso: 'traspaso_bodega',
      items: itemsPorDespacho[despacho.id] || [],
    })),
    error: null,
  }
}

export async function guardarTraspasoBodega({
  supabase,
  inventarioOrigenId,
  fecha,
  documento,
  bodegaOrigen,
  bodegaDestino,
  usuarioNombre,
  items = [],
}) {
  const { data, error } = await supabase.rpc('crear_traspaso_bodega', {
    p_inventario_origen_id: inventarioOrigenId,
    p_fecha: fecha,
    p_documento: documento || '',
    p_bodega_origen: bodegaOrigen,
    p_bodega_destino: bodegaDestino,
    p_usuario_nombre: usuarioNombre || '',
    p_items: items,
  })

  return { despacho: data, error }
}

export async function recepcionarTraspasoBodega({
  supabase,
  despachoId,
  inventarioDestinoId,
  usuarioNombre,
}) {
  const { data, error } = await supabase.rpc('recepcionar_traspaso_bodega', {
    p_despacho_id: despachoId,
    p_inventario_destino_id: inventarioDestinoId,
    p_usuario_nombre: usuarioNombre || '',
  })

  return { resultado: data, error }
}

export async function guardarDespachoBodega({
  supabase,
  fecha,
  documento,
  bodega,
  obraDestino,
  usuarioNombre,
  items = [],
}) {
  const { data: despacho, error } = await supabase
    .from('bodega_despachos')
    .insert({
      fecha,
      documento: documento || '',
      bodega: bodega || '',
      destino_tipo: 'obra',
      obra_destino: obraDestino || '',
      usuario_nombre: usuarioNombre || '',
    })
    .select('id')
    .single()

  if (error) {
    return { despacho: null, error, etapa: 'cabecera' }
  }

  const filas = items.map((item) => ({
    despacho_id: despacho.id,
    codigo_bodega: item.codigo || '',
    descripcion: item.descripcion || '',
    unidad: item.unidad || '',
    cantidad: Number(item.cantidad || 0),
  }))

  if (filas.length === 0) {
    return { despacho, error: null, etapa: null }
  }

  const { error: errorItems } = await supabase
    .from('bodega_despacho_items')
    .insert(filas)

  if (errorItems) {
    return { despacho, error: errorItems, etapa: 'items' }
  }

  return { despacho, error: null, etapa: null }
}
