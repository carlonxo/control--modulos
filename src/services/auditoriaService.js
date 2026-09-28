const LIMITE_EVENTOS_AUDITORIA = 1000

export async function cargarEventosAuditoria({
  supabase,
  fechaDesde = '',
  fechaHasta = '',
  tabla = '',
  accion = '',
} = {}) {
  let consulta = supabase
    .from('auditoria_eventos')
    .select(`
      id,
      ocurrido_en,
      transaccion_id,
      usuario_id,
      usuario_nombre,
      usuario_rol,
      accion,
      tabla,
      registro_id,
      datos_antes,
      datos_despues,
      cambios,
      origen
    `)
    .order('ocurrido_en', { ascending: false })
    .limit(LIMITE_EVENTOS_AUDITORIA)

  if (fechaDesde) {
    consulta = consulta.gte('ocurrido_en', inicioDiaIso(fechaDesde))
  }

  if (fechaHasta) {
    consulta = consulta.lt('ocurrido_en', diaSiguienteIso(fechaHasta))
  }

  if (tabla) consulta = consulta.eq('tabla', tabla)
  if (accion) consulta = consulta.eq('accion', accion)

  const { data, error } = await consulta
  return { data: data || [], error, limite: LIMITE_EVENTOS_AUDITORIA }
}

function inicioDiaIso(fecha) {
  return new Date(`${fecha}T00:00:00`).toISOString()
}

function diaSiguienteIso(fecha) {
  const siguiente = new Date(`${fecha}T00:00:00`)
  siguiente.setDate(siguiente.getDate() + 1)
  return siguiente.toISOString()
}
