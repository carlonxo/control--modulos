import { useEffect, useRef, useState } from 'react'
import { supabase } from './services/supabase'
import { exportarHistorialExcel } from './services/exportarExcel'
import Notificacion from './components/Notificacion'
import ProtocoloEntrega, { camposMateriales, parsearCantidadProtocolo } from './components/ProtocoloEntrega'
import { obtenerHistorial } from './services/modulosService'
import { formatearFecha } from './utils/fechas'
import { descargarProtocolosDiariosPdf } from './services/protocolosDiariosPdf'

function esSolicitudPruebaActiva(valor) {
  return valor === true || valor === 'true' || valor === 1
}

function esEstadoPruebaElectrica(estado) {
  return ['prueba eléctrica', 'prueba electrica'].includes(
    String(estado || '').trim().toLowerCase()
  )
}

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
}

function esTipoBodega(tipo) {
  return normalizarTexto(tipo).includes('bodega')
}

function esEstadoConObservacionAlerta(estado) {
  return ['prueba electrica', 'en garantia', 'sin instalacion'].includes(
    normalizarTexto(estado)
  )
}

function fechaParaInput(valor) {
  if (!valor) return ''
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return ''
  return fecha.toISOString().slice(0, 10)
}

function diasDesdeFecha(valor) {
  if (!valor) return null
  const fecha = new Date(valor)
  if (Number.isNaN(fecha.getTime())) return null
  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const inicioFecha = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate())
  return Math.floor((inicioHoy - inicioFecha) / 86400000)
}

function estaDentroDeGarantia(valor) {
  const dias = diasDesdeFecha(valor)
  return dias !== null && dias >= 0 && dias <= 90
}

const seccionesFormularioElectrico = [
  {
    nombre: 'Canalización',
    items: ['Conduit 20mm', 'Conduit 25mm', 'Conduit 32mm', 'Caja PVC 100x100x65', 'Caja metálica 100x100x65', 'Caja tabique LH', 'Tapa ciega - Pasac.'],
  },
  {
    nombre: 'Cableado',
    items: ['Cable RZ1 2,5mm', 'Cable RZ1 4mm', 'Cable RZ1 6mm', 'Cordon 3x1.5mm', 'Cordon 3x4mm', 'Cordon 3 x 6mm'],
  },
  {
    nombre: 'Iluminación',
    items: ['EQ. Herm. LED 40W (tubo/placa)', 'Tubo LED', 'Foco tortuga LED', 'Foco tortuga 60W', 'Ampolleta LED', 'Plafón'],
  },
  {
    nombre: 'Artefactos',
    items: ['Artefacto simple', 'Artefacto doble', 'Artefacto triple', 'Tapa ciega artefacto', 'Ench. Ind. 32A macho', 'Ench. Ind. 32A hembra', 'Extractor'],
  },
  {
    nombre: 'Tableros',
    items: ['Aut. monof. 10-16-20A', 'Aut. bifásico 2x10A', 'Aut. bifásico 2x16A', 'Aut. bifásico 2x20A', 'Aut. bifásico 2x25A', 'Diferencial 2x25A', 'Luz Piloto', 'Porta Fusible', 'Barra repartidora', 'Falso polo', 'Tablero emb. IP44', 'Tablero sobr. IP44', 'Tablero IP65 18p', 'Tablero IP65 24p', 'Tablero armado'],
  },
  {
    nombre: 'Especiales',
    items: ['Panel led 60x60 + soporte', 'Plafo led 18w', 'Plafo led 24w', 'BPC LH 100x45', 'Tapa idrobox IP65', 'Caja chuqui'],
  },
]

const todosLosMateriales = seccionesFormularioElectrico.flatMap((seccion) => seccion.items)

