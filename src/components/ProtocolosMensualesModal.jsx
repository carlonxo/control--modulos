function ProtocolosMensualesModal({ onClickFondo, children }) {
  return (
    <div
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'calc(100vw - 24px)',
        maxWidth: '1180px',
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
      {children}
    </div>
  )
}

export default ProtocolosMensualesModal
