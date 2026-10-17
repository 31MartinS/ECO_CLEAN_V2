import {
  areas as mockAreas,
  sitios as mockSitios,
  productos as localDemoProducts,
} from './operarioMock'
import {
  effluentDecision as mockEffluentDecision,
  variantComparisons as mockVariantComparisons,
  type ConsumptionRow,
  type EffluentDecision,
  type VariantComparison,
} from './supervisorMock'
import { isSupabaseConfigured, supabase } from './supabase'
import {
  projectLocalTasks,
  projectSupabaseTasks,
} from '../features/supervisor/explainer/data'
import type { DemoSnapshot } from '../features/supervisor/explainer/contracts'
import { compararVariantes } from '@ecocleaner/core'

/** Carga inicial de solo lectura. Abrir el explicador y preguntar no produce consultas. */
export async function obtenerDatosExplicadorSupervisor(): Promise<DemoSnapshot> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('tareas')
        .select(
          `
        id, area_id, producto_id, estado, nivel_suciedad,
        litros_solucion_esperados, ml_producto_esperados,
        productos (tipo_quimico, categorias, dilucion_min_ml_por_litro, dilucion_max_ml_por_litro),
        areas (nombre),
        variantes (id, nombre, dilucion_ml_por_litro),
        registros_uso (
          id, variante_id, litros_agua_reales, ml_producto_reales, marca, fuente, alerta_sobredosis,
          resultados (cumple_criterio, decisiones_efluente (decision_final))
        )
      `,
        )
        .order('created_at', { ascending: false })
        .order('id')
        .limit(201)
        .limit(201, { referencedTable: 'registros_uso' })
        .limit(201, { referencedTable: 'variantes' })
        .abortSignal(AbortSignal.timeout(15000))
      if (!error && Array.isArray(data))
        return projectSupabaseTasks(data.slice(0, 200), data.length > 200)
    } catch {
      // El fallo de lectura solo afecta al explicador y conserva el fallback existente.
    }
    const local = projectLocalTasks(getLocalState(), localDemoProducts, getLocalDemoAreas())
    local.limitations.push('remote_unavailable')
    return local
  }
  return projectLocalTasks(getLocalState(), localDemoProducts, getLocalDemoAreas())
}

function getLocalDemoAreas(): unknown[] {
  if (typeof localStorage === 'undefined') return mockAreas
  try {
    const custom: unknown = JSON.parse(localStorage.getItem('ecocleaner:areas_custom') || '[]')
    return Array.isArray(custom) ? [...custom, ...mockAreas] : mockAreas
  } catch { return mockAreas }
}

/**
 * Desempaqueta de forma segura un objeto que puede venir como elemento único o como array
 * desde relaciones de Supabase/PostgREST.
 */
function unwrapSingle<T>(val: T | T[] | null | undefined): T | null {
  if (!val) return null
  if (Array.isArray(val)) return val.length > 0 ? (val[0] as T) : null
  return val
}

/**
 * Obtiene el estado local del operario guardado en localStorage.
 */
function getLocalState(): any {
  if (typeof localStorage === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem('ecocleaner:operario') || '{}')
  } catch {
    return {}
  }
}

/**
 * Consulta y consolida las filas de consumo para el Panel del Supervisor.
 * Muestra ÚNICAMENTE las tareas que han sido completadas y validadas por el revisor.
 */
