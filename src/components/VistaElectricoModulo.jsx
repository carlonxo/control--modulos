function VistaElectricoModulo({
  serieEditada,
  tipoEditado,
  proyectoEditado,
  notaEditada,
  setNotaEditada,
  children,
}) {
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '10px 18px',
          textAlign: 'left',
          marginBottom: '12px',
        }}
      >
        <div><strong>Serie:</strong> {serieEditada}</div>
        <div><strong>Tipo:</strong> {tipoEditado}</div>
        <div style={{ gridColumn: '1 / -1' }}>
          <strong>Proyecto:</strong> {proyectoEditado}
        </div>
      </div>

      <div style={{ marginBottom: '12px', textAlign: 'left' }}>
        <strong>Nota:</strong>
        <textarea
          value={notaEditada}
          onChange={(e) => setNotaEditada(e.target.value)}
          rows={3}
          style={{
            width: '100%',
            marginTop: '5px',
            padding: '8px',
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {children}
    </>
  )
}

export default VistaElectricoModulo
