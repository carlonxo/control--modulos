export default function ModalModulo({ children }) {
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
        maxWidth: '420px',
        maxHeight: 'calc(100vh - 32px)',
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
