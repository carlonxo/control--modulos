import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import * as XLSX from 'xlsx'
function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  async function iniciarSesion() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      alert(error.message)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '300px',
        margin: '100px auto',
      }}
    >
      <h2>Iniciar sesión</h2>

      <input
        type="email"
        placeholder="Correo"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={iniciarSesion}>
        Ingresar
      </button>
    </div>
  )
}
function App() {
  const [datos, setDatos] = useState([])
const [moduloSeleccionado, setModuloSeleccionado] = useState(null)
const [historial, setHistorial] = useState([])

const [estadoEditado, setEstadoEditado] = useState('')
const [lineaEditada, setLineaEditada] = useState('')
const [posicionEditada, setPosicionEditada] = useState('')
const [serieBusqueda, setSerieBusqueda] = useState('')
const [resultadoBusqueda, setResultadoBusqueda] = useState([])
const [mostrarNuevoModulo, setMostrarNuevoModulo] = useState(false)
const [posicionSeleccionada, setPosicionSeleccionada] = useState(null)
const [serieNueva, setSerieNueva] = useState('')
const [tipoNuevo, setTipoNuevo] = useState('')
const [proyectoNuevo, setProyectoNuevo] = useState('')
const [responsableNuevo, setResponsableNuevo] = useState('')
const [fechaDesde, setFechaDesde] = useState('')
const [fechaHasta, setFechaHasta] = useState('')
const [session, setSession] = useState(null)
const [perfil, setPerfil] = useState(null)
  const [serieEditada, setSerieEditada] = useState('')
const [tipoEditado, setTipoEditado] = useState('')
const [proyectoEditado, setProyectoEditado] = useState('')
const [mostrarKPI, setMostrarKPI] = useState(false)
const [mostrarVistaGeneral, setMostrarVistaGeneral] = useState(false)
const [notificacion, setNotificacion] = useState(null)
const [moduloEnDrag, setModuloEnDrag] = useState(null)

useEffect(() => {
  if (!notificacion) return

  const timer = window.setTimeout(() => setNotificacion(null), 3000)

  return () => window.clearTimeout(timer)
}, [notificacion])

function mostrarNotificacion(mensaje) {
  setNotificacion(mensaje)
}

useEffect(() => {
  supabase.auth.getSession().then(({ data }) => {
    setSession(data.session)
  })

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      setSession(session)
    }
  )
console.log('PERFIL ACTUAL:', perfil)
  return () => subscription.unsubscribe()
}, [])

useEffect(() => {
  if (session) {
    cargarPerfil()
  }
}, [session])

useEffect(() => {
  cargarTablero()
  cargarHistorial()
}, [])

if (!session) {
  return <Login />
}

async function cargarPerfil() {
  const usuario = session?.user

  if (!usuario) return

  const { data, error } = await supabase
  .from('perfiles')
  .select('*')
  .eq('id', usuario.id)
  .maybeSingle()

  console.log('USUARIO:', usuario.id)
  console.log('PERFIL:', data)
  console.log('ERROR PERFIL:', error)

  if (error) {
    console.error(error)
    return
  }

  setPerfil(data)
}
  
  async function cargarTablero() {
    const { data, error } = await supabase
      .from('tablero')
      .select('*')
      .order('linea')
      .order('posicion')

    if (error) {
      console.error(error)
      return
    }

    setDatos(data)
  }

  async function cargarHistorial() {
  const { data, error } = await supabase
    .from('historial_modulos')
    .select('*')

  if (error) {
    console.error('Error cargando historial:', error)
    return
  }

  setHistorial(data || [])
}

async function buscarSerie() {
  const { data, error } = await supabase
    .from('historial_modulos')
    .select('*')
    .eq('serie', serieBusqueda)
    .order('fecha_salida', { ascending: false })
    .limit(5)

  if (error) {
    alert(error.message)
    return
  }

  setResultadoBusqueda(data || [])
}

