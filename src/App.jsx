import { useEffect, useRef, useState } from 'react'
import { supabase } from './services/supabase'
import { exportarHistorialExcel } from './services/exportarExcel'
import Notificacion from './components/Notificacion'
import { obtenerHistorial } from './services/modulosService'

function esSolicitudPruebaActiva(valor) {
  return valor === true || valor === 'true' || valor === 1
}

function esEstadoPruebaElectrica(estado) {
  return ['prueba eléctrica', 'prueba electrica'].includes(
    String(estado || '').trim().toLowerCase()
  )
}

const seccionesFormularioElectrico = [
  {
    nombre: 'Canalización',
    items: ['Conduit 20mm', 'Conduit 25mm', 'Conduit 32mm', 'Caja PVC 100x100x65', 'Caja metálica 100x100x65', 'Caja 5/8"', 'Tapa ciega - Pasac.'],
  },
  {
    nombre: 'Cableado',
    items: ['Cable RZ1 2,5mm', 'Cable RZ1 4mm', 'Cable RZ1 6mm'],
  },
  {
    nombre: 'Iluminación',
    items: ['Ampolleta B/Conc.', 'Plafón', 'Tubo fluorescente', 'Hermético 2x40W', 'Foco tortuga 60W', 'Foco tortuga LED'],
  },
  {
    nombre: 'Artefactos',
    items: ['Artefacto simple', 'Artefacto doble', 'Artefacto triple', 'Tapa ciega artefacto', 'Ench. Ind. 32A macho', 'Ench. Ind. 32A hembra', 'Extractor'],
  },
  {
    nombre: 'Tableros',
    items: ['Aut. monof. 10-16-20A', 'Aut. bifásico 2x10A', 'Aut. bifásico 2x16A', 'Aut. bifásico 2x20A', 'Diferencial 2x25A', 'Barra repartidora', 'Falso polo', 'Tablero PVC emb.', 'Tablero PVC sobrepuesto', 'Tablero armado'],
  },
]

