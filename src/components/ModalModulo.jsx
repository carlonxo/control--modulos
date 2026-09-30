export default function ModalModulo({ children }) {
  return (
    <div
      className="modal-modulo"
      style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        background: '#222',
        padding: '20px',
        borderRadius: '10px',
        border: '1px solid white',
        width: 'min(420px, calc(100dvw - 32px))',
        maxWidth: '420px',
        maxHeight: 'calc(100dvh - 32px)',
        minWidth: 0,
        overflowY: 'auto',
        boxSizing: 'border-box',
        zIndex: 1000,
        color: 'white',
      }}
    >
      {children}
    </div>
  )
}