function exportarHistorialExcel() {
  console.log('🔥 EXPORTACIÓN EJECUTADA')
  
  if (!historial || historial.length === 0) {
    alert('No hay datos para exportar')
    return
  }

  const filtrado = historial.filter((item) => {
    const fecha = new Date(item.fecha_ingreso)

    const desde = fechaDesde ? new Date(fechaDesde) : null
    const hasta = fechaHasta ? new Date(fechaHasta) : null

    if (desde && fecha < desde) return false
    if (hasta && fecha > hasta) return false

    return true
  })

  if (filtrado.length === 0) {
    alert('No hay registros en ese rango de fechas')
    return
  }

  const datosExcel = filtrado.map((item) => ({
    Serie: item.serie,
    Tipo: item.tipo,
    Proyecto: item.proyecto,
    Responsable: item.responsable,
    Estado: item.estado,
    Linea: item.linea,
    Posicion: item.posicion,
    FechaIngreso: item.fecha_ingreso,
    FechaSalida: item.fecha_salida,
  }))

  const worksheet = XLSX.utils.json_to_sheet(datosExcel)
  const workbook = XLSX.utils.book_new()

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historial')

  XLSX.writeFile(
    workbook,
    `Historial_${fechaDesde || 'inicio'}_${fechaHasta || 'actual'}.xlsx`
  )
}

async function crearModulo() {

  if (
    !serieNueva.trim() ||
    !tipoNuevo.trim() ||
    !proyectoNuevo.trim() ||
    !responsableNuevo.trim()
  ) {
    alert('Debe completar todos los campos')
    return
  }

  const { error } = await supabase
    .from('modulos')
    .insert([
      {
        serie: serieNueva,
        tipo: tipoNuevo,
        proyecto: proyectoNuevo,
        responsable: responsableNuevo,
        linea: posicionSeleccionada.linea,
        posicion: posicionSeleccionada.posicion,
        estado: 'Sin iniciar',
        fecha_ingreso: new Date(),
      },
    ])

  if (error) {
    alert(error.message)
    return
  }

  await cargarTablero()

  setMostrarNuevoModulo(false)

  alert('Módulo creado correctamente')
}

  async function guardarCambios() {
  const isPruebaElectrica = estadoEditado === 'Prueba eléctrica'
  const shouldSetFechaPrueba =
    isPruebaElectrica && moduloSeleccionado?.estado !== 'Prueba eléctrica'

  const updatePayload = {
    serie: serieEditada,
    tipo: tipoEditado,
    proyecto: proyectoEditado,
    estado: estadoEditado,
    linea: lineaEditada,
    posicion: posicionEditada,
  }

  if (shouldSetFechaPrueba) {
    updatePayload.fecha_prueba_electrica = new Date()
  }

  let { error } = await supabase
    .from('modulos')
    .update(updatePayload)
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()

  setModuloSeleccionado(null)

  mostrarNotificacion('Cambios guardados correctamente')
}
async function finalizarModulo() {
  const modulo = moduloSeleccionado

  const { data, error: errorHistorial } = await supabase
    .from('historial_modulos')
    .insert([
      {
  modulo_id: modulo.id,
  serie: modulo.serie,
  tipo: modulo.tipo,
  proyecto: modulo.proyecto,
  responsable: modulo.responsable,
  fecha_ingreso: modulo.fecha_ingreso,
  fecha_salida: new Date(),
  estado: modulo.estado,
  linea: modulo.linea,
  posicion: modulo.posicion,
},
    ])
    .select()



  if (errorHistorial) {
    mostrarNotificacion(errorHistorial.message)
    return
  }

  const { error: errorDelete } = await supabase
    .from('modulos')
    .delete()
    .eq('id', modulo.id)

  

  if (errorDelete) {
    mostrarNotificacion(errorDelete.message)
    return
  }

  await cargarTablero()
  await cargarHistorial()

  setModuloSeleccionado(null)

  mostrarNotificacion('Módulo finalizado correctamente')
}

