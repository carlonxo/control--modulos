export default function Notificacion({ mensaje }) {
  if (!mensaje) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        background: '#111827',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        zIndex: 2000,
      }}
    >
      {mensaje}
    </div>
  )
}
