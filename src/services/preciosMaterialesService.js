export async function cargarPreciosMateriales({
  supabase,
  catalogo,
}) {
  const respuesta = await supabase
    .from('material_precios')
    .select('material, material_original, id_art_interno, id_art, precio, precio_compra')

  const respuestaSinMaterialOriginal = respuesta.error?.message?.includes('material_original')
    ? await supabase
      .from('material_precios')
      .select('material, id_art_interno, id_art, precio, precio_compra')
    : respuesta

  const respuestaSinIdInterno = respuestaSinMaterialOriginal.error?.message?.includes('id_art_interno')
    ? await supabase
      .from('material_precios')
      .select('material, material_original, id_art, precio, precio_compra')
    : respuestaSinMaterialOriginal

  const { data, error } = respuestaSinIdInterno.error?.message?.includes('precio_compra')
    ? await supabase
      .from('material_precios')
      .select('material, id_art, precio')
    : respuestaSinIdInterno

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
  ;(data || []).forEach((item) => {
    if (!item.material_original) return
    preciosGuardados[item.material_original] = item.precio ?? ''
  })
  const preciosCompraGuardados = Object.fromEntries((data || []).map((item) => [
    item.material,
    item.precio_compra ?? '',
  ]))
  ;(data || []).forEach((item) => {
    if (!item.material_original) return
    preciosCompraGuardados[item.material_original] = item.precio_compra ?? ''
  })
  const preciosGuardadosPorId = Object.fromEntries((data || [])
    .filter((item) => item.id_art)
    .map((item) => [
      String(item.id_art),
      item.precio ?? '',
    ]))
  const preciosCompraGuardadosPorId = Object.fromEntries((data || [])
    .filter((item) => item.id_art)
    .map((item) => [
      String(item.id_art),
      item.precio_compra ?? '',
    ]))
  const resolverPrecioCompra = (item) => {
    const guardado = preciosCompraGuardados[item.material] ?? (
      item.idArt ? preciosCompraGuardadosPorId[String(item.idArt)] : undefined
    )
    const respaldo = item.precioCompra ?? ''
    const guardadoVacio = guardado === undefined || guardado === null || String(guardado).trim() === '' || Number(guardado) === 0
    return guardadoVacio && Number(respaldo || 0) > 0 ? respaldo : guardado ?? respaldo
  }

  const precios = {}
  const preciosCompra = {}
  catalogo.forEach((item) => {
    const precioVenta = preciosGuardados[item.material] ?? (
      item.idArt ? preciosGuardadosPorId[String(item.idArt)] : undefined
    ) ?? item.precio
    const precioCompra = resolverPrecioCompra(item)
    precios[item.material] = precioVenta
    preciosCompra[item.material] = precioCompra
    if (item.materialOriginal) {
      precios[item.materialOriginal] = precioVenta
      preciosCompra[item.materialOriginal] = precioCompra
    }
  })

  return {
    precios,
    preciosCompra,
    error: null,
  }
}