const catalogoPreciosProtocolo = [
  { seccion: 'Canalización', material: 'Ducto Flex/Rig 20mm LH (Incl Acc)', idArt: 323, precio: 1932 },
  { seccion: 'Canalización', material: 'Ducto Flex/Rig 25mm LH (Incl Acc)', idArt: 1681, precio: 2782 },
  { seccion: 'Canalización', material: 'Caja PVC 100x100x65', idArt: 244, precio: 2377 },
  { seccion: 'Canalización', material: 'Caja Metálica 100x65x65 / Chuqui', idArt: 322, precio: 2378 },
  { seccion: 'Canalización', material: 'Caja Metálica 100x100x65', idArt: 1704, precio: 3120 },
  { seccion: 'Canalización', material: 'Caja Tabique 3 Puestos LH', idArt: 1680, precio: 1900 },
  { seccion: 'Canalización', material: 'Tapa Ciega - Plástica / Metálica', idArt: 1684, precio: 480 },
  { seccion: 'Canalización', material: 'Prensa Estopa 16-21mm', idArt: 1683, precio: 1458 },
  { seccion: 'Cableado', material: 'Cable RZ1 2,5mm (Alum + Ench)', idArt: 248, precio: 353 },
  { seccion: 'Cableado', material: 'Cable RZ1 4mm (Termo)', idArt: 249, precio: 493 },
  { seccion: 'Cableado', material: 'Cable RZ1 6mm (Alimentación)', idArt: 1687, precio: 710 },
  { seccion: 'Cableado', material: 'Cable RZ1 3x2.5 / 4mm (Ilu-Term)', idArt: 252, precio: 2872 },
  { seccion: 'Cableado', material: 'Cable RZ1 3x6mm (Alimentación)', idArt: 1685, precio: 3460 },
  { seccion: 'Iluminación básica', material: 'Ampolleta LED', idArt: 254, precio: 3180 },
  { seccion: 'Iluminación básica', material: 'Foco Led 12W Sob', idArt: 259, precio: 6702 },
  { seccion: 'Iluminación básica', material: 'Tubo Led', idArt: 255, precio: 3180 },
  { seccion: 'Iluminación básica', material: 'Eq. Herm. Led 40w (Tubo/Placa)', idArt: 256, precio: 18559 },
  { seccion: 'Iluminación básica', material: 'Foco Tortuga Led', idArt: 258, precio: 7733 },
  { seccion: 'Accesorios', material: 'Instalación Extractor', idArt: 273, precio: 0 },
  { seccion: 'Artefactos tableros', material: 'Artefacto Simple', idArt: 263, precio: 1856 },
  { seccion: 'Artefactos tableros', material: 'Artefacto Doble', idArt: 264, precio: 2578 },
  { seccion: 'Artefactos tableros', material: 'Artefacto Triple', idArt: 265, precio: 3299 },
  { seccion: 'Artefactos tableros', material: 'Tapa Ciega + Soporte', idArt: 266, precio: 0 },
  { seccion: 'Artefactos tableros', material: 'Ench Hembra Indep 32A', idArt: 267, precio: 5639 },
  { seccion: 'Artefactos tableros', material: 'Enchufe Mch Indep 32A', idArt: 1693, precio: 9250 },
  { seccion: 'Tableros', material: 'Tab. PVC 24-36cc IP44', idArt: 1700, precio: 25300 },
  { seccion: 'Tableros', material: 'Tab. PVC 8-12-18cc IP44', idArt: 270, precio: 17279 },
  { seccion: 'Tableros', material: 'Tablero PVC IP65', idArt: 1701, precio: 56279 },
  { seccion: 'Tableros', material: 'Inst Tab. TOP (Armado)', idArt: 17, precio: 70000 },
  { seccion: 'Tableros', material: 'Aut. Monof 10-16-20A', idArt: 268, precio: 2578 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x10A', idArt: 1705, precio: 6740 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x16A', idArt: 1706, precio: 6950 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x20A', idArt: 1707, precio: 7308 },
  { seccion: 'Tableros', material: 'Auto. Bifásico 2x25-32A', idArt: 1708, precio: 8450 },
  { seccion: 'Tableros', material: 'Diferencial 2x25A', idArt: 269, precio: 8673 },
  { seccion: 'Tableros', material: 'Diferencial 2x40A', idArt: 1709, precio: 13520 },
  { seccion: 'Tableros', material: 'Porta Fusibles', idArt: 1698, precio: 1850 },
  { seccion: 'Tableros', material: 'Luz Piloto', idArt: 1697, precio: 2100 },
  { seccion: 'Tableros', material: 'Barra Monofásica 4cto', idArt: 271, precio: 1577 },
  { seccion: 'Tableros', material: 'Repartidor 4x80A', idArt: 1699, precio: 4200 },
  { seccion: 'Tableros', material: 'Falso Polo 1Mts', idArt: 272, precio: 1237 },
  { seccion: 'Moldura plástica', material: 'Mold Bca C/T 20x10 x 2mt + Acces', idArt: 325, precio: 2000 },
  { seccion: 'Bandeja plástica', material: 'BPC LH 100x45 + Acces', idArt: 1694, precio: 25200 },
  { seccion: 'Bandeja plástica', material: 'Tapa Idrobox IP55', idArt: 1692, precio: 11033 },
  { seccion: 'Eq. iluminación', material: 'Foco Sobrep LED 18W', idArt: 1712, precio: 8940 },
  { seccion: 'Eq. iluminación', material: 'Panel Led 600x600mm', idArt: 1690, precio: 1690 },
  { seccion: 'Eq. iluminación', material: 'Accesorio Mtaje Panel Led', idArt: 1688, precio: 15200 },
  { seccion: 'Eq. iluminación', material: 'Foco Sobrep LED 24W', idArt: 1713, precio: 14320 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Tub Flexible Metálica c/acces', idArt: 1711, precio: 3390 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Tubería EMT c/accesorio', idArt: 1710, precio: 3900 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Ducto Flex/Rig 32mm LH (Incl Acc)', idArt: 1682, precio: 3744 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Caja Chuqui PVC', idArt: 324, precio: 1200 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Int. Difer. Legrand 2x10A 10mA', idArt: 1695, precio: 102500 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Int. Difer. Legrand 2x16A 10mA', idArt: 1696, precio: 24200 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Cordón Flex 3x18 AWG', idArt: 250, precio: 919 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Cable RZ-1 3x1.5mm2', idArt: 251, precio: 1658 },
  { seccion: 'Canalización-Cableado-SPT', material: 'Cable RZ-1 5x4mm2', idArt: 1686, precio: 4620 },
  { seccion: 'SPT', material: 'Barra Coperw 5/8 Inc. Con', idArt: 1702, precio: 12540 },
  { seccion: 'SPT', material: 'Camarilla Registro PVC', idArt: 1703, precio: 5600 },
]

const seccionesCatalogoPrecios = [...new Set(catalogoPreciosProtocolo.map((item) => item.seccion))]
const valorBaseManoObraMantencion = 18900
const encabezadosProtocolosMensuales = [
  { clave: 'ver', lineas: ['Ver'], align: 'center' },
  { clave: 'serie', lineas: ['Serie'] },
  { clave: 'fecha', lineas: ['Fecha'] },
  { clave: 'tipo', lineas: ['Tipo', 'Modulo'] },
  { clave: 'mantencion', lineas: ['Valor', 'mantencion'] },
  { clave: 'modificacion', lineas: ['Valor', 'modificacion'] },
  { clave: 'total', lineas: ['Valor', 'total'] },
  { clave: 'idOt', lineas: ['ID.', 'OT'] },
]

function formatearPrecioMaterial(valor) {
  const numero = Number(String(valor ?? '').replace(/[^\d]/g, ''))
  if (!numero) return '$ 0'
  return `$ ${numero.toLocaleString('es-CL')}`
}

function limpiarPrecioMaterial(valor) {
  return String(valor ?? '').replace(/[^\d]/g, '')
}

function normalizarTextoComparacion(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

const equivalenciasPrecioProtocolo = {
  [normalizarTextoComparacion('Conduit 20mm')]: 'Ducto Flex/Rig 20mm LH (Incl Acc)',
  [normalizarTextoComparacion('Conduit 25mm')]: 'Ducto Flex/Rig 25mm LH (Incl Acc)',
  [normalizarTextoComparacion('Caja metálica 100x100x65')]: 'Caja Metálica 100x100x65',
  [normalizarTextoComparacion('Caja tabique LH')]: 'Caja Tabique 3 Puestos LH',
  [normalizarTextoComparacion('Tapa ciega - Pasac.')]: 'Tapa Ciega - Plástica / Metálica',
  [normalizarTextoComparacion('Cordon flex 3 x 2.5/4mm')]: 'Cable RZ1 3x2.5 / 4mm (Ilu-Term)',
  [normalizarTextoComparacion('Cordon flex 3 x 6mm')]: 'Cable RZ1 3x6mm (Alimentación)',
  [normalizarTextoComparacion('Plafón')]: 'Foco Led 12W Sob',
  [normalizarTextoComparacion('Extractor')]: 'Instalación Extractor',
  [normalizarTextoComparacion('Conduit 32mm')]: 'Ducto Flex/Rig 32mm LH (Incl Acc)',
  [normalizarTextoComparacion('Artefacto simple')]: 'Artefacto Simple',
  [normalizarTextoComparacion('Artefacto doble')]: 'Artefacto Doble',
  [normalizarTextoComparacion('Artefacto triple')]: 'Artefacto Triple',
  [normalizarTextoComparacion('Tapa ciega artefacto')]: 'Tapa Ciega + Soporte',
  [normalizarTextoComparacion('Ench. Ind. 32A hembra')]: 'Ench Hembra Indep 32A',
  [normalizarTextoComparacion('Ench. Ind. 32A macho')]: 'Enchufe Mch Indep 32A',
  [normalizarTextoComparacion('Tablero IP65')]: 'Tablero PVC IP65',
  [normalizarTextoComparacion('Tablero armado')]: 'Inst Tab. TOP (Armado)',
  [normalizarTextoComparacion('Aut. monof. 10-16-20A')]: 'Aut. Monof 10-16-20A',
  [normalizarTextoComparacion('Aut. bifásico 2x10A')]: 'Auto. Bifásico 2x10A',
  [normalizarTextoComparacion('Aut. bifásico 2x16A')]: 'Auto. Bifásico 2x16A',
  [normalizarTextoComparacion('Aut. bifásico 2x20A')]: 'Auto. Bifásico 2x20A',
  [normalizarTextoComparacion('Aut. bifásico 2x25A')]: 'Auto. Bifásico 2x25-32A',
  [normalizarTextoComparacion('Porta Fusible')]: 'Porta Fusibles',
  [normalizarTextoComparacion('Repartidor 4x80A')]: 'Repartidor 4x80A',
  [normalizarTextoComparacion('Falso polo')]: 'Falso Polo 1Mts',
  [normalizarTextoComparacion('BPC LH 100x45 + acces')]: 'BPC LH 100x45 + Acces',
  [normalizarTextoComparacion('Tapa idrobox IP65')]: 'Tapa Idrobox IP55',
  [normalizarTextoComparacion('Foco sobrep LED 18w')]: 'Foco Sobrep LED 18W',
  [normalizarTextoComparacion('Panel led 600x600 mm')]: 'Panel Led 600x600mm',
  [normalizarTextoComparacion('Accesorio Montaje Panel Led')]: 'Accesorio Mtaje Panel Led',
  [normalizarTextoComparacion('Foco sobrep led 24w')]: 'Foco Sobrep LED 24W',
}

function obtenerMaterialPrecioParaProtocolo(itemProtocolo) {
  const clave = normalizarTextoComparacion(itemProtocolo)
  const directo = catalogoPreciosProtocolo.find((item) => normalizarTextoComparacion(item.material) === clave)
  if (directo) return directo.material
  return equivalenciasPrecioProtocolo[clave] || itemProtocolo
}

function calcularCantidadNuevaProtocolo(valor) {
  return Number(parsearCantidadProtocolo(valor)?.nuevo || 0)
}

function formatearFechaInput(fecha) {
  const ano = fecha.getFullYear()
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const dia = String(fecha.getDate()).padStart(2, '0')
  return `${ano}-${mes}-${dia}`
}

function obtenerValorInicialRangoProtocolo(rango) {
  const hoy = new Date()
  if (rango === 'dia') return formatearFechaInput(hoy)
  if (rango === 'semana') {
    const fecha = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
    const diaSemana = fecha.getDay() || 7
    fecha.setDate(fecha.getDate() + 4 - diaSemana)
    const anoSemana = fecha.getFullYear()
    const inicioAnoSemana = new Date(anoSemana, 0, 1)
    const semana = Math.ceil((((fecha - inicioAnoSemana) / 86400000) + 1) / 7)
    return `${anoSemana}-W${String(semana).padStart(2, '0')}`
  }
  return formatearFechaInput(hoy).slice(0, 7)
}

function obtenerRangoFechasProtocolos(rango, valor) {
  if (rango === 'dia') {
    const inicio = new Date(`${valor}T00:00:00`)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 1)
    return { inicio: `${valor}T00:00:00`, fin: fin.toISOString().slice(0, 19) }
  }

  if (rango === 'semana') {
    const [anoTexto, semanaTexto = 'W1'] = String(valor || '').split('-W')
    const ano = Number(anoTexto)
    const semana = Number(semanaTexto)
    const primerDiaAno = new Date(ano, 0, 1)
    const diaSemana = primerDiaAno.getDay() || 7
    const lunesSemana1 = new Date(ano, 0, 1 + (diaSemana <= 4 ? 1 - diaSemana : 8 - diaSemana))
    const inicio = new Date(lunesSemana1)
    inicio.setDate(lunesSemana1.getDate() + (semana - 1) * 7)
    const fin = new Date(inicio)
    fin.setDate(fin.getDate() + 7)
    return { inicio: `${formatearFechaInput(inicio)}T00:00:00`, fin: fin.toISOString().slice(0, 19) }
  }

  const inicio = `${valor}-01T00:00:00`
  const fin = new Date(`${valor}-01T00:00:00`)
  fin.setMonth(fin.getMonth() + 1)
  return { inicio, fin: fin.toISOString().slice(0, 19) }
}

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
const [fechaPruebaEditada, setFechaPruebaEditada] = useState('')
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
const [responsableEditado, setResponsableEditado] = useState('')
const [mostrarKPI, setMostrarKPI] = useState(false)
const [mostrarVistaGeneral, setMostrarVistaGeneral] = useState(false)
const [notificacion, setNotificacion] = useState(null)
const [moduloEnDrag, setModuloEnDrag] = useState(null)
const [notaEditada, setNotaEditada] = useState('')
const [nombreSolicitante, setNombreSolicitante] = useState('')
const [rolSolicitante, setRolSolicitante] = useState('')
const [formulariosElectricos, setFormulariosElectricos] = useState({})
const [mostrarResumenMateriales, setMostrarResumenMateriales] = useState(false)
const [mostrarEditorMateriales, setMostrarEditorMateriales] = useState(false)
const [cargandoMateriales, setCargandoMateriales] = useState(false)
const [avisoPruebaElectrica, setAvisoPruebaElectrica] = useState(null)
const [mostrarLlamadosPendientes, setMostrarLlamadosPendientes] = useState(false)
const [solicitantesPendientes, setSolicitantesPendientes] = useState({})
const [mostrarMenuAcciones, setMostrarMenuAcciones] = useState(false)
const [mostrarMenuModulo, setMostrarMenuModulo] = useState(false)
const [mostrarReintegrar, setMostrarReintegrar] = useState(false)
const [mostrarDescargaProtocolos, setMostrarDescargaProtocolos] = useState(false)
const [mostrarPreciosMateriales, setMostrarPreciosMateriales] = useState(false)
const [mostrarProtocolosMensuales, setMostrarProtocolosMensuales] = useState(false)
const [preciosMateriales, setPreciosMateriales] = useState({})
const [cargandoPreciosMateriales, setCargandoPreciosMateriales] = useState(false)
const [guardandoPreciosMateriales, setGuardandoPreciosMateriales] = useState(false)
const [precioMaterialEnEdicion, setPrecioMaterialEnEdicion] = useState(null)
const [rangoProtocolosMensuales, setRangoProtocolosMensuales] = useState('mes')
const [fechaProtocolosMensuales, setFechaProtocolosMensuales] = useState(new Date().toISOString().slice(0, 7))
const [protocolosMensuales, setProtocolosMensuales] = useState([])
const [cargandoProtocolosMensuales, setCargandoProtocolosMensuales] = useState(false)
const [idOtEnEdicion, setIdOtEnEdicion] = useState(null)
const [fechaProtocolosDiarios, setFechaProtocolosDiarios] = useState(new Date().toISOString().slice(0, 10))
const [descargandoProtocolos, setDescargandoProtocolos] = useState(false)
const [serieReintegrar, setSerieReintegrar] = useState('')
const [lineaReintegrar, setLineaReintegrar] = useState(1)
const [extremoReintegrar, setExtremoReintegrar] = useState('fin')
const [historialSeleccionadoReintegrar, setHistorialSeleccionadoReintegrar] = useState(null)
const [reintegrandoModulo, setReintegrandoModulo] = useState(false)
const [mostrarProtocoloEntrega, setMostrarProtocoloEntrega] = useState(false)
const [datosProtocoloEntrega, setDatosProtocoloEntrega] = useState({})
const [responsableProtocolo, setResponsableProtocolo] = useState('')
const [protocoloSoloLecturaBusqueda, setProtocoloSoloLecturaBusqueda] = useState(false)
const [protocoloDesdeHistorial, setProtocoloDesdeHistorial] = useState(false)
const [protocoloManualMensual, setProtocoloManualMensual] = useState(false)
const solicitudesPendientesRef = useRef(new Set())
const autoScrollArrastreRef = useRef(null)
const esRolSoloLectura = ['visor', 'analista', 'electrico'].includes(perfil?.rol)
const puedeAgregarModulos = ['admin', 'operador'].includes(perfil?.rol)
const puedeResolverPrueba = ['admin', 'control_calidad'].includes(perfil?.rol)
const puedeUsarProtocolo = ['admin', 'operador', 'control_calidad', 'visor', 'analista'].includes(perfil?.rol)
const puedeEditarProtocolo = ['admin', 'operador'].includes(perfil?.rol)
const puedeEditarDatosProtocolo = ['admin', 'operador', 'control_calidad'].includes(perfil?.rol)
const recibeAvisosPrueba = ['admin', 'control_calidad', 'operador'].includes(perfil?.rol)
const puedeDescargarProtocolosDiarios = ['analista', 'admin', 'operador', 'control_calidad'].includes(perfil?.rol)
const puedeVerPreciosMateriales = ['operador', 'analista', 'admin'].includes(perfil?.rol)
const puedeEditarPreciosMateriales = ['analista', 'admin'].includes(perfil?.rol)
const puedeVerProtocolosMensuales = ['analista', 'admin'].includes(perfil?.rol)
const puedeVerMenuAcciones = puedeAgregarModulos || puedeDescargarProtocolosDiarios || puedeVerPreciosMateriales
const puedeVerMenuModulo = ['admin', 'operador'].includes(perfil?.rol)
const puedeDejarObservacionAlerta = puedeVerMenuModulo && esEstadoConObservacionAlerta(moduloSeleccionado?.estado)
const llamadosPendientes = datos.filter(
  (modulo) => modulo.serie && esSolicitudPruebaActiva(modulo.solicitud_prueba)
)
const ingresosProtocolosMensuales = protocolosMensuales.reduce(
  (total, registro) => total + Number(registro.valorTotal || 0),
  0
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

function detenerAutoScrollArrastre() {
  if (autoScrollArrastreRef.current) {
    window.cancelAnimationFrame(autoScrollArrastreRef.current)
    autoScrollArrastreRef.current = null
  }
}

function autoScrollLineaDuranteArrastre(contenedor, posicionX) {
  if (!contenedor) return

  const rect = contenedor.getBoundingClientRect()
  const margenActivo = 90
  const velocidadMaxima = 22
  let velocidad = 0

  if (posicionX < rect.left + margenActivo) {
    const intensidad = (rect.left + margenActivo - posicionX) / margenActivo
    velocidad = -Math.ceil(intensidad * velocidadMaxima)
  } else if (posicionX > rect.right - margenActivo) {
    const intensidad = (posicionX - (rect.right - margenActivo)) / margenActivo
    velocidad = Math.ceil(intensidad * velocidadMaxima)
  }

  detenerAutoScrollArrastre()

  if (!velocidad) return

  const desplazar = () => {
    contenedor.scrollLeft += velocidad
    autoScrollArrastreRef.current = window.requestAnimationFrame(desplazar)
  }

  autoScrollArrastreRef.current = window.requestAnimationFrame(desplazar)
}

useEffect(() => {
  return () => detenerAutoScrollArrastre()
}, [])

function cerrarPanelesFlotantes() {
  setMostrarLlamadosPendientes(false)
  setMostrarMenuAcciones(false)
  setMostrarMenuModulo(false)
}

function cerrarPanelesYModulo() {
  cerrarVentanasEmergentes()
}

function cerrarVentanasEmergentes({ conservarModulo = false } = {}) {
  cerrarPanelesFlotantes()
  setMostrarResumenMateriales(false)
  setMostrarEditorMateriales(false)
  setMostrarProtocoloEntrega(false)
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)
  setProtocoloManualMensual(false)
  setMostrarNuevoModulo(false)
  setMostrarReintegrar(false)
  setMostrarDescargaProtocolos(false)
  setMostrarPreciosMateriales(false)
  setPrecioMaterialEnEdicion(null)

  if (!conservarModulo) {
    limpiarEstadosModal()
  }
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

    let { data: modulosData, error: modulosError } = await supabase
      .from('modulos')
      .select('id, nota, observacion_alerta, fecha_prueba_electrica')

    if (modulosError?.message?.includes('observacion_alerta')) {
      ;({ data: modulosData, error: modulosError } = await supabase
        .from('modulos')
        .select('id, nota, fecha_prueba_electrica'))
    }

    if (modulosError) {
      console.error(modulosError)
      return
    }

    const modulosMap = new Map((modulosData || []).map((item) => [item.id, item]))
    const mergedData = (tableroData || []).map((row) => ({
      ...row,
      nota: row.nota || modulosMap.get(row.id)?.nota || '',
      observacion_alerta: row.observacion_alerta || modulosMap.get(row.id)?.observacion_alerta || '',
      fecha_prueba_electrica: row.fecha_prueba_electrica || modulosMap.get(row.id)?.fecha_prueba_electrica || null,
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
      .order('fecha_prueba_electrica', { ascending: false, nullsFirst: false })
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

  let lineaIngreso = posicionSeleccionada.linea
  let posicionIngreso = posicionSeleccionada.posicion

  if (posicionSeleccionada.extremo) {
    try {
      posicionIngreso = await prepararLineaParaIngreso(
        posicionSeleccionada.linea,
        posicionSeleccionada.extremo
      )
    } catch (error) {
      mostrarNotificacion(error.message)
      await cargarTablero()
      return
    }
  }

  const { error } = await supabase
    .from('modulos')
    .insert([
      {
        serie: serieNueva,
        tipo: tipoNuevo,
        proyecto: proyectoNuevo,
        responsable: responsableNuevo,
        linea: lineaIngreso,
        posicion: posicionIngreso,
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

function abrirIngresoModuloEnExtremo(linea, extremo) {
  if (!puedeAgregarModulos) return
  cerrarVentanasEmergentes()

  const cantidadModulos = datos.filter((x) => Number(x.linea) === Number(linea) && x.serie).length
  if (cantidadModulos >= 9) {
    mostrarNotificacion(`La línea ${linea} ya está completa`)
    return
  }

  setPosicionSeleccionada({
    linea,
    posicion: extremo === 'inicio' ? 1 : cantidadModulos + 1,
    extremo,
  })
  setMostrarNuevoModulo(true)
}

async function prepararLineaParaIngreso(linea, extremo) {
  const { data: registros, error } = await supabase
    .from('modulos')
    .select('id, linea, posicion, serie')
    .eq('linea', linea)

  if (error) {
    throw new Error('No se pudo preparar la línea: ' + error.message)
  }

  const modulosLinea = (registros || [])
    .filter((x) => x?.serie && String(x.serie).trim() !== '')
    .sort((a, b) => Number(a.posicion) - Number(b.posicion))

  if (modulosLinea.length >= 9) {
    throw new Error(`La línea ${linea} ya está completa`)
  }

  const posicionTemporalBase = 1000 + Math.floor(Math.random() * 100000)
  for (const [index, modulo] of modulosLinea.entries()) {
    const { error: errorTemporal } = await supabase
      .from('modulos')
      .update({ posicion: posicionTemporalBase + index })
      .eq('id', modulo.id)

    if (errorTemporal) {
      throw new Error(errorTemporal.message)
    }
  }

  for (const [index, modulo] of modulosLinea.entries()) {
    const nuevaPosicion = extremo === 'inicio' ? index + 2 : index + 1
    const { error: errorOrden } = await supabase
      .from('modulos')
      .update({ posicion: nuevaPosicion })
      .eq('id', modulo.id)

    if (errorOrden) {
      throw new Error(errorOrden.message)
    }
  }

  return extremo === 'inicio' ? 1 : modulosLinea.length + 1
}

function abrirReintegrarModulo() {
  cerrarVentanasEmergentes()
  setMostrarReintegrar(true)
  setSerieReintegrar('')
  setHistorialSeleccionadoReintegrar(null)
  setLineaReintegrar(1)
  setExtremoReintegrar('fin')
}

function seleccionarHistorialParaReintegrar(item) {
  setHistorialSeleccionadoReintegrar(item)
  setSerieReintegrar(item?.serie || '')
}

function descargarProtocolosDiarios() {
  if (!puedeDescargarProtocolosDiarios) return
  cerrarVentanasEmergentes()
  setFechaProtocolosDiarios(new Date().toISOString().slice(0, 10))
  setMostrarDescargaProtocolos(true)
}

async function cargarPreciosMateriales() {
  setCargandoPreciosMateriales(true)
  const { data, error } = await supabase
    .from('material_precios')
    .select('material, precio')
  setCargandoPreciosMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudieron cargar los precios: ' + error.message)
    const preciosPorDefecto = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [item.material, item.precio]))
    setPreciosMateriales(preciosPorDefecto)
    return preciosPorDefecto
  }

  const preciosGuardados = Object.fromEntries((data || []).map((item) => [
    item.material,
    item.precio ?? '',
  ]))

  const preciosCompletos = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    item.material,
    preciosGuardados[item.material] ?? item.precio,
  ]))
  setPreciosMateriales(preciosCompletos)
  return preciosCompletos
}

async function abrirPreciosMateriales() {
  if (!puedeVerPreciosMateriales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarPreciosMateriales(true)
  await cargarPreciosMateriales()
}

function calcularValoresProtocoloMensual(registro, precios = preciosMateriales) {
  const detalleMateriales = registro?.protocolo_entrega?.detalleMateriales || {}
  const preciosBase = Object.fromEntries(catalogoPreciosProtocolo.map((item) => [
    item.material,
    Number(limpiarPrecioMaterial(precios[item.material] ?? item.precio) || 0),
  ]))

  return camposMateriales.reduce((totales, [itemProtocolo]) => {
    const detalle = detalleMateriales[itemProtocolo] || {}
    const materialPrecio = obtenerMaterialPrecioParaProtocolo(itemProtocolo)
    const precioUnitario = preciosBase[materialPrecio] ?? 0
    const cantidadMantencion = calcularCantidadNuevaProtocolo(detalle.mantencion)
    const cantidadModificacion = calcularCantidadNuevaProtocolo(detalle.modificacion)

    return {
      mantencion: totales.mantencion + cantidadMantencion * precioUnitario,
      modificacion: totales.modificacion + cantidadModificacion * precioUnitario,
    }
  }, { mantencion: valorBaseManoObraMantencion, modificacion: 0 })
}

function prepararRegistroProtocoloMensual(registro, origen, precios = preciosMateriales) {
  const valores = calcularValoresProtocoloMensual(registro, precios)
  return {
    ...registro,
    origen,
    esActual: origen === 'actual',
    valorMantencion: valores.mantencion,
    valorModificacion: valores.modificacion,
    valorTotal: valores.mantencion + valores.modificacion,
    idOt: registro?.protocolo_entrega?.id_ot || registro?.protocolo_entrega?.idOt || '',
  }
}

async function cargarProtocolosMensuales(valor = fechaProtocolosMensuales, rango = rangoProtocolosMensuales) {
  if (!puedeVerProtocolosMensuales || !valor) return

  setCargandoProtocolosMensuales(true)
  const preciosParaCalculo = Object.keys(preciosMateriales).length === 0
    ? await cargarPreciosMateriales()
    : preciosMateriales

  const { inicio, fin: finTexto } = obtenerRangoFechasProtocolos(rango, valor)

  const [respuestaActivos, respuestaHistorial, respuestaManuales] = await Promise.all([
    supabase
      .from('modulos')
      .select('id, serie, tipo, proyecto, responsable, fecha_prueba_electrica, protocolo_entrega, materiales')
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', finTexto),
    supabase
      .from('historial_modulos')
      .select('id, serie, tipo, proyecto, responsable, fecha_prueba_electrica, fecha_salida, protocolo_entrega, materiales')
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', finTexto),
    supabase
      .from('protocolos_manuales')
      .select('id, serie, tipo, proyecto, responsable, fecha_prueba_electrica, protocolo_entrega, materiales')
      .gte('fecha_prueba_electrica', inicio)
      .lt('fecha_prueba_electrica', finTexto),
  ])

  setCargandoProtocolosMensuales(false)

  const tablaManualNoExiste = respuestaManuales.error?.message?.includes('protocolos_manuales')
  const error = respuestaActivos.error || respuestaHistorial.error || (tablaManualNoExiste ? null : respuestaManuales.error)
  if (error) {
    mostrarNotificacion('No se pudieron cargar los protocolos mensuales: ' + error.message)
    return
  }

  const preciosActuales = Object.keys(preciosParaCalculo || {}).length > 0
    ? preciosParaCalculo
    : Object.fromEntries(catalogoPreciosProtocolo.map((item) => [item.material, item.precio]))

  const registros = [
    ...(respuestaActivos.data || []).map((item) => prepararRegistroProtocoloMensual(item, 'actual', preciosActuales)),
    ...(respuestaHistorial.data || []).map((item) => prepararRegistroProtocoloMensual(item, 'historial', preciosActuales)),
    ...((tablaManualNoExiste ? [] : respuestaManuales.data) || []).map((item) => prepararRegistroProtocoloMensual(item, 'manual', preciosActuales)),
  ].sort((a, b) => new Date(b.fecha_prueba_electrica || 0) - new Date(a.fecha_prueba_electrica || 0))

  setProtocolosMensuales(registros)
}

async function abrirProtocolosMensuales() {
  if (!puedeVerProtocolosMensuales) return
  cerrarVentanasEmergentes()
  setMostrarMenuAcciones(false)
  setMostrarProtocolosMensuales(true)
  await cargarProtocolosMensuales()
}

function fechaInicialProtocoloManual() {
  const hoy = new Date().toISOString().slice(0, 10)
  if (!fechaProtocolosMensuales) return hoy
  if (rangoProtocolosMensuales === 'dia') return fechaProtocolosMensuales
  const { inicio, fin } = obtenerRangoFechasProtocolos(rangoProtocolosMensuales, fechaProtocolosMensuales)
  const inicioFecha = inicio.slice(0, 10)
  const finFecha = fin.slice(0, 10)
  return hoy >= inicioFecha && hoy < finFecha ? hoy : inicioFecha
}

function abrirIngresoManualProtocolo() {
  if (!puedeVerProtocolosMensuales) return

  const fecha = fechaInicialProtocoloManual()
  const moduloManual = {
    id: `manual-nuevo-${Date.now()}`,
    origen: 'manual',
    serie: '',
    tipo: '',
    proyecto: '',
    responsable: perfil?.nombre || '',
    linea: '',
    materiales: {},
    protocolo_entrega: {
      fecha,
      responsable: perfil?.nombre || '',
      serie: '',
      tipo: '',
      proyecto: '',
      linea: '',
      detalleMateriales: {},
      materiales: {},
    },
  }

  setModuloSeleccionado(moduloManual)
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloManual.id]: {},
  }))
  setDatosProtocoloEntrega(moduloManual.protocolo_entrega)
  setResponsableProtocolo(perfil?.nombre || '')
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)
  setProtocoloManualMensual(true)
  setMostrarProtocoloEntrega(true)
}

