import { estaDentroDeGarantia, fechaDocumentoProtocolo } from '../utils/modulos'

async function actualizarPosicionModulo({ supabase, id, posicion }) {
  const { error } = await supabase
    .from('modulos')
    .update({ posicion })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

export async function buscarPruebaRecienteGarantiaPorSerie({
  supabase,
  serie,
}) {
  const serieLimpia = String(serie || '').trim()
  if (!serieLimpia) return { data: null, error: null }

  const seleccionarRegistros = (tabla) => supabase
    .from(tabla)
    .select('id, serie, fecha_prueba_electrica, protocolo_entrega')
    .ilike('serie', serieLimpia)
    .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
    .limit(5)

  const [respuestaHistorial, respuestaManuales] = await Promise.all([
    seleccionarRegistros('historial_modulos'),
    seleccionarRegistros('protocolos_manuales'),
  ])

  const tablaManualNoExiste = respuestaManuales.error?.message?.includes('protocolos_manuales')
  const error = respuestaHistorial.error || (tablaManualNoExiste ? null : respuestaManuales.error)
  if (error) return { data: null, error }

  const candidatos = [
    ...(respuestaHistorial.data || []).map((registro) => ({ ...registro, origen: 'historial' })),
    ...(tablaManualNoExiste ? [] : respuestaManuales.data || []).map((registro) => ({ ...registro, origen: 'manual' })),
  ]
    .map((registro) => ({
      ...registro,
      fechaPruebaAnterior: fechaDocumentoProtocolo(registro),
    }))
    .filter((registro) => estaDentroDeGarantia(registro.fechaPruebaAnterior))
    .sort((a, b) => new Date(b.fechaPruebaAnterior) - new Date(a.fechaPruebaAnterior))

  return {
    data: candidatos[0] || null,
    error: null,
  }
}

export async function prepararLineaParaIngresoModulo({ supabase, linea, extremo }) {
  const { data: registros, error } = await supabase
    .from('modulos')
    .select('id, linea, posicion, serie')
    .eq('linea', linea)

  if (error) {
    throw new Error('No se pudo preparar la línea: ' + error.message)
  }

  const modulosLinea = (registros || [])
    .filter((modulo) => modulo?.serie && String(modulo.serie).trim() !== '')
    .sort((a, b) => Number(a.posicion) - Number(b.posicion))

  if (modulosLinea.length >= 9) {
    throw new Error(`La línea ${linea} ya está completa`)
  }

  const posicionTemporalBase = 1000 + Math.floor(Math.random() * 100000)
  for (const [index, modulo] of modulosLinea.entries()) {
    await actualizarPosicionModulo({
      supabase,
      id: modulo.id,
      posicion: posicionTemporalBase + index,
    })
  }

  for (const [index, modulo] of modulosLinea.entries()) {
    const nuevaPosicion = extremo === 'inicio' ? index + 2 : index + 1
    await actualizarPosicionModulo({
      supabase,
      id: modulo.id,
      posicion: nuevaPosicion,
    })
  }

  return extremo === 'inicio' ? 1 : modulosLinea.length + 1
}

export async function crearModuloActivo({
  supabase,
  serie,
  tipo,
  proyecto,
  responsable,
  linea,
  posicion,
  estado = 'Sin iniciar',
  fechaPruebaElectrica = null,
  protocoloEntrega = null,
}) {
  const moduloNuevo = {
    serie,
    tipo,
    proyecto,
    responsable: String(responsable || '').trim() || null,
    linea,
    posicion,
    estado,
    fecha_ingreso: new Date(),
  }

  if (fechaPruebaElectrica) moduloNuevo.fecha_prueba_electrica = fechaPruebaElectrica
  if (protocoloEntrega) moduloNuevo.protocolo_entrega = protocoloEntrega

  return supabase
    .from('modulos')
    .insert([moduloNuevo])
    .select('*')
    .single()
}
