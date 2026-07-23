export async function cargarPreciosMateriales({
  supabase,
  catalogo,
}) {
  const respuesta = await supabase
    .from('material_precios')
    .select('material, precio, precio_compra')

  const { data, error } = respuesta.error?.message?.includes('precio_compra')
    ? await supabase
      .from('material_precios')
      .select('material, precio')
    : respuesta

  const preciosPorDefecto = Object.fromEntries(catalogo.map((item) => [
    item.material,
    item.precio,
  ]))
  const preciosCompraPorDefecto = Object.fromEntries(catalogo.map((item) => [
    item.material,
    item.precioCompra ?? '',
  ]))

  if (error) {
    return {
      precios: preciosPorDefecto,
      preciosCompra: preciosCompraPorDefecto,
      error,
    }
  }

  const preciosGuardados = Object.fromEntries((data || []).map((item) => [
    item.material,
    item.precio ?? '',
  ]))
  const preciosCompraGuardados = Object.fromEntries((data || []).map((item) => [
    item.material,
    item.precio_compra ?? '',
  ]))
  const resolverPrecioCompra = (item) => {
    const guardado = preciosCompraGuardados[item.material]
    const respaldo = item.precioCompra ?? ''
    const guardadoVacio = guardado === undefined || guardado === null || String(guardado).trim() === '' || Number(guardado) === 0
    return guardadoVacio && Number(respaldo || 0) > 0 ? respaldo : guardado ?? respaldo
  }

  return {
    precios: Object.fromEntries(catalogo.map((item) => [
      item.material,
      preciosGuardados[item.material] ?? item.precio,
    ])),
    preciosCompra: Object.fromEntries(catalogo.map((item) => [
      item.material,
      resolverPrecioCompra(item),
    ])),
    error: null,
  }
}

export async function cargarCatalogoMaterialesGuardado({
  supabase,
}) {
  const respuesta = await supabase
    .from('material_precios')
    .select('material, id_art, seccion, precio, precio_compra')

  const { data, error } = respuesta.error?.message?.includes('precio_compra')
    ? await supabase
      .from('material_precios')
      .select('material, id_art, seccion, precio')
    : respuesta

  if (error) {
    return { catalogo: [], error }
  }

  return {
    catalogo: (data || []).map((item) => ({
      material: item.material,
      idArt: item.id_art || '',
      seccion: item.seccion || 'Consumibles',
      precio: item.precio ?? 0,
      precioCompra: item.precio_compra ?? 0,
    })),
    error: null,
  }
}

export async function guardarPreciosMateriales({
  supabase,
  catalogo,
  precios,
  preciosCompra = {},
  normalizarPrecioMaterial,
}) {
  const filas = catalogo.map((item) => ({
    material: item.material,
    id_art: item.idArt || null,
    seccion: item.seccion,
    precio: normalizarPrecioMaterial(precios[item.material]),
    precio_compra: normalizarPrecioMaterial(preciosCompra[item.material]),
    updated_at: new Date().toISOString(),
  }))

  let { error } = await supabase
    .from('material_precios')
    .upsert(filas, { onConflict: 'material' })

  if (error?.message?.includes('precio_compra')) {
    const filasSinCompra = filas.map(({ precio_compra, ...fila }) => fila)
    const respuesta = await supabase
      .from('material_precios')
      .upsert(filasSinCompra, { onConflict: 'material' })
    error = respuesta.error
  }

  return { error }
}