async function guardarIdOtProtocoloMensual(registro, valor) {
  if (!puedeVerProtocolosMensuales || !registro?.id) return

  const tablaDestino = registro.origen === 'manual'
    ? 'protocolos_manuales'
    : registro.origen === 'historial'
      ? 'historial_modulos'
      : 'modulos'
  const protocoloActualizado = {
    ...(registro.protocolo_entrega || {}),
    id_ot: valor,
  }

  const { error } = await supabase
    .from(tablaDestino)
    .update({ protocolo_entrega: protocoloActualizado })
    .eq('id', registro.id)

  if (error) {
    mostrarNotificacion('No se pudo guardar el ID OT: ' + error.message)
    return
  }

  setProtocolosMensuales((actuales) => actuales.map((item) => (
    item.id === registro.id && item.origen === registro.origen
      ? { ...item, idOt: valor, protocolo_entrega: protocoloActualizado }
      : item
  )))
  setIdOtEnEdicion(null)
  mostrarNotificacion('ID OT guardado')
}

function actualizarPrecioMaterial(material, valor) {
  setPreciosMateriales((actuales) => ({
    ...actuales,
    [material]: limpiarPrecioMaterial(valor),
  }))
}

async function guardarPreciosMateriales() {
  if (!puedeEditarPreciosMateriales || guardandoPreciosMateriales) return

  setGuardandoPreciosMateriales(true)
  const filas = catalogoPreciosProtocolo.map((item) => ({
    material: item.material,
    id_art: item.idArt,
    seccion: item.seccion,
    precio: Number(limpiarPrecioMaterial(preciosMateriales[item.material]) || 0),
    updated_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('material_precios')
    .upsert(filas, { onConflict: 'material' })

  setGuardandoPreciosMateriales(false)

  if (error) {
    mostrarNotificacion('No se pudieron guardar los precios: ' + error.message)
    return
  }

  setPrecioMaterialEnEdicion(null)
  mostrarNotificacion('Precios de materiales guardados correctamente')
}

async function generarDescargaProtocolosDiarios() {
  if (!puedeDescargarProtocolosDiarios || !fechaProtocolosDiarios || descargandoProtocolos) return

  setDescargandoProtocolos(true)
  try {
    const inicio = `${fechaProtocolosDiarios}T00:00:00`
    const fin = new Date(`${fechaProtocolosDiarios}T00:00:00`)
    fin.setDate(fin.getDate() + 1)
    const finTexto = fin.toISOString().slice(0, 19)

    const [respuestaActivos, respuestaHistorial] = await Promise.all([
      supabase
        .from('modulos')
        .select('*')
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
      supabase
        .from('historial_modulos')
        .select('*')
        .gte('fecha_prueba_electrica', inicio)
        .lt('fecha_prueba_electrica', finTexto),
    ])

    const error = respuestaActivos.error || respuestaHistorial.error
    if (error) {
      mostrarNotificacion('No se pudieron cargar los protocolos: ' + error.message)
      return
    }

    const registros = [...(respuestaActivos.data || []), ...(respuestaHistorial.data || [])]
      .sort((a, b) => String(a.serie || '').localeCompare(String(b.serie || '')))

    if (registros.length === 0) {
      mostrarNotificacion('No hay protocolos con fecha de prueba eléctrica para ese día')
      return
    }

    await descargarProtocolosDiariosPdf(registros, fechaProtocolosDiarios)
    setMostrarDescargaProtocolos(false)
    mostrarNotificacion(`Se descargaron ${registros.length} protocolo(s)`)
  } finally {
    setDescargandoProtocolos(false)
  }
}

async function reintegrarModuloFinalizado() {
  if (!puedeAgregarModulos || reintegrandoModulo) return

  setReintegrandoModulo(true)
  try {
    let moduloHistorial = historialSeleccionadoReintegrar

    if (!moduloHistorial) {
      const serie = serieReintegrar.trim()
      if (!serie) {
        mostrarNotificacion('Debe seleccionar o ingresar una serie')
        return
      }

      const { data, error } = await supabase
        .from('historial_modulos')
        .select('*')
        .eq('serie', serie)
        .order('fecha_salida', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        mostrarNotificacion('No se pudo buscar el módulo: ' + error.message)
        return
      }

      moduloHistorial = data
    }

    if (!moduloHistorial) {
      mostrarNotificacion('No se encontró un módulo finalizado con esa serie')
      return
    }

    const { data: activoExistente, error: errorActivo } = await supabase
      .from('modulos')
      .select('id')
      .eq('serie', moduloHistorial.serie)
      .maybeSingle()

    if (errorActivo) {
      mostrarNotificacion('No se pudo verificar el módulo activo: ' + errorActivo.message)
      return
    }

    if (activoExistente) {
      mostrarNotificacion('Ese módulo ya se encuentra activo en una línea')
      return
    }

    const posicionDestino = await prepararLineaParaIngreso(lineaReintegrar, extremoReintegrar)
    const { error: errorInsert } = await supabase
      .from('modulos')
      .insert([
        {
          serie: moduloHistorial.serie,
          tipo: moduloHistorial.tipo,
          proyecto: moduloHistorial.proyecto,
          responsable: moduloHistorial.responsable,
          fecha_ingreso: moduloHistorial.fecha_ingreso,
          fecha_prueba_electrica: moduloHistorial.fecha_prueba_electrica,
          protocolo_entrega: moduloHistorial.protocolo_entrega || {},
          nota: moduloHistorial.nota || '',
          observacion_alerta: moduloHistorial.observacion_alerta || '',
          estado: moduloHistorial.estado || 'Sin iniciar',
          linea: lineaReintegrar,
          posicion: posicionDestino,
        },
      ])

    if (errorInsert) {
      mostrarNotificacion('No se pudo reintegrar el módulo: ' + errorInsert.message)
      await cargarTablero()
      return
    }

    const { error: errorDelete } = await supabase
      .from('historial_modulos')
      .delete()
      .eq('id', moduloHistorial.id)

    if (errorDelete) {
      mostrarNotificacion('Módulo reintegrado, pero no se pudo retirar del historial: ' + errorDelete.message)
    } else {
      mostrarNotificacion('Módulo reintegrado correctamente')
    }

    setMostrarReintegrar(false)
    setHistorialSeleccionadoReintegrar(null)
    setSerieReintegrar('')
    await cargarTablero()
    await cargarHistorial()
  } finally {
    setReintegrandoModulo(false)
  }
}

function limpiarEstadosModal() {
  cerrarPanelesFlotantes()
  setMostrarResumenMateriales(false)
  setMostrarEditorMateriales(false)
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)
  setProtocoloManualMensual(false)
  setModuloSeleccionado(null)
  setSerieEditada('')
  setTipoEditado('')
  setProyectoEditado('')
  setResponsableEditado('')
  setEstadoEditado('')
  setLineaEditada('')
  setPosicionEditada('')
  setFechaPruebaEditada('')
  setNotaEditada('')
}

  async function guardarCambios() {
  const isPruebaElectrica = estadoEditado === 'Prueba eléctrica'
  const isEnGarantia = estadoEditado === 'En garantía'
  const shouldSetFechaPrueba =
    isPruebaElectrica && moduloSeleccionado?.estado !== 'Prueba eléctrica'

  if (isEnGarantia && !fechaPruebaEditada) {
    mostrarNotificacion('Debe ingresar la fecha de la prueba eléctrica')
    return
  }

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
        responsable: responsableEditado,
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

  if (isEnGarantia) {
    updatePayload.fecha_prueba_electrica = new Date(`${fechaPruebaEditada}T12:00:00`).toISOString()
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

async function dejarObservacionAlerta() {
  if (!moduloSeleccionado?.id || !puedeDejarObservacionAlerta) return

  const textoActual = moduloSeleccionado.observacion_alerta || ''
  const observacion = window.prompt('Ingrese la observación del módulo:', textoActual)

  if (observacion === null) return

  const observacionLimpia = observacion.trim()

  const { error } = await supabase
    .from('modulos')
    .update({ observacion_alerta: observacionLimpia })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion('No se pudo guardar la observación: ' + error.message)
    return
  }

  setModuloSeleccionado((actual) => actual
    ? { ...actual, observacion_alerta: observacionLimpia }
    : actual
  )
  await cargarTablero()
  setMostrarMenuModulo(false)
  mostrarNotificacion(
    observacionLimpia
      ? 'Observación guardada'
      : 'Observación eliminada'
  )
}

function mostrarObservacionAlerta(modulo) {
  if (!modulo?.observacion_alerta) return
  window.alert(modulo.observacion_alerta)
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
  cerrarVentanasEmergentes({ conservarModulo: true })
  await cargarMaterialesModulo(moduloSeleccionado.id)
  setMostrarResumenMateriales(true)
}

async function abrirEditorMateriales() {
  if (!moduloSeleccionado?.id || !puedeVerMenuModulo) return
  cerrarVentanasEmergentes({ conservarModulo: true })
  await cargarMaterialesModulo(moduloSeleccionado.id)
  setMostrarMenuModulo(false)
  setMostrarEditorMateriales(true)
}

function actualizarMaterialFormulario(item, tipo, valor) {
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
}

async function guardarMaterialesModulo() {
  if (!moduloSeleccionado?.id || !puedeVerMenuModulo) return

  const materiales = formulariosElectricos[moduloSeleccionado.id] || {}
  const { error } = await supabase
    .from('modulos')
    .update({ materiales })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion('No se pudieron guardar los materiales: ' + error.message)
    return
  }

  setModuloSeleccionado((actual) => actual
    ? { ...actual, materiales }
    : actual
  )
  mostrarNotificacion('Materiales guardados correctamente')
}

async function abrirProtocoloEntrega() {
  if (!moduloSeleccionado?.id || !puedeUsarProtocolo) return
  cerrarVentanasEmergentes({ conservarModulo: true })
  setProtocoloSoloLecturaBusqueda(false)
  setProtocoloDesdeHistorial(false)

  const { data: modulo, error } = await supabase
    .from('modulos')
    .select('materiales, protocolo_entrega, solicitado_por')
    .eq('id', moduloSeleccionado.id)
    .single()

  if (error) {
    mostrarNotificacion('No se pudo cargar el protocolo: ' + error.message)
    return
  }

  let nombreResponsable = ''
  if (modulo?.solicitado_por) {
    const { data: perfilSolicitante } = await supabase
      .from('perfiles')
      .select('nombre')
      .eq('id', modulo.solicitado_por)
      .maybeSingle()
    nombreResponsable = perfilSolicitante?.nombre || ''
  }

  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloSeleccionado.id]: modulo?.materiales || {},
  }))
  setDatosProtocoloEntrega(modulo?.protocolo_entrega || {})
  setResponsableProtocolo(
    modulo?.protocolo_entrega?.responsable || nombreResponsable
  )
  setMostrarProtocoloEntrega(true)
}

