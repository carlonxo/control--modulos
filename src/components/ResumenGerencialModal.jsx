import { useEffect, useMemo, useState } from 'react'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
const DISTRIBUCION_INICIAL = [
  { id: 'produccion', columna: 0 },
  { id: 'pendientes', columna: 0 },
  { id: 'resumen-mensual', columna: 0 },
  { id: 'proyectos', columna: 1 },
  { id: 'materiales', columna: 1 },
  { id: 'tipos', columna: 1 },
]

function cargarDistribucion(usuarioId) {
  if (typeof window === 'undefined') return DISTRIBUCION_INICIAL
  try {
    const guardada = JSON.parse(window.localStorage.getItem(`resumen-gerencial:${usuarioId || 'local'}`) || 'null')
    const idsValidos = new Set(DISTRIBUCION_INICIAL.map((item) => item.id))
    if (!Array.isArray(guardada) || guardada.length !== idsValidos.size) return DISTRIBUCION_INICIAL
    if (guardada.some((item) => !idsValidos.has(item.id) || ![0, 1].includes(item.columna))) return DISTRIBUCION_INICIAL
    return guardada
  } catch {
    return DISTRIBUCION_INICIAL
  }
}

function numero(valor) {
  const convertido = Number(valor || 0)
  return Number.isFinite(convertido) ? convertido : 0
}

function formatearEntero(valor) {
  return Math.round(numero(valor)).toLocaleString('es-CL')
}

function formatearDinero(valor) {
  return Math.round(numero(valor)).toLocaleString('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
  })
}

function formatearMillones(valor) {
  const millones = numero(valor) / 1_000_000
  if (millones === 0) return '$ 0'
  return `$ ${millones.toLocaleString('es-CL', { maximumFractionDigits: 1 })} M`
}

function fechaRegistro(registro) {
  const texto = String(registro?.fecha_prueba_electrica || registro?.fecha || '')
  const coincidencia = texto.match(/^(\d{4})-(\d{2})/)
  if (!coincidencia) return null
  return { anio: Number(coincidencia[1]), mes: Number(coincidencia[2]) - 1 }
}

