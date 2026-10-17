import { CATEGORIAS_QUIMICAS, type Area, type CategoriaQuimica, type ParametrosSistema, type Producto } from '@ecocleaner/schemas'
import { detectarIncompatibilidades, type ProductoIncompatibilidad } from './incompatibilidades'

export interface FaltanteConfiguracion { id: string; tipo: 'producto' | 'area' | 'parametros' | 'incompatibilidad'; campo: string; descripcion: string; href: string }
export interface ResultadoCompletitud { completo: boolean; faltantes: string[] }

export function validarProductoCompleto(p: Partial<Producto> & { incompatibilidades_revisadas?: boolean }): ResultadoCompletitud {
  const f: string[] = []
  if (!p.nombre?.trim()) f.push('nombre')
  if (!p.categorias?.length) f.push('categorías químicas')
  if (!Array.isArray(p.incompatibilidades) || !p.incompatibilidades_revisadas) f.push('incompatibilidades revisadas en la HDS')
  const min = p.dilucion_min_ml_por_litro, rec = p.dilucion_ml_por_litro, max = p.dilucion_max_ml_por_litro
  if (!(typeof min === 'number' && typeof rec === 'number' && typeof max === 'number' && min > 0 && min <= rec && rec <= max)) f.push('rango de dosis mínimo/recomendado/máximo')
  if (!p.epp_requerido?.length) f.push('EPP requerido')
  if (p.ph == null || !p.concentracion_ph?.trim() || !(p.ph_medido_a_ml_por_litro && p.ph_medido_a_ml_por_litro > 0)) f.push('pH y concentración de medición')
  if (!p.url_ficha_tecnica) f.push('TDS/ficha técnica')
  if (!p.url_hoja_seguridad) f.push('HDS/hoja de seguridad')
  return { completo: f.length === 0, faltantes: f }
}

export function validarAreaCompleta(a: Partial<Area> & { criterios_limpieza?: string[] }): ResultadoCompletitud {
  const f: string[] = []
  if (!(typeof a.superficie_m2 === 'number' && Number.isFinite(a.superficie_m2) && a.superficie_m2 > 0)) f.push('superficie_m2')
  if (!a.tipo_superficie?.trim()) f.push('tipo de superficie')
  if (!(typeof a.litros_solucion_por_m2 === 'number' && Number.isFinite(a.litros_solucion_por_m2) && a.litros_solucion_por_m2 > 0)) f.push('litros_solucion_por_m2')
  if (!a.criterios_limpieza?.some((c) => c.trim().length >= 3)) f.push('criterios de limpieza')
  return { completo: f.length === 0, faltantes: f }
}

export function validarParametrosSistema(p: Partial<ParametrosSistema> | null | undefined): ResultadoCompletitud {
  const f: string[] = []
  if (!p) return { completo: false, faltantes: ['tolerancia de sobredosis', 'rango de pH de descarga', 'mínimo de repeticiones', 'vocabulario de categorías'] }
  if (!(typeof p.tolerancia_sobredosis_pct === 'number' && p.tolerancia_sobredosis_pct >= 0 && p.tolerancia_sobredosis_pct <= 100)) f.push('tolerancia de sobredosis')
  if (!(p.rango_ph_descarga && p.rango_ph_descarga.min >= 0 && p.rango_ph_descarga.min < p.rango_ph_descarga.max && p.rango_ph_descarga.max <= 14)) f.push('rango de pH de descarga')
  if (!(Number.isSafeInteger(p.min_repeticiones) && p.min_repeticiones! > 0)) f.push('mínimo de repeticiones')
  if (!p.vocabulario_categorias?.length || CATEGORIAS_QUIMICAS.some((key) => !p.vocabulario_categorias!.some((x) => x.clave === key && x.etiqueta.trim()))) f.push('vocabulario de categorías químicas')
  return { completo: f.length === 0, faltantes: f }
}

export function detectarFaltantesConfiguracion(input: { productos: Array<Partial<Producto> & { id?: string; incompatibilidades_revisadas?: boolean }>; areas: Array<Partial<Area> & { id?: string; criterios_limpieza?: string[] }>; parametros?: Partial<ParametrosSistema> | null }): FaltanteConfiguracion[] {
  const out: FaltanteConfiguracion[] = []
  for (const p of input.productos) for (const campo of validarProductoCompleto(p).faltantes) out.push({ id: p.id ?? p.nombre ?? 'producto', tipo: 'producto', campo, descripcion: `${p.nombre ?? 'Producto'}: falta ${campo}.`, href: p.id ? `/supervisor/productos/nuevo?id=${p.id}` : '/supervisor/productos' })
  for (const a of input.areas) for (const campo of validarAreaCompleta(a).faltantes) out.push({ id: a.id ?? a.nombre ?? 'area', tipo: 'area', campo, descripcion: `${a.nombre ?? 'Área'}: falta ${campo}.`, href: a.id ? `/supervisor/sitios/areas/${a.id}/editar` : '/supervisor/sitios' })
  for (const campo of validarParametrosSistema(input.parametros).faltantes) out.push({ id: 'sistema', tipo: 'parametros', campo, descripcion: `Falta configurar ${campo}.`, href: '/supervisor/parametros' })
  if (input.parametros && validarParametrosSistema(input.parametros).completo && input.parametros.configurado === false) out.push({ id: 'sistema', tipo: 'parametros', campo: 'confirmación de parámetros', descripcion: 'Los valores predeterminados están activos; revíselos y guárdelos desde parámetros del sistema.', href: '/supervisor/parametros' })
  const elegibles = input.productos.filter((p): p is ProductoIncompatibilidad => Boolean(p.id && p.nombre))
  const informe = detectarIncompatibilidades(elegibles, { detallado: true })
  for (const issue of informe.datos_insuficientes) out.push({ id: issue.producto_id ?? 'catalogo', tipo: 'incompatibilidad', campo: issue.campo, descripcion: issue.motivo, href: issue.producto_id ? `/supervisor/productos/nuevo?id=${issue.producto_id}` : '/supervisor/productos' })
  return out
}

export function procedenciaDeDatos(input: { producto: { id: string; ficha_version?: number; incompleto?: boolean }; area: { id: string; superficie_m2: number; litros_solucion_por_m2?: number | null }; parametrosConfigurados: boolean; simulated?: boolean; validaciones?: string[]; completadosDespues?: boolean }) {
  const origen = input.simulated ? 'simulado' : 'configurado_por_supervisor'
  return {
    producto: { id: input.producto.id, version: input.producto.ficha_version ?? 1, incompleto: input.producto.incompleto ?? false, origen },
    area: { id: input.area.id, superficie_m2: input.area.superficie_m2, litros_solucion_por_m2: input.area.litros_solucion_por_m2 ?? null, origen },
    parametros: { origen: input.parametrosConfigurados ? 'configurado_por_supervisor' : 'por_defecto' },
    validaciones: [...(input.validaciones ?? [])],
    afectada_por_completado_posterior: Boolean(input.completadosDespues),
  }
}

export function normalizarVocabularioCategorias(labels: Partial<Record<CategoriaQuimica, string>>) {
  return CATEGORIAS_QUIMICAS.map((clave) => ({ clave, etiqueta: labels[clave]?.trim() || clave }))
}