async function moverModulo(moduloId, lineaDestino, posicionDestino) {
  if (!moduloId) {
    mostrarNotificacion('Error: Módulo inválido')
    return
  }

  const lineaDestinoParsed = Number(lineaDestino)
  const posicionDestinoParsed = Number(posicionDestino)

  const { data: registros, error: errorCarga } = await supabase
    .from('modulos')
    .select('*')

  if (errorCarga) {
    mostrarNotificacion('Error al cargar módulos: ' + errorCarga.message)
    return
  }

  const modulosActivos = (registros || []).filter(
    (x) => x?.serie && String(x.serie).trim() !== ''
  )
  const moduloActual = modulosActivos.find(
    (x) => String(x.id) === String(moduloId)
  )

  if (!moduloActual) {
    mostrarNotificacion('Error: No se encontró el módulo')
    return
  }

  const lineaOrigen = Number(moduloActual.linea)
  const posicionOrigen = Number(moduloActual.posicion)

  if (lineaOrigen === lineaDestinoParsed && posicionOrigen === posicionDestinoParsed) {
    mostrarNotificacion('El módulo ya está en esa posición')
    return
  }

  try {
    const reindexarLinea = async (linea, lista) => {
      const ordenado = [...lista]
        .filter((x) => x?.id)
        .sort((a, b) => {
          const posA = Number(a.posicion) || 0
          const posB = Number(b.posicion) || 0
          return posA - posB || String(a.id).localeCompare(String(b.id))
        })

      for (const [index, item] of ordenado.entries()) {
        const nuevaPosicion = Math.min(index + 1, 9)
        const { error } = await supabase
          .from('modulos')
          .update({
            linea,
            posicion: nuevaPosicion,
          })
          .eq('id', item.id)

        if (error) {
          throw new Error(error.message)
        }
      }
    }

    if (lineaOrigen === lineaDestinoParsed) {
      const listaLinea = modulosActivos.filter(
        (x) => Number(x.linea) === lineaOrigen && String(x.id) !== String(moduloId)
      )
      const listaConModulo = [...listaLinea]
      const insertIndex = Math.max(0, Math.min(posicionDestinoParsed - 1, listaConModulo.length))
      listaConModulo.splice(insertIndex, 0, {
        ...moduloActual,
        linea: lineaDestinoParsed,
      })

      await reindexarLinea(lineaDestinoParsed, listaConModulo)
    } else {
      const listaOrigen = modulosActivos.filter(
        (x) => Number(x.linea) === lineaOrigen && String(x.id) !== String(moduloId)
      )
      await reindexarLinea(lineaOrigen, listaOrigen)

      const listaDestino = modulosActivos.filter(
        (x) => Number(x.linea) === lineaDestinoParsed
      )
      const listaDestinoConModulo = [...listaDestino]
      const insertIndex = Math.max(0, Math.min(posicionDestinoParsed - 1, listaDestinoConModulo.length))
      listaDestinoConModulo.splice(insertIndex, 0, {
        ...moduloActual,
        linea: lineaDestinoParsed,
      })

      await reindexarLinea(lineaDestinoParsed, listaDestinoConModulo)
    }

    await cargarTablero()
    mostrarNotificacion('Módulo movido correctamente')
  } catch (err) {
    console.error(err)
    mostrarNotificacion('Error: ' + (err?.message || 'Error desconocido'))
    await cargarTablero()
  }
}

  function colorEstado(estado) {
    switch (estado) {
      case 'sin iniciar':
        return '#808080'

      case 'canalizado':
        return '#d32f2f'

      case 'cableado':
        return '#fbc02d'

      case 'terminaciones':
        return '#1976d2'

      case 'prueba eléctrica':
        return '#388e3c'

      default:
        return '#444'
    }
  }

  const modulosActivos = datos.filter((x) => x.serie)

  const ocupacion = modulosActivos.length

  const canalizados = modulosActivos.filter(
    (x) => x.estado?.toLowerCase() === 'canalizado'
  ).length

  const cableados = modulosActivos.filter(
    (x) => x.estado?.toLowerCase() === 'cableado'
  ).length

  const terminaciones = modulosActivos.filter(
    (x) => x.estado?.toLowerCase() === 'terminaciones'
  ).length

  const pruebas = modulosActivos.filter(
    (x) =>
      x.estado?.toLowerCase() === 'prueba eléctrica' ||
      x.estado?.toLowerCase() === 'prueba electrica'
  ).length
const hoy = new Date().toISOString().slice(0, 10)

const terminadosHoy = historial.filter(
  (x) =>
    x.fecha_salida &&
    x.fecha_salida.slice(0, 10) === hoy
).length

const mesActual = new Date().getMonth()
const anioActual = new Date().getFullYear()

