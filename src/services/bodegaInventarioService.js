export async function cargarInventariosBodega({ supabase, limite = 30 }) {
  const { data: inventarios, error } = await supabase
    .from('bodega_inventarios')
    .select('*')
    .order('fecha', { ascending: false })
    .limit(limite)

  if (error) return { inventarios: [], error }

  const ids = (inventarios || []).map((item) => item.id).filter(Boolean)
  if (ids.length === 0) return { inventarios: [], error: null }

  const { data: items, error: errorItems } = await supabase
    .from('bodega_inventario_items')
    .select('*')
    .in('inventario_id', ids)
    .order('descripcion', { ascending: true })

  if (errorItems) return { inventarios: [], error: errorItems }

  const { data: movimientos, error: errorMovimientos } = await supabase
    .from('bodega_movimientos_excel')
    .select('inventario_id, codigo_bodega')
    .in('inventario_id', ids)

  if (errorMovimientos) return { inventarios: [], error: errorMovimientos }

  const movimientosPorInventario = (movimientos || []).reduce((mapa, movimiento) => {
    mapa[movimiento.inventario_id] = (mapa[movimiento.inventario_id] || 0) + 1
    return mapa
  }, {})

  const itemsPorInventario = (items || []).reduce((mapa, item) => {
    if (!mapa[item.inventario_id]) mapa[item.inventario_id] = []
    mapa[item.inventario_id].push(normalizarItemBodegaDesdeSupabase(item))
    return mapa
  }, {})

  return {
    inventarios: (inventarios || []).map((inventario) => {
      const itemsInventario = itemsPorInventario[inventario.id] || []
      return {
        id: inventario.id,
        fecha: inventario.fecha,
        hoja: inventario.hoja_nombre,
        archivoNombre: inventario.archivo_nombre || '',
        cargadoPor: inventario.cargado_por || '',
        creadoEn: inventario.creado_en,
        totalItems: itemsInventario.length,
        movimientos: movimientosPorInventario[inventario.id] || 0,
        resumen: calcularResumenItemsBodega(itemsInventario),
        items: itemsInventario,
      }
    }),
    error: null,
  }
}

export async function guardarInventariosBodega({
  supabase,
  inventarios = [],
  archivoNombre = '',
  cargadoPor = '',
}) {
  for (const inventario of inventarios) {
    const { data: inventarioGuardado, error } = await supabase
      .from('bodega_inventarios')
      .upsert({
        fecha: inventario.fecha,
        archivo_nombre: archivoNombre,
        hoja_nombre: inventario.hoja,
        cargado_por: cargadoPor,
      }, {
        onConflict: 'fecha,hoja_nombre',
      })
      .select()
      .single()

    if (error) return { error, etapa: 'inventario' }

    const inventarioId = inventarioGuardado.id

    const { error: errorEliminarItems } = await supabase
      .from('bodega_inventario_items')
      .delete()
      .eq('inventario_id', inventarioId)

    if (errorEliminarItems) return { error: errorEliminarItems, etapa: 'items' }

    const { error: errorEliminarMovimientos } = await supabase
      .from('bodega_movimientos_excel')
      .delete()
      .eq('inventario_id', inventarioId)

    if (errorEliminarMovimientos) return { error: errorEliminarMovimientos, etapa: 'movimientos' }

    const items = (inventario.items || []).map((item) => ({
      inventario_id: inventarioId,
      codigo_bodega: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad || '',
      entradas: item.entradas || 0,
      salidas: item.salidas || 0,
      saldo_inicial: item.saldoInicial || 0,
      stock_container: item.stockContainer || 0,
      saldo_final: item.saldoFinal || 0,
      fila_excel: item.filaExcel || null,
    }))

    const { error: errorInsertItems } = await insertarPorLotes({
      supabase,
      tabla: 'bodega_inventario_items',
      filas: items,
    })

    if (errorInsertItems) return { error: errorInsertItems, etapa: 'items' }

    const movimientos = (inventario.items || []).flatMap((item) => (
      (item.movimientos || []).map((movimiento) => ({
        inventario_id: inventarioId,
        codigo_bodega: item.codigo,
        fecha: movimiento.fecha || inventario.fecha,
        tipo: movimiento.tipo || '',
        documento: movimiento.documento || '',
        contexto: movimiento.contexto || '',
        cantidad: movimiento.cantidad || 0,
      }))
    ))

    const { error: errorInsertMovimientos } = await insertarPorLotes({
      supabase,
      tabla: 'bodega_movimientos_excel',
      filas: movimientos,
    })

    if (errorInsertMovimientos) return { error: errorInsertMovimientos, etapa: 'movimientos' }
  }

  return { error: null, etapa: '' }
}

