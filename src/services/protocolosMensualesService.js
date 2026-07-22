export function obtenerTablaDestinoProtocolo(origen) {
  if (origen === 'manual') return 'protocolos_manuales'
  if (origen === 'historial') return 'historial_modulos'
  if (origen === 'actual') return 'modulos'
  return ''
}

export function obtenerColumnasProtocoloMensual(origen, incluirIdOt = false) {
  const columnasBase = origen === 'historial'
    ? ['id', 'modulo_id', 'protocolo_entrega', 'materiales']
    : ['id', 'protocolo_entrega', 'materiales']

  if (incluirIdOt) {
    const posicion = origen === 'historial' ? 2 : 1
    columnasBase.splice(posicion, 0, 'id_ot')
  }

  return columnasBase.join(', ')
}

export async function cargarRegistroProtocoloMensual({
  supabase,
  origen,
  id,
  incluirIdOt = false,
}) {
  const tablaDestino = obtenerTablaDestinoProtocolo(origen)
  if (!tablaDestino || !id) {
    return { data: null, error: null, tablaDestino, columnas: '' }
  }

  const columnas = obtenerColumnasProtocoloMensual(origen, incluirIdOt)
  let respuesta = await supabase
    .from(tablaDestino)
    .select(columnas)
    .eq('id', id)
    .maybeSingle()

  if (incluirIdOt && respuesta.error?.message?.includes('id_ot')) {
    const columnasCompatibles = obtenerColumnasProtocoloMensual(origen, false)
    respuesta = await supabase
      .from(tablaDestino)
      .select(columnasCompatibles)
      .eq('id', id)
      .maybeSingle()

    return { ...respuesta, tablaDestino, columnas: columnasCompatibles }
  }

  return { ...respuesta, tablaDestino, columnas }
}

export async function actualizarRegistroProtocoloMensual({
  supabase,
  origen,
  id,
  payload,
  columnas = '*',
}) {
  const tablaDestino = obtenerTablaDestinoProtocolo(origen)
  if (!tablaDestino || !id) {
    return { data: null, error: null, tablaDestino }
  }

  const respuesta = await supabase
    .from(tablaDestino)
    .update(payload)
    .eq('id', id)
    .select(columnas)
    .maybeSingle()

  return { ...respuesta, tablaDestino }
}

export async function limpiarProtocoloModuloActivo({ supabase, id }) {
  return supabase
    .from('modulos')
    .update({
      fecha_prueba_electrica: null,
      id_ot: null,
      protocolo_entrega: {},
    })
    .eq('id', id)
}

export async function eliminarRegistroProtocoloMensual({ supabase, origen, id }) {
  const tablaDestino = obtenerTablaDestinoProtocolo(origen)
  if (!tablaDestino || !id) {
    return { error: null, tablaDestino }
  }

  const respuesta = await supabase
    .from(tablaDestino)
    .delete()
    .eq('id', id)

  return { ...respuesta, tablaDestino }
}

export async function guardarIdOtProtocoloMensualSupabase({
  supabase,
  registro,
  valorIdOt,
}) {
  const carga = await cargarRegistroProtocoloMensual({
    supabase,
    origen: registro?.origen,
    id: registro?.id,
    incluirIdOt: true,
  })

  if (carga.error) {
    return {
      error: carga.error,
      tablaDestino: carga.tablaDestino,
      mensaje: 'No se pudo cargar el protocolo para guardar ID OT: ' + carga.error.message,
    }
  }

  if (!carga.data) {
    return {
      error: new Error('No se encontró el protocolo para guardar ID OT'),
      tablaDestino: carga.tablaDestino,
      mensaje: 'No se encontró el protocolo para guardar ID OT',
    }
  }

  const registroActual = carga.data
  const protocoloActualizado = {
    ...(registroActual.protocolo_entrega || {}),
    id_ot: valorIdOt,
    idOt: valorIdOt,
  }
  const payloadIdOt = {
    id_ot: valorIdOt,
    protocolo_entrega: protocoloActualizado,
  }

  let guardado = await actualizarRegistroProtocoloMensual({
    supabase,
    origen: registro.origen,
    id: registroActual.id,
    payload: payloadIdOt,
    columnas: carga.columnas,
  })

  if (guardado.error?.message?.includes('id_ot')) {
    const columnasCompatibles = obtenerColumnasProtocoloMensual(registro.origen, false)
    guardado = await actualizarRegistroProtocoloMensual({
      supabase,
      origen: registro.origen,
      id: registroActual.id,
      payload: { protocolo_entrega: protocoloActualizado },
      columnas: columnasCompatibles,
    })
  }

  return {
    ...guardado,
    registroActual,
    protocoloActualizado,
    tablaDestino: guardado.tablaDestino || carga.tablaDestino,
  }
}

