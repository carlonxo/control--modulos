export async function buscarRegistrosPorSerie({ supabase, serie }) {
  const serieLimpia = String(serie || '').trim()

  if (!serieLimpia) {
    return { data: [], error: null }
  }

  const [respuestaHistorial, respuestaActivos, respuestaManuales] = await Promise.all([
    supabase
      .from('historial_modulos')
      .select('*')
      .eq('serie', serieLimpia)
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .order('fecha_salida', { ascending: false })
      .limit(5),
    supabase
      .from('modulos')
      .select('*')
      .eq('serie', serieLimpia),
    supabase
      .from('protocolos_manuales')
      .select('*')
      .eq('serie', serieLimpia)
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .limit(5),
  ])

  const error = respuestaHistorial.error || respuestaActivos.error || (
    respuestaManuales.error?.message?.includes('protocolos_manuales') ? null : respuestaManuales.error
  )

  if (error) {
    return { data: [], error }
  }

  const activos = (respuestaActivos.data || []).map((modulo) => ({
    ...modulo,
    esActual: true,
  }))

  const manuales = (respuestaManuales.error?.message?.includes('protocolos_manuales') ? [] : respuestaManuales.data || []).map((protocolo) => ({
    ...protocolo,
    origen: 'manual',
  }))

  return {
    data: [...activos, ...(respuestaHistorial.data || []), ...manuales],
    error: null,
  }
}
