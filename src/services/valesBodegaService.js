export async function cargarItemsValesBodegaPorRango({
  supabase,
  fechaInicio,
  fechaFin,
}) {
  const { vales, error: errorVales } = await cargarValesBodegaCabeceraPorRango({
    supabase,
    fechaInicio,
    fechaFin,
  })
  if (!errorVales && vales.length > 0) {
    const { items, error: errorItems } = await cargarItemsPorVales({
      supabase,
      vales,
    })
    if (!errorItems) {
      return {
        items,
        error: null,
      }
    }
  }

  let { data, error } = await supabase
    .from('vales_bodega_items')
    .select('id, vale_id, fecha, serie, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')
    .gte('fecha', fechaInicio)
    .lt('fecha', fechaFin)

  if (error?.message?.includes('serie')) {
    ;({ data, error } = await supabase
      .from('vales_bodega_items')
      .select('id, vale_id, fecha, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin))
  }

  if (error?.message?.includes('solicitante') || error?.message?.includes('tipo_ingreso')) {
    ;({ data, error } = await supabase
      .from('vales_bodega_items')
      .select('id, vale_id, fecha, material_vale, material_balance, cantidad')
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin))
  }

  if (!error) {
    data = await completarDatosValeEnItems({ supabase, items: data || [] })
  }

  return {
    items: data || [],
    error,
  }
}

async function cargarValesBodegaCabeceraPorRango({
  supabase,
  fechaInicio,
  fechaFin,
}) {
  let { data, error } = await supabase
    .from('vales_bodega')
    .select('id, fecha, serie, solicitante_id, solicitante_nombre, tipo_ingreso')
    .gte('fecha', fechaInicio)
    .lt('fecha', fechaFin)

  if (error?.message?.includes('serie')) {
    ;({ data, error } = await supabase
      .from('vales_bodega')
      .select('id, fecha, solicitante_id, solicitante_nombre, tipo_ingreso')
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin))
  }

  if (error?.message?.includes('solicitante') || error?.message?.includes('tipo_ingreso')) {
    ;({ data, error } = await supabase
      .from('vales_bodega')
      .select('id, fecha')
      .gte('fecha', fechaInicio)
      .lt('fecha', fechaFin))
  }

  return {
    vales: data || [],
    error,
  }
}

async function cargarItemsPorVales({
  supabase,
  vales = [],
}) {
  const ids = vales.map((vale) => vale.id).filter(Boolean)
  if (ids.length === 0) return { items: [], error: null }

  let { data, error } = await supabase
    .from('vales_bodega_items')
    .select('id, vale_id, fecha, serie, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')
    .in('vale_id', ids)

  if (error?.message?.includes('serie')) {
    ;({ data, error } = await supabase
      .from('vales_bodega_items')
      .select('id, vale_id, fecha, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')
      .in('vale_id', ids))
  }

  if (error?.message?.includes('solicitante') || error?.message?.includes('tipo_ingreso')) {
    ;({ data, error } = await supabase
      .from('vales_bodega_items')
      .select('id, vale_id, fecha, material_vale, material_balance, cantidad')
      .in('vale_id', ids))
  }

  if (error) return { items: [], error }

  const valesPorId = Object.fromEntries(vales.map((vale) => [vale.id, vale]))
  const items = (data || []).map((item) => {
    const vale = valesPorId[item.vale_id] || {}
    return {
      ...item,
      fecha: item.fecha || vale.fecha || '',
      serie: item.serie || vale.serie || '',
      solicitante_id: item.solicitante_id || vale.solicitante_id || null,
      solicitante_nombre: item.solicitante_nombre || vale.solicitante_nombre || '',
      tipo_ingreso: item.tipo_ingreso || vale.tipo_ingreso || '',
    }
  })

  return {
    items,
    error: null,
  }
}

