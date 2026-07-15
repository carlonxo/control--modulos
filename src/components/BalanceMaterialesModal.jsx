import { useState } from 'react'

function BalanceMaterialesModal({
  rango,
  fecha,
  cargando,
  filas,
  configMateriales = {},
  formatearPrecio,
  onCambiarRango,
  onCambiarFecha,
  onActualizar,
  onActualizarConfigMaterial,
  onCerrar,
  onClickFondo,
}) {
  const [mostrarReutilizados, setMostrarReutilizados] = useState(false)
  const filasBalance = filas.map((fila) => ({
    ...fila,
    materialVisible: configMateriales[fila.clave]?.nombreVisible || fila.material,
    instalado: Number(fila.nuevo || 0),
    valorVenta: Number(fila.precioUnitarioNuevo || 0),
    valorCompra: configMateriales[fila.clave]?.valorCompra ?? '',
    valorCompraNumero: normalizarPrecioManual(configMateriales[fila.clave]?.valorCompra),
    retirado: Number(fila.retirado || 0),
    balance: (Number(fila.precioUnitarioNuevo || 0) * Number(fila.nuevo || 0)) - (normalizarPrecioManual(configMateriales[fila.clave]?.valorCompra) * Number(fila.retirado || 0)),
  }))
  const balanceTotal = filasBalance.reduce(
    (total, fila) => total + Number(fila.balance || 0),
    0
  )
  const filasReutilizadas = filas
    .filter((fila) => Number(fila.reutilizado || 0) > 0)
    .map((fila) => ({
      ...fila,
      cantidadReutilizada: Number(fila.reutilizado || 0),
      valorUnitarioReutilizado: Number(fila.precioUnitarioReutilizado || 0),
      valorTotalReutilizado: Number(fila.valorReutilizado || 0),
    }))
  const totalReutilizados = filasReutilizadas.reduce(
    (total, fila) => total + Number(fila.cantidadReutilizada || 0),
    0
  )
  const totalValorReutilizados = filasReutilizadas.reduce(
    (total, fila) => total + Number(fila.valorTotalReutilizado || 0),
    0
  )
  const indicadorBalance = mostrarReutilizados ? totalValorReutilizados : balanceTotal
  const colorBalanceTotal = balanceTotal > 0 ? '#66bb6a' : balanceTotal < 0 ? '#ff5252' : 'white'

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
          <h2 style={{ margin: 0 }}>Balance materiales</h2>
          <p style={{ color: '#ccc', margin: '6px 0 0' }}>
            Compilado de materiales cobrados en protocolos.
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#555',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Cerrar
        </button>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
        <select
          value={rango}
          onChange={(e) => onCambiarRango(e.target.value)}
          style={{ padding: '8px', fontWeight: 700 }}
          title="Cambiar rango"
        >
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
        <input
          type={rango === 'dia' ? 'date' : rango === 'semana' ? 'week' : 'month'}
          value={fecha}
          onChange={(e) => onCambiarFecha(e.target.value)}
          style={{ padding: '8px' }}
        />
        <button
          type="button"
          onClick={onActualizar}
          disabled={cargando}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#1565c0',
            color: 'white',
            cursor: cargando ? 'not-allowed' : 'pointer',
            fontWeight: 700,
          }}
        >
          {cargando ? 'Cargando...' : 'Actualizar'}
        </button>
      </div>

      <div
        style={{
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '14px',
        }}
      >
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#263238', border: '1px solid #546e7a', fontWeight: 800 }}>
          {mostrarReutilizados ? filasReutilizadas.length : filasBalance.length} materiales
        </div>
        <button
          type="button"
          onClick={() => setMostrarReutilizados((actual) => !actual)}
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: mostrarReutilizados ? '#0d47a1' : '#263238',
            border: '1px solid #64b5f6',
            color: 'white',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Reutilizados ({totalReutilizados})
        </button>
        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#1b5e20', border: '1px solid #66bb6a', fontWeight: 800, color: mostrarReutilizados ? 'white' : colorBalanceTotal }}>
          Balance: {formatearPrecio(indicadorBalance)}
        </div>
      </div>

      {filas.length === 0 && !cargando ? (
        <p style={{ color: '#ccc' }}>No hay materiales cobrados en el rango seleccionado.</p>
      ) : (
        mostrarReutilizados ? (
          <TablaMaterialesReutilizados
            filas={filasReutilizadas}
            tituloVacio="No hay material reutilizado cobrado en el rango seleccionado."
            formatearPrecio={formatearPrecio}
          />
        ) : (
          <TablaBalanceMateriales
            filas={filasBalance}
            tituloVacio="No hay materiales cobrados en el rango seleccionado."
            formatearPrecio={formatearPrecio}
            onCambiarNombreMaterial={(clave, valor) => {
              onActualizarConfigMaterial(clave, { nombreVisible: valor })
            }}
            onCambiarValorCompra={(clave, valor) => {
              onActualizarConfigMaterial(clave, { valorCompra: valor })
            }}
          />
        )
      )}
    </div>
  )
}