function textoNormalizado(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function nombreProyectoVisible(nombre, clave) {
  if (clave === 'mantencion') return 'Mantención'
  const texto = String(nombre || '').trim().replace(/\s+/g, ' ')
  if (!texto || texto === texto.toUpperCase()) {
    return texto.toLocaleLowerCase('es-CL').replace(/(^|\s)\S/g, (letra) => letra.toLocaleUpperCase('es-CL'))
  }
  return texto
}

function tieneOtPendiente(registro) {
  const ids = String(registro?.idOt || registro?.id_ot || '')
    .split(/[;,/\s]+/)
    .map((valor) => valor.trim())
    .filter((valor) => valor && valor !== '-')
  return ids.length === 0
}

function registrosUnicos(registros) {
  const unicos = new Map()
  for (const registro of registros || []) {
    const fecha = String(registro.fecha_prueba_electrica || registro.fecha || '').slice(0, 10)
    const serie = String(registro.serie || '').trim().replace(/^0+(?=\d)/, '')
    const clave = serie && fecha
      ? `${serie}|${fecha}`
      : `${registro.origen || 'registro'}|${registro.id || Math.random()}`
    const existente = unicos.get(clave)
    if (!existente || numero(registro.valorTotal) > numero(existente.valorTotal)) unicos.set(clave, registro)
  }
  return [...unicos.values()]
}

function construirResumen(registros, anio) {
  const filas = MESES.map((mes, indice) => ({ indice, mes, modulos: 0, valor: 0, garantias: 0 }))
  const porTipo = new Map()
  const porProyecto = new Map()
  const produccion = MESES.map((mes, indice) => ({ indice, mes, mantencion: 0, proyectos: 0, garantia: 0 }))
  const registrosAnio = registrosUnicos(registros).filter((registro) => fechaRegistro(registro)?.anio === Number(anio))

  for (const registro of registrosAnio) {
    const fecha = fechaRegistro(registro)
    if (!fecha || fecha.mes < 0 || fecha.mes > 11) continue
    const valor = numero(registro.valorTotal)
    filas[fecha.mes].modulos += 1
    filas[fecha.mes].valor += valor
    if (registro.esGarantia) filas[fecha.mes].garantias += 1

    const proyecto = String(registro.proyecto || 'Sin proyecto').trim() || 'Sin proyecto'
    const claveProyecto = textoNormalizado(proyecto) || 'sin proyecto'
    const acumuladoProyecto = porProyecto.get(claveProyecto) || {
      proyecto: nombreProyectoVisible(proyecto, claveProyecto),
      modulos: 0,
      valor: 0,
    }
    acumuladoProyecto.modulos += 1
    acumuladoProyecto.valor += valor
    porProyecto.set(claveProyecto, acumuladoProyecto)

    if (registro.esGarantia) produccion[fecha.mes].garantia += 1
    else if (claveProyecto === 'mantencion' || claveProyecto === 'mantenimiento') produccion[fecha.mes].mantencion += 1
    else produccion[fecha.mes].proyectos += 1

    const tipo = String(registro.tipo || 'Sin tipo').trim() || 'Sin tipo'
    const acumulado = porTipo.get(tipo) || { tipo, modulos: 0, valor: 0 }
    acumulado.modulos += 1
    acumulado.valor += valor
    porTipo.set(tipo, acumulado)
  }

  const totalModulos = filas.reduce((total, fila) => total + fila.modulos, 0)
  const totalValor = filas.reduce((total, fila) => total + fila.valor, 0)
  const totalGarantias = filas.reduce((total, fila) => total + fila.garantias, 0)
  const pendientes = registrosAnio.filter((registro) => !registro.esGarantia && tieneOtPendiente(registro))
  const hoy = new Date()
  const antiguedadPendientes = [
    { etiqueta: '0–7 días', cantidad: 0 },
    { etiqueta: '8–30 días', cantidad: 0 },
    { etiqueta: '31–60 días', cantidad: 0 },
    { etiqueta: 'Más de 60 días', cantidad: 0 },
  ]
  pendientes.forEach((registro) => {
    const fecha = new Date(`${String(registro.fecha_prueba_electrica || '').slice(0, 10)}T12:00:00`)
    const dias = Number.isNaN(fecha.getTime()) ? 0 : Math.max(0, Math.floor((hoy - fecha) / 86400000))
    const indice = dias <= 7 ? 0 : dias <= 30 ? 1 : dias <= 60 ? 2 : 3
    antiguedadPendientes[indice].cantidad += 1
  })
  return {
    filas,
    totalModulos,
    totalValor,
    totalGarantias,
    promedio: totalModulos > 0 ? totalValor / totalModulos : 0,
    produccion,
    proyectos: [...porProyecto.values()]
      .sort((a, b) => b.valor - a.valor || b.modulos - a.modulos)
      .slice(0, 8),
    pendientes: {
      cantidad: pendientes.length,
      valor: pendientes.reduce((total, registro) => total + numero(registro.valorTotal), 0),
      antiguedad: antiguedadPendientes,
    },
    tipos: [...porTipo.values()]
      .sort((a, b) => b.valor - a.valor || b.modulos - a.modulos)
      .slice(0, 8),
  }
}

function GraficoAnual({ filas }) {
  const ancho = 1000
  const alto = 360
  const margen = { izquierda: 64, derecha: 78, arriba: 34, abajo: 52 }
  const anchoGrafico = ancho - margen.izquierda - margen.derecha
  const altoGrafico = alto - margen.arriba - margen.abajo
  const maxModulos = Math.max(1, ...filas.map((fila) => fila.modulos))
  const maxValor = Math.max(1, ...filas.map((fila) => fila.valor))
  const x = (indice) => margen.izquierda + (indice * anchoGrafico) / 11
  const yModulos = (valor) => margen.arriba + altoGrafico - (valor / maxModulos) * altoGrafico
  const yValor = (valor) => margen.arriba + altoGrafico - (valor / maxValor) * altoGrafico
  const puntosModulos = filas.map((fila) => `${x(fila.indice)},${yModulos(fila.modulos)}`).join(' ')
  const puntosValor = filas.map((fila) => `${x(fila.indice)},${yValor(fila.valor)}`).join(' ')

  return (
    <div style={{ overflowX: 'auto', paddingBottom: '4px' }}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Módulos y servicios valorizados por mes" style={{ display: 'block', width: '100%', minWidth: '780px', height: 'auto' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((proporcion) => {
          const y = margen.arriba + altoGrafico - proporcion * altoGrafico
          return (
            <g key={proporcion}>
              <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={y} y2={y} stroke="#34444d" strokeWidth="1" />
              <text x={margen.izquierda - 12} y={y + 5} textAnchor="end" fill="#b0bec5" fontSize="13">{formatearEntero(maxModulos * proporcion)}</text>
              <text x={ancho - margen.derecha + 12} y={y + 5} fill="#b0bec5" fontSize="13">{formatearMillones(maxValor * proporcion)}</text>
            </g>
          )
        })}

        <text x={margen.izquierda} y="18" fill="#ff7b72" fontSize="13" fontWeight="700">Módulos</text>
        <text x={ancho - margen.derecha} y="18" textAnchor="end" fill="#49d17d" fontSize="13" fontWeight="700">Servicios valorizados</text>
        <line x1={margen.izquierda} x2={ancho - margen.derecha} y1={margen.arriba + altoGrafico} y2={margen.arriba + altoGrafico} stroke="#61727b" />
        <polyline points={puntosModulos} fill="none" stroke="#ff6b6b" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />
        <polyline points={puntosValor} fill="none" stroke="#42d27a" strokeWidth="4" strokeLinejoin="round" strokeLinecap="round" />

        {filas.map((fila) => (
          <g key={fila.mes}>
            <text x={x(fila.indice)} y={alto - 18} textAnchor="middle" fill="#e6edf3" fontSize="13">{fila.mes}</text>
            <circle cx={x(fila.indice)} cy={yModulos(fila.modulos)} r="5" fill="#ff6b6b">
              <title>{`${fila.mes}: ${formatearEntero(fila.modulos)} módulos`}</title>
            </circle>
            <rect x={x(fila.indice) - 5} y={yValor(fila.valor) - 5} width="10" height="10" rx="2" transform={`rotate(45 ${x(fila.indice)} ${yValor(fila.valor)})`} fill="#42d27a">
              <title>{`${fila.mes}: ${formatearDinero(fila.valor)}`}</title>
            </rect>
          </g>
        ))}
      </svg>
    </div>
  )
}

