import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Error no controlado en la interfaz', error, info)
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <main style={contenedorStyle}>
        <section style={tarjetaStyle}>
          <div style={iconoStyle}>!</div>
          <h1 style={{ margin: 0 }}>La aplicación encontró un problema</h1>
          <p style={{ color: '#ccc', lineHeight: 1.5 }}>
            Tus datos guardados no se han eliminado. Recarga la aplicación para continuar.
            Si el problema se repite, informa al administrador indicando qué acción estabas realizando.
          </p>
          <button type="button" onClick={() => window.location.reload()} style={botonStyle}>
            Recargar aplicación
          </button>
          <details style={detalleStyle}>
            <summary style={{ cursor: 'pointer', fontWeight: 700 }}>Detalle técnico</summary>
            <pre style={preStyle}>{String(error?.message || error || 'Error desconocido')}</pre>
          </details>
        </section>
      </main>
    )
  }
}

const contenedorStyle = { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '20px', boxSizing: 'border-box', background: '#111', color: 'white' }
const tarjetaStyle = { width: 'min(560px, 100%)', padding: '24px', boxSizing: 'border-box', border: '1px solid #ef5350', borderRadius: '14px', background: '#242020', textAlign: 'center', boxShadow: '0 14px 35px rgba(0,0,0,0.45)' }
const iconoStyle = { width: '52px', height: '52px', margin: '0 auto 14px', display: 'grid', placeItems: 'center', borderRadius: '50%', background: '#b71c1c', border: '2px solid #ff8a80', fontSize: '30px', fontWeight: 900 }
const botonStyle = { padding: '11px 18px', border: '1px solid #42a5f5', borderRadius: '8px', background: '#1565c0', color: 'white', cursor: 'pointer', fontWeight: 800 }
const detalleStyle = { marginTop: '18px', textAlign: 'left', color: '#bbb' }
const preStyle = { padding: '10px', overflow: 'auto', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', borderRadius: '7px', background: '#111', color: '#ffcccb', fontSize: '12px' }
