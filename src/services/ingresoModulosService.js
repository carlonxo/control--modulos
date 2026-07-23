async function actualizarPosicionModulo({ supabase, id, posicion }) {
  const { error } = await supabase
    .from('modulos')
    .update({ posicion })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
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
}) {
  return supabase
    .from('modulos')
    .insert([
      {
        serie,
        tipo,
        proyecto,
        responsable: String(responsable || '').trim() || null,
        linea,
        posicion,
        estado: 'Sin iniciar',
        fecha_ingreso: new Date(),
      },
    ])
    .select('*')
    .single()
}
