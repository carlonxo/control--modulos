function nombrePersona(valor) {
  return String(valor || '').trim() || 'No asignado'
}

function crearFila({ solicitante, material, precioCompra = 0 }) {
  return {
    clave: `${solicitante}__${material}`,
    solicitante,
    material,
    cobrado: 0,
    cobradoMismaSerie: 0,
    cobradoOtraSerie: 0,
    retirado: 0,
    diferencia: 0,
    porcentajeDiferencia: 0,
    valorDiferencia: 0,
    precioCompra,
    estado: 'ok',
  }
}

export function compilarTrazabilidadMaterialesPorSolicitante({
  registros = [],
  vales = [],
  catalogoPrecios = [],
  normalizarTextoComparacion,
}) {
  const normalizar = normalizarTextoComparacion || ((valor) => String(valor || '').toLowerCase().replace(/[^a-z0-9]+/g, ''))
  const catalogoPorClave = {}

  catalogoPrecios.forEach((item) => {
    const claves = [item.material, item.materialOriginal, item.clave].filter(Boolean)
    claves.forEach((clave) => {
      catalogoPorClave[normalizar(clave)] = item
    })
  })

  function resolverMaterial(nombre) {
    const nombreLimpio = String(nombre || '').replace(/\s+reutilizado$/i, '').trim()
    const catalogo = catalogoPorClave[normalizar(nombreLimpio)]
    return {
      material: catalogo?.material || nombreLimpio,
      precioCompra: Number(catalogo?.precioCompra || 0),
    }
  }

  const acumulado = new Map()
  const cobrosPorSerieMaterial = new Map()
  const cobrosDisponiblesPorMaterial = new Map()

  function obtenerFila(solicitante, material, precioCompra = 0) {
    const clave = `${normalizar(solicitante)}__${normalizar(material)}`
    if (!acumulado.has(clave)) {
      acumulado.set(clave, crearFila({ solicitante, material, precioCompra }))
    }
    const fila = acumulado.get(clave)
    if (!fila.precioCompra && precioCompra) fila.precioCompra = precioCompra
    return fila
  }

  function agregarCobroDisponible({ serie, material, precioCompra, cantidad }) {
    const claveMaterial = normalizar(material)
    const claveSerieMaterial = `${normalizar(serie)}__${claveMaterial}`
    const actualSerie = cobrosPorSerieMaterial.get(claveSerieMaterial) || {
      material,
      precioCompra,
      cantidad: 0,
    }
    actualSerie.cantidad += cantidad
    cobrosPorSerieMaterial.set(claveSerieMaterial, actualSerie)

    const actualMaterial = cobrosDisponiblesPorMaterial.get(claveMaterial) || {
      material,
      precioCompra,
      cantidad: 0,
    }
    actualMaterial.cantidad += cantidad
    cobrosDisponiblesPorMaterial.set(claveMaterial, actualMaterial)
  }

  function descontarCobroDisponible({ serie, material, cantidad, mismaSerie }) {
    const claveMaterial = normalizar(material)
    const claveSerieMaterial = `${normalizar(serie)}__${claveMaterial}`
    const bolsa = mismaSerie
      ? cobrosPorSerieMaterial.get(claveSerieMaterial)
      : cobrosDisponiblesPorMaterial.get(claveMaterial)
    const usado = Math.min(Number(cantidad || 0), Number(bolsa?.cantidad || 0))

    if (usado <= 0) return 0

    bolsa.cantidad -= usado

    if (mismaSerie) {
      const bolsaGlobal = cobrosDisponiblesPorMaterial.get(claveMaterial)
      if (bolsaGlobal) {
        bolsaGlobal.cantidad = Math.max(0, Number(bolsaGlobal.cantidad || 0) - usado)
      }
    }

    return usado
  }

  registros.forEach((registro) => {
    const serie = registro.serie || registro.protocolo_entrega?.serie || ''
    ;[
      ...(registro.detalleCobro?.mantencion || []),
      ...(registro.detalleCobro?.modificacion || []),
    ].forEach((item) => {
      const { material, precioCompra } = resolverMaterial(item.materialPrecio || item.material)
      const cantidad = Number(item.cantidad || 0)
      if (!material || cantidad <= 0) return
      agregarCobroDisponible({ serie, material, precioCompra, cantidad })
    })
  })

  const valesPreparados = vales.map((item) => {
    const solicitante = nombrePersona(item.solicitante_nombre || item.solicitante || item.responsable)
    const { material, precioCompra } = resolverMaterial(item.material_balance || item.material || item.material_vale)
    return {
      item,
      solicitante,
      material,
      precioCompra,
      serie: item.serie || '',
      cantidad: Number(item.cantidad || 0),
      cobradoMismaSerie: 0,
      cobradoOtraSerie: 0,
    }
  }).filter((item) => item.material && item.cantidad > 0)

  valesPreparados.forEach((item) => {
    const fila = obtenerFila(item.solicitante, item.material, item.precioCompra)
    const cobradoMismaSerie = item.serie
      ? descontarCobroDisponible({
          serie: item.serie,
          material: item.material,
          cantidad: item.cantidad,
          mismaSerie: true,
        })
      : 0

    item.cobradoMismaSerie = cobradoMismaSerie
    fila.retirado += item.cantidad
    fila.cobrado += cobradoMismaSerie
    fila.cobradoMismaSerie += cobradoMismaSerie
  })

  valesPreparados.forEach((item) => {
    const pendienteItem = Math.max(0, item.cantidad - item.cobradoMismaSerie)
    if (pendienteItem <= 0) return

    const cobradoOtraSerie = descontarCobroDisponible({
      serie: item.serie,
      material: item.material,
      cantidad: pendienteItem,
      mismaSerie: false,
    })
    if (cobradoOtraSerie <= 0) return

    const fila = obtenerFila(item.solicitante, item.material, item.precioCompra)
    item.cobradoOtraSerie = cobradoOtraSerie
    fila.cobrado += cobradoOtraSerie
    fila.cobradoOtraSerie += cobradoOtraSerie
  })

  return [...acumulado.values()]
    .map((fila) => {
      const diferencia = Number(fila.retirado || 0) - Number(fila.cobrado || 0)
      const porcentajeDiferencia = fila.retirado > 0
        ? (diferencia / fila.retirado) * 100
        : 0
      const estado = porcentajeDiferencia > 15
        ? 'critico'
        : porcentajeDiferencia > 5
          ? 'alerta'
          : 'ok'

      return {
        ...fila,
        diferencia,
        porcentajeDiferencia,
        valorDiferencia: diferencia * Number(fila.precioCompra || 0),
        estado,
      }
    })
    .filter((fila) => fila.retirado > 0 || fila.cobrado > 0)
    .sort((a, b) => (
      Number(b.valorDiferencia || 0) - Number(a.valorDiferencia || 0) ||
      Number(b.diferencia || 0) - Number(a.diferencia || 0)
    ))
}

