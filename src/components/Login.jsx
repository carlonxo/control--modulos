import { useState } from 'react'

function Login({ supabase }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [ingresando, setIngresando] = useState(false)
  const [mensajeError, setMensajeError] = useState('')

  async function iniciarSesion(evento) {
    evento.preventDefault()
    if (ingresando) return

    const correo = email.trim()
    if (!correo || !password) {
      setMensajeError('Ingresa tu correo y contraseña para continuar.')
      return
    }

    setIngresando(true)
    setMensajeError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: correo,
      password,
    })

    if (error) {
      const credencialesInvalidas = /invalid login credentials/i.test(error.message || '')
      setMensajeError(
        credencialesInvalidas
          ? 'El correo o la contraseña no son correctos.'
          : `No se pudo iniciar sesión: ${error.message}`
      )
      setIngresando(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-glow login-glow-left" aria-hidden="true" />
      <div className="login-glow login-glow-right" aria-hidden="true" />

      <section className="login-content" aria-labelledby="login-title">
        <header className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <span>CM</span>
          </div>
          <h1 id="login-title">Control de Módulos</h1>
          <p>Gestión operacional de plantas y bodegas</p>
        </header>

        <form className="login-card" onSubmit={iniciarSesion} noValidate>
          <div className="login-card-heading">
            <span className="login-eyebrow">ACCESO SEGURO</span>
            <h2>Iniciar sesión</h2>
            <p>Ingresa con tu cuenta corporativa.</p>
          </div>

          <label className="login-field">
            <span>Correo corporativo</span>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16v12H4zM4 7l8 6 8-6" />
              </svg>
              <input
                type="email"
                placeholder="nombre@empresa.com"
                value={email}
                onChange={(evento) => {
                  setEmail(evento.target.value)
                  if (mensajeError) setMensajeError('')
                }}
                autoComplete="email"
                inputMode="email"
                required
                autoFocus
              />
            </div>
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <div className="login-input-wrap">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M7 10V8a5 5 0 0110 0v2M5 10h14v10H5z" />
              </svg>
              <input
                type={mostrarPassword ? 'text' : 'password'}
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(evento) => {
                  setPassword(evento.target.value)
                  if (mensajeError) setMensajeError('')
                }}
                autoComplete="current-password"
                required
              />
              <button
                className="login-password-toggle"
                type="button"
                onClick={() => setMostrarPassword((actual) => !actual)}
                aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {mostrarPassword ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.7a2 2 0 002.8 2.8M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-2.1 3M6.2 6.2C4.2 7.7 3 12 3 12s3.5 7 9 7a9.7 9.7 0 004-.9" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7z" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {mensajeError && (
            <div className="login-error" role="alert">
              <span aria-hidden="true">!</span>
              {mensajeError}
            </div>
          )}

          <button className="login-submit" type="submit" disabled={ingresando}>
            <span>{ingresando ? 'Ingresando...' : 'Ingresar'}</span>
            {!ingresando && (
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14M14 7l5 5-5 5" />
              </svg>
            )}
          </button>
        </form>

        <footer className="login-footer">
          Sistema interno de gestión · {new Date().getFullYear()}
        </footer>
      </section>
    </main>
  )
}

export default Login
