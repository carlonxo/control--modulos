function ResumenMaterialesModal({
  modulo,
  cargandoMateriales,
  resumenMateriales,
  onCerrar,
  onClickFondo,
}) {
  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 32px)',
        maxWidth: '420px',
        maxHeight: 'calc(100vh - 32px)',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '20px',
        background: '#222',
        border: '1px solid white',
        borderRadius: '10px',
        zIndex: 1200,
        color: 'white',
        textAlign: 'left',
      }}
    >
      <h2 style={{ marginTop: 0 }}>Materiales  {modulo?.serie}</h2>

      {cargandoMateriales ? (
        <p>Cargando...</p>
      ) : resumenMateriales.length === 0 ? (
        <p>No hay materiales registrados.</p>
      ) : (
        <div style={{ display: 'grid', gap: '8px' }}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
              gap: '7px',
              fontSize: '12px',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            <span />
            <span>Nuevo</span>
            <span>Reutilizado</span>
          </div>

          {resumenMateriales.map(([material, nuevo, reutilizado]) => (
            <div
              key={material}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                gap: '7px',
                paddingBottom: '8px',
                borderBottom: '1px solid #444',
                alignItems: 'center',
              }}
            >
              <span>{material}</span>
              <strong style={{ textAlign: 'center' }}>{nuevo || ''}</strong>
              <strong style={{ textAlign: 'center' }}>{reutilizado || ''}</strong>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={onCerrar}
        style={{ width: '100%', marginTop: '18px', padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
  )
}

export default ResumenMaterialesModal
