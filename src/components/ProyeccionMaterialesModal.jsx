import { useMemo, useState } from 'react'
import { exportarProyeccionMaterialesExcel } from '../services/exportarExcel'

function normalizar(valor = '') {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function numero(valor) {
  return Number(valor || 0)
}

function formato(valor) {
  return numero(valor).toLocaleString('es-CL', { maximumFractionDigits: 1 })
}

function partesMes(periodo) {
  const [anio, mes] = String(periodo).split('-').map(Number)
  if (!anio || !mes) return { mes: periodo, anio: '' }
  return {
    mes: new Intl.DateTimeFormat('es-CL', { month: 'long' }).format(new Date(anio, mes - 1, 1)),
    anio: String(anio),
  }
}

function EncabezadoMes({ periodo, estimado = false, subtitulo = '' }) {
  const partes = partesMes(periodo)
  return (
    <span style={{ display: 'grid', gap: '2px', lineHeight: 1.05 }}>
      <span>{estimado ? `Estimado ${partes.mes}` : partes.mes}</span>
      <span>{subtitulo || partes.anio}</span>
    </span>
  )
}

function factorEstimacionMesActual(periodoActual) {
  const hoy = new Date()
  const periodoHoy = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
  if (periodoActual !== periodoHoy) return 1
  const diasMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).getDate()
  return diasMes / Math.max(1, hoy.getDate())
}

function construirFilas(pedidos, periodos, inventario, resumenMensual = []) {
  const inventarioPorClave = new Map()
  for (const [indice, material] of inventario.entries()) {
    const claves = [material.codigo, material.descripcion].map(normalizar).filter(Boolean)
    for (const clave of claves) inventarioPorClave.set(clave, { material, indice })
  }

  const mapa = new Map()
  function sumarMaterial({ periodo, codigo = '', descripcion = '', cantidad = 0 }) {
    const periodoNormalizado = String(periodo || '').replace('/', '-').slice(0, 7)
    const indiceMes = periodos.indexOf(periodoNormalizado)
    if (indiceMes < 0) return
    const codigoLimpio = String(codigo || '').trim()
    const descripcionLimpia = String(descripcion || codigo || '').trim()
    const coincidenciaInventario = inventarioPorClave.get(normalizar(codigoLimpio)) || inventarioPorClave.get(normalizar(descripcionLimpia))
    const materialInventario = coincidenciaInventario?.material
    const clave = normalizar(materialInventario?.codigo || codigoLimpio || descripcionLimpia)
    if (!clave) return
    const fila = mapa.get(clave) || {
      codigo: materialInventario?.codigo || codigoLimpio,
      material: materialInventario?.descripcion || descripcionLimpia,
      unidad: materialInventario?.unidad || '',
      ordenInventario: coincidenciaInventario?.indice ?? Number.MAX_SAFE_INTEGER,
      consumosReales: [0, 0, 0],
    }
    fila.consumosReales[indiceMes] += numero(cantidad)
    mapa.set(clave, fila)
  }

  if (resumenMensual.length > 0) {
    for (const fila of resumenMensual) {
      if (fila.categoria !== 'material') continue
      sumarMaterial({
        periodo: fila.periodo,
        codigo: fila.codigo,
        descripcion: fila.descripcion,
        cantidad: fila.cantidad,
      })
    }
  } else {
    for (const pedido of pedidos) {
      const periodo = String(pedido.fecha_entrega_bodega || pedido.fecha || '').slice(0, 7)
      for (const item of pedido.items || []) {
        sumarMaterial({
          periodo,
          codigo: item.material_vale,
          descripcion: item.material_balance || item.material_vale,
          cantidad: item.cantidad,
        })
      }
    }
  }

  return [...mapa.values()].map((fila) => {
    const factorMesActual = factorEstimacionMesActual(periodos[2])
    const julioReplicado = fila.consumosReales[0] <= 0 && fila.consumosReales[1] > 0
    const meses = [
      julioReplicado ? fila.consumosReales[1] : fila.consumosReales[0],
      fila.consumosReales[1],
      fila.consumosReales[2] * factorMesActual,
    ]
    const promedio = meses.reduce((total, valor) => total + valor, 0) / 3
    const estimadoMensual = (meses[0] * 0.2) + (meses[1] * 0.3) + (meses[2] * 0.5)
    const estimadoTresMeses = estimadoMensual * 3
    return {
      ...fila,
      meses,
      julioReplicado,
      septiembreProyectado: factorMesActual > 1,
      promedio,
      estimadoMensual,
      estimadoTresMeses,
    }
  }).sort((a, b) => (
    a.ordenInventario - b.ordenInventario ||
    a.material.localeCompare(b.material, 'es', { numeric: true, sensitivity: 'base' })
  ))
}

