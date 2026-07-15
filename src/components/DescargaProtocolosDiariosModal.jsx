function DescargaProtocolosDiariosModal({
  fecha,
  descargando,
  onCambiarFecha,
  onDescargar,
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
        maxWidth: '380px',
        boxSizing: 'border-box',
        zIndex: 3200,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Descargar protocolos diarios</h2>
      <p style={{ color: '#ccc', marginTop: 0 }}>
        Selecciona la fecha de prueba eléctrica.
      </p>

      <label style={{ display: 'block', marginBottom: '16px' }}>
        <strong>Fecha</strong>
        <input
          type="date"
          value={fecha}
          onChange={(e) => onCambiarFecha(e.target.value)}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '6px',
            boxSizing: 'border-box',
          }}
        />
        <small style={{ display: 'block', color: '#bbb', marginTop: '5px' }}>
          Formato visual: dd-mm-aaaa
        </small>
      </label>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          type="button"
          onClick={onDescargar}
          disabled={descargando}
          style={{ flex: 1, padding: '12px', background: '#2e7d32', color: 'white' }}
        >
          {descargando ? 'Generando...' : 'Descargar'}
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

export default DescargaProtocolosDiariosModal