export async function guardarAjusteValorizacionProtocoloSupabase({
  supabase,
  registro,
  ajuste,
  perfil,
  normalizarPrecioMaterial,
}) {
  const carga = await cargarRegistroProtocoloMensual({
    supabase,
    origen: registro?.origen,
    id: registro?.id,
  })

  if (carga.error) {
    return {
      error: carga.error,
      tablaDestino: carga.tablaDestino,
      mensaje: 'No se pudo cargar el protocolo para ajustar valores: ' + carga.error.message,
    }
  }

  if (!carga.data) {
    return {
      error: new Error('No se encontró el protocolo para ajustar valores'),
      tablaDestino: carga.tablaDestino,
      mensaje: 'No se encontró el protocolo para ajustar valores',
    }
  }

  const registroActual = carga.data
  const ajustesItemsActuales = registroActual.protocolo_entrega?.ajustes_valorizacion_items || {}
  const protocoloActualizado = {
    ...(registroActual.protocolo_entrega || {}),
    ajustes_valorizacion_items: {
      ...ajustesItemsActuales,
      [ajuste.itemKey]: {
        valor: normalizarPrecioMaterial(ajuste.valor),
        motivo: ajuste.motivo,
        item: ajuste.itemLabel,
        tipo: ajuste.tipoCobro,
        usuario: perfil?.nombre || perfil?.email || perfil?.rol || '',
        fecha: new Date().toISOString(),
      },
    },
  }
  delete protocoloActualizado.ajuste_valorizacion

  const guardado = await actualizarRegistroProtocoloMensual({
    supabase,
    origen: registro.origen,
    id: registro.id,
    payload: { protocolo_entrega: protocoloActualizado },
  })

  return {
    ...guardado,
    registroActual,
    protocoloActualizado,
    tablaDestino: guardado.tablaDestino || carga.tablaDestino,
  }
}

export async function guardarProtocoloManualMensualSupabase({
  supabase,
  moduloSeleccionado,
  protocoloNormalizado,
  fechaProtocolo,
  esManualExistente,
}) {
  const payloadManual = {
    serie: protocoloNormalizado.serie,
    tipo: protocoloNormalizado.tipo,
    proyecto: protocoloNormalizado.proyecto,
    responsable: protocoloNormalizado.responsable,
    fecha_prueba_electrica: `${fechaProtocolo}T00:00:00`,
    protocolo_entrega: protocoloNormalizado,
    materiales: protocoloNormalizado.materiales || {},
  }

  const consulta = esManualExistente
    ? supabase.from('protocolos_manuales').update(payloadManual).eq('id', moduloSeleccionado.id).select().single()
    : supabase.from('protocolos_manuales').insert([payloadManual]).select().single()

  const { data, error } = await consulta

  if (error) {
    return {
      data: null,
      error,
      payloadManual,
      mensaje: 'No se pudo guardar el protocolo manual: ' + error.message,
    }
  }

  const registroInicial = data || { ...payloadManual, id: moduloSeleccionado.id, origen: 'manual' }
  const { data: manualVerificado, error: errorVerificacionManual } = await supabase
    .from('protocolos_manuales')
    .select('*')
    .eq('id', registroInicial.id)
    .maybeSingle()

  if (errorVerificacionManual) {
    return {
      data: null,
      error: errorVerificacionManual,
      payloadManual,
      mensaje: 'El protocolo manual se guardó, pero no se pudo verificar: ' + errorVerificacionManual.message,
    }
  }

  if (!manualVerificado?.protocolo_entrega) {
    return {
      data: null,
      error: new Error('No se pudo verificar que el protocolo manual quedara guardado'),
      payloadManual,
      mensaje: 'No se pudo verificar que el protocolo manual quedara guardado',
    }
  }

  return {
    data: manualVerificado,
    error: null,
    payloadManual,
  }
}

export async function guardarProtocoloModuloSupabase({
  supabase,
  moduloSeleccionado,
  protocoloParaGuardar,
  protocoloDesdeHistorial,
}) {
  const tablaDestino = protocoloDesdeHistorial ? 'historial_modulos' : 'modulos'
  const fechaPruebaProtocolo = protocoloParaGuardar.fecha
    ? `${protocoloParaGuardar.fecha}T00:00:00`
    : moduloSeleccionado?.fecha_prueba_electrica || null
  const payloadProtocolo = {
    protocolo_entrega: protocoloParaGuardar,
    materiales: protocoloParaGuardar.materiales || {},
    fecha_prueba_electrica: fechaPruebaProtocolo,
    serie: protocoloParaGuardar.serie || moduloSeleccionado?.serie || '',
    tipo: protocoloParaGuardar.tipo || moduloSeleccionado?.tipo || '',
    proyecto: protocoloParaGuardar.proyecto || moduloSeleccionado?.proyecto || '',
    responsable: protocoloParaGuardar.responsable || moduloSeleccionado?.responsable || '',
    linea: protocoloParaGuardar.linea || moduloSeleccionado?.linea || '',
  }

  const { count: filasActualizadas, error } = await supabase
    .from(tablaDestino)
    .update(payloadProtocolo, { count: 'exact' })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    return {
      data: null,
      error,
      payloadProtocolo,
      tablaDestino,
      mensaje: 'No se pudo guardar el protocolo: ' + error.message,
    }
  }

  if (filasActualizadas === 0) {
    return {
      data: null,
      error: new Error('No se encontró el registro del protocolo para guardar'),
      payloadProtocolo,
      tablaDestino,
      mensaje: 'No se encontró el registro del protocolo para guardar',
    }
  }

  const { data: registroVerificado, error: errorVerificacion } = await supabase
    .from(tablaDestino)
    .select('*')
    .eq('id', moduloSeleccionado.id)
    .maybeSingle()

  return {
    data: registroVerificado || { ...moduloSeleccionado, ...payloadProtocolo },
    error: null,
    errorVerificacion: errorVerificacion || null,
    payloadProtocolo,
    tablaDestino,
  }
}

export async function cargarDatosProtocoloModuloActivo({ supabase, moduloId }) {
  return supabase
    .from('modulos')
    .select('materiales, protocolo_entrega, responsable, fecha_prueba_electrica')
    .eq('id', moduloId)
    .single()
}

export async function cargarModuloActualParaProtocolo({ supabase, moduloId }) {
  return supabase
    .from('modulos')
    .select('*')
    .eq('id', moduloId)
    .single()
}
