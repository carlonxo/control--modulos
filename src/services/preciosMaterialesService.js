export async function cargarPreciosMateriales({
  supabase,
  catalogo,
}) {
  const { data, error } = await supabase
    .from('material_precios')
    .select('material, precio')

  const preciosPorDefecto = Object.fromEntries(catalogo.map((item) => [
    item.material,
    item.precio,
  ]))

  if (error) {
    return {
      precios: preciosPorDefecto,
      error,
    }
  }

  const preciosGuardados = Object.fromEntries((data || []).map((item) => [
    item.material,
    item.precio ?? '',
  ]))

  return {
    precios: Object.fromEntries(catalogo.map((item) => [
      item.material,
      preciosGuardados[item.material] ?? item.precio,
    ])),
    error: null,
  }
}

export async function guardarPreciosMateriales({
  supabase,
  catalogo,
  precios,
  normalizarPrecioMaterial,
}) {
  const filas = catalogo.map((item) => ({
    material: item.material,
    id_art: item.idArt,
    seccion: item.seccion,
    precio: normalizarPrecioMaterial(precios[item.material]),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('material_precios')
    .upsert(filas, { onConflict: 'material' })

  return { error }
}