function TablaMaterialesReutilizados({
  filas,
  tituloVacio,
  formatearPrecio,
}) {
  if (filas.length === 0) {
    return <p style={{ color: '#ccc' }}>{tituloVacio}</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '620px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            <th style={thStyle}>Material</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>$ unitario</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Reutilizado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor total</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>
                {fila.material}
                {fila.noCatalogado && (
                  <span style={{ display: 'inline-block', marginLeft: '8px', color: '#ffcc80', fontSize: '12px', fontWeight: 800 }}>
                    no catalogado
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearPrecio(fila.valorUnitarioReutilizado || 0)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.cantidadReutilizada || '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 900 }}>{formatearPrecio(fila.valorTotalReutilizado || 0)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaBalanceMateriales({
  filas,
  tituloVacio,
  formatearPrecio,
  onCambiarNombreMaterial,
  onCambiarValorCompra,
}) {
  if (filas.length === 0) {
    return <p style={{ color: '#ccc' }}>{tituloVacio}</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '680px' }}>
        <thead>
          <tr style={{ background: '#333' }}>
            <th style={thStyle}>Material</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor venta</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Instalado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Valor compra</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Retirado</th>
            <th style={{ ...thStyle, textAlign: 'right' }}>Balance</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.clave}>
              <td style={{ ...tdStyle, fontWeight: 700 }}>
                <input
                  type="text"
                  value={fila.materialVisible}
                  onChange={(e) => onCambiarNombreMaterial(fila.clave, e.target.value)}
                  style={{
                    width: '100%',
                    minWidth: '220px',
                    padding: '6px',
                    boxSizing: 'border-box',
                    background: '#fff',
                    color: '#111',
                    border: '1px solid #777',
                    borderRadius: '6px',
                    fontWeight: 800,
                  }}
                />
                {fila.noCatalogado && (
                  <span style={{ display: 'inline-block', marginTop: '5px', color: '#ffcc80', fontSize: '12px', fontWeight: 800 }}>
                    no catalogado
                  </span>
                )}
              </td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>{formatearPrecio(fila.valorVenta || 0)}</td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.instalado || '-'}</td>
              <td style={{ ...tdStyle, textAlign: 'right' }}>
                <input
                  type="text"
                  inputMode="numeric"
                  value={fila.valorCompra}
                  onChange={(e) => onCambiarValorCompra(fila.clave, e.target.value)}
                  placeholder="$ 0"
                  style={{
                    width: '105px',
                    maxWidth: '100%',
                    padding: '6px',
                    boxSizing: 'border-box',
                    textAlign: 'right',
                    background: '#fff',
                    color: '#111',
                    border: '1px solid #777',
                    borderRadius: '6px',
                    fontWeight: 700,
                  }}
                />
              </td>
              <td style={{ ...tdStyle, textAlign: 'right', fontWeight: 800 }}>{fila.retirado || '-'}</td>
              <td
                style={{
                  ...tdStyle,
                  textAlign: 'right',
                  fontWeight: 900,
                  color: fila.balance > 0 ? '#66bb6a' : fila.balance < 0 ? '#ff5252' : 'white',
                }}
              >
                {formatearPrecio(fila.balance)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = {
  padding: '8px 10px',
  border: '1px solid #555',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle = {
  padding: '8px 10px',
  border: '1px solid #444',
}

function normalizarPrecioManual(valor) {
  if (valor === null || valor === undefined || valor === '') return 0
  const limpio = String(valor).replace(/[^\d,-]/g, '').replace(',', '.')
  const numero = Number(limpio)
  return Number.isFinite(numero) ? numero : 0
}

export default BalanceMaterialesModal
