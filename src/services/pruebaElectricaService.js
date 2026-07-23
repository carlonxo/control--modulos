export async function solicitarPruebaElectricaModulo({
  supabase,
  moduloId,
  usuarioId,
  materiales,
}) {
  return supabase
    .from('modulos')
    .update({
      solicitud_prueba: true,
      solicitado_por: usuarioId,
      fecha_solicitud: new Date().toISOString(),
      ...(materiales ? { materiales } : {}),
    })
    .eq('id', moduloId)
}

export async function cancelarSolicitudPruebaElectricaModulo({ supabase, moduloId }) {
  return supabase
    .from('modulos')
    .update({ solicitud_prueba: false })
    .eq('id', moduloId)
}

export async function aprobarPruebaElectricaModulo({
  supabase,
  moduloId,
  fechaPruebaDb,
  protocoloActualizado,
}) {
  return supabase
    .from('modulos')
    .update({
      solicitud_prueba: false,
      estado: 'Prueba eléctrica',
      fecha_prueba_electrica: fechaPruebaDb,
      protocolo_entrega: protocoloActualizado,
    })
    .eq('id', moduloId)
}

export async function rechazarPruebaElectricaModulo({ supabase, moduloId }) {
  return supabase
    .from('modulos')
    .update({ solicitud_prueba: false })
    .eq('id', moduloId)
}

export async function guardarObservacionAlertaModulo({
  supabase,
  moduloId,
  observacion,
}) {
  return supabase
    .from('modulos')
    .update({ observacion_alerta: observacion })
    .eq('id', moduloId)
}
