export const valorBaseManoObraMantencion = 18900

export function claveItemCobro(tipo, item = {}) {
  return [
    tipo || '',
    item.material || '',
    item.materialPrecio || '',
    item.tipoCantidad || '',
  ].map((parte) => String(parte).trim()).join('|')
}

export function prepararRegistroProtocoloMensual({
  registro,
  origen,
  precios,
  catalogoPreciosProtocolo,
  camposMateriales,
  equivalenciasPrecioProtocolo,
  normalizarTextoComparacion,
  normalizarPrecioMaterial,
  parsearCantidadProtocolo,
  esEstadoGarantia,
  fechaDocumentoProtocolo,
}) {
  const valores = calcularValoresProtocoloMensual({
    registro,
    precios,
    catalogoPreciosProtocolo,
    camposMateriales,
    equivalenciasPrecioProtocolo,
    normalizarTextoComparacion,
    normalizarPrecioMaterial,
    parsearCantidadProtocolo,
    esEstadoGarantia,
  })
  const datosProtocolo = registro?.protocolo_entrega || {}
  const fechaProtocolo = fechaDocumentoProtocolo(registro)
  const ajusteValorizacion = datosProtocolo.ajuste_valorizacion || {}
  const ajustesItems = datosProtocolo.ajustes_valorizacion_items || {}
  const tieneAjustesItems = Object.keys(ajustesItems).length > 0
  const tieneAjusteMantencion = !tieneAjustesItems && ajusteValorizacion.mantencion !== undefined && ajusteValorizacion.mantencion !== null && ajusteValorizacion.mantencion !== ''
  const tieneAjusteModificacion = !tieneAjustesItems && ajusteValorizacion.modificacion !== undefined && ajusteValorizacion.modificacion !== null && ajusteValorizacion.modificacion !== ''
  const valorMantencion = tieneAjusteMantencion ? normalizarPrecioMaterial(ajusteValorizacion.mantencion) : valores.mantencion
  const valorModificacion = tieneAjusteModificacion ? normalizarPrecioMaterial(ajusteValorizacion.modificacion) : valores.modificacion

  return {
    ...registro,
    tipo: datosProtocolo.tipo || registro?.tipo || '',
    proyecto: datosProtocolo.proyecto || registro?.proyecto || '',
    linea: datosProtocolo.linea || registro?.linea || '',
    fecha_prueba_electrica: fechaProtocolo,
    origen,
    esActual: origen === 'actual',
    valorMantencion,
    valorModificacion,
    valorTotal: valorMantencion + valorModificacion,
    ajusteValorizacion,
    ajustesValorizacionItems: ajustesItems,
    tieneAjusteValorizacion: Boolean(ajusteValorizacion.motivo) || tieneAjustesItems,
    detalleCobro: {
      mantencion: valores.detalleMantencion,
      modificacion: valores.detalleModificacion,
    },
    idOt: registro?.id_ot || datosProtocolo.id_ot || datosProtocolo.idOt || '',
  }
}

