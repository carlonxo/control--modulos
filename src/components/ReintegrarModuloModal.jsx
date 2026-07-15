function ReintegrarModuloModal({
  ultimosFinalizados,
  historialSeleccionado,
  serie,
  linea,
  extremo,
  reintegrando,
  formatearFecha,
  onSeleccionarHistorial,
  onCambiarSerie,
  onLimpiarHistorialSeleccionado,
  onCambiarLinea,
  onCambiarExtremo,
  onReintegrar,
  onCerrar,
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#222',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid white',
        width: 'calc(100vw - 32px)',
        maxWidth: '430px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 3200,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Reintegrar módulo</h2>
      <p style={{ color: '#ccc', marginTop: 0 }}>
        Selecciona uno de los últimos finalizados o ingresa una serie.
      </p>

      <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
        {ultimosFinalizados.length === 0 ? (
          <p style={{ margin: 0 }}>No hay módulos finalizados recientes.</p>
        ) : (
          ultimosFinalizados.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSeleccionarHistorial(item)}
              style={{
                padding: '10px',
                borderRadius: '8px',
                border: historialSeleccionado?.id === item.id ? '2px solid #64b5f6' : '1px solid #555',
                background: historialSeleccionado?.id === item.id ? '#0d47a1' : '#333',
                color: 'white',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <strong>{item.serie}</strong>
              <span style={{ display: 'block', color: '#ccc', fontSize: '12px', marginTop: '2px' }}>
                {item.tipo} · Salida {formatearFecha(item.fecha_salida) || 'sin fecha'}
              </span>
            </button>
          ))
        )}
      </div>

      <label style={{ display: 'block', marginBottom: '12px' }}>
        <strong>Serie</strong>
        <input
          value={serie}
          onChange={(e) => {
            onCambiarSerie(e.target.value)
            onLimpiarHistorialSeleccionado()
          }}
          placeholder="Ingresar serie"
          style={{
            width: '100%',
            padding: '9px',
            marginTop: '5px',
            boxSizing: 'border-box',
          }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <label>
          <strong>Línea</strong>
          <select
            value={linea}
            onChange={(e) => onCambiarLinea(Number(e.target.value))}
            style={{ width: '100%', padding: '9px', marginTop: '5px' }}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </label>

        <label>
          <strong>Ubicación</strong>
          <select
            value={extremo}
            onChange={(e) => onCambiarExtremo(e.target.value)}
            style={{ width: '100%', padding: '9px', marginTop: '5px' }}
          >
            <option value="inicio">Calle acopio</option>
            <option value="fin">Calle agua</option>
          </select>
        </label>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onReintegrar}
          disabled={reintegrando}
          style={{ flex: 1, padding: '12px', background: '#2e7d32', color: 'white' }}
        >
          {reintegrando ? 'Reintegrando...' : 'Reintegrar'}
        </button>
        <button
          type="button"
          onClick={onCerrar}
          style={{ flex: 1, padding: '12px' }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default ReintegrarModuloModal
