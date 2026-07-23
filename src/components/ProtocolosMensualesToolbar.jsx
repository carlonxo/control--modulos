function ProtocolosMensualesToolbar({
  ingresos,
  formatearPrecio,
  rango,
  fecha,
  busqueda,
  totalResultados,
  resultadosFiltrados,
  cargando,
  onCerrar,
  onIngresoManual,
  onCambiarRango,
  onCambiarFecha,
  onActualizar,
  onCambiarBusqueda,
  onLimpiarBusqueda,
}) {
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <h2 style={{ margin: 0 }}>Protocolos mensuales</h2>
        <div style={{ display: 'grid', gap: '8px', minWidth: '150px' }}>
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
          <button
            type="button"
            onClick={onIngresoManual}
            style={{
              padding: '9px 14px',
              borderRadius: '8px',
              border: '1px solid #66bb6a',
              background: '#1b5e20',
              color: 'white',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            Ingreso manual
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          marginBottom: '16px',
          borderRadius: '10px',
          background: '#1b5e20',
          border: '1px solid #66bb6a',
          color: 'white',
          fontWeight: 800,
          fontSize: '18px',
        }}
      >
        <span>{'\u{1F4B0}'} ingresos</span>
        <span>{formatearPrecio(ingresos)}</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
        <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
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
        </label>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onCambiarBusqueda(e.target.value)}
            placeholder="Buscar serie o ID OT"
            style={{
              padding: '9px 10px',
              minWidth: '210px',
              borderRadius: '6px',
              border: '1px solid #777',
              background: '#333',
              color: 'white',
              fontWeight: 700,
            }}
          />
          {busqueda && (
            <button
              type="button"
              onClick={onLimpiarBusqueda}
              title="Limpiar búsqueda"
              style={{
                padding: '9px 11px',
                borderRadius: '6px',
                border: '1px solid #777',
                background: '#444',
                color: 'white',
                cursor: 'pointer',
                fontWeight: 800,
              }}
            >
              ×
            </button>
          )}
        </div>
        <span style={{ color: '#ddd', fontWeight: 700 }}>
          {busqueda
            ? `${resultadosFiltrados} de ${totalResultados} resultados`
            : `${totalResultados} resultados`}
        </span>
      </div>
    </>
  )
}

export default ProtocolosMensualesToolbar
