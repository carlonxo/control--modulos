import {
  filtrarConsultaPorSerieEquivalente,
  filtrarRegistrosPorSerieEquivalente,
  normalizarSerieParaComparar,
} from '../utils/series'

export async function buscarRegistrosPorSerie({ supabase, serie }) {
  const serieLimpia = String(serie || '').trim()

  if (!serieLimpia) {
    return { data: [], error: null }
  }

  const consultaHistorial = supabase
      .from('historial_modulos')
      .select('*')
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .order('fecha_salida', { ascending: false })
      .limit(25)
  const consultaActivos = supabase
      .from('modulos')
      .select('*')
      .limit(25)
  const consultaManuales = supabase
      .from('protocolos_manuales')
      .select('*')
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
      .limit(25)

  const [respuestaHistorial, respuestaActivos, respuestaManuales] = await Promise.all([
    filtrarConsultaPorSerieEquivalente(consultaHistorial, serieLimpia),
    filtrarConsultaPorSerieEquivalente(consultaActivos, serieLimpia),
    filtrarConsultaPorSerieEquivalente(consultaManuales, serieLimpia),
  ])

  const error = respuestaHistorial.error || respuestaActivos.error || (
    respuestaManuales.error?.message?.includes('protocolos_manuales') ? null : respuestaManuales.error
  )

  if (error) {
    return { data: [], error }
  }

  const activos = filtrarRegistrosPorSerieEquivalente(respuestaActivos.data, serieLimpia).map((modulo) => ({
    ...modulo,
    esActual: true,
  }))

  const manuales = filtrarRegistrosPorSerieEquivalente(
    respuestaManuales.error?.message?.includes('protocolos_manuales') ? [] : respuestaManuales.data,
    serieLimpia,
  ).slice(0, 5).map((protocolo) => ({
    ...protocolo,
    origen: 'manual',
  }))

  return {
    data: [
      ...activos,
      ...filtrarRegistrosPorSerieEquivalente(respuestaHistorial.data, serieLimpia).slice(0, 5),
      ...manuales,
    ],
    error: null,
  }
}

export { normalizarSerieParaComparar }
