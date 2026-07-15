function FormularioDatosModulo({
  serieEditada,
  setSerieEditada,
  tipoEditado,
  setTipoEditado,
  proyectoEditado,
  setProyectoEditado,
  lineaEditada,
  setLineaEditada,
  estadoEditado,
  setEstadoEditado,
  fechaPruebaEditada,
  setFechaPruebaEditada,
  responsableEditado,
  setResponsableEditado,
  notaEditada,
  setNotaEditada,
  puedeEditarDatosModulo,
  esTipoBodega,
  estaDentroDeGarantia,
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
        gap: '10px',
        textAlign: 'left',
      }}
    >
      <div style={{ marginBottom: '10px' }}>
        <strong>Serie</strong>
        <input
          value={serieEditada}
          onChange={(e) => setSerieEditada(e.target.value)}
          disabled={!puedeEditarDatosModulo}
          style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '10px' }}>
        <strong>Tipo</strong>
        <input
          value={tipoEditado}
          onChange={(e) => setTipoEditado(e.target.value)}
          disabled={!puedeEditarDatosModulo}
          style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
        <strong>Proyecto</strong>
        <input
          value={proyectoEditado}
          onChange={(e) => setProyectoEditado(e.target.value)}
          disabled={!puedeEditarDatosModulo}
          style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <strong style={{ whiteSpace: 'nowrap' }}>Línea</strong>

        <select
          value={lineaEditada}
          onChange={(e) => setLineaEditada(Number(e.target.value))}
          disabled={!puedeEditarDatosModulo}
          style={{
            width: '64px',
            padding: '8px',
            boxSizing: 'border-box',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <strong style={{ whiteSpace: 'nowrap' }}>Estado</strong>

        <select
          value={estadoEditado}
          onChange={(e) => setEstadoEditado(e.target.value)}
          disabled={!puedeEditarDatosModulo}
          style={{
            width: '170px',
            maxWidth: 'calc(100% - 62px)',
            padding: '8px',
            boxSizing: 'border-box',
          }}
        >
          <option value="Sin iniciar">Sin iniciar</option>
          <option value="Canalizado">Canalizado</option>
          <option value="Cableado">Cableado</option>
          <option value="Terminaciones">Terminaciones</option>
          <option value="Prueba eléctrica">Prueba eléctrica</option>
          {(esTipoBodega(tipoEditado) || estadoEditado === 'Sin instalación') && (
            <option value="Sin instalación">Sin instalación</option>
          )}
          <option value="En garantía">En garantía</option>
        </select>
      </div>

      {estadoEditado === 'En garantía' && (
        <div style={{ gridColumn: '1 / -1', marginBottom: '10px', textAlign: 'left' }}>
          <strong>Fecha prueba eléctrica</strong>
          <input
            type="date"
            value={fechaPruebaEditada}
            onChange={(e) => setFechaPruebaEditada(e.target.value)}
            disabled={!puedeEditarDatosModulo}
            style={{
              width: '190px',
              maxWidth: '100%',
              padding: '8px',
              marginLeft: '8px',
              boxSizing: 'border-box',
            }}
          />
          {fechaPruebaEditada && !estaDentroDeGarantia(fechaPruebaEditada) && (
            <div style={{ color: '#ff8a80', fontWeight: 800, marginTop: '6px' }}>
              Fuera de garantía
            </div>
          )}
        </div>
      )}

      <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
        <strong>Responsable</strong>
        <input
          value={responsableEditado}
          onChange={(e) => setResponsableEditado(e.target.value)}
          disabled={!puedeEditarDatosModulo}
          style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
        />
      </div>

      <div style={{ marginBottom: '5px', gridColumn: '1 / -1' }}>
        <strong>Nota</strong>
        <textarea
          value={notaEditada}
          onChange={(e) => setNotaEditada(e.target.value)}
          rows={2}
          style={{ width: '100%', marginTop: '5px', padding: '8px', resize: 'vertical', boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}

export default FormularioDatosModulo