function FormularioElectrico({ valores, onChange }) {
  return (
    <div style={{ display: 'grid', gap: '8px', marginBottom: '14px', textAlign: 'left' }}>
      {seccionesFormularioElectrico.map((seccion, index) => (
        <details
          key={seccion.nombre}
          defaultOpen={index === 0}
          style={{ border: '1px solid #555', borderRadius: '8px', overflow: 'hidden' }}
        >
          <summary
            style={{
              padding: '10px 12px',
              background: '#333',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {seccion.nombre}
          </summary>

          <div style={{ padding: '6px 10px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                gap: '7px',
                padding: '4px 0',
                fontSize: '12px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            >
              <span />
              <span>Nuevo</span>
              <span>Reutilizado</span>
            </div>

            {seccion.items.map((item) => {
              const valorGuardado = valores[item]
              const cantidades =
                valorGuardado && typeof valorGuardado === 'object'
                  ? valorGuardado
                  : { nuevo: valorGuardado ?? '', reutilizado: '' }

              return (
                <div
                  key={item}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
                    gap: '7px',
                    alignItems: 'center',
                    padding: '7px 0',
                    borderBottom: '1px solid #444',
                  }}
                >
                  <span style={{ lineHeight: 1.2 }}>{item}</span>
                  {['nuevo', 'reutilizado'].map((tipo) => (
                    <input
                      key={tipo}
                      type="number"
                      min="0"
                      inputMode="numeric"
                      aria-label={`${tipo} de ${item}`}
                      value={cantidades[tipo] ?? ''}
                      onChange={(e) => onChange(item, tipo, e.target.value)}
                      style={{ width: '100%', padding: '8px 5px', boxSizing: 'border-box' }}
                    />
                  ))}
                </div>
              )
            })}
          </div>
        </details>
      ))}
    </div>
  )
}


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
const [busquedaRealizada, setBusquedaRealizada] = useState(false)
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
const [notaEditada, setNotaEditada] = useState('')
const [nombreSolicitante, setNombreSolicitante] = useState('')
const [rolSolicitante, setRolSolicitante] = useState('')
const [formulariosElectricos, setFormulariosElectricos] = useState({})
const [mostrarResumenMateriales, setMostrarResumenMateriales] = useState(false)
const [cargandoMateriales, setCargandoMateriales] = useState(false)
const [avisoPruebaElectrica, setAvisoPruebaElectrica] = useState(null)
const [mostrarLlamadosPendientes, setMostrarLlamadosPendientes] = useState(false)
const [solicitantesPendientes, setSolicitantesPendientes] = useState({})
const solicitudesPendientesRef = useRef(new Set())
const esRolSoloLectura = ['visor', 'electrico'].includes(perfil?.rol)
const puedeAgregarModulos = ['admin', 'operador'].includes(perfil?.rol)
const ocultarEspaciosVacios = ['electrico', 'visor', 'control_calidad'].includes(perfil?.rol)
const puedeResolverPrueba = ['admin', 'control_calidad'].includes(perfil?.rol)
const recibeAvisosPrueba = ['admin', 'control_calidad', 'operador'].includes(perfil?.rol)
const llamadosPendientes = datos.filter(
  (modulo) => modulo.serie && esSolicitudPruebaActiva(modulo.solicitud_prueba)
)
const materialesModuloSeleccionado = formulariosElectricos[moduloSeleccionado?.id] || {}
const resumenMateriales = Object.entries(materialesModuloSeleccionado)
  .map(([material, valor]) => {
    const cantidades = valor && typeof valor === 'object'
      ? valor
      : { nuevo: valor ?? '', reutilizado: '' }

    return [material, cantidades.nuevo || 0, cantidades.reutilizado || 0]
  })
  .filter(([, nuevo, reutilizado]) => Number(nuevo) > 0 || Number(reutilizado) > 0)

useEffect(() => {
  if (!notificacion) return

  const timer = window.setTimeout(() => setNotificacion(null), 3000)

  return () => window.clearTimeout(timer)
}, [notificacion])

useEffect(() => {
  if (!avisoPruebaElectrica) return

  const timer = window.setTimeout(() => setAvisoPruebaElectrica(null), 6000)
  return () => window.clearTimeout(timer)
}, [avisoPruebaElectrica])

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

useEffect(() => {
  const intervalo = setInterval(() => {
    cargarTablero()
  }, 5000)

  return () => clearInterval(intervalo)
}, [])

useEffect(() => {
  const canalModulos = supabase
    .channel('cambios-modulos-tablero')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'modulos' },
      (cambio) => {
        const moduloActualizado = cambio.new

        if (
          recibeAvisosPrueba &&
          esSolicitudPruebaActiva(moduloActualizado?.solicitud_prueba) &&
          !solicitudesPendientesRef.current.has(moduloActualizado.id)
        ) {
          setAvisoPruebaElectrica({
            linea: moduloActualizado.linea,
            id: moduloActualizado.id,
          })
        }

        if (esSolicitudPruebaActiva(moduloActualizado?.solicitud_prueba)) {
          solicitudesPendientesRef.current.add(moduloActualizado.id)
        } else if (moduloActualizado?.id) {
          solicitudesPendientesRef.current.delete(moduloActualizado.id)
        }

        cargarTablero()
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(canalModulos)
  }
}, [perfil?.rol, recibeAvisosPrueba])

useEffect(() => {
  if (!recibeAvisosPrueba) return

  const modulosPendientes = datos.filter(
    (modulo) => modulo.id && esSolicitudPruebaActiva(modulo.solicitud_prueba)
  )

  if (modulosPendientes.length === 0) {
    return
  }

  async function cargarSolicitantesPendientes() {
    const idsModulos = modulosPendientes.map((modulo) => modulo.id)
    const { data: modulos, error: errorModulos } = await supabase
      .from('modulos')
      .select('id, solicitado_por')
      .in('id', idsModulos)

    if (errorModulos) {
      console.error(errorModulos)
      return
    }

    const idsPerfiles = [...new Set(
      (modulos || []).map((modulo) => modulo.solicitado_por).filter(Boolean)
    )]

    if (idsPerfiles.length === 0) {
      setSolicitantesPendientes({})
      return
    }

    const { data: perfiles, error: errorPerfiles } = await supabase
      .from('perfiles')
      .select('id, nombre')
      .in('id', idsPerfiles)

    if (errorPerfiles) {
      console.error(errorPerfiles)
      return
    }

    const nombresPorPerfil = new Map(
      (perfiles || []).map((perfilSolicitante) => [perfilSolicitante.id, perfilSolicitante.nombre])
    )

    setSolicitantesPendientes(
      Object.fromEntries(
        (modulos || []).map((modulo) => [
          modulo.id,
          nombresPorPerfil.get(modulo.solicitado_por) || 'No disponible',
        ])
      )
    )
  }

  cargarSolicitantesPendientes()
}, [datos, recibeAvisosPrueba])

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
    const { data: tableroData, error: tableroError } = await supabase
      .from('tablero')
      .select('*')
      .order('linea')
      .order('posicion')

    if (tableroError) {
      console.error(tableroError)
      return
    }

    const { data: modulosData, error: modulosError } = await supabase
      .from('modulos')
      .select('id, nota')

    if (modulosError) {
      console.error(modulosError)
      return
    }

    const notaMap = new Map((modulosData || []).map((item) => [item.id, item.nota]))
    const mergedData = (tableroData || []).map((row) => ({
      ...row,
      nota: row.nota || notaMap.get(row.id) || '',
      solicitud_prueba: esSolicitudPruebaActiva(row.solicitud_prueba),
    }))

    solicitudesPendientesRef.current = new Set(
      mergedData
        .filter((modulo) => esSolicitudPruebaActiva(modulo.solicitud_prueba))
        .map((modulo) => modulo.id)
    )

    setDatos(mergedData)
  }

  async function cargarHistorial() {
  try {
    const data = await obtenerHistorial()
    setHistorial(data || [])
  } catch (error) {
    console.error(error)
  }
}

