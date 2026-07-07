import { supabase } from './supabase'

export async function obtenerTablero() {
  const { data, error } = await supabase
    .from('tablero')
    .select('*')
    .order('linea')
    .order('posicion')

  if (error) throw error

  return data
}

export async function obtenerHistorial() {
  const { data, error } = await supabase
    .from('historial_modulos')
    .select('*')

  if (error) throw error

  return data
}

export async function actualizarModulo(id, datos) {
  const { error } = await supabase
    .from('modulos')
    .update(datos)
    .eq('id', id)

  if (error) throw error
}

export async function eliminarModulo(id) {
  const { error } = await supabase
    .from('modulos')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function insertarHistorial(datos) {
  const { error } = await supabase
    .from('historial_modulos')
    .insert([datos])

  if (error) throw error
}