export function compilarTrazabilidadMaterialesPorGrupo({
  registros = [],
  vales = [],
  catalogoPrecios = [],
  solicitantesDisponibles = [],
  solicitantesSeleccionados = [],
  lineasSeleccionadas = [],
  normalizarTextoComparacion,
}) {
  const normalizar = normalizarTextoComparacion || ((valor) => String(valor || '').toLowerCase().replace(/[^a-z0-9]+/g, ''))
  const perfilesPorId = new Map(solicitantesDisponibles
    .filter((item) => item?.id)
    .map((item) => [String(item.id), item]))
  const solicitantes = new Set()
  solicitantesSeleccionados.forEach((valor) => {
    const valorTexto = String(valor || '')
    if (!valorTexto) return
    solicitantes.add(normalizar(valorTexto))
    const perfil = perfilesPorId.get(valorTexto)
    if (perfil?.nombre) solicitantes.add(normalizar(perfil.nombre))
    if (perfil?.id) solicitantes.add(normalizar(perfil.id))
  })
  const lineas = new Set(lineasSeleccionadas.map((linea) => String(linea)).filter(Boolean))
  const catalogoPorClave = {}

  catalogoPrecios.forEach((item) => {
    const claves = [item.material, item.materialOriginal, item.clave].filter(Boolean)
    claves.forEach((clave) => {
      catalogoPorClave[normalizar(clave)] = item
    })
  })

  function resolverMaterial(nombre) {
    const nombreLimpio = String(nombre || '').replace(/\s+reutilizado$/i, '').trim()
    const catalogo = catalogoPorClave[normalizar(nombreLimpio)]
    return {
      material: catalogo?.material || nombreLimpio,
      precioCompra: Number(catalogo?.precioCompra || 0),
    }
  }

  const acumulado = new Map()

  function obtenerFila(material, precioCompra = 0) {
    const clave = normalizar(material)
    if (!acumulado.has(clave)) {
      acumulado.set(clave, {
        clave,
        material,
        retirado: 0,
        instalado: 0,
        diferencia: 0,
        porcentajeDiferencia: 0,
        valorDiferencia: 0,
        precioCompra,
        estado: 'ok',
      })
    }
    const fila = acumulado.get(clave)
    if (!fila.precioCompra && precioCompra) fila.precioCompra = precioCompra
    return fila
  }

  if (lineas.size > 0) {
    registros
      .filter((registro) => lineas.has(String(registro.linea || registro.protocolo_entrega?.linea || '')))
      .forEach((registro) => {
        ;[
          ...(registro.detalleCobro?.mantencion || []),
          ...(registro.detalleCobro?.modificacion || []),
        ].forEach((item) => {
          const { material, precioCompra } = resolverMaterial(item.materialPrecio || item.material)
          const cantidad = Number(item.cantidad || 0)
          if (!material || cantidad <= 0) return
          const fila = obtenerFila(material, precioCompra)
          fila.instalado += cantidad
        })
      })
  }

  if (solicitantes.size > 0) {
    vales
      .filter((item) => (
        solicitantes.has(normalizar(item.solicitante_id)) ||
        solicitantes.has(normalizar(item.solicitante_nombre || item.solicitante || item.responsable))
      ))
      .forEach((item) => {
        const { material, precioCompra } = resolverMaterial(item.material_balance || item.material || item.material_vale)
        const cantidad = Number(item.cantidad || 0)
        if (!material || cantidad <= 0) return
        const fila = obtenerFila(material, precioCompra)
        fila.retirado += cantidad
      })
  }

  return [...acumulado.values()]
    .map((fila) => {
      const diferencia = Number(fila.retirado || 0) - Number(fila.instalado || 0)
      const porcentajeDiferencia = fila.retirado > 0
        ? (diferencia / fila.retirado) * 100
        : 0
      const estado = porcentajeDiferencia > 15
        ? 'critico'
        : porcentajeDiferencia > 5
          ? 'alerta'
          : 'ok'

      return {
        ...fila,
        diferencia,
        porcentajeDiferencia,
        valorDiferencia: diferencia * Number(fila.precioCompra || 0),
        estado,
      }
    })
    .filter((fila) => fila.retirado > 0 || fila.instalado > 0)
    .sort((a, b) => (
      Number(b.valorDiferencia || 0) - Number(a.valorDiferencia || 0) ||
      Number(b.diferencia || 0) - Number(a.diferencia || 0)
    ))
}