export default function ResumenGerencialModal({
  registros = [],
  materiales = [],
  usuarioId = '',
  anio,
  cargando = false,
  error = '',
  onCambiarAnio,
  onActualizar,
  onCerrar,
}) {
  const resumen = useMemo(() => construirResumen(registros, anio), [registros, anio])
  const maxTipo = Math.max(1, ...resumen.tipos.map((tipo) => tipo.valor))
  const maxProyecto = Math.max(1, ...resumen.proyectos.map((proyecto) => proyecto.valor))
  const diferenciasMateriales = useMemo(() => materiales
    .map((material) => ({
      material: material.material || 'Sin descripción',
      retirado: numero(material.retirado),
      instalado: numero(material.totalCantidad),
      diferencia: numero(material.retirado) - numero(material.totalCantidad),
    }))
    .filter((material) => material.retirado !== 0 || material.instalado !== 0)
    .sort((a, b) => (
      Number(b.instalado > 0) - Number(a.instalado > 0)
      || Math.abs(b.diferencia) - Math.abs(a.diferencia)
    ))
    .slice(0, 8), [materiales])
  const anioActual = new Date().getFullYear()
  const opcionesAnio = Array.from({ length: 7 }, (_, indice) => anioActual - indice)
  const [distribucion, setDistribucion] = useState(() => cargarDistribucion(usuarioId))

  useEffect(() => {
    window.localStorage.setItem(`resumen-gerencial:${usuarioId || 'local'}`, JSON.stringify(distribucion))
  }, [distribucion, usuarioId])

  function moverPanel(idOrigen, idDestino, columnaDestino) {
    if (!idOrigen || idOrigen === idDestino) return
    setDistribucion((actual) => {
      const origen = actual.find((item) => item.id === idOrigen)
      if (!origen) return actual
      const sinOrigen = actual.filter((item) => item.id !== idOrigen)
      const movido = { ...origen, columna: columnaDestino }
      const indiceDestino = idDestino ? sinOrigen.findIndex((item) => item.id === idDestino) : -1
      if (indiceDestino < 0) return [...sinOrigen, movido]
      const siguiente = [...sinOrigen]
      siguiente.splice(indiceDestino, 0, movido)
      return siguiente
    })
  }

  function moverPanelUnPaso(id, direccion) {
    setDistribucion((actual) => {
      const item = actual.find((panel) => panel.id === id)
      if (!item) return actual
      const indicesColumna = actual
        .map((panel, indice) => ({ panel, indice }))
        .filter(({ panel }) => panel.columna === item.columna)
      const posicion = indicesColumna.findIndex(({ panel }) => panel.id === id)
      const destino = indicesColumna[posicion + direccion]
      if (!destino) return actual
      const siguiente = [...actual]
      const indiceActual = actual.findIndex((panel) => panel.id === id)
      ;[siguiente[indiceActual], siguiente[destino.indice]] = [siguiente[destino.indice], siguiente[indiceActual]]
      return siguiente
    })
  }

  function cambiarPanelDeColumna(id) {
    const item = distribucion.find((panel) => panel.id === id)
    if (!item) return
    moverPanel(id, '', item.columna === 0 ? 1 : 0)
  }

  function contenidoPanel(id) {
    if (id === 'produccion') return (
      <>
        <h3 style={{ margin: '0 36px 4px 0' }}>Producción mensual</h3>
        <small style={{ color: '#90a4ae' }}>Distribución porcentual entre mantención, proyectos y garantía</small>
        <GraficoProduccion filas={resumen.produccion} />
      </>
    )

    if (id === 'pendientes') return (
      <>
        <h3 style={{ margin: '0 36px 4px 0' }}>Protocolos pendientes de OT</h3>
        <small style={{ color: '#90a4ae' }}>Documentación valorizada que todavía no tiene una OT asociada</small>
        <div style={{ ...cardsStyle, margin: '16px 0' }}>
          <Tarjeta titulo="Protocolos pendientes" valor={formatearEntero(resumen.pendientes.cantidad)} color="#ffcc80" />
          <Tarjeta titulo="Servicios valorizados pendientes" valor={formatearDinero(resumen.pendientes.valor)} color="#ff8a80" />
        </div>
        <GraficoAntiguedad filas={resumen.pendientes.antiguedad} />
      </>
    )

    if (id === 'resumen-mensual') return (
      <>
        <h3 style={{ margin: '0 36px 12px 0' }}>Resumen por mes</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
            <thead><tr><th style={thStyle}>Mes</th><th style={thRightStyle}>Módulos</th><th style={thRightStyle}>Garantías</th><th style={thRightStyle}>Servicios valorizados</th></tr></thead>
            <tbody>
              {resumen.filas.map((fila) => (
                <tr key={fila.mes}>
                  <td style={tdStyle}>{fila.mes}</td>
                  <td style={tdRightStyle}>{formatearEntero(fila.modulos)}</td>
                  <td style={tdRightStyle}>{formatearEntero(fila.garantias)}</td>
                  <td style={{ ...tdRightStyle, color: '#8be9ad', fontWeight: 800 }}>{formatearDinero(fila.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )

    if (id === 'proyectos') return (
      <>
        <h3 style={{ margin: '0 36px 4px 0' }}>Servicios valorizados por proyecto</h3>
        <small style={{ color: '#90a4ae' }}>Proyectos con mayor valorización durante {anio}</small>
        <div style={{ display: 'grid', gap: '13px', marginTop: '18px' }}>
          {resumen.proyectos.length === 0 && <p style={{ color: '#bbb' }}>No hay información para este año.</p>}
          {resumen.proyectos.map((proyecto) => (
            <BarraResumen
              key={proyecto.proyecto}
              etiqueta={proyecto.proyecto}
              valor={proyecto.valor}
              maximo={maxProyecto}
              detalle={`${formatearEntero(proyecto.modulos)} módulos`}
            />
          ))}
        </div>
      </>
    )

    if (id === 'materiales') return (
      <>
        <h3 style={{ margin: '0 36px 4px 0' }}>Material retirado vs. instalado/cobrado</h3>
        <small style={{ color: '#90a4ae' }}>Mayores diferencias del período, después de aplicar equivalencias y devoluciones registradas</small>
        <ComparacionMateriales filas={diferenciasMateriales} />
      </>
    )

    if (id === 'tipos') return (
      <>
        <h3 style={{ margin: '0 36px 4px 0' }}>Tipos con mayor valorización</h3>
        <small style={{ color: '#90a4ae' }}>Primeros 8 tipos del año seleccionado</small>
        <div style={{ display: 'grid', gap: '13px', marginTop: '18px' }}>
          {resumen.tipos.length === 0 && <p style={{ color: '#bbb' }}>No hay información para este año.</p>}
          {resumen.tipos.map((tipo) => (
            <div key={tipo.tipo}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '5px' }}>
                <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tipo.tipo}</strong>
                <span style={{ color: '#8be9ad', whiteSpace: 'nowrap' }}>{formatearDinero(tipo.valor)}</span>
              </div>
              <div style={{ height: '9px', borderRadius: '999px', background: '#24333b', overflow: 'hidden' }}>
                <div style={{ width: `${Math.max(2, (tipo.valor / maxTipo) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #1f9d63, #55e394)', borderRadius: 'inherit' }} />
              </div>
              <small style={{ color: '#90a4ae' }}>{formatearEntero(tipo.modulos)} módulos</small>
            </div>
          ))}
        </div>
      </>
    )

    return null
  }

  return (
    <div onClick={onCerrar} style={overlayStyle}>
      <section onClick={(evento) => evento.stopPropagation()} style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Resumen gerencial</h2>
            <p style={{ margin: '6px 0 0', color: '#aebdc5' }}>Consolidado anual de módulos protocolizados y servicios valorizados.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select value={anio} onChange={(evento) => onCambiarAnio(evento.target.value)} style={controlStyle} aria-label="Año del resumen">
              {opcionesAnio.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
            <button type="button" onClick={onActualizar} disabled={cargando} style={{ ...buttonStyle, background: '#1565c0' }}>
              {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button type="button" onClick={() => setDistribucion(DISTRIBUCION_INICIAL.map((item) => ({ ...item })))} style={buttonStyle}>
              Restablecer orden
            </button>
            <button type="button" onClick={onCerrar} style={buttonStyle}>Cerrar</button>
          </div>
        </header>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={cardsStyle}>
          <Tarjeta titulo="Módulos del año" valor={formatearEntero(resumen.totalModulos)} color="#ff8a80" />
          <Tarjeta titulo="Servicios valorizados" valor={formatearDinero(resumen.totalValor)} color="#69f0ae" />
          <Tarjeta titulo="Promedio valorizado por módulo" valor={formatearDinero(resumen.promedio)} color="#82b1ff" />
          <Tarjeta titulo="Registros en garantía" valor={formatearEntero(resumen.totalGarantias)} color="#ffd180" />
        </div>

        <div style={panelStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Módulos y valor mensual</h3>
              <small style={{ color: '#90a4ae' }}>Cantidad de módulos en el eje izquierdo · montos en el eje derecho</small>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#d6e2e8' }}>
              <span><b style={{ color: '#ff6b6b' }}>●</b> Módulos</span>
              <span><b style={{ color: '#42d27a' }}>◆</b> Servicios valorizados</span>
            </div>
          </div>
          {cargando && registros.length === 0
            ? <p style={{ color: '#bbb' }}>Preparando consolidado...</p>
            : <GraficoAnual filas={resumen.filas} />}
        </div>

        <div style={dosColumnasStyle}>
          {[0, 1].map((columna) => (
            <div
              key={columna}
              style={columnaPanelesStyle}
              onDragOver={(evento) => evento.preventDefault()}
              onDrop={(evento) => {
                evento.preventDefault()
                moverPanel(evento.dataTransfer.getData('text/panel-gerencial'), '', columna)
              }}
            >
              {distribucion.filter((item) => item.columna === columna).map((item) => (
                <PanelMovible
                  key={item.id}
                  id={item.id}
                  columna={columna}
                  onMover={moverPanel}
                  onSubir={() => moverPanelUnPaso(item.id, -1)}
                  onBajar={() => moverPanelUnPaso(item.id, 1)}
                  onCambiarColumna={() => cambiarPanelDeColumna(item.id)}
                >
                  {contenidoPanel(item.id)}
                </PanelMovible>
              ))}
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function PanelMovible({ id, columna, onMover, onSubir, onBajar, onCambiarColumna, children }) {
  return (
    <div
      style={{ ...panelStyle, position: 'relative' }}
      onDragOver={(evento) => evento.preventDefault()}
      onDrop={(evento) => {
        evento.preventDefault()
        evento.stopPropagation()
        onMover(evento.dataTransfer.getData('text/panel-gerencial'), id, columna)
      }}
    >
      <div style={controlesPanelStyle}>
        <button
          type="button"
          draggable
          title="Arrastrar para mover"
          aria-label="Arrastrar panel"
          onDragStart={(evento) => {
            evento.dataTransfer.effectAllowed = 'move'
            evento.dataTransfer.setData('text/panel-gerencial', id)
          }}
          style={{ ...botonPanelStyle, cursor: 'grab' }}
        >
          {'\u283F'}
        </button>
        <button type="button" title="Subir" aria-label="Subir panel" onClick={onSubir} style={botonPanelStyle}>↑</button>
        <button type="button" title="Bajar" aria-label="Bajar panel" onClick={onBajar} style={botonPanelStyle}>↓</button>
        <button type="button" title="Cambiar de columna" aria-label="Cambiar panel de columna" onClick={onCambiarColumna} style={botonPanelStyle}>⇄</button>
      </div>
      {children}
    </div>
  )
}

function GraficoProduccion({ filas }) {
  return (
    <div style={{ marginTop: '18px' }}>
      <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#c5d2d8', flexWrap: 'wrap', marginBottom: '8px' }}>
        <span><b style={{ color: '#42d27a' }}>■</b> Mantención</span>
        <span><b style={{ color: '#64b5f6' }}>■</b> Proyectos</span>
        <span><b style={{ color: '#ffb74d' }}>■</b> Garantía</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(42px, 1fr))', gap: '5px', height: '210px', alignItems: 'end', overflowX: 'auto', overflowY: 'hidden', paddingTop: '8px' }}>
        {filas.map((fila) => {
          const total = fila.mantencion + fila.proyectos + fila.garantia
          const altoMantencion = total ? (fila.mantencion / total) * 164 : 0
          const altoProyectos = total ? (fila.proyectos / total) * 164 : 0
          const altoGarantia = total ? (fila.garantia / total) * 164 : 0
          const porcentaje = (cantidad) => total ? Math.round((cantidad / total) * 100) : 0
          return (
            <div key={fila.mes} style={{ display: 'grid', gridTemplateRows: '18px 164px 18px', gap: '4px', minWidth: '34px', textAlign: 'center' }} title={`${fila.mes}: ${total} módulos`}>
              <strong style={{ fontSize: '11px', color: '#dce7ec' }}>{total || ''}</strong>
              <div style={{ alignSelf: 'end', height: total ? '164px' : 0, minHeight: total ? '3px' : 0, display: 'flex', flexDirection: 'column-reverse', borderRadius: '5px 5px 0 0', overflow: 'hidden', background: '#20323b' }}>
                <SegmentoProduccion alto={altoMantencion} color="#42d27a" porcentaje={porcentaje(fila.mantencion)} titulo={`Mantención: ${fila.mantencion}`} />
                <SegmentoProduccion alto={altoProyectos} color="#64b5f6" porcentaje={porcentaje(fila.proyectos)} titulo={`Proyectos: ${fila.proyectos}`} />
                <SegmentoProduccion alto={altoGarantia} color="#ffb74d" porcentaje={porcentaje(fila.garantia)} titulo={`Garantía: ${fila.garantia}`} />
              </div>
              <span style={{ color: '#aebdc5', fontSize: '11px' }}>{fila.mes}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function SegmentoProduccion({ alto, color, porcentaje, titulo }) {
  return (
    <div
      title={`${titulo} (${porcentaje}%)`}
      style={{
        height: `${alto}px`,
        background: color,
        color: '#081117',
        display: 'grid',
        placeItems: 'center',
        fontSize: '10px',
        fontWeight: 900,
        overflow: 'hidden',
      }}
    >
      {porcentaje >= 12 ? `${porcentaje}%` : ''}
    </div>
  )
}

function BarraResumen({ etiqueta, valor, maximo, detalle }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', marginBottom: '5px' }}>
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{etiqueta}</strong>
        <span style={{ color: '#8be9ad', whiteSpace: 'nowrap' }}>{formatearDinero(valor)}</span>
      </div>
      <div style={{ height: '9px', borderRadius: '999px', background: '#24333b', overflow: 'hidden' }}>
        <div style={{ width: `${Math.max(2, (numero(valor) / maximo) * 100)}%`, height: '100%', background: 'linear-gradient(90deg, #1f9d63, #55e394)', borderRadius: 'inherit' }} />
      </div>
      <small style={{ color: '#90a4ae' }}>{detalle}</small>
    </div>
  )
}

function GraficoAntiguedad({ filas }) {
  const maximo = Math.max(1, ...filas.map((fila) => fila.cantidad))
  return (
    <div style={{ display: 'grid', gap: '11px' }}>
      {filas.map((fila, indice) => (
        <div key={fila.etiqueta} style={{ display: 'grid', gridTemplateColumns: '105px 1fr 42px', gap: '9px', alignItems: 'center' }}>
          <span style={{ color: '#c5d2d8', fontSize: '13px' }}>{fila.etiqueta}</span>
          <div style={{ height: '12px', borderRadius: '999px', background: '#263740', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(fila.cantidad / maximo) * 100}%`, background: ['#66bb6a', '#ffee58', '#ffb74d', '#ef5350'][indice] }} />
          </div>
          <strong style={{ textAlign: 'right' }}>{formatearEntero(fila.cantidad)}</strong>
        </div>
      ))}
    </div>
  )
}

function ComparacionMateriales({ filas }) {
  if (filas.length === 0) return <p style={{ color: '#bbb', marginTop: '18px' }}>No hay movimientos comparables para el período.</p>
  return (
    <div style={{ display: 'grid', gap: '15px', marginTop: '18px' }}>
      {filas.map((fila) => {
        const maximo = Math.max(1, Math.abs(fila.retirado), Math.abs(fila.instalado))
        return (
          <div key={fila.material}>
            <strong title={fila.material} style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '5px' }}>{fila.material}</strong>
            <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr 54px', gap: '7px', alignItems: 'center', fontSize: '12px' }}>
              <span style={{ color: '#90caf9' }}>Retirado</span><div style={{ height: '8px', background: '#263740', borderRadius: '999px', overflow: 'hidden' }}><div style={{ width: `${(Math.abs(fila.retirado) / maximo) * 100}%`, height: '100%', background: '#42a5f5' }} /></div><b style={{ textAlign: 'right' }}>{formatearEntero(fila.retirado)}</b>
              <span style={{ color: '#a5d6a7' }}>Inst./cob.</span><div style={{ height: '8px', background: '#263740', borderRadius: '999px', overflow: 'hidden' }}><div style={{ width: `${(Math.abs(fila.instalado) / maximo) * 100}%`, height: '100%', background: '#66bb6a' }} /></div><b style={{ textAlign: 'right' }}>{formatearEntero(fila.instalado)}</b>
            </div>
            <small style={{ color: fila.diferencia === 0 ? '#90a4ae' : '#ffcc80' }}>Diferencia: {formatearEntero(fila.diferencia)}</small>
          </div>
        )
      })}
    </div>
  )
}

function Tarjeta({ titulo, valor, color }) {
  return <article style={cardStyle}><span style={{ color: '#b8c6cd' }}>{titulo}</span><strong style={{ color, fontSize: 'clamp(22px, 2vw, 32px)' }}>{valor}</strong></article>
}

const overlayStyle = {
  position: 'fixed', inset: 0, zIndex: 10040, background: 'rgba(3, 8, 12, 0.82)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', boxSizing: 'border-box',
}
const modalStyle = {
  width: 'min(1480px, 100%)', maxHeight: 'calc(100vh - 28px)', overflow: 'auto', boxSizing: 'border-box',
  background: 'linear-gradient(145deg, #14232b, #0c151a)', border: '1px solid #315462', borderRadius: '16px',
  color: 'white', padding: 'clamp(16px, 2.3vw, 30px)', boxShadow: '0 28px 70px rgba(0,0,0,.55)',
}
const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }
const controlStyle = { padding: '10px 12px', borderRadius: '8px', border: '1px solid #58717c', background: '#18272f', color: 'white', fontWeight: 800 }
const buttonStyle = { padding: '10px 16px', borderRadius: '8px', border: '1px solid #607d8b', background: '#455a64', color: 'white', cursor: 'pointer', fontWeight: 800 }
const cardsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '12px', margin: '22px 0' }
const cardStyle = { display: 'grid', gap: '8px', padding: '18px', borderRadius: '13px', border: '1px solid #344f5b', background: 'rgba(33, 47, 54, .88)', minWidth: 0 }
const panelStyle = { padding: '18px', borderRadius: '13px', border: '1px solid #304b57', background: 'rgba(12, 23, 29, .8)', minWidth: 0 }
const controlesPanelStyle = { position: 'absolute', top: '9px', right: '9px', display: 'flex', gap: '3px', zIndex: 2 }
const botonPanelStyle = {
  width: '25px', height: '25px', padding: 0, borderRadius: '6px', border: '1px solid #46616d',
  background: '#1b2c34', color: '#c9d8df', cursor: 'pointer', fontWeight: 900, lineHeight: 1,
}
const dosColumnasStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))',
  gap: '14px',
  marginTop: '14px',
  alignItems: 'start',
}
const columnaPanelesStyle = { display: 'grid', gap: '14px', alignContent: 'start', minWidth: 0 }
const thStyle = { textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid #45606c', color: '#b9d8e5' }
const thRightStyle = { ...thStyle, textAlign: 'right' }
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #263b44' }
const tdRightStyle = { ...tdStyle, textAlign: 'right' }
const errorStyle = { marginTop: '14px', padding: '12px 14px', borderRadius: '9px', border: '1px solid #ef5350', background: '#42191c', color: '#ffcdd2' }