export default function ProyeccionMaterialesModal({
  pedidos = [],
  resumenMensual = [],
  periodos = [],
  periodosFuturos = [],
  inventario = [],
  cargando = false,
  error = '',
  onActualizar,
  onCerrar,
}) {
  const [busqueda, setBusqueda] = useState('')
  const filas = useMemo(
    () => construirFilas(pedidos, periodos, inventario, resumenMensual),
    [pedidos, periodos, inventario, resumenMensual]
  )
  const visibles = filas.filter((fila) => {
    const texto = normalizar(`${fila.codigo} ${fila.material}`)
    return !busqueda || texto.includes(normalizar(busqueda))
  })
  const materialesConConsumoActual = filas.filter((fila) => fila.consumosReales[2] > 0).length
  const pedidosAnalizados = resumenMensual.length > 0
    ? resumenMensual
        .filter((fila) => fila.categoria === 'pedido')
        .reduce((total, fila) => total + numero(fila.cantidad), 0)
    : pedidos.length

  return (
    <div onClick={onCerrar} style={overlayStyle}>
      <div onClick={(event) => event.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>Proyección de materiales</h2>
            <p style={{ margin: '6px 0 0', color: '#bbb' }}>
              Estimación basada en julio, agosto y septiembre. Julio utiliza agosto como referencia cuando no tiene registros y septiembre se proyecta al cierre del mes.
            </p>
          </div>
          <button type="button" onClick={onCerrar} style={buttonStyle}>Cerrar</button>
        </div>

        <div style={cardsStyle}>
          <div style={cardStyle}><small>Materiales analizados</small><strong>{filas.length}</strong></div>
          <div style={cardStyle}><small>Con consumo en septiembre</small><strong style={{ color: '#ffe082' }}>{materialesConConsumoActual}</strong></div>
          <div style={cardStyle}><small>Pedidos entregados analizados</small><strong>{formato(pedidosAnalizados)}</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '14px 0' }}>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por código o material"
            style={{ ...inputStyle, flex: '1 1 320px' }}
          />
          <button type="button" onClick={onActualizar} disabled={cargando} style={{ ...buttonStyle, background: '#1565c0' }}>
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
          <button
            type="button"
            onClick={() => exportarProyeccionMaterialesExcel(filas, periodos, periodosFuturos)}
            disabled={cargando || filas.length === 0}
            style={{ ...buttonStyle, background: '#2e7d32' }}
          >
            Descargar Excel
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {cargando && filas.length === 0 ? (
          <p style={{ color: '#bbb' }}>Calculando proyección...</p>
        ) : filas.length === 0 ? (
          <p style={{ color: '#bbb' }}>No hay pedidos entregados en los tres meses considerados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1040px', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: '122px' }}>Código</th>
                  <th style={{ ...thStyle, width: '200px' }}>Material</th>
                  {periodos.map((periodo, indice) => (
                    <th key={periodo} style={{ ...thRightStyle, width: indice === 2 ? '94px' : '78px', color: indice === 2 ? '#ffe082' : 'white' }}>
                      <EncabezadoMes periodo={periodo} estimado={indice === 2} subtitulo={indice === 0 ? 'base agosto' : ''} />
                    </th>
                  ))}
                  <th style={{ ...thRightStyle, width: '76px' }}>Promedio</th>
                  {periodosFuturos.map((periodo) => <th key={`futuro-${periodo}`} style={{ ...thRightStyle, width: '102px', color: '#90caf9' }}><EncabezadoMes periodo={periodo} estimado /></th>)}
                  <th style={{ ...thRightStyle, width: '88px' }}><span>Proyección<br />3 meses</span></th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila) => (
                  <tr key={`${fila.codigo}-${fila.material}`}>
                    <td style={tdStyle}>{fila.codigo || '-'}</td>
                    <td style={tdStyle}>{fila.material || '-'}</td>
                    {fila.meses.map((valor, indice) => (
                      <td
                        key={indice}
                        style={{
                          ...tdRightStyle,
                          color: (indice === 0 && fila.julioReplicado) || (indice === 2 && fila.septiembreProyectado) ? '#ffe082' : 'white',
                          fontWeight: (indice === 0 && fila.julioReplicado) || (indice === 2 && fila.septiembreProyectado) ? 800 : 400,
                        }}
                      >
                        {formato(valor)}
                      </td>
                    ))}
                    <td style={tdRightStyle}>{formato(fila.promedio)}</td>
                    {periodosFuturos.map((periodo) => <td key={`futuro-${periodo}`} style={{ ...tdRightStyle, color: '#90caf9', fontWeight: 800 }}>{formato(fila.estimadoMensual)}</td>)}
                    <td style={{ ...tdRightStyle, fontWeight: 900 }}>{formato(fila.estimadoTresMeses)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: '#999', fontSize: '13px', marginBottom: 0 }}>
          Los valores amarillos son estimados: julio replica agosto cuando no hay consumo registrado y septiembre se amplía proporcionalmente según los días transcurridos. La proyección mensual pondera julio, agosto y septiembre en 20%, 30% y 50%. La última columna muestra la demanda total estimada para octubre, noviembre y diciembre.
        </p>
      </div>
    </div>
  )
}

const overlayStyle = { position: 'fixed', inset: 0, zIndex: 3100, background: 'rgba(0,0,0,0.72)', padding: '18px', overflowY: 'auto' }
const modalStyle = { width: 'min(1450px, 100%)', margin: '0 auto', padding: '20px', boxSizing: 'border-box', border: '1px solid #777', borderRadius: '12px', background: '#202020', color: 'white' }
const cardsStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '10px', marginTop: '16px' }
const cardStyle = { display: 'grid', gap: '6px', padding: '13px', border: '1px solid #546e7a', borderRadius: '9px', background: '#263238', fontSize: '14px' }
const inputStyle = { padding: '10px', border: '1px solid #666', borderRadius: '7px', background: '#353535', color: 'white', boxSizing: 'border-box' }
const buttonStyle = { padding: '9px 14px', border: '1px solid #777', borderRadius: '8px', background: '#555', color: 'white', cursor: 'pointer', fontWeight: 700 }
const thStyle = { padding: '8px 7px', border: '1px solid #555', background: '#363636', textAlign: 'left', whiteSpace: 'normal', overflowWrap: 'anywhere', verticalAlign: 'middle' }
const thRightStyle = { ...thStyle, textAlign: 'right' }
const tdStyle = { padding: '8px 9px', border: '1px solid #494949' }
const tdRightStyle = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }
const errorStyle = { marginBottom: '12px', padding: '10px', border: '1px solid #ef5350', borderRadius: '8px', background: '#3a1717', color: '#ff8a80', fontWeight: 700 }
