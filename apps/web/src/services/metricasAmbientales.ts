import { isSupabaseConfigured, supabase } from './supabase'

export const LINEA_BASE_LITROS_POR_M2 = 3.0

export interface MetricasReto {
  sitioId: string
  lineaBaseLitrosPorM2: number
  aguaAhorradaL: number
  dosificacionExactaPct: number | null
  usoBiodegradablePct: number | null
  eficienciaLimpiezaPct: number | null
  tareasEvaluadas: number
  dosisEvaluadas: number
  biodegradabilidadEvaluada: number
  limpiezasEvaluadas: number
}

function unElemento<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function porcentaje(numerador: number, denominador: number): number | null {
  return denominador ? Math.round((numerador / denominador) * 1000) / 10 : null
}

/**
 * Calcula indicadores solo desde tareas con registros no simulados.
 * Si la base actual no expone el flag biodegradable, ese indicador queda sin datos;
 * no se infiere biodegradabilidad a partir del nombre o tipo del producto.
 */
export async function obtenerMetricasReto(sitioId: string): Promise<MetricasReto> {
  if (!sitioId.trim()) throw new Error('Selecciona un sitio para calcular las métricas.')
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Las métricas ambientales requieren datos persistidos en Supabase.')
  }

  const { data: tareas, error } = await supabase
    .from('tareas')
    .select(`
      id, area_id, producto_id, productos_receta,
      areas!inner(superficie_m2, sitio_id),
      registros_uso(litros_agua_reales, ml_producto_reales, fuente, resultados(cumple_criterio))
    `)
    .eq('areas.sitio_id', sitioId)

  if (error) throw new Error(`No se pudieron consultar las métricas ambientales: ${error.message}`)

  const rows = (tareas ?? []) as any[]
  const productIds = [...new Set(rows.flatMap((task) => {
    const components = Array.isArray(task.productos_receta) ? task.productos_receta : []
    return components.map((component: any) => component.producto_id).filter(Boolean).concat(task.producto_id ?? [])
  }))]

  const productsById = new Map<string, any>()
  if (productIds.length) {
    // '*' permite leer columnas adicionales existentes (como biodegradable) sin
    // hacer que la consulta falle si esa columna no forma parte del esquema actual.
    const { data: products, error: productError } = await supabase.from('productos').select('*').in('id', productIds)
    if (productError) throw new Error(`No se pudieron consultar las fichas de producto: ${productError.message}`)
    for (const product of products ?? []) productsById.set(product.id, product)
  }

  let aguaAhorradaL = 0
  let tareasEvaluadas = 0
  let dosisCorrectas = 0
  let dosisEvaluadas = 0
  let biodegradables = 0
  let biodegradabilidadEvaluada = 0
  let limpiezasCumplidas = 0
  let limpiezasEvaluadas = 0

  for (const task of rows) {
    const area = unElemento<any>(task.areas)
    const registros: any[] = Array.isArray(task.registros_uso) ? task.registros_uso : []
    const componentes = Array.isArray(task.productos_receta) && task.productos_receta.length
      ? task.productos_receta
      : [{ producto_id: task.producto_id }]
    const fichas: any[] = componentes.map((component: any) => productsById.get(component.producto_id)).filter(Boolean)
    const maximoMlPorLitro = fichas.length === componentes.length && fichas.every((p) => Number.isFinite(Number(p.dilucion_max_ml_por_litro)))
      ? fichas.reduce((sum, p) => sum + Number(p.dilucion_max_ml_por_litro), 0)
      : null
    const biodegradable = fichas.length === componentes.length && fichas.every((p) => typeof p.biodegradable === 'boolean')
      ? fichas.every((p) => p.biodegradable === true)
      : null

    for (const registro of registros) {
      if (registro.fuente === 'simulada') continue
      tareasEvaluadas += 1

      const superficie = Number(area?.superficie_m2)
      const aguaReal = Number(registro.litros_agua_reales)
      if (Number.isFinite(superficie) && superficie > 0 && Number.isFinite(aguaReal) && aguaReal >= 0) {
        aguaAhorradaL += Math.max(0, LINEA_BASE_LITROS_POR_M2 * superficie - aguaReal)
      }

      const mlProducto = Number(registro.ml_producto_reales)
      const litrosSolucionReal = aguaReal + mlProducto / 1000
      if (maximoMlPorLitro !== null && Number.isFinite(mlProducto) && mlProducto >= 0 && litrosSolucionReal > 0) {
        dosisEvaluadas += 1
        if (mlProducto / litrosSolucionReal <= maximoMlPorLitro) dosisCorrectas += 1
      }

      if (biodegradable !== null) {
        biodegradabilidadEvaluada += 1
        if (biodegradable) biodegradables += 1
      }

      const resultado = unElemento<any>(registro.resultados)
      if (typeof resultado?.cumple_criterio === 'boolean') {
        limpiezasEvaluadas += 1
        if (resultado.cumple_criterio) limpiezasCumplidas += 1
      }
    }
  }

  return {
    sitioId,
    lineaBaseLitrosPorM2: LINEA_BASE_LITROS_POR_M2,
    aguaAhorradaL: Math.round(aguaAhorradaL * 100) / 100,
    dosificacionExactaPct: porcentaje(dosisCorrectas, dosisEvaluadas),
    usoBiodegradablePct: porcentaje(biodegradables, biodegradabilidadEvaluada),
    eficienciaLimpiezaPct: porcentaje(limpiezasCumplidas, limpiezasEvaluadas),
    tareasEvaluadas,
    dosisEvaluadas,
    biodegradabilidadEvaluada,
    limpiezasEvaluadas,
  }
}
