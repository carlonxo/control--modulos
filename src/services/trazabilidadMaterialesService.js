function nombrePersona(valor) {
  return String(valor || '').trim() || 'No asignado'
}

function crearFila({ solicitante, material, precioCompra = 0 }) {
  return {
    clave: `${solicitante}__${material}`,
    solicitante,
    material,
    cobrado: 0,
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

  function obtenerFila(solicitante, material, precioCompra = 0) {
    const clave = `${normalizar(solicitante)}__${normalizar(material)}`
    if (!acumulado.has(clave)) {
      acumulado.set(clave, crearFila({ solicitante, material, precioCompra }))
    }
    const fila = acumulado.get(clave)
    if (!fila.precioCompra && precioCompra) fila.precioCompra = precioCompra
    return fila
  }

  registros.forEach((registro) => {
    const solicitante = nombrePersona(registro.responsable || registro.protocolo_entrega?.responsable)
    ;[
      ...(registro.detalleCobro?.mantencion || []),
      ...(registro.detalleCobro?.modificacion || []),
    ].forEach((item) => {
      const { material, precioCompra } = resolverMaterial(item.materialPrecio || item.material)
      if (!material) return
      const fila = obtenerFila(solicitante, material, precioCompra)
      fila.cobrado += Number(item.cantidad || 0)
    })
  })

  vales.forEach((item) => {
    const solicitante = nombrePersona(item.solicitante_nombre || item.solicitante || item.responsable)
    const { material, precioCompra } = resolverMaterial(item.material_balance || item.material || item.material_vale)
    if (!material) return
    const fila = obtenerFila(solicitante, material, precioCompra)
    fila.retirado += Number(item.cantidad || 0)
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