const terminadosMes = historial.filter((x) => {
  const fecha = new Date(x.fecha_salida)

  return (
    fecha.getMonth() === mesActual &&
    fecha.getFullYear() === anioActual
  )
}).length

  

  return (
    <>
      <div
        style={{
          padding: '20px',
          width: '100%',
          boxSizing: 'border-box',
          maxWidth: '1200px',
          margin: '0 auto',
        }}
      >
        <h1 style={{ fontSize: '24px', marginBottom: '12px' }}>Control de Módulos</h1>

        {notificacion && (
          <div
            style={{
              marginBottom: '15px',
              padding: '10px 12px',
              background: '#2e7d32',
              color: 'white',
              borderRadius: '8px',
              maxWidth: '400px',
            }}
          >
            {notificacion}
          </div>
        )}

        <button
  onClick={() => supabase.auth.signOut()}
  style={{
    marginBottom: '20px',
  }}
>
  Cerrar sesión
</button>

        
             <div
  style={{
    marginBottom: '15px',
    color: '#ccc',
  }}
>
  Usuario: {perfil?.nombre}
  {' | '}
  Rol: {perfil?.rol}
</div>

<div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
  <button
    onClick={() => setMostrarKPI(!mostrarKPI)}
    style={{
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
    }}
  >
    {mostrarKPI ? 'Ocultar indicadores' : 'Ver indicadores'}
  </button>
  <button
    onClick={() => setMostrarVistaGeneral(!mostrarVistaGeneral)}
    style={{
      padding: '10px 20px',
      borderRadius: '8px',
      cursor: 'pointer',
    }}
  >
    {mostrarVistaGeneral ? 'Ver por línea' : 'Vista general'}
  </button>
</div>

{mostrarKPI && (
  <div
    style={{
      display: 'flex',
      gap: '20px',
      marginBottom: '30px',
      flexWrap: 'wrap',
      width: '100%',
    }}
  >

    <div
      style={{
        background: '#222',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>En proceso</h3>
      <h2>{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#222',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Ocupación</h3>
      <h2>{ocupacion}/63</h2>
    </div>

    <div
      style={{
        background: '#d32f2f',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Canalizado</h3>
      <h2>{canalizados}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#fbc02d',
        color: 'black',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Cableado</h3>
      <h2>{cableados}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#1976d2',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Terminaciones</h3>
      <h2>{terminaciones}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#388e3c',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Prueba eléctrica</h3>
      <h2>{pruebas}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#4caf50',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Terminados hoy</h3>
      <h2>{terminadosHoy}</h2>
    </div>

    <div
      style={{
        background: '#009688',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '180px',
      }}
    >
      <h3>Terminados este mes</h3>
      <h2>{terminadosMes}</h2>
    </div>

  </div>
)}

<div
  style={{
    background: '#222',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '30px',
    width: '100%',
    boxSizing: 'border-box',
  }}
>

  <h2>Buscar historial por serie</h2>

<input
  type="text"
  value={serieBusqueda}
  onChange={(e) => setSerieBusqueda(e.target.value)}
  placeholder="Buscar serie"
  onKeyDown={(e) => {
    if (e.key === 'Enter') {
      buscarSerie()
    }
  }}
/>

<button onClick={buscarSerie} style={{ marginLeft: '10px' }}>
  Buscar
</button>

{/* BLOQUE FECHAS + EXPORTAR (SEPARADO) */}
<div style={{ marginTop: '15px', display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>

  <input
    type="date"
    value={fechaDesde}
    onChange={(e) => setFechaDesde(e.target.value)}
  />

  <input
    type="date"
    value={fechaHasta}
    onChange={(e) => setFechaHasta(e.target.value)}
  />

  <button
    type="button"
    onClick={exportarHistorialExcel}
  >
    Exportar Excel
  </button>

</div>

  {resultadoBusqueda.map((item) => (
    <div
      key={item.id}
      style={{
        marginTop: '10px',
        padding: '10px',
        border: '1px solid #555',
      }}
    >
      <div>
        <strong>Serie:</strong> {item.serie}
      </div>

      <div>
        <strong>Fecha prueba:</strong>{' '}
        {new Date(item.fecha_salida).toLocaleDateString()}
      </div>

      <div>
        <strong>Proyecto:</strong> {item.proyecto}
      </div>

      <div>
        <strong>Responsable:</strong> {item.responsable}
      </div>
    </div>
  ))}
</div>

</div>

{mostrarVistaGeneral ? (
  <div style={{ marginBottom: '20px', fontSize: '13px', lineHeight: 1.2 }}>
    <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>Vista general de todas las líneas</h2>

    {Array.from({ length: 9 }, (_, i) => i + 1).map((linea) => (
      <div key={linea} style={{ marginBottom: '14px' }}>
        <h3 style={{ marginBottom: '8px', fontSize: '16px' }}>
          Línea {linea} ({datos.filter((x) => x.linea === linea && x.serie).length} módulos)
        </h3>

        <div
          style={{
            display: 'flex',
            gap: '2px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          {datos
            .filter((x) => x.linea === linea)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                draggable={pos.serie ? true : false}
                onDragStart={() => pos.serie && setModuloEnDrag(pos)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '0.6'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '1'
                  const idValido = typeof moduloEnDrag?.id === 'string' && moduloEnDrag.id !== 'null' && moduloEnDrag.id.trim() !== ''
                  const esMismo = moduloEnDrag?.id === pos.id
                  if (idValido && !esMismo) {
                    moverModulo(moduloEnDrag.id, linea, pos.posicion)
                  }
                  setModuloEnDrag(null)
                }}
                onDragEnd={() => {
                  setModuloEnDrag(null)
                }}
                onClick={() => {
                  console.log('CLICK POSICION', pos)

                  if (pos.serie) {
                    setModuloSeleccionado(pos)
                    setSerieEditada(pos.serie)
                    setTipoEditado(pos.tipo)
                    setProyectoEditado(pos.proyecto)
                    setEstadoEditado(pos.estado)
                    setLineaEditada(pos.linea)
                    setPosicionEditada(pos.posicion)
                  } else {
                    console.log('POSICION VACIA')
                    setPosicionSeleccionada(pos)
                    setMostrarNuevoModulo(true)
                  }
                }}
                style={{
                  width: '70px',
                  minHeight: '60px',
                  padding: '3px',
                  borderRadius: '5px',
                  cursor: pos.serie ? 'grab' : 'default',
                  backgroundColor: pos.estado
                    ? colorEstado(pos.estado.toLowerCase())
                    : '#222',
                  color: 'white',
                  boxSizing: 'border-box',
                  flex: '0 0 70px',
                  fontSize: '9px',
                  transition: 'opacity 0.2s',
                }}
              >
                <div>
                  <strong>P{pos.posicion}</strong>
                </div>

                {pos.serie ? (
                  <>
                    <div>
                      <strong>{pos.serie}</strong>
                    </div>
                    <div>{pos.tipo}</div>
                  </>
                ) : (
                  <div>Vacío</div>
                )}
              </div>
            ))}
        </div>
      </div>
    ))}
  </div>
) : (
  <>
    {Array.from({ length: 9 }, (_, i) => i + 1).map((linea) => (
      <div key={linea} style={{ marginBottom: '30px' }}>
        <h2>Línea {linea} ({datos.filter((x) => x.linea === linea && x.serie).length} módulos)</h2>

        <div
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '6px',
          }}
        >
          {datos
            .filter((x) => x.linea === linea)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                draggable={pos.serie ? true : false}
                onDragStart={() => pos.serie && setModuloEnDrag(pos)}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '0.6'
                }}
                onDragLeave={(e) => {
                  e.currentTarget.style.opacity = '1'
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  e.currentTarget.style.opacity = '1'
                  const idValido = typeof moduloEnDrag?.id === 'string' && moduloEnDrag.id !== 'null' && moduloEnDrag.id.trim() !== ''
                  const esMismo = moduloEnDrag?.id === pos.id
                  if (idValido && !esMismo) {
                    moverModulo(moduloEnDrag.id, linea, pos.posicion)
                  }
                  setModuloEnDrag(null)
                }}
                onDragEnd={() => {
                  setModuloEnDrag(null)
                }}
                onClick={() => {
                  console.log('CLICK POSICION', pos)

                  if (pos.serie) {
                    setModuloSeleccionado(pos)
                    setSerieEditada(pos.serie)
                    setTipoEditado(pos.tipo)
                    setProyectoEditado(pos.proyecto)
                    setEstadoEditado(pos.estado)
                    setLineaEditada(pos.linea)
                    setPosicionEditada(pos.posicion)
                  } else {
                    console.log('POSICION VACIA')
                    setPosicionSeleccionada(pos)
                    setMostrarNuevoModulo(true)
                  }
                }}
                style={{
                  width: '150px',
                  minHeight: '120px',
                  padding: '8px',
                  borderRadius: '8px',
                  cursor: pos.serie ? 'grab' : 'default',
                  backgroundColor: pos.estado
                    ? colorEstado(pos.estado.toLowerCase())
                    : '#222',
                  color: 'white',
                  boxSizing: 'border-box',
                  flex: '0 0 150px',
                  transition: 'opacity 0.2s',
                }}
              >
                <div>
                  <strong>P{pos.posicion}</strong>
                </div>

                {pos.serie ? (
                  <>
                    <div>
                      <strong>{pos.serie}</strong>
                    </div>
                    <div>{pos.tipo}</div>
                    <div>{pos.proyecto}</div>
                    <div>{pos.estado}</div>
                  </>
                ) : (
                  <div>Vacío</div>
                )}
              </div>
            ))}
        </div>
      </div>
    ))}
  </>
)}
      

      {moduloSeleccionado && (
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
      minWidth: '350px',
      zIndex: 1000,
      color: 'white',
    }}
  >
    <h2>Módulo</h2>

    <div style={{ marginBottom: '10px' }}>
  <strong>Serie</strong>

  <input
    value={serieEditada}
    onChange={(e) => setSerieEditada(e.target.value)}
    style={{
      width: '100%',
      padding: '8px',
      marginTop: '5px',
    }}
  />
