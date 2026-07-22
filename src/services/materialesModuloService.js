export async function cargarMaterialesModuloSupabase({ supabase, moduloId }) {
  return supabase
    .from('modulos')
    .select('materiales')
    .eq('id', moduloId)
    .single()
}

export function fusionarMaterialesEditados({
  materialesActuales,
  materialesLocales,
  camposEditados,
}) {
  const materialesFusionados = { ...(materialesActuales || {}) }

  Object.entries(camposEditados || {}).forEach(([item, tiposEditados]) => {
    const valorActual = materialesFusionados[item]
    const valorLocal = materialesLocales[item]
    const baseItem = typeof valorActual === 'object' && valorActual !== null
      ? { ...valorActual }
      : { nuevo: valorActual || '', reutilizado: '' }
    const localItem = typeof valorLocal === 'object' && valorLocal !== null
      ? valorLocal
      : { nuevo: valorLocal || '', reutilizado: '' }

    Object.keys(tiposEditados || {}).forEach((tipo) => {
      baseItem[tipo] = localItem[tipo] ?? ''
    })

    materialesFusionados[item] = baseItem
  })

  return materialesFusionados
}

export async function guardarMaterialesModuloSupabase({
  supabase,
  moduloId,
  materiales,
}) {
  return supabase
    .from('modulos')
    .update({ materiales })
    .eq('id', moduloId)
}