async function abrirProtocoloDesdeBusqueda(item) {
  if (!item?.id || !puedeUsarProtocolo) return

  cerrarVentanasEmergentes({ conservarModulo: true })
  setMostrarMenuModulo(false)

  if (item.origen === 'manual') {
    setModuloSeleccionado(item)
    setFormulariosElectricos((actuales) => ({
      ...actuales,
      [item.id]: item?.materiales || {},
    }))
    setDatosProtocoloEntrega({
      ...(item?.protocolo_entrega || {}),
      serie: item?.protocolo_entrega?.serie || item?.serie || '',
      tipo: item?.protocolo_entrega?.tipo || item?.tipo || '',
      proyecto: item?.protocolo_entrega?.proyecto || item?.proyecto || '',
      responsable: item?.protocolo_entrega?.responsable || item?.responsable || '',
      fecha: item?.protocolo_entrega?.fecha || fechaParaInput(item?.fecha_prueba_electrica),
    })
    setResponsableProtocolo(item?.protocolo_entrega?.responsable || item?.responsable || '')
    setProtocoloSoloLecturaBusqueda(false)
    setProtocoloDesdeHistorial(false)
    setProtocoloManualMensual(true)
    setMostrarProtocoloEntrega(true)
    return
  }

  if (item.esActual) {
    const { data: modulo, error } = await supabase
      .from('modulos')
      .select('*')
      .eq('id', item.id)
      .single()

    if (error) {
      mostrarNotificacion('No se pudo cargar el protocolo: ' + error.message)
      return
    }

    setModuloSeleccionado(modulo)
    setFormulariosElectricos((actuales) => ({
      ...actuales,
      [modulo.id]: modulo?.materiales || {},
    }))
    setDatosProtocoloEntrega(modulo?.protocolo_entrega || {})
    setResponsableProtocolo(modulo?.protocolo_entrega?.responsable || modulo?.responsable || '')
    setProtocoloSoloLecturaBusqueda(false)
    setProtocoloDesdeHistorial(false)
    setMostrarProtocoloEntrega(true)
    return
  }

  setModuloSeleccionado(item)
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [item.id]: item?.materiales || {},
  }))
  setDatosProtocoloEntrega(item?.protocolo_entrega || {})
  setResponsableProtocolo(item?.protocolo_entrega?.responsable || item?.responsable || '')
  setProtocoloSoloLecturaBusqueda(perfil?.rol !== 'admin')
  setProtocoloDesdeHistorial(true)
  setMostrarProtocoloEntrega(true)
}