</div>

<div style={{ marginBottom: '10px' }}>
  <strong>Tipo</strong>

  <input
    value={tipoEditado}
    onChange={(e) => setTipoEditado(e.target.value)}
    style={{
      width: '100%',
      padding: '8px',
      marginTop: '5px',
    }}
  />
</div>

<div style={{ marginBottom: '10px' }}>
  <strong>Proyecto</strong>

  <input
    value={proyectoEditado}
    onChange={(e) => setProyectoEditado(e.target.value)}
    style={{
      width: '100%',
      padding: '8px',
      marginTop: '5px',
    }}
  />
</div>

    <div style={{ marginBottom: '10px' }}>
      <strong>Estado</strong>

      <select
        value={estadoEditado}
        onChange={(e) => setEstadoEditado(e.target.value)}
        style={{
          width: '100%',
          padding: '8px',
          marginTop: '5px',
        }}
      >
        <option value="Sin iniciar">Sin iniciar</option>
        <option value="Canalizado">Canalizado</option>
        <option value="Cableado">Cableado</option>
        <option value="Terminaciones">Terminaciones</option>
        <option value="Prueba eléctrica">Prueba eléctrica</option>
      </select>
    </div>

    <div style={{ marginBottom: '10px' }}>
      <strong>Línea</strong>

      <select
        value={lineaEditada}
        onChange={(e) => setLineaEditada(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '8px',
          marginTop: '5px',
        }}
      >
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>

    <div style={{ marginBottom: '15px' }}>
      <strong>Posición</strong>

      <select
        value={posicionEditada}
        onChange={(e) => setPosicionEditada(Number(e.target.value))}
        style={{
          width: '100%',
          padding: '8px',
          marginTop: '5px',
        }}
      >
        {[1,2,3,4,5,6,7,8,9].map((n) => (
          <option key={n} value={n}>
            {n}
          </option>
        ))}
      </select>
    </div>

    <div
      style={{
        display: 'flex',
        gap: '10px',
      }}
    >
      <button
        onClick={guardarCambios}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Guardar
      </button>

      <button
        onClick={() => setModuloSeleccionado(null)}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Cerrar
      </button>
    </div>

    {perfil?.rol === 'admin' && (
  <button
    onClick={finalizarModulo}
    style={{
      padding: '10px',
      background: '#388e3c',
      color: 'white',
      width: '100%',
      marginTop: '10px',
    }}
  >
    Finalizar módulo
  </button>
)}
  </div>
)}

