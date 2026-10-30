import { useMemo } from 'react'

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

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
  const registrosAnio = registrosUnicos(registros).filter((registro) => fechaRegistro(registro)?.anio === Number(anio))

  for (const registro of registrosAnio) {
    const fecha = fechaRegistro(registro)
    if (!fecha || fecha.mes < 0 || fecha.mes > 11) continue
    const valor = numero(registro.valorTotal)
    filas[fecha.mes].modulos += 1
    filas[fecha.mes].valor += valor
    if (registro.esGarantia) filas[fecha.mes].garantias += 1

    const tipo = String(registro.tipo || 'Sin tipo').trim() || 'Sin tipo'
    const acumulado = porTipo.get(tipo) || { tipo, modulos: 0, valor: 0 }
    acumulado.modulos += 1
    acumulado.valor += valor
    porTipo.set(tipo, acumulado)
  }

  const totalModulos = filas.reduce((total, fila) => total + fila.modulos, 0)
  const totalValor = filas.reduce((total, fila) => total + fila.valor, 0)
  const totalGarantias = filas.reduce((total, fila) => total + fila.garantias, 0)
  return {
    filas,
    totalModulos,
    totalValor,
    totalGarantias,
    promedio: totalModulos > 0 ? totalValor / totalModulos : 0,
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
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label="Módulos y valor cobrado por mes" style={{ display: 'block', width: '100%', minWidth: '780px', height: 'auto' }}>
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
        <text x={ancho - margen.derecha} y="18" textAnchor="end" fill="#49d17d" fontSize="13" fontWeight="700">Valor cobrado</text>
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
  anio,
  cargando = false,
  error = '',
  onCambiarAnio,
  onActualizar,
  onCerrar,
}) {
  const resumen = useMemo(() => construirResumen(registros, anio), [registros, anio])
  const maxTipo = Math.max(1, ...resumen.tipos.map((tipo) => tipo.valor))
  const anioActual = new Date().getFullYear()
  const opcionesAnio = Array.from({ length: 7 }, (_, indice) => anioActual - indice)

  return (
    <div onClick={onCerrar} style={overlayStyle}>
      <section onClick={(evento) => evento.stopPropagation()} style={modalStyle}>
        <header style={headerStyle}>
          <div>
            <h2 style={{ margin: 0 }}>Resumen gerencial</h2>
            <p style={{ margin: '6px 0 0', color: '#aebdc5' }}>Consolidado anual de módulos protocolizados y valores cobrados.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select value={anio} onChange={(evento) => onCambiarAnio(evento.target.value)} style={controlStyle} aria-label="Año del resumen">
              {opcionesAnio.map((opcion) => <option key={opcion} value={opcion}>{opcion}</option>)}
            </select>
            <button type="button" onClick={onActualizar} disabled={cargando} style={{ ...buttonStyle, background: '#1565c0' }}>
              {cargando ? 'Actualizando...' : 'Actualizar'}
            </button>
            <button type="button" onClick={onCerrar} style={buttonStyle}>Cerrar</button>
          </div>
        </header>

        {error && <div style={errorStyle}>{error}</div>}

        <div style={cardsStyle}>
          <Tarjeta titulo="Módulos del año" valor={formatearEntero(resumen.totalModulos)} color="#ff8a80" />
          <Tarjeta titulo="Valor cobrado acumulado" valor={formatearDinero(resumen.totalValor)} color="#69f0ae" />
          <Tarjeta titulo="Promedio por módulo" valor={formatearDinero(resumen.promedio)} color="#82b1ff" />
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
              <span><b style={{ color: '#42d27a' }}>◆</b> Valor cobrado</span>
            </div>
          </div>
          {cargando && registros.length === 0
            ? <p style={{ color: '#bbb' }}>Preparando consolidado...</p>
            : <GraficoAnual filas={resumen.filas} />}
        </div>

        <div style={dosColumnasStyle}>
          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 12px' }}>Resumen por mes</h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '480px' }}>
                <thead><tr><th style={thStyle}>Mes</th><th style={thRightStyle}>Módulos</th><th style={thRightStyle}>Garantías</th><th style={thRightStyle}>Valor cobrado</th></tr></thead>
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
          </div>

          <div style={panelStyle}>
            <h3 style={{ margin: '0 0 4px' }}>Tipos con mayor valor cobrado</h3>
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
          </div>
        </div>
      </section>
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
const dosColumnasStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 480px), 1fr))', gap: '14px', marginTop: '14px' }
const thStyle = { textAlign: 'left', padding: '9px 10px', borderBottom: '1px solid #45606c', color: '#b9d8e5' }
const thRightStyle = { ...thStyle, textAlign: 'right' }
const tdStyle = { padding: '8px 10px', borderBottom: '1px solid #263b44' }
const tdRightStyle = { ...tdStyle, textAlign: 'right' }
const errorStyle = { marginTop: '14px', padding: '12px 14px', borderRadius: '9px', border: '1px solid #ef5350', background: '#42191c', color: '#ffcdd2' }