export async function obtenerConsumoSupervisor(): Promise<ConsumptionRow[]> {
  const localState = getLocalState()

  if (isSupabaseConfigured && supabase) {
    const { data: registros, error: regError } = await supabase
      .from('registros_uso')
      .select(`
        id,
        litros_agua_reales,
        ml_producto_reales,
        marca,
        fuente,
        tarea_id,
        variante_id,
        tareas (
          id,
          estado,
          hora_inicio,
          tiempo_estimado_min,
          nivel_suciedad,
          litros_solucion_esperados,
          ml_producto_esperados,
          area_id,
          areas (
            nombre,
            superficie_m2,
            litros_solucion_por_m2
          ),
          variantes (
            id,
            nombre,
            dilucion_ml_por_litro,
            repeticiones
          )
        ),
        resultados (
          cumple_criterio
        )
      `)
      .order('created_at', { ascending: false })

    const rows: ConsumptionRow[] = []

    if (!regError && registros && registros.length > 0) {
      for (const reg of registros) {
        const tarea = unwrapSingle<any>(reg.tareas)
        const localTarea = localState.tareas?.find((t: any) => t.id === reg.tarea_id)
        const estadoTarea = tarea?.estado || localTarea?.estado || 'receta_enviada'

        // EL PANEL DEL SUPERVISOR SOLO MUESTRA TAREAS COMPLETADAS / VALIDADAS
        if (estadoTarea !== 'completada') {
          continue
        }

        const area = unwrapSingle<any>(tarea?.areas)
        const resultado = unwrapSingle<any>(reg.resultados)
        const cumple = resultado?.cumple_criterio ?? false

        const variantesList: any[] = Array.isArray(tarea?.variantes)
          ? tarea.variantes
          : tarea?.variantes
            ? [tarea.variantes]
            : []

        const variante = reg.variante_id
          ? (variantesList.find((v: any) => v.id === reg.variante_id) ?? variantesList[0] ?? null)
          : (variantesList[0] ?? null)

        const litEsp = Number(tarea?.litros_solucion_esperados)
        const litPorM2 = Number(area?.litros_solucion_por_m2 ?? 0.4)
        const supDesdeLitros = litEsp > 0 && litPorM2 > 0
          ? Math.round((litEsp / litPorM2) * 10) / 10
          : null

        const superficieReal =
          localTarea?.superficie_m2 ??
          (variante?.repeticiones && Number(variante.repeticiones) > 0 ? Number(variante.repeticiones) : null) ??
          supDesdeLitros ??
          Number(area?.superficie_m2 ?? 100)

        const nombreTarea =
          localTarea?.tipo_tarea?.trim() ||
          variante?.nombre?.trim() ||
          (tarea?.nivel_suciedad ? `Limpieza ${tarea.nivel_suciedad}` : 'Lavado de pisos')

        const dirtLevel = (tarea?.nivel_suciedad ?? localTarea?.nivel_suciedad ?? 'media') as 'baja' | 'media' | 'alta'
        const aguaReal = Number(reg.litros_agua_reales) || 0
        const prodReal = Number(reg.ml_producto_reales) || 0
        const startTime = tarea?.hora_inicio || localTarea?.hora_inicio || null
        const estimatedTimeMin = tarea?.tiempo_estimado_min ?? localTarea?.tiempo_estimado_min ?? null

        rows.push({
          task: nombreTarea,
          area: area?.nombre ?? 'Área general',
          surface: Number(superficieReal),
          dirtLevel,
          water: Number(aguaReal.toFixed(1)),
          product: Number((prodReal / 1000).toFixed(2)),
          compliance: cumple ? 'Cumple' : 'Revisar',
          source: reg.marca === 'medido' ? 'Medido' : 'Estimado',
          simulated: reg.fuente === 'simulada',
          startTime,
          estimatedTimeMin: estimatedTimeMin != null ? Number(estimatedTimeMin) : null,
        })
      }
    }

    if (rows.length > 0) {
      return rows
    }
  }

  // Fallback transparente a datos locales del operario o simulados
  if (localState.registros && localState.registros.length > 0) {
    const completadosLocal = localState.registros.filter((reg: any) => {
      const t = localState.tareas?.find((x: any) => x.id === reg.tarea_id)
      return t && t.estado === 'completada'
    })

    if (completadosLocal.length > 0) {
      return completadosLocal.map((reg: any) => {
        const t = localState.tareas?.find((x: any) => x.id === reg.tarea_id)
        const res = localState.resultados?.find((r: any) => r.registro_uso_id === reg.id)
        const cumple = res ? res.cumple_criterio : true
        const areaObj = mockAreas.find((a) => a.id === t?.area_id)
        const areaNombre = areaObj?.nombre ?? 'Área general'

        return {
          task: t?.tipo_tarea?.trim() || (t?.nivel_suciedad ? `Limpieza ${t.nivel_suciedad}` : 'Lavado de pisos'),
          area: areaNombre,
          surface: Number(t?.superficie_m2 ?? areaObj?.superficie_m2 ?? 100),
          dirtLevel: (t?.nivel_suciedad ?? 'media') as 'baja' | 'media' | 'alta',
          water: Number(Number(reg.litros_agua_reales || 0).toFixed(1)),
          product: Number(((Number(reg.ml_producto_reales || 0)) / 1000).toFixed(2)),
          compliance: cumple ? 'Cumple' : 'Revisar',
          source: reg.marca === 'medido' ? 'Medido' : 'Estimado',
          simulated: reg.fuente === 'simulada',
          startTime: t?.hora_inicio || null,
          estimatedTimeMin: t?.tiempo_estimado_min != null ? Number(t.tiempo_estimado_min) : null,
        }
      })
    }
  }

  // Si no hay tareas validadas, devolver lista vacía para reflejar fielmente que no hay tareas validadas aún
  return []
}

