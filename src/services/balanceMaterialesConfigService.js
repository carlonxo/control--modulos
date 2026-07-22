export async function cargarConfigBalanceMateriales({
  supabase,
  normalizarPrecioMaterial,
  storage = globalThis.localStorage,
}) {
  const { data, error } = await supabase
    .from('balance_materiales_config')
    .select('material_key, nombre_visible, valor_compra')

  if (error) {
    return {
      config: {},
      error,
    }
  }

  const config = Object.fromEntries((data || []).map((item) => [
    item.material_key,
    {
      nombreVisible: item.nombre_visible || '',
      valorCompra: item.valor_compra ?? '',
    },
  ]))

  const { config: configMigrada } = await migrarConfigLocalBalance({
    supabase,
    normalizarPrecioMaterial,
    storage,
    config,
  })

  return {
    config: configMigrada,
    error: null,
  }
}

export async function guardarConfigBalanceMaterial({
  supabase,
  clave,
  config,
  normalizarPrecioMaterial,
}) {
  if (!clave) return { error: null }

  const { error } = await supabase
    .from('balance_materiales_config')
    .upsert({
      material_key: clave,
      nombre_visible: config.nombreVisible || null,
      valor_compra: normalizarPrecioMaterial(config.valorCompra),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'material_key' })

  return { error }
}

async function migrarConfigLocalBalance({
  supabase,
  normalizarPrecioMaterial,
  storage,
  config,
}) {
  let configFinal = config

  try {
    const comprasLocales = JSON.parse(storage?.getItem('balance_materiales_valores_compra') || '{}')
    const nombresLocales = JSON.parse(storage?.getItem('balance_materiales_nombres') || '{}')
    const clavesLocales = [...new Set([...Object.keys(comprasLocales), ...Object.keys(nombresLocales)])]
    const filasMigrar = clavesLocales
      .filter((clave) => !config[clave] && (comprasLocales[clave] !== undefined || nombresLocales[clave]))
      .map((clave) => ({
        material_key: clave,
        nombre_visible: nombresLocales[clave] || null,
        valor_compra: normalizarPrecioMaterial(comprasLocales[clave]),
        updated_at: new Date().toISOString(),
      }))

    if (filasMigrar.length === 0) return { config: configFinal, error: null }

    const { error } = await supabase
      .from('balance_materiales_config')
      .upsert(filasMigrar, { onConflict: 'material_key' })

    if (error) return { config: configFinal, error }

    configFinal = {
      ...config,
      ...Object.fromEntries(filasMigrar.map((fila) => [
        fila.material_key,
        {
          nombreVisible: fila.nombre_visible || '',
          valorCompra: fila.valor_compra ?? '',
        },
      ])),
    }
  } catch {
    // Si no existe información local o no se puede leer, seguimos con Supabase.
  }

  return { config: configFinal, error: null }
}
