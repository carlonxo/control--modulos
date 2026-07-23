export function nombreTipoAccionModulo(tipo) {
  if (tipo === 'ingreso') return 'Ingreso'
  if (tipo === 'finalizacion') return 'Finalización'
  if (tipo === 'cambio_estado') return 'Cambio estado'
  if (tipo === 'aprobacion_prueba_electrica') return 'Aprobación prueba eléctrica'
  if (tipo === 'rechazo_prueba_electrica') return 'Rechazo prueba eléctrica'
  return tipo || 'Acción'
}

export async function deshacerAccionModuloSupabase({ supabase, accion }) {
  if (accion.tipo === 'ingreso') {
    const idModulo = accion.datos_despues?.id || accion.modulo_id
    const { error } = await supabase
      .from('modulos')
      .delete()
      .eq('id', idModulo)

    if (error) {
      return { ok: false, mensaje: 'No se pudo deshacer el ingreso: ' + error.message }
    }
  } else if (accion.tipo === 'cambio_estado' || accion.tipo === 'aprobacion_prueba_electrica') {
    const anterior = accion.datos_antes || {}
    const { error } = await supabase
      .from('modulos')
      .update({
        estado: anterior.estado,
        solicitud_prueba: accion.tipo === 'aprobacion_prueba_electrica'
          ? true
          : anterior.solicitud_prueba,
        fecha_prueba_electrica: anterior.fecha_prueba_electrica || null,
        protocolo_entrega: anterior.protocolo_entrega || {},
      })
      .eq('id', anterior.id || accion.modulo_id)

    if (error) {
      return { ok: false, mensaje: 'No se pudo deshacer la acción: ' + error.message }
    }
  } else if (accion.tipo === 'rechazo_prueba_electrica') {
    const anterior = accion.datos_antes || {}
    const { error } = await supabase
      .from('modulos')
      .update({
        solicitud_prueba: true,
        solicitado_por: anterior.solicitado_por || null,
        fecha_solicitud: anterior.fecha_solicitud || null,
      })
      .eq('id', anterior.id || accion.modulo_id)

    if (error) {
      return { ok: false, mensaje: 'No se pudo deshacer el rechazo: ' + error.message }
    }
  } else if (accion.tipo === 'finalizacion') {
    const moduloAnterior = accion.datos_antes || {}
    const historialId = accion.datos_despues?.id

    const moduloRestaurado = { ...moduloAnterior }
    delete moduloRestaurado.modulo_id
    delete moduloRestaurado.fecha_salida

    const { error: errorInsert } = await supabase
      .from('modulos')
      .insert([moduloRestaurado])

    if (errorInsert) {
      return {
        ok: false,
        mensaje: 'No se pudo restaurar el módulo. Es posible que la posición ya está ocupada: ' + errorInsert.message,
      }
    }

    if (historialId) {
      const { error: errorDelete } = await supabase
        .from('historial_modulos')
        .delete()
        .eq('id', historialId)

      if (errorDelete) {
        return {
          ok: false,
          mensaje: 'Módulo restaurado, pero no se pudo eliminar del historial: ' + errorDelete.message,
        }
      }
    }
  }

  return { ok: true }
}