/**
 * Consulta la cantidad de tareas completadas y pendientes de validar.
 */
export async function obtenerResumenSupervisor(): Promise<{
  tareasCompletadas: number
  tareasPendientes: number
}> {
  let pendientes = 0
  let completadas = 0

  if (isSupabaseConfigured && supabase) {
    try {
      const { data } = await supabase
        .from('tareas')
        .select('estado')

      if (data && data.length > 0) {
        pendientes = data.filter((t) => t.estado === 'receta_enviada').length
        completadas = data.filter((t) => t.estado === 'completada').length
        return { tareasCompletadas: completadas, tareasPendientes: pendientes }
      }
    } catch {
      // fallback
    }
  }

  const localState = getLocalState()
  const localTareas: any[] = localState.tareas || []
  pendientes = localTareas.filter((t) => t.estado === 'receta_enviada').length
  completadas = localTareas.filter((t) => t.estado === 'completada').length

  return { tareasCompletadas: completadas, tareasPendientes: pendientes }
}

export interface TareaTrazabilidadSupervisor {
  id: string; tarea: string; area: string; area_id: string; estado: string; prevista_litros: number; prevista_ml: number;
  declarada_agua: number | null; declarada_ml: number | null; marca: string | null; fuente: string | null;
  evaluada: boolean; simulated: boolean; producto: string; procedencia: Record<string, any>; validaciones: string[]; configuracion_actualizada_despues: boolean;
}

export async function obtenerTrazabilidadTareasSupervisor(): Promise<TareaTrazabilidadSupervisor[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('tareas').select('id, area_id, producto_id, nivel_suciedad, estado, litros_solucion_esperados, ml_producto_esperados, tipo_tarea, hora_inicio, productos_receta, procedencia_configuracion, validaciones_receta, configuracion_actualizada_despues, areas(nombre), productos(nombre), registros_uso(litros_agua_reales, ml_producto_reales, marca, fuente, resultados(cumple_criterio))').order('created_at', { ascending: false }).limit(200)
    if (!error && data) return data.map((task: any) => {
      const area = unwrapSingle<any>(task.areas), product = unwrapSingle<any>(task.productos)
      const usage = Array.isArray(task.registros_uso) ? task.registros_uso[0] : null
      const result = usage?.resultados ? Array.isArray(usage.resultados) ? usage.resultados[0] : usage.resultados : null
      return { id: task.id, tarea: task.tipo_tarea ?? `Limpieza ${task.nivel_suciedad ?? ''}`.trim(), area: area?.nombre ?? 'Área sin nombre', area_id: task.area_id, estado: task.estado ?? 'receta_enviada', prevista_litros: Number(task.litros_solucion_esperados ?? 0), prevista_ml: Number(task.ml_producto_esperados ?? 0), declarada_agua: usage ? Number(usage.litros_agua_reales) : null, declarada_ml: usage ? Number(usage.ml_producto_reales) : null, marca: usage?.marca ?? null, fuente: usage?.fuente ?? null, evaluada: typeof result?.cumple_criterio === 'boolean', simulated: usage?.fuente === 'simulada', producto: product?.nombre ?? 'Producto sin nombre', procedencia: task.procedencia_configuracion ?? {}, validaciones: task.validaciones_receta ?? [], configuracion_actualizada_despues: Boolean(task.configuracion_actualizada_despues) }
    })
  }
  const state = getLocalState()
  return (state.tareas ?? []).slice().reverse().map((task: any) => {
    const reg = (state.registros ?? []).find((r: any) => r.tarea_id === task.id)
    const result = reg && (state.resultados ?? []).find((r: any) => r.registro_uso_id === reg.id)
    const area = mockAreas.find((a) => a.id === task.area_id)
    const product = localDemoProducts.find((p) => p.id === task.producto_id)
    return { id: task.id, tarea: task.tipo_tarea ?? 'Tarea', area: area?.nombre ?? 'Área sin nombre', area_id: task.area_id, estado: task.estado ?? 'receta_enviada', prevista_litros: task.receta?.litros_solucion ?? 0, prevista_ml: task.receta?.ml_producto ?? 0, declarada_agua: reg?.litros_agua_reales ?? null, declarada_ml: reg?.ml_producto_reales ?? null, marca: reg?.marca ?? null, fuente: reg?.fuente ?? null, evaluada: typeof result?.cumple_criterio === 'boolean', simulated: reg?.fuente === 'simulada', producto: product?.nombre ?? 'Producto', procedencia: task.procedencia_configuracion ?? {}, validaciones: task.validaciones_receta ?? [], configuracion_actualizada_despues: Boolean(task.configuracion_actualizada_despues) }
  })
}

