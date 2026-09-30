import { esFechaDeHoy } from './fechas'

function esEstado(valor, estado) {
  return String(valor || '').toLowerCase() === estado
}

function esEstadoPruebaElectricaTexto(valor) {
  const estado = String(valor || '').toLowerCase()
  return estado === 'prueba eléctrica' || estado === 'prueba electrica'
}

export function calcularIndicadoresTablero(datos = [], historial = []) {
  const modulosActivos = datos.filter((modulo) => modulo.serie)
  const ocupacion = modulosActivos.length
  const canalizados = modulosActivos.filter((modulo) => esEstado(modulo.estado, 'canalizado')).length
  const cableados = modulosActivos.filter((modulo) => esEstado(modulo.estado, 'cableado')).length
  const terminaciones = modulosActivos.filter((modulo) => esEstado(modulo.estado, 'terminaciones')).length
  const pruebas = modulosActivos.filter((modulo) => esEstadoPruebaElectricaTexto(modulo.estado)).length
  const pruebasElectricasHoy = [...modulosActivos, ...historial].filter(
    (modulo) => esFechaDeHoy(modulo.fecha_prueba_electrica)
  ).length

  const hoy = new Date().toISOString().slice(0, 10)
  const terminadosHoy = historial.filter(
    (modulo) => modulo.fecha_salida && modulo.fecha_salida.slice(0, 10) === hoy
  ).length

  const mesActual = new Date().getMonth()
  const anioActual = new Date().getFullYear()
  const pruebasElectricasMes = [...modulosActivos, ...historial].filter((modulo) => {
    if (!modulo.fecha_prueba_electrica) return false
    const fecha = new Date(modulo.fecha_prueba_electrica)

    return (
      !Number.isNaN(fecha.getTime()) &&
      fecha.getMonth() === mesActual &&
      fecha.getFullYear() === anioActual
    )
  }).length

  const ultimosFinalizados = [...historial]
    .filter((item) => item.serie)
    .sort((a, b) => new Date(b.fecha_salida || 0) - new Date(a.fecha_salida || 0))
    .slice(0, 5)

  return {
    modulosActivos,
    ocupacion,
    canalizados,
    cableados,
    terminaciones,
    pruebas,
    pruebasElectricasHoy,
    terminadosHoy,
    pruebasElectricasMes,
    ultimosFinalizados,
  }
}

function numeroValido(valor) {
  if (valor === null || valor === undefined || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) && numero >= 0 ? numero : null
}

export function calcularHorasDentroDeJornada(fechaIngreso, fechaPrueba, horaInicio = 9, horaFin = 17) {
  const ingreso = fechaIngreso instanceof Date ? new Date(fechaIngreso) : new Date(fechaIngreso || '')
  const prueba = fechaPrueba instanceof Date ? new Date(fechaPrueba) : new Date(fechaPrueba || '')
  if (Number.isNaN(ingreso.getTime()) || Number.isNaN(prueba.getTime()) || prueba <= ingreso) return null
  if (horaFin <= horaInicio) return null

  let totalMilisegundos = 0
  const dia = new Date(ingreso)
  dia.setHours(0, 0, 0, 0)
  const ultimoDia = new Date(prueba)
  ultimoDia.setHours(0, 0, 0, 0)

  while (dia <= ultimoDia) {
    const inicioJornada = new Date(dia)
    inicioJornada.setHours(horaInicio, 0, 0, 0)
    const finJornada = new Date(dia)
    finJornada.setHours(horaFin, 0, 0, 0)

    const inicioContabilizado = Math.max(ingreso.getTime(), inicioJornada.getTime())
    const finContabilizado = Math.min(prueba.getTime(), finJornada.getTime())
    if (finContabilizado > inicioContabilizado) {
      totalMilisegundos += finContabilizado - inicioContabilizado
    }

    dia.setDate(dia.getDate() + 1)
  }

  return totalMilisegundos / 3600000
}

function mediana(valores = []) {
  if (!valores.length) return null
  const ordenados = [...valores].sort((a, b) => a - b)
  const centro = Math.floor(ordenados.length / 2)
  return ordenados.length % 2
    ? ordenados[centro]
    : (ordenados[centro - 1] + ordenados[centro]) / 2
}

function modasHorasRedondeadas(valores = []) {
  if (valores.length < 2) return []
  const frecuencias = new Map()
  valores.forEach((valor) => {
    const hora = Math.round(valor)
    frecuencias.set(hora, (frecuencias.get(hora) || 0) + 1)
  })
  const maxima = Math.max(...frecuencias.values())
  if (maxima <= 1) return []
  return [...frecuencias.entries()]
    .filter(([, frecuencia]) => frecuencia === maxima)
    .map(([hora]) => hora)
    .sort((a, b) => a - b)
}

export function calcularIndicadoresHorasHombre(datos = [], historial = [], factorEfectividad = 100) {
  const factor = Math.min(100, Math.max(0, Number(factorEfectividad) || 0))
  const registros = [
    ...datos.map((modulo) => ({ ...modulo, origen_hh: 'modulos' })),
    ...historial.map((modulo) => ({ ...modulo, origen_hh: 'historial_modulos' })),
  ]
    .map((modulo) => {
      const ingreso = new Date(modulo.fecha_ingreso || '')
      const prueba = new Date(modulo.fecha_prueba_electrica || '')
      if (!modulo.serie || !modulo.tipo || Number.isNaN(ingreso.getTime()) || Number.isNaN(prueba.getTime())) return null
      const calculadas = calcularHorasDentroDeJornada(ingreso, prueba)
      if (calculadas === null) return null
      const corregidas = numeroValido(modulo.horas_hombre_corregidas)
      const horasBase = corregidas ?? calculadas
      return {
        ...modulo,
        horas_hombre_calculadas: calculadas,
        horas_hombre_base: horasBase,
        horas_hombre: horasBase * (factor / 100),
        factor_efectividad: factor,
        tiene_correccion_hh: corregidas !== null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.fecha_prueba_electrica) - new Date(a.fecha_prueba_electrica))

  const grupos = new Map()
  registros.forEach((registro) => {
    const clave = String(registro.tipo || '').trim().toLocaleLowerCase('es-CL')
    if (!grupos.has(clave)) grupos.set(clave, { tipo: String(registro.tipo).trim(), registros: [] })
    grupos.get(clave).registros.push(registro)
  })

  const porTipo = [...grupos.values()].map((grupo) => {
    const valores = grupo.registros.map((registro) => registro.horas_hombre)
    return {
      tipo: grupo.tipo,
      cantidad: valores.length,
      promedio: valores.reduce((total, valor) => total + valor, 0) / valores.length,
      mediana: mediana(valores),
      modas: modasHorasRedondeadas(valores),
    }
  }).sort((a, b) => a.tipo.localeCompare(b.tipo, 'es'))

  return { registros, porTipo }
}