async function guardarProtocoloEntrega(protocolo) {
  if (!moduloSeleccionado?.id) return

  if (protocoloManualMensual) {
    if (!puedeVerProtocolosMensuales) return

    const fechaProtocolo = protocolo.fecha || new Date().toISOString().slice(0, 10)
    const protocoloNormalizado = {
      ...protocolo,
      serie: protocolo.serie || moduloSeleccionado.serie || '',
      tipo: protocolo.tipo || moduloSeleccionado.tipo || '',
      proyecto: protocolo.proyecto || moduloSeleccionado.proyecto || '',
      linea: protocolo.linea || moduloSeleccionado.linea || '',
      responsable: protocolo.responsable || moduloSeleccionado.responsable || perfil?.nombre || '',
    }
    const payloadManual = {
      serie: protocoloNormalizado.serie,
      tipo: protocoloNormalizado.tipo,
      proyecto: protocoloNormalizado.proyecto,
      responsable: protocoloNormalizado.responsable,
      fecha_prueba_electrica: `${fechaProtocolo}T00:00:00`,
      protocolo_entrega: protocoloNormalizado,
      materiales: protocoloNormalizado.materiales || {},
    }

    const esManualExistente = moduloSeleccionado.origen === 'manual' && !String(moduloSeleccionado.id).startsWith('manual-nuevo-')
    const consulta = esManualExistente
      ? supabase.from('protocolos_manuales').update(payloadManual).eq('id', moduloSeleccionado.id).select().single()
      : supabase.from('protocolos_manuales').insert([payloadManual]).select().single()

    const { data, error } = await consulta

    if (error) {
      mostrarNotificacion('No se pudo guardar el protocolo manual: ' + error.message)
      return
    }

    const registroGuardado = data || { ...payloadManual, id: moduloSeleccionado.id, origen: 'manual' }
    setModuloSeleccionado({
      ...registroGuardado,
      origen: 'manual',
      esActual: false,
    })
    setDatosProtocoloEntrega(protocoloNormalizado)
    setFormulariosElectricos((actuales) => ({
      ...actuales,
      [registroGuardado.id]: protocoloNormalizado.materiales || {},
    }))
    setProtocoloManualMensual(true)
    await cargarProtocolosMensuales(fechaProtocolosMensuales)
    mostrarNotificacion('Protocolo manual guardado correctamente')
    return
  }

  if (protocoloDesdeHistorial && perfil?.rol !== 'admin') return
  if (!protocoloDesdeHistorial && !puedeEditarDatosProtocolo) return

  const tablaDestino = protocoloDesdeHistorial ? 'historial_modulos' : 'modulos'
  const { error } = await supabase
    .from(tablaDestino)
    .update({
      protocolo_entrega: protocolo,
      materiales: protocolo.materiales || {},
    })
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion('No se pudo guardar el protocolo: ' + error.message)
    return
  }

  setDatosProtocoloEntrega(protocolo)
  setFormulariosElectricos((actuales) => ({
    ...actuales,
    [moduloSeleccionado.id]: protocolo.materiales || {},
  }))
  setModuloSeleccionado((actual) => actual
    ? {
        ...actual,
        protocolo_entrega: protocolo,
        materiales: protocolo.materiales || {},
      }
    : actual
  )
  if (protocoloDesdeHistorial) {
    setResultadoBusqueda((actuales) => actuales.map((item) => (
      item.id === moduloSeleccionado.id && !item.esActual
        ? { ...item, protocolo_entrega: protocolo, materiales: protocolo.materiales || {} }
        : item
    )))
    await cargarHistorial()
  }
  mostrarNotificacion('Protocolo guardado correctamente')
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

  if (normalizarTexto(modulo.estado) === 'sin instalacion') {
    const { error: errorDeleteSinInstalacion } = await supabase
      .from('modulos')
      .delete()
      .eq('id', modulo.id)

    if (errorDeleteSinInstalacion) {
      mostrarNotificacion(errorDeleteSinInstalacion.message)
      return
    }

    setFormulariosElectricos((actuales) => {
      const copia = { ...actuales }
      delete copia[modulo.id]
      return copia
    })

    await cargarTablero()
    limpiarEstadosModal()
    mostrarNotificacion('Módulo sin instalacion retirado sin registro')
    return
  }

  const historialPayload = {
    modulo_id: modulo.id,
    serie: modulo.serie,
    tipo: modulo.tipo,
    proyecto: modulo.proyecto,
    responsable: modulo.responsable,
    fecha_ingreso: modulo.fecha_ingreso,
    fecha_prueba_electrica: modulo.fecha_prueba_electrica,
    protocolo_entrega: modulo.protocolo_entrega || {},
    nota: modulo.nota || '',
    observacion_alerta: modulo.observacion_alerta || '',
    fecha_salida: new Date().toISOString(),
    estado: modulo.estado,
    linea: modulo.linea,
    posicion: modulo.posicion,
  }

  let { error: errorHistorial } = await supabase
    .from('historial_modulos')
    .insert([historialPayload])

  if (errorHistorial?.message?.includes("'nota' column")) {
    const payloadSinNota = { ...historialPayload }
    delete payloadSinNota.nota
    ;({ error: errorHistorial } = await supabase
      .from('historial_modulos')
      .insert([payloadSinNota]))
  }

  if (errorHistorial?.message?.includes('historial_ciclo_unico')) {
    let { error: errorUpdateHistorial } = await supabase
      .from('historial_modulos')
      .update(historialPayload)
      .eq('modulo_id', modulo.id)

    if (errorUpdateHistorial?.message?.includes("'nota' column")) {
      const payloadSinNota = { ...historialPayload }
      delete payloadSinNota.nota
      ;({ error: errorUpdateHistorial } = await supabase
        .from('historial_modulos')
        .update(payloadSinNota)
        .eq('modulo_id', modulo.id))
    }

    errorHistorial = errorUpdateHistorial
  }

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

async function eliminarModuloSinRegistro() {
  if (perfil?.rol !== 'admin' || !moduloSeleccionado?.id) return

  const confirmado = window.confirm(
    `¿Eliminar el módulo ${moduloSeleccionado.serie || ''} sin dejar registro? Esta acción no se puede deshacer.`
  )

  if (!confirmado) return

  const { error } = await supabase
    .from('modulos')
    .delete()
    .eq('id', moduloSeleccionado.id)

  if (error) {
    mostrarNotificacion('No se pudo eliminar el módulo: ' + error.message)
    return
  }

  setFormulariosElectricos((actuales) => {
    const copia = { ...actuales }
    delete copia[moduloSeleccionado.id]
    return copia
  })
  await cargarTablero()
  limpiarEstadosModal()
  mostrarNotificacion('Módulo eliminado sin dejar registro')
}