async function buscarSerie() {
  const serie = serieBusqueda.trim()

  if (!serie) {
    setResultadoBusqueda([])
    setBusquedaRealizada(false)
    return
  }

  const [respuestaHistorial, respuestaActivos] = await Promise.all([
    supabase
      .from('historial_modulos')
      .select('*')
      .eq('serie', serie)
      .order('fecha_salida', { ascending: false })
      .limit(5),
    supabase
      .from('modulos')
      .select('*')
      .eq('serie', serie),
  ])

  if (respuestaHistorial.error || respuestaActivos.error) {
    alert((respuestaHistorial.error || respuestaActivos.error).message)
    return
  }

  const activos = (respuestaActivos.data || []).map((modulo) => ({
    ...modulo,
    esActual: true,
  }))

  setResultadoBusqueda([...activos, ...(respuestaHistorial.data || [])])
  setBusquedaRealizada(true)
}

function exportarHistorialExcelHandler() {
  exportarHistorialExcel(historial, fechaDesde, fechaHasta)
}

async function crearModulo() {
  if (!puedeAgregarModulos) {
    mostrarNotificacion('No tienes permisos para agregar módulos')
    setMostrarNuevoModulo(false)
    return
  }

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

function limpiarEstadosModal() {
  setMostrarResumenMateriales(false)
  setModuloSeleccionado(null)
  setSerieEditada('')
  setTipoEditado('')
  setProyectoEditado('')
  setEstadoEditado('')
  setLineaEditada('')
  setPosicionEditada('')
  setNotaEditada('')
}

  async function guardarCambios() {
  const isPruebaElectrica = estadoEditado === 'Prueba eléctrica'
  const shouldSetFechaPrueba =
    isPruebaElectrica && moduloSeleccionado?.estado !== 'Prueba eléctrica'

  const updatePayload = esRolSoloLectura
    ? {
        nota: notaEditada,
        ...(perfil?.rol === 'electrico'
          ? { materiales: formulariosElectricos[moduloSeleccionado?.id] || {} }
          : {}),
      }
    : {
        serie: serieEditada,
        tipo: tipoEditado,
        proyecto: proyectoEditado,
        estado: estadoEditado,
        linea: lineaEditada,
        posicion: posicionEditada,
        nota: notaEditada,
      }

  console.log('GUARDANDO CAMBIOS:', {
    moduloId: moduloSeleccionado?.id,
    notaEditada,
    moduloSeleccionado,
  })

console.log({
  estadoOriginal: moduloSeleccionado.estado,
  estadoNuevo: estadoEditado,
  shouldSetFechaPrueba
})
  if (shouldSetFechaPrueba) {
    console.log("Guardando fecha de prueba eléctrica")

    updatePayload.fecha_prueba_electrica = new Date().toISOString()
  }

  let { error } = await supabase
    .from('modulos')
    .update(updatePayload)
    .eq('id', moduloSeleccionado.id)

  console.log('RESULTADO UPDATE - NOTA:', notaEditada)
  console.log('RESULTADO UPDATE - PAYLOAD:')
  console.log('  serie:', updatePayload.serie)
  console.log('  tipo:', updatePayload.tipo)
  console.log('  proyecto:', updatePayload.proyecto)
  console.log('  estado:', updatePayload.estado)
  console.log('  linea:', updatePayload.linea)
  console.log('  posicion:', updatePayload.posicion)
  console.log('  nota:', updatePayload.nota)
  console.log('  error:', error)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()

  limpiarEstadosModal()

  mostrarNotificacion('Cambios guardados correctamente')
}

async function solicitarPruebaElectrica() {
  const usuario = session?.user

  if (esEstadoPruebaElectrica(moduloSeleccionado?.estado)) {
    mostrarNotificacion('Este módulo ya tiene la prueba eléctrica aprobada')
    return
  }

  if (!usuario || !moduloSeleccionado?.id) {
    mostrarNotificacion('No se pudo identificar al usuario o al módulo')
    return
  }

  const { error } = await supabase
    .from('modulos')
    .update({
      solicitud_prueba: true,
      solicitado_por: usuario.id,
      fecha_solicitud: new Date().toISOString(),
      ...(perfil?.rol === 'electrico'
        ? { materiales: formulariosElectricos[moduloSeleccionado.id] || {} }
        : {}),
    })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()

  setModuloSeleccionado(null)

  mostrarNotificacion('Solicitud de prueba eléctrica enviada')
}

async function cancelarSolicitudPruebaElectrica() {
  if (!moduloSeleccionado?.id) return

  const { error } = await supabase
    .from('modulos')
    .update({ solicitud_prueba: false })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Solicitud de prueba eléctrica cancelada')
}

async function aprobarPruebaElectrica() {
  if (!moduloSeleccionado?.id) return

  const { error } = await supabase
    .from('modulos')
    .update({
      solicitud_prueba: false,
      estado: 'Prueba eléctrica',
      fecha_prueba_electrica: new Date().toISOString(),
    })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Prueba eléctrica aprobada')
}

async function rechazarPruebaElectrica() {
  if (!moduloSeleccionado?.id) return

  const { error } = await supabase
    .from('modulos')
    .update({ solicitud_prueba: false })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion(error.message)
    return
  }

  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Solicitud de prueba eléctrica rechazada')
}


