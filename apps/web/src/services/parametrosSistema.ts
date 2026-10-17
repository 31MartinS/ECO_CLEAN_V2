import { CATEGORIAS_QUIMICAS, type ParametrosSistema } from '@ecocleaner/schemas'
import { isSupabaseConfigured, supabase } from './supabase'

export const PARAMETROS_POR_DEFECTO: ParametrosSistema = {
  tolerancia_sobredosis_pct: 10,
  rango_ph_descarga: { min: 6, max: 9 },
  min_repeticiones: 3,
  vocabulario_categorias: CATEGORIAS_QUIMICAS.map((clave) => ({ clave, etiqueta: clave.replaceAll('_', ' ') })),
  configurado: false,
}

export async function obtenerParametrosSistema(): Promise<ParametrosSistema> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('parametros_sistema').select('*').eq('id', 1).maybeSingle()
    if (!error && data) return { ...data, rango_ph_descarga: data.rango_ph_descarga as ParametrosSistema['rango_ph_descarga'], vocabulario_categorias: data.vocabulario_categorias as ParametrosSistema['vocabulario_categorias'] } as ParametrosSistema
  }
  if (typeof localStorage !== 'undefined') {
    try {
      const saved = localStorage.getItem('ecocleaner:parametros_sistema')
      if (saved) return JSON.parse(saved) as ParametrosSistema
    } catch { /* conserva valores por defecto */ }
  }
  return PARAMETROS_POR_DEFECTO
}

export async function guardarParametrosSistema(input: Omit<ParametrosSistema, 'configurado'>): Promise<ParametrosSistema> {
  const value = { ...input, configurado: true, actualizado_en: new Date().toISOString() }
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('parametros_sistema').upsert({ id: 1, ...value }, { onConflict: 'id' }).select('*').single()
    if (error || !data) throw error ?? new Error('No se pudieron guardar los parámetros del sistema')
    return { ...value, ...data, rango_ph_descarga: data.rango_ph_descarga as ParametrosSistema['rango_ph_descarga'], vocabulario_categorias: data.vocabulario_categorias as ParametrosSistema['vocabulario_categorias'] } as ParametrosSistema
  }
  if (typeof localStorage !== 'undefined') localStorage.setItem('ecocleaner:parametros_sistema', JSON.stringify(value))
  return value
}
