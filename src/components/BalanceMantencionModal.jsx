import { useState } from 'react'

function BalanceMantencionModal({
  rango,
  fecha,
  cargando,
  protocolos = [],
  materiales = [],
  sueldos,
  formatearPrecio,
  onCambiarRango,
  onCambiarFecha,
  onCambiarSueldos,
  onActualizar,
  onCerrar,
  onClickFondo,
}) {
  const [editandoSueldos, setEditandoSueldos] = useState(false)
  const valorProtocolos = protocolos.reduce((total, registro) => total + Number(registro.valorTotal || 0), 0)
  const valorMaterialRetirado = materiales.reduce((total, fila) => {
    const retirado = Number(fila.retirado || 0)
    const compra = Number(fila.precioUnitarioCompra || 0)
    return total + (retirado * compra)
  }, 0)
  const valorSueldos = normalizarPrecio(sueldos)
  const balance = valorProtocolos - valorMaterialRetirado - valorSueldos
  const colorBalance = balance > 0 ? '#66bb6a' : balance < 0 ? '#ff5252' : 'white'
  const materialesRetirados = materiales
    .filter((fila) => Number(fila.retirado || 0) > 0)
    .sort((a, b) => String(a.material || '').localeCompare(String(b.material || ''), 'es', {
      numeric: true,
      sensitivity: 'base',
    }))

  return (
    <div
      onClick={(e) => {
        e.stopPropagation()
        onClickFondo?.()
      }}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 24px)',
        maxWidth: '980px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '20px',
        background: '#222',
        border: '1px solid white',
        borderRadius: '10px',
        zIndex: 1300,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'flex-start', marginBottom: '14px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Balance mantención</h2>
          <p style={{ color: '#ccc', margin: '6px 0 0' }}>
            Valor protocolos - material usado - sueldos.
          </p>
        </div>
        <button type="button" onClick={onCerrar} style={botonGris}>
          Cerrar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <select
          value={rango}
          onChange={(e) => onCambiarRango(e.target.value)}
          style={{ padding: '8px', fontWeight: 700 }}
        >
          <option value="dia">Día</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
        <input
          type={rango === 'dia' ? 'date' : rango === 'semana' ? 'week' : 'month'}
          value={fecha}
          onChange={(e) => onCambiarFecha(e.target.value)}
          style={{ padding: '8px' }}
        />
        <button type="button" onClick={onActualizar} disabled={cargando} style={botonAzul}>
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'stretch', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '4px', marginBottom: '14px' }}>
        <Tarjeta titulo="Valor protocolos" valor={formatearPrecio(valorProtocolos)} color="#66bb6a" />
        <OperadorBalance simbolo="-" />
        <Tarjeta titulo="Material usado" valor={formatearPrecio(valorMaterialRetirado)} color="#ff5252" />
        <OperadorBalance simbolo="-" />
        <label style={{ ...tarjetaStyle, flex: '0 0 190px', display: 'grid', gap: '6px' }}>
          <span style={{ color: '#ccc', fontWeight: 700 }}>Sueldos</span>
          {editandoSueldos ? (
            <input
              value={sueldos}
              onChange={(e) => onCambiarSueldos(e.target.value)}
              onBlur={() => setEditandoSueldos(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') setEditandoSueldos(false)
              }}
              autoFocus
              placeholder="$ 0"
              style={{
                padding: '2px 5px',
                borderRadius: '4px',
                border: '1px solid #64b5f6',
                background: '#263238',
                color: '#ff5252',
                font: 'inherit',
                fontSize: '20px',
                fontWeight: 900,
                lineHeight: 1.2,
                outline: 'none',
              }}
            />
          ) : (
            <span
              onDoubleClick={() => setEditandoSueldos(true)}
              title="Doble click para editar sueldos"
              style={{
                color: '#ff5252',
                fontSize: '20px',
                fontWeight: 900,
                cursor: 'text',
                lineHeight: 1.2,
              }}
            >
              {formatearPrecio(valorSueldos)}
            </span>
          )}
        </label>
        <OperadorBalance simbolo="=" />
        <Tarjeta titulo="Balance" valor={formatearPrecio(balance)} color={colorBalance} />
      </div>

      <div style={{ display: 'none', padding: '10px 12px', border: '1px solid #555', borderRadius: '8px', marginBottom: '12px', background: '#262626' }}>
        <strong>Fórmula:</strong> {formatearPrecio(valorProtocolos)} - {formatearPrecio(valorMaterialRetirado)} - {formatearPrecio(valorSueldos)} ={' '}
        <strong style={{ color: colorBalance }}>{formatearPrecio(balance)}</strong>
      </div>

      <h3 style={{ margin: '0 0 8px' }}>Material usado considerado</h3>
      {materialesRetirados.length === 0 ? (
        <p style={{ color: '#ccc' }}>No hay material usado en el rango seleccionado.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
            <thead>
              <tr style={{ background: '#333' }}>
                <th style={thStyle}>Material</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Retirado</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>$ compra</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {materialesRetirados.map((fila) => {
                const total = Number(fila.retirado || 0) * Number(fila.precioUnitarioCompra || 0)
                return (
                  <tr key={fila.clave || fila.material}>
                    <td style={tdStyle}>{fila.material}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.retirado}</td>
                    <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearPrecio(fila.precioUnitarioCompra || 0)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{formatearPrecio(total)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Tarjeta({ titulo, valor, color }) {
  return (
    <div style={{ ...tarjetaStyle, flex: '0 0 190px' }}>
      <div style={{ color: '#ccc', fontWeight: 700 }}>{titulo}</div>
      <div style={{ color, fontSize: '20px', fontWeight: 900 }}>{valor}</div>
    </div>
  )
}

function OperadorBalance({ simbolo }) {
  return (
    <div
      aria-hidden="true"
      style={{
        alignSelf: 'center',
        flex: '0 0 auto',
        color: 'white',
        fontSize: '30px',
        fontWeight: 900,
        lineHeight: 1,
        padding: '0 2px',
      }}
    >
      {simbolo}
    </div>
  )
}

function normalizarPrecio(valor) {
  if (valor === null || valor === undefined || valor === '') return 0
  const limpio = String(valor).replace(/[^\d,-]/g, '').replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : 0
}

const tarjetaStyle = {
  padding: '12px',
  border: '1px solid #555',
  borderRadius: '10px',
  background: '#263238',
}

const botonGris = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid #777',
  background: '#555',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const botonAzul = {
  padding: '9px 14px',
  borderRadius: '8px',
  border: '1px solid #777',
  background: '#1565c0',
  color: 'white',
  cursor: 'pointer',
  fontWeight: 700,
}

const thStyle = {
  padding: '8px 10px',
  border: '1px solid #555',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '7px 8px',
  border: '1px solid #444',
}

export default BalanceMantencionModal