export async function cargarCatalogoMaterialesGuardado({
  supabase,
}) {
  const respuesta = await supabase
    .from('material_precios')
    .select('material, material_original, id_art_interno, id_art, seccion, precio, precio_compra, activo, updated_at')
    .order('updated_at', { ascending: false })

  const respuestaSinMaterialOriginal = respuesta.error?.message?.includes('material_original')
    ? await supabase
      .from('material_precios')
      .select('material, id_art_interno, id_art, seccion, precio, precio_compra, activo, updated_at')
      .order('updated_at', { ascending: false })
    : respuesta

  const respuestaSinIdInterno = respuestaSinMaterialOriginal.error?.message?.includes('id_art_interno')
    ? await supabase
      .from('material_precios')
      .select('material, material_original, id_art, seccion, precio, precio_compra, activo, updated_at')
      .order('updated_at', { ascending: false })
    : respuestaSinMaterialOriginal

  const respuestaSinActivo = respuestaSinIdInterno.error?.message?.includes('activo')
    ? await supabase
      .from('material_precios')
      .select('material, id_art, seccion, precio, precio_compra, updated_at')
      .order('updated_at', { ascending: false })
    : respuestaSinIdInterno

  const { data, error } = respuestaSinActivo.error?.message?.includes('precio_compra')
    ? await supabase
      .from('material_precios')
      .select('material, id_art, seccion, precio')
    : respuestaSinActivo

  if (error) {
    return { catalogo: [], error }
  }

  const catalogoSinDuplicados = []
  const clavesVistas = new Set()

  ;(data || []).forEach((item) => {
    const clave = item.id_art ? `id:${item.id_art}` : `material:${String(item.material || '').toLowerCase()}`
    if (clavesVistas.has(clave)) return
    clavesVistas.add(clave)
    catalogoSinDuplicados.push({
      material: item.material,
      materialOriginal: item.material_original || '',
      idArtInterno: item.id_art_interno || '',
      idArtVisible: item.id_art || item.id_art_interno || '',
      idArt: item.id_art || '',
      seccion: item.seccion || 'Consumibles',
      precio: item.precio ?? 0,
      precioCompra: item.precio_compra ?? 0,
      activo: item.activo ?? true,
    })
  })

  return {
    catalogo: catalogoSinDuplicados,
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
  const resolverPrecio = (item, mapa, campoCatalogo) => normalizarPrecioMaterial(
    mapa[item.material] ??
    mapa[item.materialOriginal] ??
    item[campoCatalogo] ??
    0
  )
  const filas = catalogo.map((item) => ({
    material: item.material,
    material_original: item.materialOriginal || null,
    id_art_interno: item.idArtInterno || null,
    id_art: item.idArt || null,
    seccion: item.seccion,
    precio: resolverPrecio(item, precios, 'precio'),
    precio_compra: resolverPrecio(item, preciosCompra, 'precioCompra'),
    activo: item.activo ?? true,
    updated_at: new Date().toISOString(),
  }))

  const verificarGuardado = async () => {
    const { catalogo: catalogoVerificado, error: errorVerificacion } = await cargarCatalogoMaterialesGuardado({ supabase })
    if (errorVerificacion) return { error: errorVerificacion }

    const porMaterial = Object.fromEntries((catalogoVerificado || []).map((item) => [
      normalizarMaterial(item.material),
      item,
    ]))
    const porId = Object.fromEntries((catalogoVerificado || [])
      .filter((item) => item.idArt)
      .map((item) => [String(item.idArt), item]))

    const noConfirmados = filas.filter((fila) => {
      const guardado = fila.id_art ? porId[String(fila.id_art)] : porMaterial[normalizarMaterial(fila.material)]
      if (!guardado) return true

      return normalizarPrecioMaterial(guardado.precio) !== normalizarPrecioMaterial(fila.precio) ||
        normalizarPrecioMaterial(guardado.precioCompra) !== normalizarPrecioMaterial(fila.precio_compra)
    })

    if (noConfirmados.length > 0) {
      const ejemplo = noConfirmados[0]
      return {
        error: new Error(`Supabase no confirmó el guardado de "${ejemplo.material}" (venta ${ejemplo.precio}, compra ${ejemplo.precio_compra})`),
      }
    }

    return { error: null, catalogo: catalogoVerificado }
  }

  const respuestasRpc = []
  for (const fila of filas) {
    const respuestaRpc = await supabase.rpc('guardar_material_precio', {
      p_material: fila.material,
      p_id_art: fila.id_art,
      p_seccion: fila.seccion,
      p_precio: fila.precio,
      p_precio_compra: fila.precio_compra,
      p_activo: fila.activo,
    })

    respuestasRpc.push(respuestaRpc)
    const funcionNoExiste = respuestaRpc.error?.message?.includes('guardar_material_precio')
      || respuestaRpc.error?.message?.includes('Could not find the function')
    if (respuestaRpc.error && !funcionNoExiste) {
      return { error: respuestaRpc.error }
    }
  }

  const existeFuncionRpc = respuestasRpc.some((respuesta) => !respuesta.error)
  if (existeFuncionRpc) {
    await guardarIdsInternosMateriales({ supabase, filas })
    return verificarGuardado()
  }

  let { error } = await supabase
    .from('material_precios')
    .upsert(filas, { onConflict: 'material' })

  if (error?.message?.includes('activo')) {
    const filasSinActivo = filas.map(({ activo, ...fila }) => fila)
    const respuesta = await supabase
      .from('material_precios')
      .upsert(filasSinActivo, { onConflict: 'material' })
    error = respuesta.error
  }

  if (error?.message?.includes('material_original')) {
    const filasSinOriginal = filas.map(({ material_original, ...fila }) => fila)
    const respuesta = await supabase
      .from('material_precios')
      .upsert(filasSinOriginal, { onConflict: 'material' })
    error = respuesta.error
  }

  if (error?.message?.includes('id_art_interno')) {
    const filasSinInterno = filas.map(({ id_art_interno, ...fila }) => fila)
    const respuesta = await supabase
      .from('material_precios')
      .upsert(filasSinInterno, { onConflict: 'material' })
    error = respuesta.error
  }

  if (error?.message?.includes('precio_compra')) {
    const filasSinCompra = filas.map(({ precio_compra, ...fila }) => fila)
    const respuesta = await supabase
      .from('material_precios')
      .upsert(filasSinCompra, { onConflict: 'material' })
    error = respuesta.error
  }

  if (error) return { error }

  return verificarGuardado()
}

export async function eliminarMaterialPrecio({
  supabase,
  item,
  precios = {},
  preciosCompra = {},
  normalizarPrecioMaterial,
}) {
  const material = item.material

  if (!item.idArt) {
    const { error } = await supabase
      .from('material_precios')
      .delete()
      .eq('material', material)

    return { error }
  }

  const filaOculta = {
    material,
    id_art: item.idArt,
    seccion: item.seccion,
    precio: normalizarPrecioMaterial(precios[material] ?? item.precio ?? 0),
    precio_compra: normalizarPrecioMaterial(preciosCompra[material] ?? item.precioCompra ?? 0),
    activo: false,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase
    .from('material_precios')
    .upsert([filaOculta], { onConflict: 'material' })

  return { error, requiereColumnaActivo: error?.message?.includes('activo') }
}

export async function renombrarMaterialPrecio({
  supabase,
  itemAnterior,
  itemNuevo,
  precioVenta,
  precioCompra,
  normalizarPrecioMaterial,
}) {
  const filaNueva = {
    material: itemNuevo.material,
    material_original: itemNuevo.materialOriginal || itemAnterior.material || null,
    id_art_interno: itemNuevo.idArtInterno || itemAnterior.idArtInterno || null,
    id_art: itemNuevo.idArt || null,
    seccion: itemNuevo.seccion,
    precio: normalizarPrecioMaterial(precioVenta ?? itemNuevo.precio ?? 0),
    precio_compra: normalizarPrecioMaterial(precioCompra ?? itemNuevo.precioCompra ?? 0),
    activo: itemNuevo.activo ?? true,
    updated_at: new Date().toISOString(),
  }

  const respuestaRpc = await supabase.rpc('renombrar_material_precio', {
    p_material_anterior: itemAnterior.material,
    p_material_nuevo: itemNuevo.material,
    p_id_art: itemNuevo.idArt || null,
    p_seccion: itemNuevo.seccion,
    p_precio: normalizarPrecioMaterial(precioVenta ?? itemNuevo.precio ?? 0),
    p_precio_compra: normalizarPrecioMaterial(precioCompra ?? itemNuevo.precioCompra ?? 0),
    p_activo: itemNuevo.activo ?? true,
  })

  if (!respuestaRpc.error) {
    await actualizarIdInternoMaterialPrecio({
      supabase,
      material: itemNuevo.material,
      idArtInterno: itemNuevo.idArtInterno || itemAnterior.idArtInterno || null,
    })
    await actualizarAliasMaterialPrecio({
      supabase,
      material: itemNuevo.material,
      materialOriginal: itemNuevo.materialOriginal || itemAnterior.material || null,
    })
    await limpiarDuplicadosRenombradoMaterial({
      supabase,
      materialAnterior: itemAnterior.material,
      materialNuevo: itemNuevo.material,
      idArt: itemNuevo.idArt,
    })
    return { error: null }
  }

  const funcionNoExiste = respuestaRpc.error.message?.includes('renombrar_material_precio')
    || respuestaRpc.error.message?.includes('Could not find the function')

  if (!funcionNoExiste) {
    return { error: respuestaRpc.error }
  }

  const materialAnterior = itemAnterior.material
  let error = null
  let filasActualizadas = 0

  if (materialAnterior) {
    const respuestaUpdate = await supabase
      .from('material_precios')
      .update(filaNueva, { count: 'exact' })
      .eq('material', materialAnterior)

    error = respuestaUpdate.error
    filasActualizadas = respuestaUpdate.count || 0
  }

  if (!error && filasActualizadas === 0 && itemNuevo.idArt) {
    const respuestaUpdatePorId = await supabase
      .from('material_precios')
      .update(filaNueva, { count: 'exact' })
      .eq('id_art', itemNuevo.idArt)

    error = respuestaUpdatePorId.error
    filasActualizadas = respuestaUpdatePorId.count || 0
  }

  if (!error && filasActualizadas === 0) {
    const respuestaInsert = await supabase
      .from('material_precios')
      .upsert([filaNueva], { onConflict: 'material' })
    error = respuestaInsert.error
  }

  if (error?.message?.includes('activo')) {
    const { activo, ...filaSinActivo } = filaNueva
    if (materialAnterior && filasActualizadas > 0) {
      const respuesta = await supabase
        .from('material_precios')
        .update(filaSinActivo)
        .eq('material', materialAnterior)
      error = respuesta.error
    } else {
      const respuesta = await supabase
        .from('material_precios')
        .upsert([filaSinActivo], { onConflict: 'material' })
      error = respuesta.error
    }
  }

  if (error?.message?.includes('material_original')) {
    const { material_original, ...filaSinOriginal } = filaNueva
    if (materialAnterior && filasActualizadas > 0) {
      const respuesta = await supabase
        .from('material_precios')
        .update(filaSinOriginal)
        .eq('material', materialAnterior)
      error = respuesta.error
    } else {
      const respuesta = await supabase
        .from('material_precios')
        .upsert([filaSinOriginal], { onConflict: 'material' })
      error = respuesta.error
    }
  }

  if (error?.message?.includes('id_art_interno')) {
    const { id_art_interno, ...filaSinInterno } = filaNueva
    if (materialAnterior && filasActualizadas > 0) {
      const respuesta = await supabase
        .from('material_precios')
        .update(filaSinInterno)
        .eq('material', materialAnterior)
      error = respuesta.error
    } else {
      const respuesta = await supabase
        .from('material_precios')
        .upsert([filaSinInterno], { onConflict: 'material' })
      error = respuesta.error
    }
  }

  if (error?.message?.includes('precio_compra')) {
    const { precio_compra, ...filaSinCompra } = filaNueva
    if (materialAnterior && filasActualizadas > 0) {
      const respuesta = await supabase
        .from('material_precios')
        .update(filaSinCompra)
        .eq('material', materialAnterior)
      error = respuesta.error
    } else {
      const respuesta = await supabase
        .from('material_precios')
        .upsert([filaSinCompra], { onConflict: 'material' })
      error = respuesta.error
    }
  }

  if (error) {
    return {
      error,
      requierePermisoInsert: filasActualizadas === 0 && error.message?.toLowerCase().includes('row-level security'),
    }
  }

  await limpiarDuplicadosRenombradoMaterial({
    supabase,
    materialAnterior: itemAnterior.material,
    materialNuevo: itemNuevo.material,
    idArt: itemNuevo.idArt,
  })
  await actualizarAliasMaterialPrecio({
    supabase,
    material: itemNuevo.material,
    materialOriginal: itemNuevo.materialOriginal || itemAnterior.material || null,
  })
  await actualizarIdInternoMaterialPrecio({
    supabase,
    material: itemNuevo.material,
    idArtInterno: itemNuevo.idArtInterno || itemAnterior.idArtInterno || null,
  })

  return { error: null }
}

async function guardarIdsInternosMateriales({
  supabase,
  filas,
}) {
  for (const fila of filas || []) {
    if (!fila.material || !fila.id_art_interno) continue
    await actualizarIdInternoMaterialPrecio({
      supabase,
      material: fila.material,
      idArtInterno: fila.id_art_interno,
    })
  }
}

async function actualizarIdInternoMaterialPrecio({
  supabase,
  material,
  idArtInterno,
}) {
  if (!material || !idArtInterno) return

  const { error } = await supabase
    .from('material_precios')
    .update({ id_art_interno: idArtInterno })
    .eq('material', material)

  if (error?.message?.includes('id_art_interno')) return
}

async function actualizarAliasMaterialPrecio({
  supabase,
  material,
  materialOriginal,
}) {
  if (!material || !materialOriginal || normalizarMaterial(material) === normalizarMaterial(materialOriginal)) return

  const { error } = await supabase
    .from('material_precios')
    .update({ material_original: materialOriginal })
    .eq('material', material)

  if (error?.message?.includes('material_original')) return
}

async function limpiarDuplicadosRenombradoMaterial({
  supabase,
  materialAnterior,
  materialNuevo,
  idArt,
}) {
  if (materialAnterior && normalizarMaterial(materialAnterior) !== normalizarMaterial(materialNuevo)) {
    await supabase
      .from('material_precios')
      .delete()
      .eq('material', materialAnterior)
  }

  if (idArt) {
    await supabase
      .from('material_precios')
      .delete()
      .eq('id_art', idArt)
      .neq('material', materialNuevo)
  }
}

function normalizarMaterial(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function renombrarClaveMateriales(materiales, materialAnterior, materialNuevo) {
  if (!materiales || typeof materiales !== 'object' || Array.isArray(materiales)) {
    return { valor: materiales, cambio: false }
  }

  const claveAnterior = normalizarMaterial(materialAnterior)
  let cambio = false
  const valor = {}

  Object.entries(materiales).forEach(([clave, contenido]) => {
    if (normalizarMaterial(clave) === claveAnterior) {
      valor[materialNuevo] = contenido
      cambio = true
    } else {
      valor[clave] = contenido
    }
  })

  return { valor, cambio }
}

function renombrarMaterialEnProtocolo(protocolo, materialAnterior, materialNuevo) {
  if (!protocolo || typeof protocolo !== 'object' || Array.isArray(protocolo)) {
    return { valor: protocolo, cambio: false }
  }

  const protocoloActualizado = { ...protocolo }
  let cambio = false

  const materiales = renombrarClaveMateriales(protocoloActualizado.materiales, materialAnterior, materialNuevo)
  if (materiales.cambio) {
    protocoloActualizado.materiales = materiales.valor
    cambio = true
  }

  const detalleMateriales = renombrarClaveMateriales(protocoloActualizado.detalleMateriales, materialAnterior, materialNuevo)
  if (detalleMateriales.cambio) {
    protocoloActualizado.detalleMateriales = detalleMateriales.valor
    cambio = true
  }

  return { valor: protocoloActualizado, cambio }
}

async function propagarRenombradoEnTabla({
  supabase,
  tabla,
  materialAnterior,
  materialNuevo,
}) {
  const { data, error } = await supabase
    .from(tabla)
    .select('id, materiales, protocolo_entrega')

  if (error) return { error, actualizados: 0 }

  let actualizados = 0

  for (const registro of data || []) {
    const materiales = renombrarClaveMateriales(registro.materiales, materialAnterior, materialNuevo)
    const protocolo = renombrarMaterialEnProtocolo(registro.protocolo_entrega, materialAnterior, materialNuevo)
    if (!materiales.cambio && !protocolo.cambio) continue

    const payload = {}
    if (materiales.cambio) payload.materiales = materiales.valor
    if (protocolo.cambio) payload.protocolo_entrega = protocolo.valor

    const { error: errorUpdate } = await supabase
      .from(tabla)
      .update(payload)
      .eq('id', registro.id)

    if (errorUpdate) return { error: errorUpdate, actualizados }
    actualizados += 1
  }

  return { error: null, actualizados }
}

export async function propagarRenombradoMaterial({
  supabase,
  materialAnterior,
  materialNuevo,
}) {
  const tablasConMateriales = ['modulos', 'historial_modulos', 'protocolos_manuales']
  let actualizados = 0

  for (const tabla of tablasConMateriales) {
    const resultado = await propagarRenombradoEnTabla({
      supabase,
      tabla,
      materialAnterior,
      materialNuevo,
    })
    if (resultado.error) return resultado
    actualizados += resultado.actualizados
  }

  const { data: itemsVale, error: errorVales } = await supabase
    .from('vales_bodega_items')
    .select('id, material_balance')

  if (errorVales && !errorVales.message?.includes('vales_bodega_items')) {
    return { error: errorVales, actualizados }
  }

  for (const itemVale of itemsVale || []) {
    if (normalizarMaterial(itemVale.material_balance) !== normalizarMaterial(materialAnterior)) continue
    const { error } = await supabase
      .from('vales_bodega_items')
      .update({ material_balance: materialNuevo })
      .eq('id', itemVale.id)
    if (error) return { error, actualizados }
    actualizados += 1
  }

  const claveAnterior = normalizarMaterial(materialAnterior)
  const claveNueva = normalizarMaterial(materialNuevo)
  const { data: configs, error: errorConfig } = await supabase
    .from('balance_materiales_config')
    .select('material_key, nombre_visible, valor_compra')

  if (errorConfig && !errorConfig.message?.includes('balance_materiales_config')) {
    return { error: errorConfig, actualizados }
  }

  for (const config of configs || []) {
    const coincideClave = config.material_key === claveAnterior
    const coincideNombre = normalizarMaterial(config.nombre_visible) === claveAnterior
    if (!coincideClave && !coincideNombre) continue

    const payload = {
      material_key: coincideClave ? claveNueva : config.material_key,
      nombre_visible: materialNuevo,
      valor_compra: config.valor_compra ?? 0,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('balance_materiales_config')
      .upsert(payload, { onConflict: 'material_key' })
    if (error) return { error, actualizados }

    if (coincideClave && claveAnterior !== claveNueva) {
      await supabase
        .from('balance_materiales_config')
        .delete()
        .eq('material_key', claveAnterior)
    }
    actualizados += 1
  }

  return { error: null, actualizados }
}