export async function cargarValesBodegaDia({
  supabase,
  fecha,
}) {
  let { data: vales, error: errorVales } = await supabase
    .from('vales_bodega')
    .select('id, fecha, serie, archivo_nombre, usuario_nombre, solicitante_id, solicitante_nombre, tipo_ingreso, observacion, estado_bodega, fecha_entrega_bodega, entregado_por, created_at')
    .eq('fecha', fecha)
    .order('created_at', { ascending: false })

  if (errorVales?.message?.includes('estado_bodega') || errorVales?.message?.includes('fecha_entrega_bodega') || errorVales?.message?.includes('entregado_por')) {
    ;({ data: vales, error: errorVales } = await supabase
      .from('vales_bodega')
      .select('id, fecha, serie, archivo_nombre, usuario_nombre, solicitante_id, solicitante_nombre, tipo_ingreso, observacion, created_at')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false }))
  }

  if (errorVales?.message?.includes('serie')) {
    ;({ data: vales, error: errorVales } = await supabase
      .from('vales_bodega')
      .select('id, fecha, archivo_nombre, usuario_nombre, solicitante_id, solicitante_nombre, tipo_ingreso, observacion, created_at')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false }))
  }

  if (errorVales?.message?.includes('solicitante') || errorVales?.message?.includes('tipo_ingreso')) {
    ;({ data: vales, error: errorVales } = await supabase
      .from('vales_bodega')
      .select('id, fecha, archivo_nombre, usuario_nombre, observacion, created_at')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false }))
  }

  if (errorVales?.message?.includes('observacion')) {
    ;({ data: vales, error: errorVales } = await supabase
      .from('vales_bodega')
      .select('id, fecha, archivo_nombre, usuario_nombre, created_at')
      .eq('fecha', fecha)
      .order('created_at', { ascending: false }))
  }

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

  let { data: items, error: errorItems } = await supabase
    .from('vales_bodega_items')
    .select('id, vale_id, serie, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')
    .in('vale_id', ids)

  if (errorItems?.message?.includes('serie')) {
    ;({ data: items, error: errorItems } = await supabase
      .from('vales_bodega_items')
      .select('id, vale_id, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')
      .in('vale_id', ids))
  }

  if (errorItems?.message?.includes('solicitante') || errorItems?.message?.includes('tipo_ingreso')) {
    ;({ data: items, error: errorItems } = await supabase
      .from('vales_bodega_items')
      .select('id, vale_id, material_vale, material_balance, cantidad')
      .in('vale_id', ids))
  }

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
      items: deduplicarItemsValeBodega(itemsPorVale[vale.id] || []),
    })),
    error: null,
  }
}

