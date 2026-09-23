import { useMemo, useState } from 'react'

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

function etiquetaMes(periodo) {
  const [anio, mes] = String(periodo).split('-').map(Number)
  if (!anio || !mes) return periodo
  return new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' })
    .format(new Date(anio, mes - 1, 1))
}

function construirFilas(pedidos, periodos, inventario) {
  const inventarioPorClave = new Map()
  for (const material of inventario) {
    const claves = [material.codigo, material.descripcion].map(normalizar).filter(Boolean)
    for (const clave of claves) inventarioPorClave.set(clave, material)
  }

  const mapa = new Map()
  for (const pedido of pedidos) {
    const periodo = String(pedido.fecha_entrega_bodega || pedido.fecha || '').slice(0, 7)
    const indiceMes = periodos.indexOf(periodo)
    if (indiceMes < 0) continue

    for (const item of pedido.items || []) {
      const codigo = String(item.material_vale || '').trim()
      const descripcion = String(item.material_balance || item.material_vale || '').trim()
      const materialInventario = inventarioPorClave.get(normalizar(codigo)) || inventarioPorClave.get(normalizar(descripcion))
      const clave = normalizar(materialInventario?.codigo || codigo || descripcion)
      if (!clave) continue
      const fila = mapa.get(clave) || {
        codigo: materialInventario?.codigo || codigo,
        material: materialInventario?.descripcion || descripcion,
        unidad: materialInventario?.unidad || '',
        stock: numero(materialInventario?.saldoFinal),
        meses: [0, 0, 0],
      }
      fila.meses[indiceMes] += numero(item.cantidad)
      mapa.set(clave, fila)
    }
  }

  return [...mapa.values()].map((fila) => {
    const promedio = fila.meses.reduce((total, valor) => total + valor, 0) / 3
    const estimadoMensual = (fila.meses[0] * 0.2) + (fila.meses[1] * 0.3) + (fila.meses[2] * 0.5)
    const estimadoTresMeses = estimadoMensual * 3
    return {
      ...fila,
      promedio,
      estimadoMensual,
      estimadoTresMeses,
      reposicion: Math.max(0, Math.ceil(estimadoTresMeses - fila.stock)),
    }
  }).sort((a, b) => b.reposicion - a.reposicion || b.estimadoMensual - a.estimadoMensual)
}

export default function ProyeccionMaterialesModal({
  pedidos = [],
  periodos = [],
  periodosFuturos = [],
  inventario = [],
  cargando = false,
  error = '',
  onActualizar,
  onCerrar,
}) {
  const [busqueda, setBusqueda] = useState('')
  const [soloReposicion, setSoloReposicion] = useState(false)
  const filas = useMemo(() => construirFilas(pedidos, periodos, inventario), [pedidos, periodos, inventario])
  const visibles = filas.filter((fila) => {
    if (soloReposicion && fila.reposicion <= 0) return false
    const texto = normalizar(`${fila.codigo} ${fila.material}`)
    return !busqueda || texto.includes(normalizar(busqueda))
  })
  const materialesAReponer = filas.filter((fila) => fila.reposicion > 0).length

  return (
    <div onClick={onCerrar} style={overlayStyle}>
      <div onClick={(event) => event.stopPropagation()} style={modalStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start' }}>
          <div>
            <h2 style={{ margin: 0 }}>Proyección de materiales</h2>
            <p style={{ margin: '6px 0 0', color: '#bbb' }}>
              Estimación basada en pedidos entregados durante los últimos tres meses completos.
            </p>
          </div>
          <button type="button" onClick={onCerrar} style={buttonStyle}>Cerrar</button>
        </div>

        <div style={cardsStyle}>
          <div style={cardStyle}><small>Materiales analizados</small><strong>{filas.length}</strong></div>
          <div style={cardStyle}><small>Necesitan reposición</small><strong style={{ color: '#ffb74d' }}>{materialesAReponer}</strong></div>
          <div style={cardStyle}><small>Pedidos entregados analizados</small><strong>{pedidos.length}</strong></div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', margin: '14px 0' }}>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar por código o material"
            style={{ ...inputStyle, flex: '1 1 320px' }}
          />
          <button type="button" onClick={() => setSoloReposicion((actual) => !actual)} style={buttonStyle}>
            {soloReposicion ? 'Mostrar todos' : 'Solo por reponer'}
          </button>
          <button type="button" onClick={onActualizar} disabled={cargando} style={{ ...buttonStyle, background: '#1565c0' }}>
            {cargando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>

        {error && <div style={errorStyle}>{error}</div>}
        {cargando && filas.length === 0 ? (
          <p style={{ color: '#bbb' }}>Calculando proyección...</p>
        ) : filas.length === 0 ? (
          <p style={{ color: '#bbb' }}>No hay pedidos entregados en los tres meses considerados.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: '1120px', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Código</th>
                  <th style={thStyle}>Material</th>
                  {periodos.map((periodo) => <th key={periodo} style={thRightStyle}>{etiquetaMes(periodo)}</th>)}
                  <th style={thRightStyle}>Promedio</th>
                  {periodosFuturos.map((periodo) => <th key={`futuro-${periodo}`} style={{ ...thRightStyle, color: '#90caf9' }}>Estimado {etiquetaMes(periodo)}</th>)}
                  <th style={thRightStyle}>Stock actual</th>
                  <th style={thRightStyle}>Proyección 3 meses</th>
                  <th style={thRightStyle}>Reponer</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((fila) => (
                  <tr key={`${fila.codigo}-${fila.material}`}>
                    <td style={tdStyle}>{fila.codigo || '-'}</td>
                    <td style={tdStyle}>{fila.material || '-'}</td>
                    {fila.meses.map((valor, indice) => <td key={indice} style={tdRightStyle}>{formato(valor)}</td>)}
                    <td style={tdRightStyle}>{formato(fila.promedio)}</td>
                    {periodosFuturos.map((periodo) => <td key={`futuro-${periodo}`} style={{ ...tdRightStyle, color: '#90caf9', fontWeight: 800 }}>{formato(fila.estimadoMensual)}</td>)}
                    <td style={tdRightStyle}>{formato(fila.stock)}</td>
                    <td style={tdRightStyle}>{formato(fila.estimadoTresMeses)}</td>
                    <td style={{ ...tdRightStyle, color: fila.reposicion > 0 ? '#ffb74d' : '#81c784', fontWeight: 900 }}>{formato(fila.reposicion)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p style={{ color: '#999', fontSize: '13px', marginBottom: 0 }}>
          La proyección mensual pondera los consumos del mes más antiguo al más reciente en 20%, 30% y 50%. “Reponer” compara la demanda estimada de tres meses con el saldo actual del inventario.
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
const thStyle = { padding: '9px', border: '1px solid #555', background: '#363636', textAlign: 'left', whiteSpace: 'nowrap' }
const thRightStyle = { ...thStyle, textAlign: 'right' }
const tdStyle = { padding: '8px 9px', border: '1px solid #494949' }
const tdRightStyle = { ...tdStyle, textAlign: 'right', whiteSpace: 'nowrap' }
const errorStyle = { marginBottom: '12px', padding: '10px', border: '1px solid #ef5350', borderRadius: '8px', background: '#3a1717', color: '#ff8a80', fontWeight: 700 }
