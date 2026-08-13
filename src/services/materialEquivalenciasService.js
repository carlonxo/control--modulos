export const equivalenciasMaterialesBase = [
  {
    origen: 'CABLE RZ-1 2.5 MM2',
    destino: 'Cable RZ1 2,5mm (Alum + Ench)',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'CABLE RZ-1 4.0 MM2',
    destino: 'Cable RZ1 4mm (Termo)',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'CABLE RZ-1 6.0 MM2',
    destino: 'Cable RZ1 6mm (Alimentación)',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'CINTA DE AISLAR',
    destino: 'CINTA DE AISLAR',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'CINTA AISLANTE',
    destino: 'CINTA DE AISLAR',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'FERRULER 2.5 MM',
    destino: 'FERRULER 2.5 MM',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'FERRULER 2.5 MM CON AISLACION',
    destino: 'FERRULER 2.5 MM',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'FERRULER 4.0 MM',
    destino: 'FERRULER 4.0 MM',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'FERRULER 4.0 MM CON AISLACION',
    destino: 'FERRULER 4.0 MM',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'ENCH. 2P+T 10',
    destino: 'MODULO ENCH. 2P+T 10A VIMAR NEVE',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'ENCH. 2P+T 16',
    destino: 'MODULO ENCH. 2P+T 16A VIMAR NEVE',
    tipo: 'contiene',
    activo: true,
  },
  {
    origen: 'INT. 9/12',
    destino: 'MODULO INT. 9/12 VIMAR NEVE 09001',
    tipo: 'contiene',
    activo: true,
  },
]

export function normalizarEquivalenciaMaterial(item = {}, orden = 0) {
  return {
    id: item.id || '',
    origen: String(item.origen || '').trim(),
    destino: String(item.destino || '').trim(),
    tipo: item.tipo === 'exacto' ? 'exacto' : 'contiene',
    activo: item.activo !== false,
    orden: Number.isFinite(Number(item.orden)) ? Number(item.orden) : orden,
  }
}

export function combinarEquivalenciasMateriales(equivalencias = []) {
  const mapa = new Map()

  equivalenciasMaterialesBase.forEach((item, index) => {
    const fila = normalizarEquivalenciaMaterial(item, index)
    mapa.set(claveEquivalencia(fila), fila)
  })

  equivalencias.forEach((item, index) => {
    const fila = normalizarEquivalenciaMaterial(item, index + equivalenciasMaterialesBase.length)
    if (!fila.origen || !fila.destino) return
    mapa.set(claveEquivalencia(fila), fila)
  })

  return [...mapa.values()].sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
}

export async function cargarEquivalenciasMateriales({ supabase }) {
  const { data, error } = await supabase
    .from('material_equivalencias')
    .select('id, origen, destino, tipo, activo, orden')
    .order('orden', { ascending: true })
    .order('origen', { ascending: true })

  if (error) {
    return {
      data: combinarEquivalenciasMateriales([]),
      error,
    }
  }

  return {
    data: combinarEquivalenciasMateriales(data || []),
    error: null,
  }
}

export async function guardarEquivalenciasMateriales({ supabase, equivalencias = [] }) {
  const filas = equivalencias
    .map((item, index) => normalizarEquivalenciaMaterial(item, index))
    .filter((item) => item.origen && item.destino)
    .map((item, index) => ({
      id: item.id || '',
      origen: item.origen,
      destino: item.destino,
      tipo: item.tipo,
      activo: item.activo,
      orden: index,
    }))

  const { data: actuales, error: selectError } = await supabase
    .from('material_equivalencias')
    .select('id, origen, tipo')

  if (selectError) return { error: selectError }

  const actualesPorId = new Map((actuales || []).map((item) => [String(item.id), item]))
  const actualesPorClave = new Map((actuales || []).map((item) => [claveEquivalencia(item), item]))
  const idsConservados = new Set()

  for (const fila of filas) {
    const existente = fila.id
      ? actualesPorId.get(String(fila.id))
      : actualesPorClave.get(claveEquivalencia(fila))

    if (existente?.id) {
      idsConservados.add(String(existente.id))
      const { error } = await supabase
        .from('material_equivalencias')
        .update({
          origen: fila.origen,
          destino: fila.destino,
          tipo: fila.tipo,
          activo: fila.activo,
          orden: fila.orden,
          actualizado_en: new Date().toISOString(),
        })
        .eq('id', existente.id)

      if (error) return { error }
      continue
    }

    const { data: insertado, error } = await supabase
      .from('material_equivalencias')
      .insert({
        origen: fila.origen,
        destino: fila.destino,
        tipo: fila.tipo,
        activo: fila.activo,
        orden: fila.orden,
      })
      .select('id')
      .single()

    if (error) return { error }
    if (insertado?.id) idsConservados.add(String(insertado.id))
  }

  const idsAEliminar = (actuales || [])
    .map((item) => String(item.id))
    .filter((id) => !idsConservados.has(id))

  for (const id of idsAEliminar) {
    const { error } = await supabase
      .from('material_equivalencias')
      .delete()
      .eq('id', id)

    if (error) return { error }
  }

  return cargarEquivalenciasMateriales({ supabase })
}

function claveEquivalencia(item) {
  return `${String(item.origen || '').trim().toLowerCase()}__${String(item.tipo || '').trim().toLowerCase()}`
}