export async function guardarValeBodega({
  supabase,
  fecha,
  archivoNombre,
  usuarioNombre,
  serie,
  solicitanteId,
  solicitanteNombre,
  tipoIngreso = 'archivo',
  observacion = '',
  items,
}) {
  const { data: vale, error: errorVale } = await supabase
    .from('vales_bodega')
    .insert([{
      fecha,
      serie: serie || '',
      archivo_nombre: archivoNombre || '',
      usuario_nombre: usuarioNombre || '',
      solicitante_id: solicitanteId || null,
      solicitante_nombre: solicitanteNombre || '',
      tipo_ingreso: tipoIngreso || 'archivo',
      observacion: observacion || '',
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
      serie: serie || '',
      solicitante_id: solicitanteId || null,
      solicitante_nombre: solicitanteNombre || '',
      tipo_ingreso: tipoIngreso || 'archivo',
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

function deduplicarItemsValeBodega(items = []) {
  const vistos = new Set()
  const resultado = []

  for (const item of items) {
    const materialVale = String(item.material_vale || '').trim()
    const materialBalance = String(item.material_balance || materialVale).trim()
    const cantidad = Number(item.cantidad || 0)
    const clave = [
      normalizarTextoValeBodega(materialVale),
      normalizarTextoValeBodega(materialBalance),
      cantidad,
    ].join('|')

    if (!materialBalance || cantidad <= 0 || vistos.has(clave)) continue
    vistos.add(clave)
    resultado.push(item)
  }

  return resultado
}

function normalizarTextoValeBodega(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

export async function actualizarItemsValeBodega({
  supabase,
  vale,
  items = [],
}) {
  if (!vale?.id) return { error: new Error('Falta el pedido para editar'), etapa: 'vale' }

  const filas = deduplicarItemsValeBodega(items)
    .map((item) => ({
      id: item.id || null,
      vale_id: vale.id,
      fecha: vale.fecha || item.fecha || '',
      serie: vale.serie || item.serie || '',
      solicitante_id: vale.solicitante_id || item.solicitante_id || null,
      solicitante_nombre: vale.solicitante_nombre || item.solicitante_nombre || '',
      tipo_ingreso: vale.tipo_ingreso || item.tipo_ingreso || 'pedido_app',
      material_vale: String(item.material_vale || item.material_balance || '').trim(),
      material_balance: String(item.material_balance || item.material_vale || '').trim(),
      cantidad: Number(item.cantidad || 0),
    }))
    .filter((item) => item.material_balance && item.cantidad > 0)

  if (filas.length === 0) {
    return { error: new Error('Debes dejar al menos un material con cantidad'), etapa: 'items' }
  }

  const { data: itemsActuales, error: errorConsultar } = await supabase
    .from('vales_bodega_items')
    .select('id')
    .eq('vale_id', vale.id)

  if (errorConsultar) {
    return { error: errorConsultar, etapa: 'consultar_items' }
  }

  const { data: itemsEliminados, error: errorEliminar } = await supabase
    .from('vales_bodega_items')
    .delete()
    .eq('vale_id', vale.id)
    .select('id')

  if (errorEliminar) {
    return { error: errorEliminar, etapa: 'eliminar_items' }
  }

  if ((itemsEliminados || []).length < (itemsActuales || []).length) {
    return {
      error: new Error('Supabase no eliminó los materiales anteriores del pedido. Revisa la política DELETE de vales_bodega_items para el rol bodega. No se insertaron filas nuevas para evitar duplicados.'),
      etapa: 'eliminar_items',
    }
  }

  const filasInsertar = filas.map(({ id, ...fila }) => fila)
  const { data: itemsGuardados, error: errorInsertar } = await supabase
    .from('vales_bodega_items')
    .insert(filasInsertar)
    .select('id, vale_id, fecha, serie, material_vale, material_balance, cantidad, solicitante_id, solicitante_nombre, tipo_ingreso')

  if (errorInsertar) {
    return { error: errorInsertar, etapa: 'insertar_items' }
  }

  return { error: null, etapa: null, items: itemsGuardados || filasInsertar }
}

async function completarDatosValeEnItems({
  supabase,
  items = [],
}) {
  const idsVale = [...new Set(items
    .filter((item) => item.vale_id && (!item.solicitante_nombre || !item.serie || !item.tipo_ingreso))
    .map((item) => item.vale_id))]

  if (idsVale.length === 0) return items

  let { data: vales, error } = await supabase
    .from('vales_bodega')
    .select('id, serie, solicitante_id, solicitante_nombre, tipo_ingreso')
    .in('id', idsVale)

  if (error?.message?.includes('serie')) {
    ;({ data: vales, error } = await supabase
      .from('vales_bodega')
      .select('id, solicitante_id, solicitante_nombre, tipo_ingreso')
      .in('id', idsVale))
  }

  if (error?.message?.includes('solicitante') || error?.message?.includes('tipo_ingreso')) {
    ;({ data: vales, error } = await supabase
      .from('vales_bodega')
      .select('id')
      .in('id', idsVale))
  }

  if (error) return items

  const valesPorId = Object.fromEntries((vales || []).map((vale) => [vale.id, vale]))

  return items.map((item) => {
    const vale = valesPorId[item.vale_id] || {}
    return {
      ...item,
      serie: item.serie || vale.serie || '',
      solicitante_id: item.solicitante_id || vale.solicitante_id || null,
      solicitante_nombre: item.solicitante_nombre || vale.solicitante_nombre || '',
      tipo_ingreso: item.tipo_ingreso || vale.tipo_ingreso || '',
    }
  })
}
