export async function cargarItemsValesBodegaPorRango({
  supabase,
  fechaInicio,
  fechaFin,
}) {
  const { data, error } = await supabase
    .from('vales_bodega_items')
    .select('id, fecha, material_vale, material_balance, cantidad')
    .gte('fecha', fechaInicio)
    .lt('fecha', fechaFin)

  return {
    items: data || [],
    error,
  }
}

export async function cargarValesBodegaDia({
  supabase,
  fecha,
}) {
  const { data: vales, error: errorVales } = await supabase
    .from('vales_bodega')
    .select('id, fecha, archivo_nombre, usuario_nombre, created_at')
    .eq('fecha', fecha)
    .order('created_at', { ascending: false })

  if (errorVales) {
    return {
      vales: [],
      error: errorVales,
    }
  }

  const ids = (vales || []).map((vale) => vale.id)
  if (ids.length === 0) {
    return {
      vales: [],
      error: null,
    }
  }

  const { data: items, error: errorItems } = await supabase
    .from('vales_bodega_items')
    .select('id, vale_id, material_vale, material_balance, cantidad')
    .in('vale_id', ids)

  if (errorItems) {
    return {
      vales: (vales || []).map((vale) => ({ ...vale, items: [] })),
      error: errorItems,
    }
  }

  const itemsPorVale = (items || []).reduce((mapa, item) => {
    mapa[item.vale_id] = [...(mapa[item.vale_id] || []), item]
    return mapa
  }, {})

  return {
    vales: (vales || []).map((vale) => ({
      ...vale,
      items: itemsPorVale[vale.id] || [],
    })),
    error: null,
  }
}

export async function guardarValeBodega({
  supabase,
  fecha,
  archivoNombre,
  usuarioNombre,
  items,
}) {
  const { data: vale, error: errorVale } = await supabase
    .from('vales_bodega')
    .insert([{
      fecha,
      archivo_nombre: archivoNombre || '',
      usuario_nombre: usuarioNombre || '',
    }])
    .select('id')
    .single()

  if (errorVale) {
    return {
      vale: null,
      error: errorVale,
      etapa: 'vale',
    }
  }

  const { error: errorItems } = await supabase
    .from('vales_bodega_items')
    .insert(items.map((item) => ({
      vale_id: vale.id,
      fecha,
      ...item,
    })))

  if (errorItems) {
    return {
      vale,
      error: errorItems,
      etapa: 'items',
    }
  }

  return {
    vale,
    error: null,
    etapa: null,
  }
}
