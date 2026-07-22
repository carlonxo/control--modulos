export async function cargarModuloParaEdicion({ supabase, id }) {
  return supabase
    .from('modulos')
    .select('*')
    .eq('id', id)
    .single()
}

export async function actualizarModuloEditado({ supabase, id, payload }) {
  return supabase
    .from('modulos')
    .update(payload)
    .eq('id', id)
}

export function construirPayloadEdicionModulo({
  puedeEditarDatosModulo,
  perfil,
  formulariosElectricos,
  moduloSeleccionado,
  serieEditada,
  tipoEditado,
  proyectoEditado,
  responsableEditado,
  estadoEditado,
  lineaEditada,
  posicionEditada,
  notaEditada,
}) {
  if (!puedeEditarDatosModulo) {
    return {
      nota: notaEditada,
      ...(perfil?.rol === 'electrico'
        ? { materiales: formulariosElectricos[moduloSeleccionado?.id] || {} }
        : {}),
    }
  }

  return {
    serie: serieEditada,
    tipo: tipoEditado,
    proyecto: proyectoEditado,
    responsable: responsableEditado,
    estado: estadoEditado,
    linea: lineaEditada,
    posicion: posicionEditada,
    nota: notaEditada,
  }
}

export function aplicarDatosPruebaElectricaEnPayload({
  payload,
  moduloSeleccionado,
  moduloAntesCambio,
  serieEditada,
  tipoEditado,
  proyectoEditado,
  responsableEditado,
  lineaEditada,
  perfil,
  formatearFechaInput,
  completarDatosPruebaEnProtocolo,
}) {
  const fechaPruebaInput = formatearFechaInput(new Date())
  const moduloBase = {
    ...moduloSeleccionado,
    ...(moduloAntesCambio || {}),
  }
  const moduloParaProtocolo = {
    ...moduloBase,
    serie: serieEditada,
    tipo: tipoEditado,
    proyecto: proyectoEditado,
    responsable: responsableEditado,
    linea: lineaEditada,
  }
  const fechaPruebaDb = `${fechaPruebaInput}T00:00:00`

  return {
    ...payload,
    fecha_prueba_electrica: fechaPruebaDb,
    protocolo_entrega: completarDatosPruebaEnProtocolo(
      moduloBase?.protocolo_entrega || {},
      moduloParaProtocolo,
      fechaPruebaDb,
      responsableEditado || perfil?.nombre || ''
    ),
  }
}

export function aplicarGarantiaEnPayload({
  payload,
  moduloSeleccionado,
  fechaPruebaEditada,
  agregarNotaGarantiaProtocolo,
}) {
  const fechaPruebaDb = new Date(`${fechaPruebaEditada}T12:00:00`).toISOString()

  return {
    ...payload,
    fecha_prueba_electrica: fechaPruebaDb,
    protocolo_entrega: agregarNotaGarantiaProtocolo(
      payload.protocolo_entrega || moduloSeleccionado?.protocolo_entrega || {},
      fechaPruebaDb
    ),
  }
}