export async function obtenerComparacionVariantesSupervisor(minRepeticiones: number) {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('variantes').select('id, nombre, tarea_id, registros_uso(litros_agua_reales, ml_producto_reales, marca, fuente, resultados(cumple_criterio))').order('created_at', { ascending: false })
    if (!error && data) {
      const entradas = data.map((v: any) => ({ variante_id: v.id, nombre: v.nombre, registros: (v.registros_uso ?? []).map((r: any) => { const result = Array.isArray(r.resultados) ? r.resultados[0] : r.resultados; return { litros_agua_reales: Number(r.litros_agua_reales), ml_producto_reales: Number(r.ml_producto_reales), marca: r.marca, fuente: r.fuente, cumple_criterio: result?.cumple_criterio } } ) }))
      return compararVariantes(entradas, { min_repeticiones: minRepeticiones })
    }
  }
  return compararVariantes(mockVariantComparisons.map((v) => ({ variante_id: v.name, nombre: v.name, registros: Array.from({ length: v.sampleSize }, () => ({ litros_agua_reales: v.waterAverage, ml_producto_reales: v.productAverage * 1000, cumple_criterio: v.compliance === 'Cumple', marca: v.source === 'Medido' ? 'medido' as const : 'estimado' as const, fuente: v.source === 'Simulado' ? 'simulada' as const : 'manual' as const })) })), { min_repeticiones: minRepeticiones })
}

/**
 * Consulta la última decisión de efluente registrada en el sistema.
 */
