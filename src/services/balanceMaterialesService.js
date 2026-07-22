export function compilarBalanceMateriales(registros = [], vales = [], opciones = {}) {
  const {
    configMateriales = {},
    catalogoPreciosProtocolo = [],
    equivalenciasPrecioProtocolo = {},
    equivalenciasValeBodega = {},
    normalizarTextoComparacion = normalizarTextoComparacionLocal,
  } = opciones

  const catalogoPorNombre = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    normalizarClaveMaterialBalance(item.material, normalizarTextoComparacion),
    item,
  ]))

  const acumulado = new Map()
  const materialesExcluidos = new Set([
    normalizarTextoComparacion('Mano de obra base'),
    normalizarTextoComparacion('Módulo en garantía'),
    normalizarTextoComparacion('Módulo en garantía sin cobro de material'),
  ])

  function resolverMaterialBalance(nombre, materialPrecio = '') {
    const nombreLimpio = String(nombre || '').trim()
    const candidatos = [
      nombreLimpio,
      materialPrecio,
      equivalenciasPrecioProtocolo[normalizarTextoComparacion(nombreLimpio)],
      equivalenciasPrecioProtocolo[normalizarTextoComparacion(materialPrecio)],
      equivalenciasValeBodega[normalizarTextoComparacion(nombreLimpio)],
    ].filter(Boolean)

    for (const candidato of candidatos) {
      const catalogo = catalogoPorNombre[normalizarClaveMaterialBalance(candidato, normalizarTextoComparacion)]
      if (catalogo) {
        return {
          clave: normalizarClaveMaterialBalance(catalogo.material, normalizarTextoComparacion),
          idArt: catalogo.idArt || '',
          material: catalogo.material,
          noCatalogado: false,
        }
      }
    }

    const nombreEquivalente = equivalenciasValeBodega[normalizarTextoComparacion(nombreLimpio)]
      || equivalenciasPrecioProtocolo[normalizarTextoComparacion(nombreLimpio)]
      || nombreLimpio
    const claveNormalizada = normalizarClaveMaterialBalance(nombreEquivalente, normalizarTextoComparacion)
    const claveExistente = [...acumulado.keys()].find((claveActual) => claveActual === claveNormalizada)
    const filaExistente = claveExistente ? acumulado.get(claveExistente) : null

    return {
      clave: claveExistente || claveNormalizada,
      idArt: '',
      material: filaExistente?.material || nombreEquivalente,
      noCatalogado: true,
    }
  }

  function crearFila(materialBalance) {
    return {
      clave: materialBalance.clave,
      idArt: materialBalance.idArt || '',
      material: materialBalance.material,
      nuevo: 0,
      reutilizado: 0,
      retirado: 0,
      noCatalogado: materialBalance.noCatalogado,
      totalCantidad: 0,
      valorNuevo: 0,
      valorReutilizado: 0,
      precioUnitarioNuevo: 0,
      precioUnitarioReutilizado: 0,
      valorMantencion: 0,
      valorModificacion: 0,
      valorTotal: 0,
    }
  }

  function agregarItem(item, tipoCobro) {
    const materialBase = String(item.material || '').replace(/\s+reutilizado$/i, '').trim()
    const claveMaterial = normalizarTextoComparacion(materialBase)
    if (!materialBase || materialesExcluidos.has(claveMaterial)) return

    const materialPrecio = item.materialPrecio || materialBase
    const materialBalance = resolverMaterialBalance(materialBase, materialPrecio)
    const esReutilizado = normalizarTextoComparacion(item.tipoCantidad || item.material).includes('reutilizado')
    const cantidad = Number(item.cantidad || 0)
    const subtotal = Number(item.subtotal || 0)
    const fila = acumulado.get(materialBalance.clave) || crearFila(materialBalance)

    fila.noCatalogado = fila.noCatalogado && materialBalance.noCatalogado
    if (!fila.idArt && materialBalance.idArt) fila.idArt = materialBalance.idArt

    if (esReutilizado) {
      fila.reutilizado += cantidad
      fila.valorReutilizado += subtotal
      fila.precioUnitarioReutilizado = Number(item.precioUnitario || 0)
    } else {
      fila.nuevo += cantidad
      fila.valorNuevo += subtotal
      fila.precioUnitarioNuevo = Number(item.precioUnitario || 0)
    }

    fila.totalCantidad += cantidad
    if (tipoCobro === 'modificacion') {
      fila.valorModificacion += subtotal
    } else {
      fila.valorMantencion += subtotal
    }
    fila.valorTotal += subtotal

    acumulado.set(materialBalance.clave, fila)
  }

  registros.forEach((registro) => {
    ;(registro.detalleCobro?.mantencion || []).forEach((item) => agregarItem(item, 'mantencion'))
    ;(registro.detalleCobro?.modificacion || []).forEach((item) => agregarItem(item, 'modificacion'))
  })

  vales.forEach((itemVale) => {
    const material = itemVale.material_balance || itemVale.material || itemVale.material_vale || ''
    if (!normalizarTextoComparacion(material)) return

    const materialBalance = resolverMaterialBalance(material)
    const fila = acumulado.get(materialBalance.clave) || crearFila(materialBalance)
    fila.retirado += Number(itemVale.cantidad || 0)
    fila.noCatalogado = fila.noCatalogado && materialBalance.noCatalogado
    if (!fila.idArt && materialBalance.idArt) fila.idArt = materialBalance.idArt
    acumulado.set(materialBalance.clave, fila)
  })

  return consolidarFilasBalanceMateriales(
    [...acumulado.values()],
    configMateriales,
    catalogoPorNombre,
    normalizarTextoComparacion
  ).sort((a, b) => a.material.localeCompare(b.material))
}