async function cargarNombreSolicitante(idSolicitante, moduloId) {
  let solicitanteId = idSolicitante

  if (!solicitanteId && moduloId) {
    const { data: modulo, error: errorModulo } = await supabase
      .from('modulos')
      .select('solicitado_por')
      .eq('id', moduloId)
      .single()

    if (errorModulo) {
      console.error(errorModulo)
      setNombreSolicitante('No disponible')
      setRolSolicitante('')
      return
    }

    solicitanteId = modulo?.solicitado_por
  }

  if (!solicitanteId) {
    setNombreSolicitante('No disponible')
    setRolSolicitante('')
    return
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('nombre, rol')
    .eq('id', solicitanteId)
    .single()

  if (error) {
    console.error(error)
    setNombreSolicitante('No disponible')
    setRolSolicitante('')
    return
  }

  setNombreSolicitante(data?.nombre || 'No disponible')
  setRolSolicitante(data?.rol || '')
}

async function cargarMaterialesModulo(moduloId) {
  if (!moduloId) return

  setCargandoMateriales(true)
  const { data, error } = await supabase
    .from('modulos')
    .select('materiales')
    .eq('id', moduloId)
    .single()
  setCargandoMateriales(false)

  if (error) {
    console.error(error)
    mostrarNotificacion('No se pudieron cargar los materiales')
    return
  }

  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloId]: data?.materiales || {},
  }))
}

