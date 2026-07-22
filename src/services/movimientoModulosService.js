export async function cargarModulosActivosParaMovimiento({ supabase }) {
  const { data, error } = await supabase
    .from('modulos')
    .select('*')

  if (error) return { data: [], error }

  return {
    data: (data || []).filter((modulo) => modulo?.serie && String(modulo.serie).trim() !== ''),
    error: null,
  }
}

async function moverRegistro({ supabase, id, linea, posicion }) {
  const { error } = await supabase
    .from('modulos')
    .update({ linea, posicion })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

function crearPosicionTemporal() {
  return 1000 + Math.floor(Math.random() * 100000)
}

function calcularMovimientosMismaLinea({
  modulosActivos,
  moduloActual,
  lineaOrigen,
  posicionOrigen,
  posicionDestino,
}) {
  const modulosLinea = modulosActivos.filter(
    (modulo) => Number(modulo.linea) === lineaOrigen && String(modulo.id) !== String(moduloActual.id)
  )

  if (posicionOrigen > posicionDestino) {
    return modulosLinea
      .filter((modulo) => Number(modulo.posicion) >= posicionDestino && Number(modulo.posicion) < posicionOrigen)
      .map((modulo) => ({
        id: modulo.id,
        linea: lineaOrigen,
        posicion: Number(modulo.posicion) + 1,
        posicionActual: Number(modulo.posicion),
      }))
      .sort((a, b) => b.posicionActual - a.posicionActual)
  }

  return modulosLinea
    .filter((modulo) => Number(modulo.posicion) <= posicionDestino && Number(modulo.posicion) > posicionOrigen)
    .map((modulo) => ({
      id: modulo.id,
      linea: lineaOrigen,
      posicion: Number(modulo.posicion) - 1,
      posicionActual: Number(modulo.posicion),
    }))
    .sort((a, b) => a.posicionActual - b.posicionActual)
}

function calcularMovimientosCambioLinea({
  modulosActivos,
  moduloActual,
  lineaOrigen,
  lineaDestino,
  posicionOrigen,
  posicionDestino,
}) {
  const modulosLineaDestino = modulosActivos
    .filter((modulo) => Number(modulo.linea) === lineaDestino && String(modulo.id) !== String(moduloActual.id))
    .sort((a, b) => Number(a.posicion) - Number(b.posicion))

  if (modulosLineaDestino.length >= 9) {
    return { lineaLlena: true, modulosLineaDestino }
  }

  const posicionInsercion = Math.max(1, Math.min(posicionDestino, modulosLineaDestino.length + 1))

  const movimientosOrigen = modulosActivos
    .filter((modulo) =>
      Number(modulo.linea) === lineaOrigen &&
      String(modulo.id) !== String(moduloActual.id) &&
      Number(modulo.posicion) > posicionOrigen
    )
    .map((modulo) => ({
      id: modulo.id,
      linea: lineaOrigen,
      posicion: Number(modulo.posicion) - 1,
      posicionActual: Number(modulo.posicion),
    }))
    .sort((a, b) => a.posicionActual - b.posicionActual)

  const movimientosDestino = modulosLineaDestino
    .filter((modulo) => Number(modulo.posicion) >= posicionInsercion)
    .map((modulo) => ({
      id: modulo.id,
      linea: lineaDestino,
      posicion: Number(modulo.posicion) + 1,
      posicionActual: Number(modulo.posicion),
    }))
    .sort((a, b) => b.posicionActual - a.posicionActual)

  return {
    lineaLlena: false,
    posicionInsercion,
    movimientosOrigen,
    movimientosDestino,
  }
}

export async function moverModuloEnTablero({
  supabase,
  moduloId,
  lineaDestino,
  posicionDestino,
}) {
  if (!moduloId) {
    return { ok: false, tipo: 'modulo_invalido' }
  }

  const lineaDestinoParsed = Number(lineaDestino)
  const posicionDestinoParsed = Number(posicionDestino)

  const { data: modulosActivos, error: errorCarga } = await cargarModulosActivosParaMovimiento({ supabase })
  if (errorCarga) {
    return { ok: false, tipo: 'error_carga', error: errorCarga }
  }

  const moduloActual = modulosActivos.find(
    (modulo) => String(modulo.id) === String(moduloId)
  )

  if (!moduloActual) {
    return { ok: false, tipo: 'no_encontrado' }
  }

  const lineaOrigen = Number(moduloActual.linea)
  const posicionOrigen = Number(moduloActual.posicion)

  if (lineaOrigen === lineaDestinoParsed && posicionOrigen === posicionDestinoParsed) {
    return { ok: true, tipo: 'misma_posicion' }
  }

  const moduloDestino = modulosActivos.find(
    (modulo) =>
      Number(modulo.linea) === lineaDestinoParsed &&
      Number(modulo.posicion) === posicionDestinoParsed &&
      String(modulo.id) !== String(moduloId)
  )

  const posicionTemporal = crearPosicionTemporal()

  if (moduloDestino && lineaOrigen === lineaDestinoParsed) {
    const movimientos = calcularMovimientosMismaLinea({
      modulosActivos,
      moduloActual,
      lineaOrigen,
      posicionOrigen,
      posicionDestino: posicionDestinoParsed,
    })

    await moverRegistro({ supabase, id: moduloActual.id, linea: lineaOrigen, posicion: posicionTemporal })

    for (const movimiento of movimientos) {
      await moverRegistro({ supabase, ...movimiento })
    }

    await moverRegistro({
      supabase,
      id: moduloActual.id,
      linea: lineaDestinoParsed,
      posicion: posicionDestinoParsed,
    })

    return { ok: true, tipo: 'insertado_misma_linea' }
  }

  if (lineaOrigen !== lineaDestinoParsed) {
    const calculo = calcularMovimientosCambioLinea({
      modulosActivos,
      moduloActual,
      lineaOrigen,
      lineaDestino: lineaDestinoParsed,
      posicionOrigen,
      posicionDestino: posicionDestinoParsed,
    })

    if (calculo.lineaLlena) {
      return { ok: false, tipo: 'linea_llena', lineaDestino: lineaDestinoParsed }
    }

    await moverRegistro({ supabase, id: moduloActual.id, linea: lineaOrigen, posicion: posicionTemporal })

    for (const movimiento of calculo.movimientosOrigen) {
      await moverRegistro({ supabase, ...movimiento })
    }

    for (const movimiento of calculo.movimientosDestino) {
      await moverRegistro({ supabase, ...movimiento })
    }

    await moverRegistro({
      supabase,
      id: moduloActual.id,
      linea: lineaDestinoParsed,
      posicion: calculo.posicionInsercion,
    })

    return { ok: true, tipo: 'agregado_otra_linea' }
  }

  await moverRegistro({ supabase, id: moduloActual.id, linea: lineaOrigen, posicion: posicionTemporal })

  if (moduloDestino) {
    await moverRegistro({ supabase, id: moduloDestino.id, linea: lineaOrigen, posicion: posicionOrigen })
  }

  await moverRegistro({
    supabase,
    id: moduloActual.id,
    linea: lineaDestinoParsed,
    posicion: posicionDestinoParsed,
  })

  return { ok: true, tipo: moduloDestino ? 'intercambiado' : 'movido' }
}
