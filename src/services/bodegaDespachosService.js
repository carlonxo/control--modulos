export async function cargarDespachosBodegaRango({
  supabase,
  fechaInicio,
  fechaFin,
  limite = 800,
}) {
  let consulta = supabase
    .from('bodega_despachos')
    .select('id, fecha, documento, bodega, usuario_nombre, creado_en')
    .order('fecha', { ascending: false })
    .order('creado_en', { ascending: false })
    .limit(limite)

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

export async function guardarDespachoBodega({
  supabase,
  fecha,
  documento,
  bodega,
  usuarioNombre,
  items = [],
}) {
  const { data: despacho, error } = await supabase
    .from('bodega_despachos')
    .insert({
      fecha,
      documento: documento || '',
      bodega: bodega || '',
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