async function abrirResumenMateriales() {
  if (!moduloSeleccionado?.id) return
  await cargarMaterialesModulo(moduloSeleccionado.id)
  setMostrarResumenMateriales(true)
}


async function finalizarModulo() {

  const { data: modulo, error: errorModulo } = await supabase
    .from('modulos')
    .select('*')
    .eq('id', moduloSeleccionado.id)
    .single()

  if (errorModulo) {
    mostrarNotificacion(errorModulo.message)
    return
  }

  const { error: errorHistorial } = await supabase
    .from('historial_modulos')
    .insert([
      {
        modulo_id: modulo.id,
        serie: modulo.serie,
        tipo: modulo.tipo,
        proyecto: modulo.proyecto,
        responsable: modulo.responsable,
        fecha_ingreso: modulo.fecha_ingreso,
        fecha_prueba_electrica: modulo.fecha_prueba_electrica,
        fecha_salida: new Date().toISOString(),
        estado: modulo.estado,
        linea: modulo.linea,
        posicion: modulo.posicion,
      },
    ])

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

  limpiarEstadosModal()

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

        <Notificacion mensaje={notificacion} />

        {recibeAvisosPrueba && avisoPruebaElectrica && (
          <button
            onClick={() => {
              setMostrarLlamadosPendientes(true)
              setAvisoPruebaElectrica(null)
            }}
            style={{
              position: 'fixed',
              top: '14px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 'calc(100vw - 32px)',
              maxWidth: '420px',
              padding: '14px 18px',
              background: '#f57c00',
              color: 'white',
              border: 'none',
              borderRadius: '10px',
              boxShadow: '0 6px 18px rgba(0,0,0,0.35)',
              zIndex: 3000,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Prueba eléctrica línea {avisoPruebaElectrica.linea}
          </button>
        )}

        {recibeAvisosPrueba && (
          <>
            <button
              aria-label="Ver llamados a prueba eléctrica pendientes"
              onClick={() => setMostrarLlamadosPendientes((visible) => !visible)}
              style={{
                position: 'fixed',
                left: '12px',
                bottom: '20px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid white',
                background: '#1976d2',
                color: 'white',
                fontSize: '24px',
                zIndex: 2500,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              🔔
              {llamadosPendientes.length > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-6px',
                    minWidth: '20px',
                    height: '20px',
                    padding: '0 4px',
                    boxSizing: 'border-box',
                    borderRadius: '10px',
                    background: '#d32f2f',
                    color: 'white',
                    fontSize: '12px',
                    lineHeight: '20px',
                    fontWeight: 700,
                  }}
                >
                  {llamadosPendientes.length}
                </span>
              )}
            </button>

            {mostrarLlamadosPendientes && (
              <div
                style={{
                  position: 'fixed',
                  left: '12px',
                  bottom: '82px',
                  width: 'calc(100vw - 24px)',
                  maxWidth: '360px',
                  maxHeight: '60vh',
                  overflowY: 'auto',
                  padding: '16px',
                  boxSizing: 'border-box',
                  border: '1px solid white',
                  borderRadius: '10px',
                  background: '#222',
                  color: 'white',
                  textAlign: 'left',
                  zIndex: 2499,
                  boxShadow: '0 6px 18px rgba(0,0,0,0.45)',
                }}
              >
                <h3 style={{ margin: '0 0 12px' }}>Pruebas pendientes</h3>

                {llamadosPendientes.length === 0 ? (
                  <p>No hay llamados pendientes.</p>
                ) : (
                  llamadosPendientes.map((modulo) => (
                    <div
                      key={modulo.id}
                      style={{ padding: '9px 0', borderBottom: '1px solid #444' }}
                    >
                      <strong style={{ display: 'block' }}>
                        LÍNEA {modulo.linea}
                      </strong>
                      <span style={{ display: 'block', marginTop: '2px', fontSize: '13px', color: '#ccc' }}>
                        {solicitantesPendientes[modulo.id] || 'Cargando...'} - {modulo.serie}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </>
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
        background: '#a6a1a1',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>En proceso</h3>
      <h2>{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#000000',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
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
        minWidth: '120px',
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
        minWidth: '120px',
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
        minWidth: '120px',
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
        minWidth: '120px',
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
        minWidth: '120px',
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
        minWidth: '120px',
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
    onClick={exportarHistorialExcelHandler}
  >
    Exportar Excel
  </button>

</div>

  {busquedaRealizada && resultadoBusqueda.length === 0 && (
    <p style={{ marginTop: '12px' }}>No se encontraron registros para esa serie.</p>
  )}

  {resultadoBusqueda.map((item) => (
    <div
      key={`${item.esActual ? 'actual' : 'historial'}-${item.id}`}
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
        {item.fecha_prueba_electrica
          ? new Date(item.fecha_prueba_electrica).toLocaleDateString('es-CL')
          : 'Sin registro'}
      </div>

      {item.esActual && (
        <div style={{ marginTop: '4px', color: '#81c784', fontWeight: 700 }}>
          (Actualmente en línea {item.linea})
        </div>
      )}

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
        <h3 style={{ marginBottom: '8px', fontSize: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
          <span style={{ fontSize: '26px', fontWeight: '800', textTransform: 'uppercase' }}>
            Línea {linea}
          </span>
          <span style={{ fontSize: '16px', fontWeight: '500', color: '#ccc' }}>
            ({datos.filter((x) => x.linea === linea && x.serie).length} módulos)
          </span>
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
            .filter((x) => !ocultarEspaciosVacios || x.serie)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                className={esSolicitudPruebaActiva(pos.solicitud_prueba) ? 'modulo-prueba-pendiente' : undefined}
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
                    setNombreSolicitante('')
                    setRolSolicitante('')
                    setModuloSeleccionado(pos)
                    setSerieEditada(pos.serie)
                    setTipoEditado(pos.tipo)
                    setProyectoEditado(pos.proyecto)
                    setEstadoEditado(pos.estado)
                    setLineaEditada(pos.linea)
                    setPosicionEditada(pos.posicion)
                    setNotaEditada(pos.nota || '')

                    if (['electrico', 'visor', 'operador', 'admin'].includes(perfil?.rol)) {
                      cargarMaterialesModulo(pos.id)
                    }

                    if (esSolicitudPruebaActiva(pos.solicitud_prueba)) {
                      cargarNombreSolicitante(pos.solicitado_por, pos.id)
                    }
                  } else {
                    console.log('POSICION VACIA')
                    if (puedeAgregarModulos) {
                      setPosicionSeleccionada(pos)
                      setMostrarNuevoModulo(true)
                    }
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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{pos.serie}</strong>

                      {pos.nota && (
                        <span
                          title="Este módulo tiene una nota"
                          style={{
                            fontSize: '18px',
                          }}
                        >
                          💬
                        </span>
                      )}
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
        <h2 style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', fontSize: '22px' }}>
          <span style={{ fontWeight: '800', textTransform: 'uppercase' }}>
            Línea {linea}
          </span>
          <span style={{ fontWeight: '500', fontSize: '18px', color: '#ccc' }}>
            ({datos.filter((x) => x.linea === linea && x.serie).length} módulos)
          </span>
        </h2>

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
            .filter((x) => !ocultarEspaciosVacios || x.serie)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                className={esSolicitudPruebaActiva(pos.solicitud_prueba) ? 'modulo-prueba-pendiente' : undefined}
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

    setNombreSolicitante('')
    setRolSolicitante('')

    setModuloSeleccionado(pos)

    setSerieEditada(pos.serie)
    setTipoEditado(pos.tipo)
    setProyectoEditado(pos.proyecto)
    setEstadoEditado(pos.estado)
    setLineaEditada(pos.linea)
    setPosicionEditada(pos.posicion)
    setNotaEditada(pos.nota || '')

    if (['electrico', 'visor', 'operador', 'admin'].includes(perfil?.rol)) {
      cargarMaterialesModulo(pos.id)
    }

    if (esSolicitudPruebaActiva(pos.solicitud_prueba)) {
      cargarNombreSolicitante(pos.solicitado_por, pos.id)
    }

  } else {

    console.log('POSICION VACIA')

    if (puedeAgregarModulos) {
      setPosicionSeleccionada(pos)
      setMostrarNuevoModulo(true)
    }

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
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <strong>{pos.serie}</strong>

                      {pos.nota && (
                        <span
                          title="Este módulo tiene una nota"
                          style={{
                            fontSize: '18px',
                          }}
                        >
                          💬
                        </span>
                      )}
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
      

      {esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba) && puedeResolverPrueba && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'calc(100vw - 32px)',
            maxWidth: '380px',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            boxSizing: 'border-box',
            background: '#222',
            padding: '20px',
            border: '2px solid orange',
            borderRadius: '10px',
            zIndex: 1100,
            color: 'white',
          }}
        >
          <h2 style={{ marginTop: 0 }}>⚠ PRUEBA ELÉCTRICA SOLICITADA</h2>
          <p style={{ marginBottom: '8px' }}>
            <strong>Módulo:</strong> {moduloSeleccionado.serie}
          </p>
          <p style={{ marginBottom: '20px' }}>
            <strong>Solicitado por:</strong>{' '}
            {nombreSolicitante || 'Cargando...'}
            {rolSolicitante && ` (${rolSolicitante})`}
          </p>

          {perfil?.rol === 'admin' && (
            <button
              onClick={abrirResumenMateriales}
              style={{ width: '100%', marginBottom: '10px', padding: '12px' }}
            >
              Materiales
            </button>
          )}

          <button
            onClick={aprobarPruebaElectrica}
            style={{
              width: '100%',
              padding: '12px',
              backgroundColor: '#2e7d32',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✔ Aprobar prueba
          </button>

          <button
            onClick={rechazarPruebaElectrica}
            style={{
              width: '100%',
              marginTop: '10px',
              padding: '12px',
              backgroundColor: '#c62828',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            ✖ Rechazar solicitud
          </button>

          <button
            onClick={limpiarEstadosModal}
            style={{ width: '100%', marginTop: '10px', padding: '12px' }}
          >
            Cerrar
          </button>
        </div>
      )}

      {moduloSeleccionado &&
       !(esSolicitudPruebaActiva(moduloSeleccionado.solicitud_prueba) && puedeResolverPrueba) && (
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
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
      <h2 style={{ margin: 0 }}>Módulo</h2>
      {perfil?.rol === 'admin' && (
        <button
          onClick={finalizarModulo}
          style={{
            background: '#d32f2f',
            color: 'white',
            padding: '10px 14px',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          Finalizar módulo
        </button>
      )}
    </div>

    {perfil?.rol === 'electrico' ? (
      <>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
            gap: '10px 18px',
            textAlign: 'left',
            marginBottom: '12px',
          }}
        >
          <div><strong>Serie:</strong> {serieEditada}</div>
          <div><strong>Tipo:</strong> {tipoEditado}</div>
          <div style={{ gridColumn: '1 / -1' }}>
            <strong>Proyecto:</strong> {proyectoEditado}
          </div>
        </div>

        <div style={{ marginBottom: '12px', textAlign: 'left' }}>
          <strong>Nota:</strong>
          <textarea
            value={notaEditada}
            onChange={(e) => setNotaEditada(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              marginTop: '5px',
              padding: '8px',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>

        <FormularioElectrico
          valores={formulariosElectricos[moduloSeleccionado?.id] || {}}
          onChange={(item, tipo, valor) => {
            const moduloId = moduloSeleccionado?.id
            if (!moduloId) return

            setFormulariosElectricos((actuales) => ({
              ...actuales,
              [moduloId]: {
                ...(actuales[moduloId] || {}),
                [item]: {
                  ...(
                    typeof actuales[moduloId]?.[item] === 'object'
                      ? actuales[moduloId][item]
                      : { nuevo: actuales[moduloId]?.[item] || '', reutilizado: '' }
                  ),
                  [tipo]: valor,
                },
              },
            }))
          }}
        />
      </>
    ) : (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '10px',
          textAlign: 'left',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <strong>Serie</strong>
          <input
            value={serieEditada}
            onChange={(e) => setSerieEditada(e.target.value)}
            disabled={esRolSoloLectura}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '10px' }}>
          <strong>Tipo</strong>
          <input
            value={tipoEditado}
            onChange={(e) => setTipoEditado(e.target.value)}
            disabled={esRolSoloLectura}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
          <strong>Proyecto</strong>
          <input
            value={proyectoEditado}
            onChange={(e) => setProyectoEditado(e.target.value)}
            disabled={esRolSoloLectura}
            style={{ width: '100%', padding: '8px', marginTop: '5px', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ marginBottom: '5px', gridColumn: '1 / -1' }}>
          <strong>Nota</strong>
          <textarea
            value={notaEditada}
            onChange={(e) => setNotaEditada(e.target.value)}
            rows={2}
            style={{ width: '100%', marginTop: '5px', padding: '8px', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </div>
      </div>
    )}

    {perfil?.rol !== 'electrico' && (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: '10px',
          textAlign: 'left',
          marginTop: '10px',
        }}
      >
        <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
          <strong>Estado</strong>

          <select
            value={estadoEditado}
            onChange={(e) => setEstadoEditado(e.target.value)}
            disabled={esRolSoloLectura}
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
            disabled={esRolSoloLectura}
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
            disabled={esRolSoloLectura}
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
      </div>
    )}

    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
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
        {esRolSoloLectura ? 'Guardar nota' : 'Guardar cambios'}
      </button>

       {['electrico', 'operador'].includes(perfil?.rol) && (
  esEstadoPruebaElectrica(moduloSeleccionado?.estado) ? (
    <button
      disabled
      style={{
        backgroundColor: '#388e3c',
        color: 'white',
        padding: '10px',
        flex: 1,
        opacity: 0.75,
        cursor: 'not-allowed',
      }}
    >
      ✓ Prueba eléctrica aprobada
    </button>
  ) : esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba) ? (
    <button
      onClick={cancelarSolicitudPruebaElectrica}
      style={{
        backgroundColor: '#ff9800',
        color: 'white',
        padding: '10px',
        flex: 1,
        cursor: 'pointer',
      }}
    >
      <span style={{ display: 'block' }}>🟡 Esperando aprobación</span>
      <small style={{ display: 'block', marginTop: '3px' }}>
        (presione para cancelar)
      </small>
    </button>
  ) : (
    <button
      onClick={solicitarPruebaElectrica}
      style={{
        backgroundColor: '#1976d2',
        color: 'white',
        padding: '10px',
        flex: 1,
      }}
    >
      ⚡ Solicitar Prueba Eléctrica
    </button>
  )
)}
      {['visor', 'operador', 'admin'].includes(perfil?.rol) && (
        <button
          onClick={abrirResumenMateriales}
          style={{ padding: '10px', flex: 1 }}
        >
          Materiales
        </button>
      )}
      <button
        onClick={limpiarEstadosModal}
        style={{
          padding: '10px',
          flex: 1,
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarResumenMateriales && moduloSeleccionado && (
  <div
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '420px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Materiales — {moduloSeleccionado.serie}</h2>

    {cargandoMateriales ? (
      <p>Cargando...</p>
    ) : resumenMateriales.length === 0 ? (
      <p>No hay materiales registrados.</p>
    ) : (
      <div style={{ display: 'grid', gap: '8px' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
            gap: '7px',
            fontSize: '12px',
            fontWeight: 700,
            textAlign: 'center',
          }}
        >
          <span />
          <span>Nuevo</span>
          <span>Reutilizado</span>
        </div>

        {resumenMateriales.map(([material, nuevo, reutilizado]) => (
          <div
            key={material}
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1fr) 64px 76px',
              gap: '7px',
              paddingBottom: '8px',
              borderBottom: '1px solid #444',
              alignItems: 'center',
            }}
          >
            <span>{material}</span>
            <strong style={{ textAlign: 'center' }}>{nuevo || '—'}</strong>
            <strong style={{ textAlign: 'center' }}>{reutilizado || '—'}</strong>
          </div>
        ))}
      </div>
    )}

    <button
      onClick={() => setMostrarResumenMateriales(false)}
      style={{ width: '100%', marginTop: '18px', padding: '12px' }}
    >
      Cerrar
    </button>
  </div>
)}

{mostrarKPI && (
  <div className="kpi-grid">
    <div style={{ color: '#ccc' }}>KPIs próximos a implementarse</div>
  </div>
)}

{mostrarNuevoModulo && puedeAgregarModulos && (
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
