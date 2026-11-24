function ProtocolosMensualesModal({ onClickFondo, children }) {
  return (
    <div
      className="protocolos-vista-completa bodega-modal-overlay-con-menu"
      onClick={onClickFondo}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'auto',
        overscrollBehavior: 'contain',
        scrollbarGutter: 'stable',
        boxSizing: 'border-box',
        background: '#111318',
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
