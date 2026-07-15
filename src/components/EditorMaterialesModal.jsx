function EditorMaterialesModal({
  modulo,
  cargandoMateriales,
  onGuardar,
  onCerrar,
  onClickFondo,
  children,
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
        maxWidth: '460px',
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
      <h2 style={{ marginTop: 0 }}>Materiales 📝 — {modulo?.serie}</h2>

      {cargandoMateriales ? (
        <p>Cargando...</p>
      ) : (
        children
      )}

      <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
        <button
          type="button"
          onClick={onGuardar}
          disabled={cargandoMateriales}
          style={{
            flex: 1,
            padding: '12px',
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: cargandoMateriales ? 'not-allowed' : 'pointer',
          }}
        >
          Guardar materiales
        </button>

        <button
          type="button"
          onClick={onCerrar}
          style={{
            flex: 1,
            padding: '12px',
          }}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}

export default EditorMaterialesModal