async function moverModulo(moduloId, lineaDestino, posicionDestino) {
  if (!puedeAgregarModulos) {
    mostrarNotificacion('No tienes permisos para mover módulos')
    return
  }

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

  const moduloDestino = modulosActivos.find(
    (x) =>
      Number(x.linea) === lineaDestinoParsed &&
      Number(x.posicion) === posicionDestinoParsed &&
      String(x.id) !== String(moduloId)
  )

  try {
    const posicionTemporal = 1000 + Math.floor(Math.random() * 100000)
    const moverRegistro = async (id, linea, posicion) => {
      const { error } = await supabase
        .from('modulos')
        .update({ linea, posicion })
        .eq('id', id)

      if (error) {
        throw new Error(error.message)
      }
    }

    if (moduloDestino && lineaOrigen === lineaDestinoParsed) {
      const modulosLinea = modulosActivos.filter(
        (x) => Number(x.linea) === lineaOrigen && String(x.id) !== String(moduloId)
      )
      let movimientos = []

      if (posicionOrigen > posicionDestinoParsed) {
        movimientos = modulosLinea
          .filter((x) => Number(x.posicion) >= posicionDestinoParsed && Number(x.posicion) < posicionOrigen)
          .map((x) => ({ id: x.id, linea: lineaOrigen, posicion: Number(x.posicion) + 1, posicionActual: Number(x.posicion) }))
          .sort((a, b) => b.posicionActual - a.posicionActual)
      } else {
        movimientos = modulosLinea
          .filter((x) => Number(x.posicion) <= posicionDestinoParsed && Number(x.posicion) > posicionOrigen)
          .map((x) => ({ id: x.id, linea: lineaOrigen, posicion: Number(x.posicion) - 1, posicionActual: Number(x.posicion) }))
          .sort((a, b) => a.posicionActual - b.posicionActual)
      }

      await moverRegistro(moduloActual.id, lineaOrigen, posicionTemporal)

      for (const movimiento of movimientos) {
        await moverRegistro(movimiento.id, movimiento.linea, movimiento.posicion)
      }

      await moverRegistro(moduloActual.id, lineaDestinoParsed, posicionDestinoParsed)
      await cargarTablero()
      mostrarNotificacion('Módulo insertado correctamente')
      return
    }

    await moverRegistro(moduloActual.id, lineaOrigen, posicionTemporal)

    if (moduloDestino) {
      await moverRegistro(moduloDestino.id, lineaOrigen, posicionOrigen)
    }

    await moverRegistro(moduloActual.id, lineaDestinoParsed, posicionDestinoParsed)

    await cargarTablero()
    mostrarNotificacion(moduloDestino ? 'Módulos intercambiados correctamente' : 'Módulo movido correctamente')
  } catch (err) {
    console.error(err)
    mostrarNotificacion('Error: ' + (err?.message || 'Error desconocido'))
    await cargarTablero()
  }
}

  function colorEstado(estado, modulo = {}) {
    switch (normalizarTexto(estado)) {
      case 'sin iniciar':
        return '#808080'

      case 'canalizado':
        return '#d32f2f'

      case 'cableado':
        return '#fbc02d'

      case 'terminaciones':
        return '#1976d2'

      case 'prueba electrica':
      case 'sin instalacion':
        return '#388e3c'

      case 'en garantia':
        return estaDentroDeGarantia(modulo.fecha_prueba_electrica) ? '#388e3c' : '#d32f2f'

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

const esFechaDeHoy = (valor) => {
  if (!valor) return false
  const fecha = new Date(valor)
  const hoyLocal = new Date()

  return (
    fecha.getFullYear() === hoyLocal.getFullYear() &&
    fecha.getMonth() === hoyLocal.getMonth() &&
    fecha.getDate() === hoyLocal.getDate()
  )
}

const pruebasElectricasHoy = [...modulosActivos, ...historial].filter(
  (modulo) => esFechaDeHoy(modulo.fecha_prueba_electrica)
).length

const hoy = new Date().toISOString().slice(0, 10)

const terminadosHoy = historial.filter(
  (x) =>
    x.fecha_salida &&
    x.fecha_salida.slice(0, 10) === hoy
).length

const mesActual = new Date().getMonth()
const anioActual = new Date().getFullYear()

const pruebasElectricasMes = [...modulosActivos, ...historial].filter((modulo) => {
  if (!modulo.fecha_prueba_electrica) return false
  const fecha = new Date(modulo.fecha_prueba_electrica)

  return (
    !Number.isNaN(fecha.getTime()) &&
    fecha.getMonth() === mesActual &&
    fecha.getFullYear() === anioActual
  )
}).length

const ultimosFinalizados = [...historial]
  .filter((item) => item.serie)
  .sort((a, b) => new Date(b.fecha_salida || 0) - new Date(a.fecha_salida || 0))
  .slice(0, 5)

  

  return (
    <>
      <div
        onClick={cerrarPanelesFlotantes}
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
              onClick={(e) => {
                e.stopPropagation()
                const abrir = !mostrarLlamadosPendientes
                cerrarVentanasEmergentes()
                setMostrarLlamadosPendientes(abrir)
              }}
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
                onClick={(e) => e.stopPropagation()}
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

        {puedeVerMenuAcciones && (
          <>
            <button
              aria-label="Abrir menú de acciones"
              onClick={(e) => {
                e.stopPropagation()
                const abrir = !mostrarMenuAcciones
                cerrarVentanasEmergentes()
                setMostrarMenuAcciones(abrir)
              }}
              style={{
                position: 'fixed',
                left: '12px',
                top: '12px',
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: '2px solid white',
                background: '#424242',
                color: 'white',
                fontSize: '24px',
                zIndex: 2500,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
              }}
            >
              ...
            </button>

            {mostrarMenuAcciones && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  left: '12px',
                  top: '72px',
                  width: '220px',
                  padding: '10px',
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
                {puedeAgregarModulos && (
                  <button
                    type="button"
                    onClick={abrirReintegrarModulo}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #555',
                      background: '#1565c0',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Reintegrar
                  </button>
                )}
                {puedeDescargarProtocolosDiarios && (
                  <button
                    type="button"
                    onClick={descargarProtocolosDiarios}
                    style={{
                      width: '100%',
                      marginTop: puedeAgregarModulos ? '8px' : 0,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #555',
                      background: '#2e7d32',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Descargar protocolos diarios
                  </button>
                )}
                {puedeVerPreciosMateriales && (
                  <button
                    type="button"
                    onClick={abrirPreciosMateriales}
                    style={{
                      width: '100%',
                      marginTop: (puedeAgregarModulos || puedeDescargarProtocolosDiarios) ? '8px' : 0,
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid #555',
                      background: '#6a1b9a',
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 700,
                    }}
                  >
                    Precios materiales
                  </button>
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
  {puedeVerProtocolosMensuales && (
    <button
      onClick={abrirProtocolosMensuales}
      style={{
        padding: '10px 20px',
        borderRadius: '8px',
        cursor: 'pointer',
        background: '#455a64',
        color: 'white',
        border: '1px solid #78909c',
      }}
    >
      Protocolos mensuales
    </button>
  )}
</div>

{mostrarKPI && (
  <div
    className="indicadores-grid"
    style={{
      marginBottom: '30px',
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
      <h3 style={{ color: '#111' }}>En proceso</h3>
      <h2 style={{ color: '#111' }}>{ocupacion}</h2>
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
      <h3>Prueba eléctrica OK</h3>
      <h2>{pruebas}/{ocupacion}</h2>
    </div>

    <div
      style={{
        background: '#00695c',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3 style={{ color: 'white' }}>Pruebas eléctricas hoy</h3>
      <h2 style={{ color: 'white' }}>{pruebasElectricasHoy}</h2>
    </div>

    <div
      style={{
        background: '#4caf50',
        padding: '15px',
        borderRadius: '10px',
        minWidth: '120px',
      }}
    >
      <h3>Retirados hoy</h3>
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
      <h3>Pruebas eléctricas este mes</h3>
      <h2>{pruebasElectricasMes}</h2>
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ flex: '1 1 260px', textAlign: 'center' }}>
        <div style={{ color: item.esActual ? '#81c784' : '#ffcc80', fontWeight: 800, marginBottom: '4px' }}>
          {item.esActual ? 'Registro actual' : 'Registro histórico'}
        </div>

        <div>
          <strong>Serie:</strong> {item.serie}
        </div>

        <div>
          <strong>Fecha prueba:</strong>{' '}
          {item.fecha_prueba_electrica
            ? formatearFecha(item.fecha_prueba_electrica)
            : 'Sin registro'}
        </div>

        {item.esActual && (
          <div style={{ marginTop: '4px', color: '#81c784', fontWeight: 700 }}>
            (Actualmente en línea {item.linea})
          </div>
        )}

        {!item.esActual && item.fecha_salida && (
          <div>
            <strong>Fecha salida:</strong> {formatearFecha(item.fecha_salida)}
          </div>
        )}

        <div>
          <strong>Proyecto:</strong> {item.proyecto}
        </div>

        <div>
          <strong>Responsable:</strong> {item.responsable}
        </div>
      </div>

      {puedeUsarProtocolo && (
        <button
          type="button"
          onClick={() => abrirProtocoloDesdeBusqueda(item)}
          style={{
            flex: '0 0 118px',
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#333',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
            lineHeight: 1.2,
          }}
        >
          <span style={{ display: 'block' }}>Ver protocolo</span>
          <span style={{ display: 'block', fontSize: '24px', marginTop: '4px' }}>📜</span>
        </button>
      )}
    </div>
  ))}
</div>

</div>

{mostrarVistaGeneral ? (
  <div onClick={cerrarPanelesYModulo} style={{ marginBottom: '20px', fontSize: '13px', lineHeight: 1.2 }}>
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
          onDragOver={(e) => {
            if (!moduloEnDrag) return
            e.preventDefault()
            autoScrollLineaDuranteArrastre(e.currentTarget, e.clientX)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              detenerAutoScrollArrastre()
            }
          }}
          style={{
            display: 'flex',
            gap: '2px',
            overflowX: 'auto',
            paddingBottom: '2px',
          }}
        >
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'inicio')
              }}
              style={{
                flex: '0 0 34px',
                minHeight: '60px',
                borderRadius: '5px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle acopio"
            >
              +
            </button>
          )}
          {datos
            .filter((x) => x.linea === linea)
            .filter((x) => x.serie)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                className={esSolicitudPruebaActiva(pos.solicitud_prueba) ? 'modulo-prueba-pendiente' : undefined}
                draggable={puedeAgregarModulos && pos.serie ? true : false}
                onDragStart={() => puedeAgregarModulos && pos.serie && setModuloEnDrag(pos)}
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
                  detenerAutoScrollArrastre()
                  const idValido = typeof moduloEnDrag?.id === 'string' && moduloEnDrag.id !== 'null' && moduloEnDrag.id.trim() !== ''
                  const esMismo = moduloEnDrag?.id === pos.id
                  if (idValido && !esMismo) {
                    moverModulo(moduloEnDrag.id, linea, pos.posicion)
                  }
                  setModuloEnDrag(null)
                }}
                onDragEnd={() => {
                  detenerAutoScrollArrastre()
                  setModuloEnDrag(null)
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  cerrarVentanasEmergentes()
                  console.log('CLICK POSICION', pos)

                  if (pos.serie) {
                    setNombreSolicitante('')
                    setRolSolicitante('')
                    setModuloSeleccionado(pos)
                    setSerieEditada(pos.serie)
                    setTipoEditado(pos.tipo)
                    setProyectoEditado(pos.proyecto)
                    setResponsableEditado(pos.responsable || '')
                    setEstadoEditado(pos.estado)
                    setLineaEditada(pos.linea)
                    setPosicionEditada(pos.posicion)
                    setFechaPruebaEditada(fechaParaInput(pos.fecha_prueba_electrica))
                    setNotaEditada(pos.nota || '')

                    if (['electrico', 'visor', 'analista', 'operador', 'admin'].includes(perfil?.rol)) {
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
                  cursor: puedeAgregarModulos && pos.serie ? 'grab' : 'pointer',
                  backgroundColor: pos.estado
                    ? colorEstado(pos.estado, pos)
                    : '#222',
                  color: 'white',
                  boxSizing: 'border-box',
                  flex: '0 0 70px',
                  fontSize: '9px',
                  transition: 'opacity 0.2s',
                }}
              >
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

                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        {pos.observacion_alerta && (
                          <span
                            title="Ver observación"
                            onClick={(e) => {
                              e.stopPropagation()
                              mostrarObservacionAlerta(pos)
                            }}
                            style={{
                              fontSize: '18px',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            🚨
                          </span>
                        )}

                        {pos.nota && (
                          <span
                            title="Este módulo tiene una nota"
                            style={{
                              fontSize: '18px',
                              lineHeight: 1,
                            }}
                          >
                            💬
                          </span>
                        )}
                      </span>
                    </div>
                    <div>{pos.tipo}</div>
                  </>
                ) : (
                  <div>Vacío</div>
                )}
              </div>
            ))}
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'fin')
              }}
              style={{
                flex: '0 0 34px',
                minHeight: '60px',
                borderRadius: '5px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle agua"
            >
              +
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
) : (
  <div onClick={cerrarPanelesYModulo}>
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
          onDragOver={(e) => {
            if (!moduloEnDrag) return
            e.preventDefault()
            autoScrollLineaDuranteArrastre(e.currentTarget, e.clientX)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              detenerAutoScrollArrastre()
            }
          }}
          style={{
            display: 'flex',
            gap: '10px',
            overflowX: 'auto',
            paddingBottom: '6px',
          }}
        >
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'inicio')
              }}
              style={{
                flex: '0 0 54px',
                minHeight: '120px',
                borderRadius: '8px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '30px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle acopio"
            >
              +
            </button>
          )}
          {datos
            .filter((x) => x.linea === linea)
            .filter((x) => x.serie)
            .map((pos) => (
              <div
                key={`${pos.linea}-${pos.posicion}`}
                className={esSolicitudPruebaActiva(pos.solicitud_prueba) ? 'modulo-prueba-pendiente' : undefined}
                draggable={puedeAgregarModulos && pos.serie ? true : false}
                onDragStart={() => puedeAgregarModulos && pos.serie && setModuloEnDrag(pos)}
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
                  detenerAutoScrollArrastre()
                  const idValido = typeof moduloEnDrag?.id === 'string' && moduloEnDrag.id !== 'null' && moduloEnDrag.id.trim() !== ''
                  const esMismo = moduloEnDrag?.id === pos.id
                  if (idValido && !esMismo) {
                    moverModulo(moduloEnDrag.id, linea, pos.posicion)
                  }
                  setModuloEnDrag(null)
                }}
                onDragEnd={() => {
                  detenerAutoScrollArrastre()
                  setModuloEnDrag(null)
                }}

                onClick={(e) => {
  e.stopPropagation()
  cerrarVentanasEmergentes()
  console.log('CLICK POSICION', pos)

  if (pos.serie) {

    setNombreSolicitante('')
    setRolSolicitante('')

    setModuloSeleccionado(pos)

    setSerieEditada(pos.serie)
    setTipoEditado(pos.tipo)
    setProyectoEditado(pos.proyecto)
    setResponsableEditado(pos.responsable || '')
    setEstadoEditado(pos.estado)
    setLineaEditada(pos.linea)
    setPosicionEditada(pos.posicion)
    setFechaPruebaEditada(fechaParaInput(pos.fecha_prueba_electrica))
    setNotaEditada(pos.nota || '')

    if (['electrico', 'visor', 'analista', 'operador', 'admin'].includes(perfil?.rol)) {
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
                  cursor: puedeAgregarModulos && pos.serie ? 'grab' : 'pointer',
                  backgroundColor: pos.estado
                    ? colorEstado(pos.estado, pos)
                    : '#222',
                  color: 'white',
                  boxSizing: 'border-box',
                  flex: '0 0 150px',
                  transition: 'opacity 0.2s',
                }}
              >
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

                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1px' }}>
                        {pos.observacion_alerta && (
                          <span
                            title="Ver observación"
                            onClick={(e) => {
                              e.stopPropagation()
                              mostrarObservacionAlerta(pos)
                            }}
                            style={{
                              fontSize: '18px',
                              cursor: 'pointer',
                              lineHeight: 1,
                            }}
                          >
                            🚨
                          </span>
                        )}

                        {pos.nota && (
                          <span
                            title="Este módulo tiene una nota"
                            style={{
                              fontSize: '18px',
                              lineHeight: 1,
                            }}
                          >
                            💬
                          </span>
                        )}
                      </span>
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
          {puedeAgregarModulos && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                abrirIngresoModuloEnExtremo(linea, 'fin')
              }}
              style={{
                flex: '0 0 54px',
                minHeight: '120px',
                borderRadius: '8px',
                border: '1px dashed #90caf9',
                background: '#0d47a1',
                color: 'white',
                fontSize: '30px',
                fontWeight: 800,
                cursor: 'pointer',
              }}
              title="Ingresar módulo por calle agua"
            >
              +
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
)}
      

      {esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba) && puedeResolverPrueba && (
        <div
          onClick={cerrarPanelesFlotantes}
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
              Resumen materiales
            </button>
          )}

          {puedeUsarProtocolo && (
            <button
              onClick={abrirProtocoloEntrega}
              style={{ width: '100%', marginBottom: '10px', padding: '12px' }}
            >
              Protocolo de entrega
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
    <div style={{ marginBottom: '16px' }}>
      <h2 style={{ margin: '0 0 12px' }}>Módulo</h2>
      {puedeVerMenuModulo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative', flex: '0 0 auto' }}>
            <button
              type="button"
              aria-label="Opciones del módulo"
              onClick={(e) => {
                e.stopPropagation()
                setMostrarMenuModulo((actual) => !actual)
              }}
              style={{
                width: '44px',
                height: '44px',
                background: 'transparent',
                color: 'white',
                padding: '4px',
                border: 'none',
                cursor: 'pointer',
                lineHeight: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Opciones del módulo"
            >
              <svg
                viewBox="0 0 64 64"
                width="34"
                height="34"
                aria-hidden="true"
                focusable="false"
              >
                <line x1="16" y1="8" x2="16" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <circle cx="16" cy="42" r="9" fill="currentColor" />
                <line x1="32" y1="8" x2="32" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <circle cx="32" cy="20" r="9" fill="currentColor" />
                <line x1="48" y1="8" x2="48" y2="56" stroke="currentColor" strokeWidth="7" strokeLinecap="round" />
                <circle cx="48" cy="34" r="9" fill="currentColor" />
              </svg>
            </button>

            {mostrarMenuModulo && (
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 'calc(100% + 6px)',
                  width: '170px',
                  background: '#111',
                  border: '1px solid #555',
                  borderRadius: '8px',
                  padding: '6px',
                  boxShadow: '0 8px 18px rgba(0,0,0,0.35)',
                  zIndex: 1200,
                  boxSizing: 'border-box',
                }}
              >
                {perfil?.rol === 'admin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMostrarMenuModulo(false)
                      eliminarModuloSinRegistro()
                    }}
                    style={{
                      width: '100%',
                      background: '#5d4037',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                      marginBottom: '6px',
                    }}
                  >
                    Eliminar módulo
                  </button>
                )}

                <button
                  type="button"
                  onClick={abrirEditorMateriales}
                  style={{
                    width: '100%',
                    background: '#455a64',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                    marginBottom: '6px',
                  }}
                >
                  Materiales 📝
                </button>

                <button
                  type="button"
                  disabled={
                    esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
                    esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
                  }
                  onClick={() => {
                    setMostrarMenuModulo(false)
                    solicitarPruebaElectrica()
                  }}
                  style={{
                    width: '100%',
                    background: '#1976d2',
                    color: 'white',
                    padding: '10px',
                    border: 'none',
                    borderRadius: '6px',
                    cursor:
                      esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
                      esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
                        ? 'not-allowed'
                        : 'pointer',
                    textAlign: 'left',
                    fontWeight: 700,
                    opacity:
                      esEstadoPruebaElectrica(moduloSeleccionado?.estado) ||
                      esSolicitudPruebaActiva(moduloSeleccionado?.solicitud_prueba)
                        ? 0.65
                        : 1,
                    marginBottom: puedeDejarObservacionAlerta ? '6px' : 0,
                  }}
                >
                  Llamar a prueba eléctrica ⚡
                </button>

                {puedeDejarObservacionAlerta && (
                  <button
                    type="button"
                    onClick={dejarObservacionAlerta}
                    style={{
                      width: '100%',
                      background: '#b71c1c',
                      color: 'white',
                      padding: '10px',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontWeight: 700,
                    }}
                  >
                    Dejar observación 🚨
                  </button>
                )}
              </div>
            )}
          </div>

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
                flex: '0 0 180px',
                maxWidth: '55%',
              }}
            >
              Finalizar módulo
            </button>
          )}
        </div>
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
          onChange={actualizarMaterialFormulario}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <strong style={{ whiteSpace: 'nowrap' }}>Línea</strong>

          <select
            value={lineaEditada}
            onChange={(e) => setLineaEditada(Number(e.target.value))}
            disabled={esRolSoloLectura}
            style={{
              width: '64px',
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            {[1,2,3,4,5,6,7,8,9].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <strong style={{ whiteSpace: 'nowrap' }}>Estado</strong>

          <select
            value={estadoEditado}
            onChange={(e) => setEstadoEditado(e.target.value)}
            disabled={esRolSoloLectura}
            style={{
              width: '170px',
              maxWidth: 'calc(100% - 62px)',
              padding: '8px',
              boxSizing: 'border-box',
            }}
          >
            <option value="Sin iniciar">Sin iniciar</option>
            <option value="Canalizado">Canalizado</option>
            <option value="Cableado">Cableado</option>
            <option value="Terminaciones">Terminaciones</option>
            <option value="Prueba eléctrica">Prueba eléctrica</option>
            {(esTipoBodega(tipoEditado) || estadoEditado === 'Sin instalación') && (
              <option value="Sin instalación">Sin instalación</option>
            )}
            <option value="En garantía">En garantía</option>
          </select>
        </div>

        {estadoEditado === 'En garantía' && (
          <div style={{ gridColumn: '1 / -1', marginBottom: '10px', textAlign: 'left' }}>
            <strong>Fecha prueba eléctrica</strong>
            <input
              type="date"
              value={fechaPruebaEditada}
              onChange={(e) => setFechaPruebaEditada(e.target.value)}
              disabled={esRolSoloLectura}
              style={{
                width: '190px',
                maxWidth: '100%',
                padding: '8px',
                marginLeft: '8px',
                boxSizing: 'border-box',
              }}
            />
            {fechaPruebaEditada && !estaDentroDeGarantia(fechaPruebaEditada) && (
              <div style={{ color: '#ff8a80', fontWeight: 800, marginTop: '6px' }}>
                Fuera de garantía
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
          <strong>Responsable</strong>
          <input
            value={responsableEditado}
            onChange={(e) => setResponsableEditado(e.target.value)}
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

    {perfil?.rol !== 'electrico' && !['admin', 'operador'].includes(perfil?.rol) && (
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
            {(esTipoBodega(tipoEditado) || estadoEditado === 'Sin instalación') && (
              <option value="Sin instalación">Sin instalación</option>
            )}
            <option value="En garantía">En garantía</option>
          </select>
        </div>

        {estadoEditado === 'En garantía' && (
          <div style={{ marginBottom: '10px', gridColumn: '1 / -1' }}>
            <strong>Fecha prueba eléctrica</strong>
            <input
              type="date"
              value={fechaPruebaEditada}
              onChange={(e) => setFechaPruebaEditada(e.target.value)}
              disabled={esRolSoloLectura}
              style={{
                width: '100%',
                padding: '8px',
                marginTop: '5px',
              }}
            />
            {fechaPruebaEditada && !estaDentroDeGarantia(fechaPruebaEditada) && (
              <div style={{ color: '#ff8a80', fontWeight: 800, marginTop: '6px' }}>
                Fuera de garantía
              </div>
            )}
          </div>
        )}

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
      {['visor', 'analista', 'operador', 'admin'].includes(perfil?.rol) && (
        <button
          onClick={abrirResumenMateriales}
          style={{ padding: '10px', flex: 1 }}
        >
          Resumen materiales
        </button>
      )}
      {puedeUsarProtocolo && (
        <button
          onClick={abrirProtocoloEntrega}
          style={{ padding: '10px', flex: 1 }}
        >
          Protocolo
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
    onClick={cerrarPanelesFlotantes}
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

{mostrarEditorMateriales && moduloSeleccionado && puedeVerMenuModulo && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '460px',
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
    <h2 style={{ marginTop: 0 }}>Materiales 📝 — {moduloSeleccionado.serie}</h2>

    {cargandoMateriales ? (
      <p>Cargando...</p>
    ) : (
      <FormularioElectrico
        valores={formulariosElectricos[moduloSeleccionado?.id] || {}}
        onChange={actualizarMaterialFormulario}
      />
    )}

    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
      <button
        type="button"
        onClick={guardarMaterialesModulo}
        disabled={cargandoMateriales}
        style={{
          flex: 1,
          padding: '12px',
          background: '#2e7d32',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: cargandoMateriales ? 'not-allowed' : 'pointer',
        }}
      >
        Guardar materiales
      </button>

      <button
        type="button"
        onClick={() => setMostrarEditorMateriales(false)}
        style={{
          flex: 1,
          padding: '12px',
        }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarProtocolosMensuales && puedeVerProtocolosMensuales && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 24px)',
      maxWidth: '1180px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1300,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
      <h2 style={{ margin: 0 }}>Protocolos mensuales</h2>
      <div style={{ display: 'grid', gap: '8px', minWidth: '150px' }}>
        <button
          type="button"
          onClick={() => setMostrarProtocolosMensuales(false)}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #777',
            background: '#555',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Cerrar
        </button>
        <button
          type="button"
          onClick={abrirIngresoManualProtocolo}
          style={{
            padding: '9px 14px',
            borderRadius: '8px',
            border: '1px solid #66bb6a',
            background: '#1b5e20',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          Ingreso manual
        </button>
      </div>
    </div>

    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        borderRadius: '10px',
        background: '#1b5e20',
        border: '1px solid #66bb6a',
        color: 'white',
        fontWeight: 800,
        fontSize: '18px',
      }}
    >
      <span>💰 ingresos</span>
      <span>{formatearPrecioMaterial(ingresosProtocolosMensuales)}</span>
    </div>

    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
      <label style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <select
          value={rangoProtocolosMensuales}
          onChange={(e) => {
            const nuevoRango = e.target.value
            setRangoProtocolosMensuales(nuevoRango)
            setFechaProtocolosMensuales(obtenerValorInicialRangoProtocolo(nuevoRango))
          }}
          style={{ padding: '8px', fontWeight: 700 }}
          title="Cambiar rango"
        >
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mes</option>
        </select>
        <input
          type={rangoProtocolosMensuales === 'dia' ? 'date' : rangoProtocolosMensuales === 'semana' ? 'week' : 'month'}
          value={fechaProtocolosMensuales}
          onChange={(e) => setFechaProtocolosMensuales(e.target.value)}
          style={{ padding: '8px' }}
        />
      </label>
      <button
        type="button"
        onClick={() => cargarProtocolosMensuales(fechaProtocolosMensuales, rangoProtocolosMensuales)}
        disabled={cargandoProtocolosMensuales}
        style={{
          padding: '9px 14px',
          borderRadius: '8px',
          border: '1px solid #777',
          background: '#1565c0',
          color: 'white',
          cursor: cargandoProtocolosMensuales ? 'not-allowed' : 'pointer',
          fontWeight: 700,
        }}
      >
        {cargandoProtocolosMensuales ? 'Cargando...' : 'Actualizar'}
      </button>
    </div>

    {protocolosMensuales.length === 0 && !cargandoProtocolosMensuales ? (
      <p style={{ color: '#ccc' }}>No hay protocolos con fecha de prueba electrica en el rango seleccionado.</p>
    ) : (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '980px' }}>
          <thead>
            <tr style={{ background: '#333' }}>
              {encabezadosProtocolosMensuales.map((encabezado) => (
                <th key={encabezado.clave} style={{ padding: '8px 10px', border: '1px solid #555', textAlign: encabezado.align || 'left', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                  {encabezado.lineas.map((linea) => (
                    <span key={linea} style={{ display: 'block' }}>{linea}</span>
                  ))}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {protocolosMensuales.map((registro) => {
              const claveRegistro = `${registro.origen}-${registro.id}`
              return (
                <tr key={claveRegistro}>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => abrirProtocoloDesdeBusqueda(registro)}
                      title="Ver protocolo"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '24px',
                      }}
                    >
                      📜
                    </button>
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444', fontWeight: 700 }}>{registro.serie}</td>
                  <td style={{ padding: '8px', border: '1px solid #444' }}>
                    {registro.fecha_prueba_electrica ? formatearFecha(registro.fecha_prueba_electrica) : '-'}
                  </td>
                  <td style={{ padding: '8px', border: '1px solid #444' }}>{registro.tipo || '-'}</td>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>{formatearPrecioMaterial(registro.valorMantencion)}</td>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right' }}>{formatearPrecioMaterial(registro.valorModificacion)}</td>
                  <td style={{ padding: '8px', border: '1px solid #444', textAlign: 'right', fontWeight: 800 }}>{formatearPrecioMaterial(registro.valorTotal)}</td>
                  <td style={{ padding: '8px', border: '1px solid #444' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        type="text"
                        value={registro.idOt}
                        disabled={idOtEnEdicion !== claveRegistro}
                        onChange={(e) => setProtocolosMensuales((actuales) => actuales.map((item) => (
                          item.id === registro.id && item.origen === registro.origen
                            ? { ...item, idOt: e.target.value }
                            : item
                        )))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') guardarIdOtProtocoloMensual(registro, e.currentTarget.value)
                        }}
                        style={{
                          width: '120px',
                          padding: '7px',
                          background: idOtEnEdicion === claveRegistro ? 'white' : '#ddd',
                          color: '#111',
                          border: '1px solid #777',
                          borderRadius: '6px',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (idOtEnEdicion === claveRegistro) {
                            guardarIdOtProtocoloMensual(registro, registro.idOt)
                          } else {
                            setIdOtEnEdicion(claveRegistro)
                          }
                        }}
                        title={idOtEnEdicion === claveRegistro ? 'Guardar ID OT' : 'Editar ID OT'}
                        style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '8px',
                          border: '1px solid #777',
                          background: idOtEnEdicion === claveRegistro ? '#2e7d32' : '#333',
                          color: 'white',
                          cursor: 'pointer',
                        }}
                      >
                        {idOtEnEdicion === claveRegistro ? '✓' : '✏️'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}

  </div>
)}

{mostrarPreciosMateriales && puedeVerPreciosMateriales && (
  <div
    onClick={cerrarPanelesFlotantes}
    style={{
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: 'calc(100vw - 32px)',
      maxWidth: '520px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      padding: '20px',
      background: '#222',
      border: '1px solid white',
      borderRadius: '10px',
      zIndex: 1300,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Precios materiales</h2>
    <p style={{ marginTop: 0, color: '#ccc' }}>
      {puedeEditarPreciosMateriales
        ? 'Estos precios quedan como catálogo global para cálculos futuros.'
        : 'Consulta de precios de materiales.'}
    </p>

    {cargandoPreciosMateriales ? (
      <p>Cargando precios...</p>
    ) : (
      <div style={{ display: 'grid', gap: '8px' }}>
        {seccionesCatalogoPrecios.map((seccion, index) => (
          <details
            key={seccion}
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
              {seccion}
            </summary>

            <div style={{ padding: '8px 10px' }}>
              {catalogoPreciosProtocolo
                .filter((item) => item.seccion === seccion)
                .map((item) => (
                <div
                  key={item.material}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: puedeEditarPreciosMateriales
                      ? '72px minmax(0, 1fr) 120px 42px'
                      : '72px minmax(0, 1fr) 120px',
                    gap: '10px',
                    alignItems: 'center',
                    padding: '7px 0',
                    borderBottom: '1px solid #444',
                  }}
                >
                  <strong style={{ color: '#bbb', fontSize: '13px' }}>
                    {item.idArt}
                  </strong>
                  <span style={{ lineHeight: 1.2 }}>{item.material}</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formatearPrecioMaterial(preciosMateriales[item.material])}
                    onChange={(e) => actualizarPrecioMaterial(item.material, e.target.value)}
                    disabled={!puedeEditarPreciosMateriales || precioMaterialEnEdicion !== item.material}
                    placeholder="$ 0"
                    style={{
                      width: '100%',
                      padding: '8px',
                      boxSizing: 'border-box',
                      textAlign: 'right',
                      opacity: puedeEditarPreciosMateriales ? 1 : 0.8,
                      background: precioMaterialEnEdicion === item.material ? 'white' : '#ddd',
                      color: '#111',
                    }}
                  />
                  {puedeEditarPreciosMateriales && (
                    <button
                      type="button"
                      onClick={() => setPrecioMaterialEnEdicion((actual) => (
                        actual === item.material ? null : item.material
                      ))}
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '8px',
                        border: '1px solid #777',
                        background: precioMaterialEnEdicion === item.material ? '#fbc02d' : '#333',
                        color: precioMaterialEnEdicion === item.material ? '#111' : 'white',
                        cursor: 'pointer',
                        fontSize: '18px',
                      }}
                      title="Editar precio"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
    )}

    <div style={{ display: 'flex', gap: '10px', marginTop: '18px' }}>
      {puedeEditarPreciosMateriales && (
        <button
          type="button"
          onClick={guardarPreciosMateriales}
          disabled={cargandoPreciosMateriales || guardandoPreciosMateriales}
          style={{
            flex: 1,
            padding: '12px',
            background: '#2e7d32',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: cargandoPreciosMateriales || guardandoPreciosMateriales ? 'not-allowed' : 'pointer',
          }}
        >
          {guardandoPreciosMateriales ? 'Guardando...' : 'Guardar precios'}
        </button>
      )}

      <button
        type="button"
        onClick={() => setMostrarPreciosMateriales(false)}
        style={{ flex: 1, padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarProtocoloEntrega && moduloSeleccionado && (
  <ProtocoloEntrega
    key={moduloSeleccionado.id}
    modulo={moduloSeleccionado}
    responsable={responsableProtocolo}
    datosIniciales={datosProtocoloEntrega}
    materiales={formulariosElectricos[moduloSeleccionado.id] || {}}
    onGuardar={guardarProtocoloEntrega}
    soloLectura={protocoloManualMensual ? false : protocoloSoloLecturaBusqueda || (protocoloDesdeHistorial ? perfil?.rol !== 'admin' : !puedeEditarDatosProtocolo)}
    materialesSoloLectura={protocoloManualMensual ? false : protocoloSoloLecturaBusqueda || (protocoloDesdeHistorial ? perfil?.rol !== 'admin' : !puedeEditarProtocolo)}
    moduloEditable={protocoloManualMensual}
    onCerrar={() => {
      setMostrarProtocoloEntrega(false)
      setProtocoloSoloLecturaBusqueda(false)
      setProtocoloDesdeHistorial(false)
      setProtocoloManualMensual(false)
    }}
  />
)}

{mostrarReintegrar && puedeAgregarModulos && (
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
      maxWidth: '430px',
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      boxSizing: 'border-box',
      zIndex: 3200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Reintegrar módulo</h2>
    <p style={{ color: '#ccc', marginTop: 0 }}>
      Selecciona uno de los últimos finalizados o ingresa una serie.
    </p>

    <div style={{ display: 'grid', gap: '8px', marginBottom: '14px' }}>
      {ultimosFinalizados.length === 0 ? (
        <p style={{ margin: 0 }}>No hay módulos finalizados recientes.</p>
      ) : (
        ultimosFinalizados.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => seleccionarHistorialParaReintegrar(item)}
            style={{
              padding: '10px',
              borderRadius: '8px',
              border: historialSeleccionadoReintegrar?.id === item.id ? '2px solid #64b5f6' : '1px solid #555',
              background: historialSeleccionadoReintegrar?.id === item.id ? '#0d47a1' : '#333',
              color: 'white',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <strong>{item.serie}</strong>
            <span style={{ display: 'block', color: '#ccc', fontSize: '12px', marginTop: '2px' }}>
              {item.tipo} · Salida {formatearFecha(item.fecha_salida) || 'sin fecha'}
            </span>
          </button>
        ))
      )}
    </div>

    <label style={{ display: 'block', marginBottom: '12px' }}>
      <strong>Serie</strong>
      <input
        value={serieReintegrar}
        onChange={(e) => {
          setSerieReintegrar(e.target.value)
          setHistorialSeleccionadoReintegrar(null)
        }}
        placeholder="Ingresar serie"
        style={{
          width: '100%',
          padding: '9px',
          marginTop: '5px',
          boxSizing: 'border-box',
        }}
      />
    </label>

    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
      <label>
        <strong>Línea</strong>
        <select
          value={lineaReintegrar}
          onChange={(e) => setLineaReintegrar(Number(e.target.value))}
          style={{ width: '100%', padding: '9px', marginTop: '5px' }}
        >
          {[1,2,3,4,5,6,7,8,9].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>

      <label>
        <strong>Ubicación</strong>
        <select
          value={extremoReintegrar}
          onChange={(e) => setExtremoReintegrar(e.target.value)}
          style={{ width: '100%', padding: '9px', marginTop: '5px' }}
        >
          <option value="inicio">Calle acopio</option>
          <option value="fin">Calle agua</option>
        </select>
      </label>
    </div>

    <div style={{ display: 'flex', gap: '10px' }}>
      <button
        type="button"
        onClick={reintegrarModuloFinalizado}
        disabled={reintegrandoModulo}
        style={{ flex: 1, padding: '12px', background: '#2e7d32', color: 'white' }}
      >
        {reintegrandoModulo ? 'Reintegrando...' : 'Reintegrar'}
      </button>
      <button
        type="button"
        onClick={() => setMostrarReintegrar(false)}
        style={{ flex: 1, padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
  </div>
)}

{mostrarKPI && (
  <div className="kpi-grid">
    <div style={{ color: '#ccc' }}>KPIs próximos a implementarse</div>
  </div>
)}

{mostrarDescargaProtocolos && puedeDescargarProtocolosDiarios && (
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
      maxWidth: '380px',
      boxSizing: 'border-box',
      zIndex: 3200,
      color: 'white',
      textAlign: 'left',
    }}
  >
    <h2 style={{ marginTop: 0 }}>Descargar protocolos diarios</h2>
    <p style={{ color: '#ccc', marginTop: 0 }}>
      Selecciona la fecha de prueba eléctrica.
    </p>

    <label style={{ display: 'block', marginBottom: '16px' }}>
      <strong>Fecha</strong>
      <input
        type="date"
        value={fechaProtocolosDiarios}
        onChange={(e) => setFechaProtocolosDiarios(e.target.value)}
        style={{
          width: '100%',
          padding: '10px',
          marginTop: '6px',
          boxSizing: 'border-box',
        }}
      />
      <small style={{ display: 'block', color: '#bbb', marginTop: '5px' }}>
        Formato visual: dd-mm-aaaa
      </small>
    </label>

    <div style={{ display: 'flex', gap: '10px' }}>
      <button
        type="button"
        onClick={generarDescargaProtocolosDiarios}
        disabled={descargandoProtocolos}
        style={{ flex: 1, padding: '12px', background: '#2e7d32', color: 'white' }}
      >
        {descargandoProtocolos ? 'Generando...' : 'Descargar'}
      </button>
      <button
        type="button"
        onClick={() => setMostrarDescargaProtocolos(false)}
        style={{ flex: 1, padding: '12px' }}
      >
        Cerrar
      </button>
    </div>
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