export async function obtenerUltimaDecisionEfluente(): Promise<EffluentDecision> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('decisiones_efluente')
      .select(`
        id,
        orientacion,
        decision_final,
        ph_estimado,
        observaciones,
        created_at,
        resultados (
          id,
          registro_uso_id,
          registros_uso (
            tarea_id,
            tareas (
              nivel_suciedad,
              variantes (
                nombre
              ),
              areas (
                nombre,
                sitios (
                  nombre
                )
              )
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && data) {
      const resultado = unwrapSingle<any>(data.resultados)
      const registro = unwrapSingle<any>(resultado?.registros_uso)
      const tarea = unwrapSingle<any>(registro?.tareas)
      const area = unwrapSingle<any>(tarea?.areas)
      const sitio = unwrapSingle<any>(area?.sitios)

      const variantesList = Array.isArray(tarea?.variantes)
        ? tarea.variantes
        : tarea?.variantes
          ? [tarea.variantes]
          : []
      const variante = variantesList[0] ?? null

      const orientacionTexto =
        data.orientacion === 'ajustar'
          ? 'Revisión técnica'
          : data.orientacion === 'gestor'
            ? 'Gestor autorizado'
            : data.orientacion === 'verter'
              ? 'Verter'
              : data.orientacion === 'reutilizar'
                ? 'Reutilización'
                : 'No disponible'

      const decisionTexto =
        data.decision_final === 'gestor'
          ? 'Enviar a gestor'
          : data.decision_final === 'ajustar'
            ? 'Ajuste técnico'
            : data.decision_final === 'verter'
              ? 'Vertido autorizado'
              : data.decision_final === 'reutilizar'
                ? 'Reutilización interna'
                : 'Pendiente de registro'

      const phVal = data.ph_estimado != null ? Number(data.ph_estimado) : null
      const ph = phVal !== null && Number.isFinite(phVal) ? phVal : null

      const taskName =
        variante?.nombre?.trim() ||
        (tarea?.nivel_suciedad ? `Limpieza ${tarea.nivel_suciedad}` : 'Lavado de pisos')

      return {
        site: sitio?.nombre ?? 'Planta Norte',
        area: area?.nombre ?? 'Producción A',
        task: taskName,
        orientation: orientacionTexto,
        decision: decisionTexto,
        ph,
        phOrigin: ph !== null ? 'Medición de pH registrada' : 'Sin medición analítica final',
        reason: data.observaciones?.trim() || 'Decisión documentada en el flujo de operario.',
      }
    }
  }

  // Fallback a localStorage para decisiones registradas en flujo local
  const localState = getLocalState()
  if (localState.decisiones && localState.decisiones.length > 0) {
    const ultimaDec = localState.decisiones[localState.decisiones.length - 1]
    const resultado = localState.resultados?.find((r: any) => r.id === ultimaDec.resultado_id)
    const registro = localState.registros?.find((reg: any) => reg.id === resultado?.registro_uso_id)
    const tarea = localState.tareas?.find((t: any) => t.id === registro?.tarea_id)
    const areaObj = mockAreas.find((a) => a.id === tarea?.area_id)
    const sitioObj = mockSitios.find((st) => st.id === areaObj?.sitio_id)

    const orientacionTexto =
      ultimaDec.orientacion === 'ajustar'
        ? 'Revisión técnica'
        : ultimaDec.orientacion === 'gestor'
          ? 'Gestor autorizado'
          : ultimaDec.orientacion === 'verter'
            ? 'Verter'
            : ultimaDec.orientacion === 'reutilizar'
              ? 'Reutilización'
              : 'No disponible'

    const decisionTexto =
      ultimaDec.decision_final === 'gestor'
        ? 'Enviar a gestor'
        : ultimaDec.decision_final === 'ajustar'
          ? 'Ajuste técnico'
          : ultimaDec.decision_final === 'verter'
            ? 'Vertido autorizado'
            : ultimaDec.decision_final === 'reutilizar'
              ? 'Reutilización interna'
              : 'Pendiente de registro'

    const phVal = ultimaDec.ph_estimado != null ? Number(ultimaDec.ph_estimado) : null
    const ph = phVal !== null && Number.isFinite(phVal) ? phVal : null

    return {
      site: sitioObj?.nombre ?? 'Planta Norte',
      area: areaObj?.nombre ?? 'Producción A',
      task: tarea?.tipo_tarea?.trim() || (tarea?.nivel_suciedad ? `Limpieza ${tarea.nivel_suciedad}` : 'Lavado de pisos'),
      orientation: orientacionTexto,
      decision: decisionTexto,
      ph,
      phOrigin: ph !== null ? 'Medición de pH registrada en flujo local' : 'Sin medición analítica final',
      reason: ultimaDec.observaciones?.trim() || 'Decisión documentada en el flujo de operario.',
    }
  }

  return mockEffluentDecision
}

/**
 * Consulta las comparaciones de variantes registradas.
 * Si Supabase tiene variantes con registros de uso asociados, calcula la comparativa dinámica;
 * de lo contrario devuelve los datos de referencia preconfigurados.
 */
export async function obtenerComparacionVariantes(): Promise<VariantComparison[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: variantesData } = await supabase
        .from('variantes')
        .select(`
          id,
          nombre,
          dilucion_ml_por_litro,
          registros_uso (
            id,
            litros_agua_reales,
            ml_producto_reales,
            marca,
            fuente,
            resultados (
              cumple_criterio
            )
          )
        `)

      if (variantesData && variantesData.length > 0) {
        const conRegistros = variantesData.filter(
          (v: any) => Array.isArray(v.registros_uso) && v.registros_uso.length > 0,
        )

        if (conRegistros.length > 0) {
          return conRegistros.map((v: any) => {
            const regs = (v.registros_uso as any[]).map((reg) => {
              const res = unwrapSingle<any>(reg.resultados)
              return {
                litros_agua_reales: Number(reg.litros_agua_reales) || 0,
                ml_producto_reales: Number(reg.ml_producto_reales) || 0,
                cumple_criterio: res?.cumple_criterio ?? true,
                marca: reg.marca,
                fuente: reg.fuente,
              }
            })

            const totalAgua = regs.reduce((acc, r) => acc + r.litros_agua_reales, 0)
            const totalProd = regs.reduce((acc, r) => acc + r.ml_producto_reales, 0)
            const aguaProm = regs.length ? Math.round((totalAgua / regs.length) * 10) / 10 : 0
            const prodProm = regs.length ? Math.round(((totalProd / regs.length) / 1000) * 100) / 100 : 0
            const cumpleTodos = regs.every((r) => r.cumple_criterio)
            const tieneMedidos = regs.some((r) => r.marca === 'medido')

            return {
              name: v.nombre,
              dilution: Number(v.dilucion_ml_por_litro) || 50,
              sampleSize: regs.length,
              productAverage: prodProm,
              waterAverage: aguaProm,
              compliance: cumpleTodos ? ('Cumple' as const) : ('No cumple' as const),
              reason: cumpleTodos
                ? `Cumple el criterio en todas las repeticiones (${regs.length}).`
                : 'Se registraron incumplimientos en una o más repeticiones.',
              source: tieneMedidos ? ('Medido' as const) : ('Simulado' as const),
            }
          })
        }
      }
    } catch {
      // Ignorar y recurrir a los datos base
    }
  }

  return mockVariantComparisons
}
