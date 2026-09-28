export default function MenuLateral({ abierto = false, items = [], onToggle, onCerrar }) {
  const visibles = items.filter((item) => item.visible !== false)

  function ejecutar(item) {
    onCerrar?.()
    item.onClick?.()
  }

  return (
    <>
      <button
        type="button"
        className="boton-menu-movil"
        aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={abierto}
        onClick={(evento) => {
          evento.stopPropagation()
          onToggle?.()
        }}
      >
        {abierto ? '\u00D7' : '\u2630'}
      </button>

      {abierto && <div className="menu-lateral-fondo" onClick={onCerrar} />}

      <aside className={`menu-lateral${abierto ? ' menu-lateral-abierto' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="menu-lateral-logo" aria-label="Control modular">CM</div>
        <nav className="menu-lateral-navegacion" aria-label="Navegación principal">
          {visibles.map((item, indice) => (
            <div key={item.id || item.etiqueta}>
              {item.separadorAntes && indice > 0 && <div className="menu-lateral-separador" />}
              <button
                type="button"
                className={`menu-lateral-opcion${item.nivel ? ' menu-lateral-opcion-submenu' : ''}${item.activo ? ' menu-lateral-opcion-activa' : ''}`}
                onClick={() => ejecutar(item)}
                title={item.etiqueta}
              >
                <span className="menu-lateral-icono" aria-hidden="true">{item.icono}</span>
                <span>{item.etiqueta}</span>
              </button>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}