export async function cargarEquivalenciasBodega({ supabase }) {
  const { data, error } = await supabase
    .from('bodega_equivalencias_materiales')
    .select('*')
    .order('material_bodega', { ascending: true })

  if (error) return { equivalencias: {}, error }

  return {
    equivalencias: (data || []).reduce((mapa, item) => {
      mapa[item.codigo_bodega] = {
        id: item.id,
        codigoBodega: item.codigo_bodega || '',
        materialBodega: item.material_bodega || '',
        idArt: item.id_art || '',
        materialCatalogo: item.material_catalogo || '',
      }
      return mapa
    }, {}),
    error: null,
  }
}

export async function guardarEquivalenciaBodega({
  supabase,
  itemBodega,
  materialCatalogo = '',
  catalogo = [],
  creadoPor = '',
}) {
  const codigoBodega = String(itemBodega?.codigo || '').trim()
  if (!codigoBodega) {
    return { error: new Error('El material de bodega no tiene código.') }
  }

  if (!materialCatalogo) {
    const { error } = await supabase
      .from('bodega_equivalencias_materiales')
      .delete()
      .eq('codigo_bodega', codigoBodega)

    return { error }
  }

  const itemCatalogo = catalogo.find((item) => item.material === materialCatalogo) || {}
  const idArt = itemCatalogo.idArtVisible || itemCatalogo.idArt || itemCatalogo.idArtInterno || ''

  const { error } = await supabase
    .from('bodega_equivalencias_materiales')
    .upsert({
      codigo_bodega: codigoBodega,
      material_bodega: itemBodega?.descripcion || '',
      id_art: String(idArt || ''),
      material_catalogo: materialCatalogo,
      creado_por: creadoPor,
      actualizado_en: new Date().toISOString(),
    }, {
      onConflict: 'codigo_bodega',
    })

  return { error }
}

async function insertarPorLotes({ supabase, tabla, filas = [], tamanoLote = 500 }) {
  for (let inicio = 0; inicio < filas.length; inicio += tamanoLote) {
    const lote = filas.slice(inicio, inicio + tamanoLote)
    if (lote.length === 0) continue
    const { error } = await supabase.from(tabla).insert(lote)
    if (error) return { error }
  }

  return { error: null }
}

function normalizarItemBodegaDesdeSupabase(item) {
  return {
    id: item.id,
    filaExcel: item.fila_excel,
    codigo: item.codigo_bodega || '',
    descripcion: item.descripcion || '',
    unidad: item.unidad || '',
    entradas: Number(item.entradas || 0),
    salidas: Number(item.salidas || 0),
    saldoInicial: Number(item.saldo_inicial || 0),
    stockContainer: Number(item.stock_container || 0),
    saldoFinal: Number(item.saldo_final || 0),
    movimientos: [],
  }
}

function calcularResumenItemsBodega(items = []) {
  return items.reduce((total, item) => ({
    entradas: total.entradas + Number(item.entradas || 0),
    salidas: total.salidas + Number(item.salidas || 0),
    saldoInicial: total.saldoInicial + Number(item.saldoInicial || 0),
    saldoFinal: total.saldoFinal + Number(item.saldoFinal || 0),
  }), {
    entradas: 0,
    salidas: 0,
    saldoInicial: 0,
    saldoFinal: 0,
  })
}