{mostrarKPI && (
  <div className="kpi-grid">
    ...
  </div>
)}

{mostrarNuevoModulo && (
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
      width: '90vw',
      maxWidth: '360px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 1000,
      color: 'white',
    }}
  >
    <h2>Nuevo módulo</h2>

    <p>
      <strong>Línea:</strong> {posicionSeleccionada?.linea}
    </p>

    <p>
      <strong>Posición:</strong> {posicionSeleccionada?.posicion}
    </p>

    <input
      placeholder="Serie"
      value={serieNueva}
      onChange={(e) => setSerieNueva(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
      }}
    />

    <input
      placeholder="Tipo"
      value={tipoNuevo}
      onChange={(e) => setTipoNuevo(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
      }}
    />

    <input
      placeholder="Proyecto"
      value={proyectoNuevo}
      onChange={(e) => setProyectoNuevo(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
      }}
    />

    <input
      placeholder="Responsable"
      value={responsableNuevo}
      onChange={(e) => setResponsableNuevo(e.target.value)}
      style={{
        width: '100%',
        padding: '8px',
        marginBottom: '10px',
      }}
    />

    <div
      style={{
        display: 'flex',
        gap: '10px',
      }}
    >
      <button
        onClick={crearModulo}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Guardar
      </button>

      <button
        onClick={() => setMostrarNuevoModulo(false)}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Cancelar
      </button>
    </div>
  </div>
)}
    </>
  )
}

export default App