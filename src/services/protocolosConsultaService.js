export async function cargarProtocolosDiarios({
  supabase,
  fecha,
}) {
  const inicio = `${fecha}T00:00:00`
  const fin = new Date(`${fecha}T00:00:00`)
  fin.setDate(fin.getDate() + 1)
  const finTexto = fin.toISOString().slice(0, 19)

  const [respuestaActivos, respuestaHistorial] = await Promise.all([
    supabase
      .from('modulos')
      .select('*')
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', finTexto),
    supabase
      .from('historial_modulos')
      .select('*')
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', finTexto),
  ])

  const error = respuestaActivos.error || respuestaHistorial.error
  if (error) {
    return {
      registros: [],
      error,
    }
  }

  return {
    registros: [...(respuestaActivos.data || []), ...(respuestaHistorial.data || [])]
      .sort((a, b) => String(a.serie || '').localeCompare(String(b.serie || ''))),
    error: null,
  }
}

export async function cargarRegistrosProtocolosPorRango({
  supabase,
  inicio,
  fin,
  fechaDocumentoProtocolo,
  fechaDentroDeRangoProtocolo,
}) {
  async function cargarTablaProtocolos(tabla, columnasConIdOt, columnasSinIdOt) {
    const quitarColumnaEstado = (columnas) => columnas
      .split(',')
      .map((columna) => columna.trim())
      .filter((columna) => columna !== 'estado')
      .join(', ')

    const traerPorRango = async (columnas) => supabase
      .from(tabla)
      .select(columnas)
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', fin)

    const traerRecientes = async (columnas) => supabase
      .from(tabla)
      .select(columnas)
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .limit(250)

    let respuesta = await traerPorRango(columnasConIdOt)

    if (respuesta.error?.message?.includes('id_ot')) {
      respuesta = await traerPorRango(columnasSinIdOt)
    }

    if (respuesta.error?.message?.includes('estado')) {
      respuesta = await traerPorRango(quitarColumnaEstado(columnasSinIdOt))
    }

    if (respuesta.error) return respuesta

    let recientes = await traerRecientes(columnasConIdOt)
    if (recientes.error?.message?.includes('id_ot')) {
      recientes = await traerRecientes(columnasSinIdOt)
    }
    if (recientes.error?.message?.includes('estado')) {
      recientes = await traerRecientes(quitarColumnaEstado(columnasSinIdOt))
    }

    const porId = new Map()
    ;[...(respuesta.data || []), ...(!recientes.error ? recientes.data || [] : [])].forEach((item) => {
      const fechaRegistro = fechaDocumentoProtocolo(item)
      if (!fechaDentroDeRangoProtocolo(fechaRegistro, inicio, fin)) return
      porId.set(String(item.id), item)
    })

    return {
      ...respuesta,
      data: [...porId.values()],
    }
  }

  const [respuestaActivos, respuestaHistorial, respuestaManuales] = await Promise.all([
    cargarTablaProtocolos(
      'modulos',
      'id, id_ot, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
      'id, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
    ),
    cargarTablaProtocolos(
      'historial_modulos',
      'id, modulo_id, id_ot, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, fecha_salida, protocolo_entrega, materiales',
      'id, modulo_id, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, fecha_salida, protocolo_entrega, materiales',
    ),
    cargarTablaProtocolos(
      'protocolos_manuales',
      'id, id_ot, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
      'id, serie, tipo, proyecto, responsable, estado, fecha_prueba_electrica, protocolo_entrega, materiales',
    ),
  ])

  const tablaManualNoExiste = respuestaManuales.error?.message?.includes('protocolos_manuales')
  const error = respuestaActivos.error || respuestaHistorial.error || (tablaManualNoExiste ? null : respuestaManuales.error)
  if (error) {
    return {
      registrosActivos: [],
      registrosHistorial: [],
      registrosManuales: [],
      tablaManualNoExiste,
      error,
    }
  }

  return {
    registrosActivos: respuestaActivos.data || [],
    registrosHistorial: respuestaHistorial.data || [],
    registrosManuales: tablaManualNoExiste ? [] : respuestaManuales.data || [],
    tablaManualNoExiste,
    error: null,
  }
}
