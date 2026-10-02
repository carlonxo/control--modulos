import { prepararLineaParaIngresoModulo } from './ingresoModulosService'

export async function buscarUltimoModuloFinalizadoPorSerie({ supabase, serie, planta = 'planta bayona' }) {
  return supabase
    .from('historial_modulos')
    .select('*')
    .eq('serie', serie)
    .eq('planta', planta)
    .order('fecha_salida', { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function buscarModuloActivoPorSerie({ supabase, serie, planta = 'planta bayona' }) {
  return supabase
    .from('modulos')
    .select('id')
    .eq('serie', serie)
    .eq('planta', planta)
    .maybeSingle()
}

export async function reintegrarModuloDesdeHistorial({
  supabase,
  moduloHistorial,
  linea,
  extremo,
  planta = 'planta bayona',
  limiteModulos = 9,
}) {
  const { data: activoExistente, error: errorActivo } = await buscarModuloActivoPorSerie({
    supabase,
    serie: moduloHistorial.serie,
    planta,
  })

  if (errorActivo) {
    return {
      ok: false,
      tipo: 'error_verificacion_activo',
      error: errorActivo,
    }
  }

  if (activoExistente) {
    return {
      ok: false,
      tipo: 'ya_activo',
    }
  }

  const posicionDestino = await prepararLineaParaIngresoModulo({
    supabase,
    linea,
    extremo,
    planta,
    limiteModulos,
  })

  const { error: errorInsert } = await supabase
    .from('modulos')
    .insert([
      {
        serie: moduloHistorial.serie,
        tipo: moduloHistorial.tipo,
        proyecto: moduloHistorial.proyecto,
        responsable: moduloHistorial.responsable,
        fecha_ingreso: moduloHistorial.fecha_ingreso,
        fecha_prueba_electrica: moduloHistorial.fecha_prueba_electrica,
        horas_hombre_corregidas: moduloHistorial.horas_hombre_corregidas ?? null,
        horas_hombre_motivo: moduloHistorial.horas_hombre_motivo || '',
        horas_hombre_corregidas_por: moduloHistorial.horas_hombre_corregidas_por || '',
        horas_hombre_corregidas_en: moduloHistorial.horas_hombre_corregidas_en || null,
        protocolo_entrega: moduloHistorial.protocolo_entrega || {},
        nota: moduloHistorial.nota || '',
        observacion_alerta: moduloHistorial.observacion_alerta || '',
        estado: moduloHistorial.estado || 'Sin iniciar',
        linea,
        posicion: posicionDestino,
        planta,
      },
    ])

  if (errorInsert) {
    return {
      ok: false,
      tipo: 'error_insert',
      error: errorInsert,
    }
  }

  const { error: errorDelete } = await supabase
    .from('historial_modulos')
    .delete()
    .eq('id', moduloHistorial.id)

  if (errorDelete) {
    return {
      ok: true,
      tipo: 'reintegrado_sin_borrar_historial',
      error: errorDelete,
    }
  }

  return {
    ok: true,
    tipo: 'reintegrado',
  }
}
