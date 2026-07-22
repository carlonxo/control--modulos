import { prepararLineaParaIngresoModulo } from './ingresoModulosService'

export async function buscarUltimoModuloFinalizadoPorSerie({ supabase, serie }) {
  return supabase
    .from('historial_modulos')
    .select('*')
    .eq('serie', serie)
    .order('fecha_salida', { ascending: false })
    .limit(1)
    .maybeSingle()
}

export async function buscarModuloActivoPorSerie({ supabase, serie }) {
  return supabase
    .from('modulos')
    .select('id')
    .eq('serie', serie)
    .maybeSingle()
}

export async function reintegrarModuloDesdeHistorial({
  supabase,
  moduloHistorial,
  linea,
  extremo,
}) {
  const { data: activoExistente, error: errorActivo } = await buscarModuloActivoPorSerie({
    supabase,
    serie: moduloHistorial.serie,
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
        protocolo_entrega: moduloHistorial.protocolo_entrega || {},
        nota: moduloHistorial.nota || '',
        observacion_alerta: moduloHistorial.observacion_alerta || '',
        estado: moduloHistorial.estado || 'Sin iniciar',
        linea,
        posicion: posicionDestino,
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
