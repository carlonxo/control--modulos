export async function cargarRecepcionesBodegaRango({
  supabase,
  fechaInicio,
  fechaFin,
  limite = 800,
}) {
  let consulta = supabase
    .from('bodega_recepciones')
    .select('id, fecha, orden_compra, numero_factura, numero_recepcion, bodega, usuario_nombre, created_at')
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite)

  if (fechaInicio) consulta = consulta.gte('fecha', fechaInicio)
  if (fechaFin) consulta = consulta.lt('fecha', fechaFin)

  const { data: recepciones, error } = await consulta

  if (error) {
    return { recepciones: [], error }
  }

  const ids = (recepciones || []).map((recepcion) => recepcion.id).filter(Boolean)
  if (ids.length === 0) {
    return { recepciones: [], error: null }
  }

  const { data: items, error: errorItems } = await supabase
    .from('bodega_recepcion_items')
    .select('id, recepcion_id, codigo_bodega, descripcion, unidad, cantidad, created_at')
    .in('recepcion_id', ids)

  if (errorItems) {
    return {
      recepciones: (recepciones || []).map((recepcion) => ({ ...recepcion, items: [] })),
      error: errorItems,
    }
  }

  const itemsPorRecepcion = (items || []).reduce((mapa, item) => {
    mapa[item.recepcion_id] = [...(mapa[item.recepcion_id] || []), item]
    return mapa
  }, {})

  return {
    recepciones: (recepciones || []).map((recepcion) => ({
      ...recepcion,
      items: itemsPorRecepcion[recepcion.id] || [],
    })),
    error: null,
  }
}

export async function guardarRecepcionBodega({
  supabase,
  fecha,
  ordenCompra,
  numeroFactura,
  numeroRecepcion,
  bodega,
  usuarioNombre,
  items = [],
}) {
  const { data: recepcion, error } = await supabase
    .from('bodega_recepciones')
    .insert({
      fecha,
      orden_compra: ordenCompra || '',
      numero_factura: numeroFactura || '',
      numero_recepcion: numeroRecepcion || '',
      bodega: bodega || '',
      usuario_nombre: usuarioNombre || '',
    })
    .select('id')
    .single()

  if (error) {
    return { recepcion: null, error, etapa: 'cabecera' }
  }

  const filas = items.map((item) => ({
    recepcion_id: recepcion.id,
    codigo_bodega: item.codigo || '',
    descripcion: item.descripcion || '',
    unidad: item.unidad || '',
    cantidad: Number(item.cantidad || 0),
  }))

  if (filas.length === 0) {
    return { recepcion, error: null, etapa: null }
  }

  const { error: errorItems } = await supabase
    .from('bodega_recepcion_items')
    .insert(filas)

  if (errorItems) {
    return { recepcion, error: errorItems, etapa: 'items' }
  }

  return { recepcion, error: null, etapa: null }
}

export async function cargarRecepcionesBodegaDia({
  supabase,
  fecha,
}) {
  return cargarRecepcionesBodegaRango({
    supabase,
    fechaInicio: fecha,
    fechaFin: sumarDiasIso(fecha, 1),
  })
}

function sumarDiasIso(fecha, dias) {
  const base = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(base.getTime())) return fecha
  base.setDate(base.getDate() + dias)
  return base.toISOString().slice(0, 10)
}
