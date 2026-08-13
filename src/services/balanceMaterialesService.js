export function compilarBalanceMateriales(registros = [], vales = [], opciones = {}) {
  const {
    configMateriales = {},
    catalogoPreciosProtocolo = [],
    equivalenciasPrecioProtocolo = {},
    equivalenciasValeBodega = {},
    equivalenciasMateriales = [],
    normalizarTextoComparacion = normalizarTextoComparacionLocal,
  } = opciones

  const catalogoPorNombre = {}
  const catalogoPorCodigoBodega = {}
  catalogoPreciosProtocolo.forEach((item) => {
    obtenerClavesMaterialBalance(item.material, normalizarTextoComparacion).forEach((clave) => {
      catalogoPorNombre[clave] = item
    })
    if (item.materialOriginal) {
      obtenerClavesMaterialBalance(item.materialOriginal, normalizarTextoComparacion).forEach((clave) => {
        catalogoPorNombre[clave] = item
      })
    }
    if (item.codigoBodega) {
      catalogoPorCodigoBodega[normalizarTextoComparacion(item.codigoBodega)] = item
    }
  })

  const acumulado = new Map()
  const materialesExcluidos = new Set([
    normalizarTextoComparacion('Mano de obra base'),
    normalizarTextoComparacion('Módulo en garantía'),
    normalizarTextoComparacion('Módulo en garantía sin cobro de material'),
  ])

  function resolverMaterialBalance(nombre, materialPrecio = '') {
    const nombreLimpio = String(nombre || '').trim()
    const materialPrecioLimpio = String(materialPrecio || '').trim()
    const materialEquivalenteEditable = resolverEquivalenciaMaterialEditable(
      [nombreLimpio, materialPrecioLimpio],
      equivalenciasMateriales,
      normalizarTextoComparacion
    )
    const materialEspecial = materialEquivalenteEditable
      || obtenerMaterialEspecialBodegaBalance(nombreLimpio)
      || obtenerMaterialEspecialBodegaBalance(materialPrecioLimpio)
    if (materialEspecial) {
      const catalogoEspecial = buscarCatalogoMaterialBalance(materialEspecial, catalogoPorNombre, normalizarTextoComparacion)
      if (catalogoEspecial) {
        return {
          clave: normalizarClaveMaterialBalance(catalogoEspecial.material, normalizarTextoComparacion),
          idArt: catalogoEspecial.idArt || '',
          material: catalogoEspecial.material,
          noCatalogado: false,
        }
      }
    }

    const catalogoPorCodigo = catalogoPorCodigoBodega[normalizarTextoComparacion(materialPrecioLimpio)]
      || catalogoPorCodigoBodega[normalizarTextoComparacion(nombreLimpio)]
    if (catalogoPorCodigo) {
      return {
        clave: normalizarClaveMaterialBalance(catalogoPorCodigo.material, normalizarTextoComparacion),
        idArt: catalogoPorCodigo.idArt || '',
        material: catalogoPorCodigo.material,
        noCatalogado: false,
      }
    }

    const candidatos = [
      materialEquivalenteEditable,
      materialEspecial,
      nombreLimpio,
      materialPrecioLimpio,
      equivalenciasPrecioProtocolo[normalizarTextoComparacion(nombreLimpio)],
      equivalenciasPrecioProtocolo[normalizarTextoComparacion(materialPrecioLimpio)],
      equivalenciasValeBodega[normalizarTextoComparacion(nombreLimpio)],
      equivalenciasValeBodega[normalizarTextoComparacion(materialPrecioLimpio)],
    ].filter(Boolean)

    for (const candidato of candidatos) {
      const catalogo = buscarCatalogoMaterialBalance(candidato, catalogoPorNombre, normalizarTextoComparacion)
      if (catalogo) {
        return {
          clave: normalizarClaveMaterialBalance(catalogo.material, normalizarTextoComparacion),
          idArt: catalogo.idArt || '',
          material: catalogo.material,
          noCatalogado: false,
        }
      }
    }

    const nombreEquivalente = materialEquivalenteEditable
      || materialEspecial
      || equivalenciasValeBodega[normalizarTextoComparacion(nombreLimpio)]
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

    const materialBalance = resolverMaterialBalance(material, itemVale.material_vale || '')
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

function resolverEquivalenciaMaterialEditable(
  valores = [],
  equivalenciasMateriales = [],
  normalizarTextoComparacion = normalizarTextoComparacionLocal
) {
  const candidatos = valores
    .map((valor) => String(valor || '').trim())
    .filter(Boolean)

  if (!candidatos.length || !equivalenciasMateriales.length) return ''

  for (const equivalencia of equivalenciasMateriales) {
    if (!equivalencia || equivalencia.activo === false) continue

    const origen = String(equivalencia.origen || '').trim()
    const destino = String(equivalencia.destino || '').trim()
    if (!origen || !destino) continue

    const origenNormalizado = normalizarTextoComparacion(origen)
    if (!origenNormalizado) continue

    const tipo = equivalencia.tipo === 'exacto' ? 'exacto' : 'contiene'
    const coincide = candidatos.some((candidato) => {
      const candidatoNormalizado = normalizarTextoComparacion(candidato)
      if (!candidatoNormalizado) return false
      return tipo === 'exacto'
        ? candidatoNormalizado === origenNormalizado
        : candidatoNormalizado.includes(origenNormalizado)
    })

    if (coincide) return destino
  }

  return ''
}

function obtenerMaterialEspecialBodegaBalance(valor) {
  return obtenerMaterialCableRzBalance(valor)
    || obtenerMaterialCintaAislanteBalance(valor)
    || obtenerMaterialFerrulerBalance(valor)
    || obtenerMaterialModuloVimarBalance(valor)
}

function obtenerMaterialCableRzBalance(valor) {
  const texto = String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/°/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  if (!texto.includes('cable') || !/rz\s*-?\s*1/.test(texto)) return ''
  if (/\b[35]\s*x\b/.test(texto)) return ''

  if (/(^|[^0-9])2(?:[,.]\s*5|\s+5)\s*mm2?\b/.test(texto)) {
    return 'Cable RZ1 2,5mm (Alum + Ench)'
  }

  if (/(^|[^0-9])4(?:[,.]\s*0)?\s*mm2?\b/.test(texto)) {
    return 'Cable RZ1 4mm (Termo)'
  }

  if (/(^|[^0-9])6(?:[,.]\s*0)?\s*mm2?\b/.test(texto)) {
    return 'Cable RZ1 6mm (Alimentación)'
  }

  return ''
}

function obtenerMaterialCintaAislanteBalance(valor) {
  const texto = String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (
    texto.includes('cinta') &&
    (
      texto.includes('aislar') ||
      texto.includes('aislante') ||
      texto.includes('aislacion')
    )
  ) {
    return 'CINTA DE AISLAR'
  }

  return ''
}

function obtenerMaterialFerrulerBalance(valor) {
  const texto = String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

  if (!texto.includes('ferruler')) return ''

  if (/(^|[^0-9])2(?:[,.]\s*5|\s+5)\s*mm\b/.test(texto)) {
    return 'FERRULER 2.5 MM'
  }

  if (/(^|[^0-9])4(?:[,.]\s*0)?\s*mm\b/.test(texto)) {
    return 'FERRULER 4.0 MM'
  }

  return ''
}

function obtenerMaterialModuloVimarBalance(valor) {
  const texto = String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  const compacto = texto.replace(/[^a-z0-9]+/g, '')

  if (!texto) return ''

  if (
    (compacto.includes('int912') || compacto.includes('interruptor912') || compacto.includes('modulor5001')) &&
    (compacto.includes('vimar') || compacto.includes('matix') || compacto.includes('modulo') || compacto.includes('int'))
  ) {
    return 'MODULO INT. 9/12 VIMAR NEVE 09001'
  }

  if (
    compacto.includes('ench') &&
    compacto.includes('16') &&
    (compacto.includes('2pt') || compacto.includes('2ptt') || compacto.includes('vimar') || compacto.includes('matix') || compacto.includes('modulo'))
  ) {
    return 'MODULO ENCH. 2P+T 16A VIMAR NEVE'
  }

  if (
    compacto.includes('ench') &&
    compacto.includes('10') &&
    !compacto.includes('16') &&
    !compacto.includes('32') &&
    (compacto.includes('2pt') || compacto.includes('2ptt') || compacto.includes('vimar') || compacto.includes('matix') || compacto.includes('modulo'))
  ) {
    return 'MODULO ENCH. 2P+T 10A VIMAR NEVE'
  }

  return ''
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
    const catalogo = buscarCatalogoMaterialBalance(nombreVisible, catalogoPorNombre, normalizarTextoComparacion)
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
        precioUnitarioCompra: catalogo?.precioCompra || 0,
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
    if (!existente.precioUnitarioCompra && catalogo?.precioCompra) {
      existente.precioUnitarioCompra = catalogo.precioCompra
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

function normalizarClaveMaterialBalanceFlexible(valor, normalizarTextoComparacion = normalizarTextoComparacionLocal) {
  return normalizarClaveMaterialBalance(valor, normalizarTextoComparacion)
    .replace(/modulo/g, '')
    .replace(/matix/g, '')
    .replace(/vimar/g, '')
    .replace(/neve/g, '')
    .replace(/r\d+/g, '')
    .replace(/(\d+)a/g, '$1')
    .replace(/enchufe/g, 'ench')
    .replace(/hembra/g, 'hemb')
    .replace(/macho/g, 'mch')
}

function obtenerClavesMaterialBalance(valor, normalizarTextoComparacion = normalizarTextoComparacionLocal) {
  return [
    normalizarClaveMaterialBalance(valor, normalizarTextoComparacion),
    normalizarClaveMaterialBalanceFlexible(valor, normalizarTextoComparacion),
  ].filter(Boolean)
}

function buscarCatalogoMaterialBalance(valor, catalogoPorNombre, normalizarTextoComparacion = normalizarTextoComparacionLocal) {
  for (const clave of obtenerClavesMaterialBalance(valor, normalizarTextoComparacion)) {
    if (catalogoPorNombre[clave]) return catalogoPorNombre[clave]
  }

  return null
}

function normalizarTextoComparacionLocal(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}
