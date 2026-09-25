export default function Notificacion({ mensaje, tipo = 'info', onCerrar }) {
  if (!mensaje) return null

  const esError = tipo === 'error'
  const esAdvertencia = tipo === 'advertencia'

  return (
    <div
      role={esError ? 'alert' : 'status'}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        left: '20px',
        marginLeft: 'auto',
        maxWidth: '620px',
        background: esError ? '#7f1d1d' : esAdvertencia ? '#78350f' : '#111827',
        border: `1px solid ${esError ? '#ef4444' : esAdvertencia ? '#f59e0b' : '#334155'}`,
        color: 'white',
        padding: '12px 16px',
        borderRadius: '8px',
        zIndex: 5000,
        boxShadow: '0 12px 30px rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        whiteSpace: 'pre-line',
      }}
    >
      <span style={{ flex: 1 }}>{mensaje}</span>
      {onCerrar && (
        <button
          type="button"
          aria-label="Cerrar notificación"
          onClick={onCerrar}
          style={{
            border: 0,
            background: 'transparent',
            color: 'white',
            fontSize: '20px',
            lineHeight: 1,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          ×
        </button>
      )}
    </div>
  )
}