function consolidarFilasBalanceMateriales(
  filas,
  configMateriales = {},
  catalogoPorNombre = {},
  normalizarTextoComparacion = normalizarTextoComparacionLocal
) {
  const consolidadas = new Map()

  filas.forEach((fila) => {
    const nombreVisible = configMateriales[fila.clave]?.nombreVisible || fila.material
    const claveVisible = normalizarClaveMaterialBalance(nombreVisible, normalizarTextoComparacion)
    const catalogo = catalogoPorNombre[claveVisible]
    const claveFinal = catalogo ? normalizarClaveMaterialBalance(catalogo.material, normalizarTextoComparacion) : claveVisible
    const materialFinal = catalogo?.material || nombreVisible || fila.material
    const existente = consolidadas.get(claveFinal)

    if (!existente) {
      consolidadas.set(claveFinal, {
        ...fila,
        clave: claveFinal,
        idArt: catalogo?.idArt || fila.idArt || '',
        material: materialFinal,
        noCatalogado: catalogo ? false : fila.noCatalogado,
        precioUnitarioNuevo: catalogo?.precio || fila.precioUnitarioNuevo || 0,
      })
      return
    }

    existente.nuevo += Number(fila.nuevo || 0)
    existente.reutilizado += Number(fila.reutilizado || 0)
    existente.retirado += Number(fila.retirado || 0)
    existente.totalCantidad += Number(fila.totalCantidad || 0)
    existente.valorNuevo += Number(fila.valorNuevo || 0)
    existente.valorReutilizado += Number(fila.valorReutilizado || 0)
    existente.valorMantencion += Number(fila.valorMantencion || 0)
    existente.valorModificacion += Number(fila.valorModificacion || 0)
    existente.valorTotal += Number(fila.valorTotal || 0)
    existente.noCatalogado = existente.noCatalogado && fila.noCatalogado && !catalogo
    if (!existente.idArt && (catalogo?.idArt || fila.idArt)) existente.idArt = catalogo?.idArt || fila.idArt
    if (!existente.precioUnitarioNuevo && (catalogo?.precio || fila.precioUnitarioNuevo)) {
      existente.precioUnitarioNuevo = catalogo?.precio || fila.precioUnitarioNuevo
    }
    if (!existente.precioUnitarioReutilizado && fila.precioUnitarioReutilizado) {
      existente.precioUnitarioReutilizado = fila.precioUnitarioReutilizado
    }
  })

  return [...consolidadas.values()]
}

function normalizarClaveMaterialBalance(valor, normalizarTextoComparacion = normalizarTextoComparacionLocal) {
  return normalizarTextoComparacion(valor)
    .replace(/retenedoresde/g, 'retenedor')
    .replace(/retenedores/g, 'retenedor')
    .replace(/retenedorde/g, 'retenedor')
    .replace(/retenedor20mm/g, 'retenedor20')
    .replace(/monofasica/g, 'monof')
    .replace(/monofasico/g, 'monof')
    .replace(/bifasica/g, 'bif')
    .replace(/bifasico/g, 'bif')
    .replace(/repartidora/g, 'repartidor')
    .replace(/barra/g, '')
    .replace(/accesorios/g, 'acces')
    .replace(/accesorio/g, 'acces')
}

function normalizarTextoComparacionLocal(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
