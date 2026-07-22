export async function cargarModuloPorId({ supabase, id }) {
  return supabase
    .from('modulos')
    .select('*')
    .eq('id', id)
    .single()
}

export async function eliminarModuloActivo({ supabase, id }) {
  return supabase
    .from('modulos')
    .delete()
    .eq('id', id)
}

function quitarNotaSiNoExisteColumna(payload, error) {
  if (!error?.message?.includes("'nota' column")) return payload
  const payloadSinNota = { ...payload }
  delete payloadSinNota.nota
  return payloadSinNota
}

export function construirHistorialModulo({ modulo, protocoloHistorial }) {
  return {
    modulo_id: modulo.id,
    serie: modulo.serie,
    tipo: modulo.tipo,
    proyecto: modulo.proyecto,
    responsable: modulo.responsable,
    fecha_ingreso: modulo.fecha_ingreso,
    fecha_prueba_electrica: modulo.fecha_prueba_electrica,
    id_ot: modulo.id_ot || modulo.protocolo_entrega?.id_ot || modulo.protocolo_entrega?.idOt || null,
    protocolo_entrega: protocoloHistorial,
    nota: modulo.nota || '',
    observacion_alerta: modulo.observacion_alerta || '',
    fecha_salida: new Date().toISOString(),
    estado: modulo.estado,
    linea: modulo.linea,
    posicion: modulo.posicion,
  }
}

export async function guardarHistorialModuloFinalizado({ supabase, historialPayload }) {
  let payloadFinal = historialPayload
  let { error: errorHistorial } = await supabase
    .from('historial_modulos')
    .insert([payloadFinal])

  if (errorHistorial?.message?.includes("'nota' column")) {
    payloadFinal = quitarNotaSiNoExisteColumna(payloadFinal, errorHistorial)
    ;({ error: errorHistorial } = await supabase
      .from('historial_modulos')
      .insert([payloadFinal]))
  }

  if (errorHistorial?.message?.includes('historial_ciclo_unico')) {
    payloadFinal = historialPayload
    let { error: errorUpdateHistorial } = await supabase
      .from('historial_modulos')
      .update(payloadFinal)
      .eq('modulo_id', historialPayload.modulo_id)

    if (errorUpdateHistorial?.message?.includes("'nota' column")) {
      payloadFinal = quitarNotaSiNoExisteColumna(payloadFinal, errorUpdateHistorial)
      ;({ error: errorUpdateHistorial } = await supabase
        .from('historial_modulos')
        .update(payloadFinal)
        .eq('modulo_id', historialPayload.modulo_id))
    }

    errorHistorial = errorUpdateHistorial
  }

  if (errorHistorial) {
    return { data: null, error: errorHistorial, historialPayload: payloadFinal }
  }

  const { data: historialCreado, error: errorCargaHistorial } = await supabase
    .from('historial_modulos')
    .select('*')
    .eq('modulo_id', historialPayload.modulo_id)
    .order('fecha_salida', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    data: historialCreado,
    error: errorCargaHistorial || null,
    historialPayload: payloadFinal,
  }
}