function calcularValoresProtocoloMensual({
  registro,
  precios,
  catalogoPreciosProtocolo,
  camposMateriales,
  equivalenciasPrecioProtocolo,
  normalizarTextoComparacion,
  normalizarPrecioMaterial,
  parsearCantidadProtocolo,
  esEstadoGarantia,
}) {
  const detalleMateriales = registro?.protocolo_entrega?.detalleMateriales || {}
  const preciosBase = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    item.material,
    normalizarPrecioMaterial(precios[item.material] ?? item.precio),
  ]))
  const preciosBaseNormalizados = {}
  catalogoPreciosProtocolo.forEach((item) => {
    const precio = normalizarPrecioMaterial(
      precios[item.material] ??
      precios[item.materialOriginal] ??
      item.precio
    )
    preciosBaseNormalizados[normalizarTextoComparacion(item.material)] = precio
    if (item.materialOriginal) {
      preciosBaseNormalizados[normalizarTextoComparacion(item.materialOriginal)] = precio
    }
  })
  Object.entries(precios || {}).forEach(([material, precio]) => {
    preciosBaseNormalizados[normalizarTextoComparacion(material)] = normalizarPrecioMaterial(precio)
  })

  const valores = camposMateriales.reduce((totales, [itemProtocolo]) => {
    const detalle = detalleMateriales[itemProtocolo] || {}
    const materialPrecio = obtenerMaterialPrecioParaProtocolo({
      itemProtocolo,
      catalogoPreciosProtocolo,
      equivalenciasPrecioProtocolo,
      normalizarTextoComparacion,
    })
    const precioUnitario = preciosBase[materialPrecio] ?? preciosBaseNormalizados[normalizarTextoComparacion(materialPrecio)] ?? 0
    const cobroMantencion = calcularCobroCantidadProtocolo(detalle.mantencion, precioUnitario, parsearCantidadProtocolo)
    const cobroModificacion = calcularCobroCantidadProtocolo(detalle.modificacion, precioUnitario, parsearCantidadProtocolo)
    const detalleMantencionItem = [
      cobroMantencion.subtotalNuevo > 0 ? { material: itemProtocolo, materialPrecio, cantidad: cobroMantencion.nuevo, precioUnitario: cobroMantencion.precioNuevo, subtotal: cobroMantencion.subtotalNuevo, tipoCantidad: 'Nuevo' } : null,
      cobroMantencion.subtotalReutilizado > 0 ? { material: `${itemProtocolo} reutilizado`, materialPrecio, cantidad: cobroMantencion.reutilizado, precioUnitario: cobroMantencion.precioReutilizado, subtotal: cobroMantencion.subtotalReutilizado, tipoCantidad: 'Reutilizado 50%' } : null,
    ].filter(Boolean)
    const detalleModificacionItem = [
      cobroModificacion.subtotalNuevo > 0 ? { material: itemProtocolo, materialPrecio, cantidad: cobroModificacion.nuevo, precioUnitario: cobroModificacion.precioNuevo, subtotal: cobroModificacion.subtotalNuevo, tipoCantidad: 'Nuevo' } : null,
      cobroModificacion.subtotalReutilizado > 0 ? { material: `${itemProtocolo} reutilizado`, materialPrecio, cantidad: cobroModificacion.reutilizado, precioUnitario: cobroModificacion.precioReutilizado, subtotal: cobroModificacion.subtotalReutilizado, tipoCantidad: 'Reutilizado 50%' } : null,
    ].filter(Boolean)

    return {
      mantencion: totales.mantencion + cobroMantencion.subtotal,
      modificacion: totales.modificacion + cobroModificacion.subtotal,
      detalleMantencion: detalleMantencionItem.length > 0
        ? [...totales.detalleMantencion, ...detalleMantencionItem]
        : totales.detalleMantencion,
      detalleModificacion: detalleModificacionItem.length > 0
        ? [...totales.detalleModificacion, ...detalleModificacionItem]
        : totales.detalleModificacion,
    }
  }, {
    mantencion: valorBaseManoObraMantencion,
    modificacion: 0,
    detalleMantencion: [{ material: 'Mano de obra base', cantidad: 1, precioUnitario: valorBaseManoObraMantencion, subtotal: valorBaseManoObraMantencion }],
    detalleModificacion: [],
  })

  const subtotalMaterialesMantencion = valores.detalleMantencion
    .filter((item) => item.material !== 'Mano de obra base')
    .reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const subtotalMaterialesModificacion = valores.detalleModificacion
    .reduce((total, item) => total + Number(item.subtotal || 0), 0)
  const tieneCobroMaterial = (subtotalMaterialesMantencion + subtotalMaterialesModificacion) > 0

  let valoresFinales = valores

  if (esEstadoGarantia(registro?.estado || registro?.protocolo_entrega?.estado) && !tieneCobroMaterial) {
    valoresFinales = {
      mantencion: 0,
      modificacion: 0,
      detalleMantencion: [{ material: 'Módulo en garantía sin cobro de material', cantidad: 1, precioUnitario: 0, subtotal: 0 }],
      detalleModificacion: [],
    }
  }

  return aplicarAjustesItemsCobro(
    valoresFinales,
    registro?.protocolo_entrega?.ajustes_valorizacion_items || {},
    normalizarPrecioMaterial
  )
}

function aplicarAjustesItemsCobro(valores, ajustesItems = {}, normalizarPrecioMaterial) {
  const aplicar = (tipo, items = []) => items.map((item) => {
    const clave = claveItemCobro(tipo, item)
    const ajuste = ajustesItems[clave]
    if (!ajuste || ajuste.valor === undefined || ajuste.valor === null || ajuste.valor === '') {
      return { ...item, tipoCobro: tipo, claveAjuste: clave }
    }

    return {
      ...item,
      tipoCobro: tipo,
      claveAjuste: clave,
      subtotalOriginal: item.subtotal,
      subtotal: normalizarPrecioMaterial(ajuste.valor),
      ajusteValorizacionItem: ajuste,
    }
  })

  const detalleMantencion = aplicar('mantencion', valores.detalleMantencion)
  const detalleModificacion = aplicar('modificacion', valores.detalleModificacion)

  return {
    mantencion: detalleMantencion.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    modificacion: detalleModificacion.reduce((total, item) => total + Number(item.subtotal || 0), 0),
    detalleMantencion,
    detalleModificacion,
  }
}

function obtenerMaterialPrecioParaProtocolo({
  itemProtocolo,
  catalogoPreciosProtocolo,
  equivalenciasPrecioProtocolo,
  normalizarTextoComparacion,
}) {
  const clave = normalizarTextoComparacion(itemProtocolo)
  const directo = catalogoPreciosProtocolo.find((item) => (
    normalizarTextoComparacion(item.material) === clave ||
    normalizarTextoComparacion(item.materialOriginal) === clave
  ))
  if (directo) return directo.material
  const equivalente = equivalenciasPrecioProtocolo[clave]
  if (equivalente) {
    const itemEquivalente = catalogoPreciosProtocolo.find((item) => (
      normalizarTextoComparacion(item.material) === normalizarTextoComparacion(equivalente) ||
      normalizarTextoComparacion(item.materialOriginal) === normalizarTextoComparacion(equivalente)
    ))
    return itemEquivalente?.material || equivalente
  }
  return itemProtocolo
}

function calcularCobroCantidadProtocolo(valor, precioUnitario, parsearCantidadProtocolo) {
  const cantidad = parsearCantidadProtocolo(valor)
  const nuevo = Number(cantidad?.nuevo || 0)
  const reutilizado = Number(cantidad?.reutilizado || 0)
  const subtotalNuevo = nuevo * precioUnitario
  const subtotalReutilizado = reutilizado * (precioUnitario / 2)

  return {
    nuevo,
    reutilizado,
    precioNuevo: precioUnitario,
    precioReutilizado: precioUnitario / 2,
    subtotalNuevo,
    subtotalReutilizado,
    subtotal: subtotalNuevo + subtotalReutilizado,
  }
}
