import { obtenerCodigoBodega, obtenerNombreBodega } from '../utils/ubicaciones'

const BODEGAS_BASE = [
  { valor: 'bayona', etiqueta: 'Bodega Bayona', tipo: 'permanente' },
  { valor: 'rental', etiqueta: 'Bodega Rental', tipo: 'permanente' },
  { valor: 'montaña', etiqueta: 'Bodega Montaña', tipo: 'permanente' },
]

export async function cargarBodegasDisponibles({ supabase }) {
  const { data, error } = await supabase
    .from('bodegas_config')
    .select('codigo, nombre, tipo, activa, creado_en')
    .eq('activa', true)
    .order('tipo', { ascending: true })
    .order('nombre', { ascending: true })

  if (error) {
    const tablaNoInstalada = error.code === '42P01' || String(error.message || '').includes('bodegas_config')
    return { bodegas: BODEGAS_BASE, error: tablaNoInstalada ? null : error, requiereInstalacion: tablaNoInstalada }
  }

  const bodegas = (data || []).map((item) => ({
    valor: obtenerCodigoBodega(item.codigo),
    etiqueta: item.nombre || obtenerNombreBodega(item.codigo),
    tipo: item.tipo || 'obra',
    creadaEn: item.creado_en || '',
  }))
  return { bodegas: bodegas.length > 0 ? bodegas : BODEGAS_BASE, error: null, requiereInstalacion: false }
}

export async function crearBodegaObra({ supabase, nombre }) {
  const nombreLimpio = String(nombre || '').trim().replace(/\s+/g, ' ')
  const codigo = crearCodigoBodegaObra(nombreLimpio)
  if (nombreLimpio.length < 3 || !codigo) {
    return { bodega: null, error: new Error('Escribe un nombre de obra de al menos 3 caracteres.') }
  }

  const etiqueta = /^bodega\s+/i.test(nombreLimpio) ? nombreLimpio : `Bodega ${nombreLimpio}`
  const { data, error } = await supabase
    .from('bodegas_config')
    .insert({ codigo, nombre: etiqueta, tipo: 'obra', activa: true })
    .select('codigo, nombre, tipo, activa, creado_en')
    .single()

  return {
    bodega: data ? {
      valor: obtenerCodigoBodega(data.codigo),
      etiqueta: data.nombre,
      tipo: data.tipo,
      creadaEn: data.creado_en || '',
    } : null,
    error,
  }
}

export async function eliminarBodegaObra({ supabase, codigo }) {
  const codigoLimpio = obtenerCodigoBodega(codigo)
  if (!codigoLimpio || BODEGAS_BASE.some((bodega) => bodega.valor === codigoLimpio)) {
    return { error: crearErrorBodega('Las bodegas permanentes no se pueden eliminar.', 'BODEGA_PERMANENTE') }
  }

  const { data: configuracion, error: errorConfiguracion } = await supabase
    .from('bodegas_config')
    .select('codigo, nombre, tipo, activa')
    .eq('codigo', codigoLimpio)
    .maybeSingle()

  if (errorConfiguracion) return { error: errorConfiguracion }
  if (!configuracion) return { error: crearErrorBodega('La bodega ya no existe.', 'BODEGA_NO_EXISTE') }
  if (configuracion.tipo !== 'obra') {
    return { error: crearErrorBodega('Solo se pueden eliminar bodegas de obra.', 'BODEGA_PERMANENTE') }
  }

  const referencias = [
    ['perfiles', 'bodega_asignada', 'usuarios asignados'],
    ['bodega_inventarios', 'bodega', 'inventarios'],
    ['vales_bodega', 'bodega', 'pedidos o devoluciones'],
    ['bodega_recepciones', 'bodega', 'recepciones'],
    ['bodega_despachos', 'bodega', 'despachos'],
    ['bodega_mermas', 'bodega', 'mermas'],
  ]

  for (const [tabla, columna, descripcion] of referencias) {
    const { count, error } = await supabase
      .from(tabla)
      .select('*', { count: 'exact', head: true })
      .eq(columna, codigoLimpio)

    // Las instalaciones antiguas pueden no tener todavía alguna tabla auxiliar.
    if (error?.code === '42P01') continue
    if (error) return { error }
    if (Number(count || 0) > 0) {
      return {
        error: crearErrorBodega(
          `No se puede eliminar porque tiene ${descripcion}. Reasigna o retira esos registros primero.`,
          'BODEGA_EN_USO'
        ),
      }
    }
  }

  const { error } = await supabase
    .from('bodegas_config')
    .update({ activa: false, actualizado_en: new Date().toISOString() })
    .eq('codigo', codigoLimpio)
    .eq('tipo', 'obra')

  return { error }
}

function crearErrorBodega(mensaje, codigo) {
  const error = new Error(mensaje)
  error.code = codigo
  return error
}

function crearCodigoBodegaObra(nombre) {
  return String(nombre || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/^bodega\s+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
}

