import { obtenerDatosExplicadorSupervisor } from '../../../services/supervisor'
import { listarProductosCatalogo } from '../../../services/productos'
import { productos } from '../../../services/operarioMock'
import { isSupabaseConfigured, supabase } from '../../../services/supabase'
import { createAssistantSimulation } from './assistant-simulation'

export interface AssistantCatalog {
  simulated: boolean
  partial: boolean
  products: {
    id: string
    name: string | null
    categories: string[] | null
    incompatibilities: string[] | null
    minimum: number | null
    maximum: number | null
    ph: number | null
  }[]
}

async function loadCatalog(): Promise<AssistantCatalog> {
  let rows: Record<string, unknown>[] = isSupabaseConfigured
    ? productos
    : await listarProductosCatalogo()
  let simulated = true
  let partial = false
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('productos')
        .select(
          'id,nombre,categorias,incompatibilidades,dilucion_min_ml_por_litro,dilucion_max_ml_por_litro,ph',
        )
        .order('id')
        .limit(51)
        .abortSignal(AbortSignal.timeout(15000))
      if (!error && Array.isArray(data)) {
        rows = data
        simulated = false
        partial = data.length > 50
      }
    } catch {
      /* Conserva el catálogo local identificado como demostración. */
    }
  }
  const number = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) ? value : null
  const strings = (value: unknown) =>
    Array.isArray(value) && value.every((item) => typeof item === 'string')
      ? (value as string[])
      : null
  return {
    simulated,
    partial,
    products: rows.slice(0, 50).map((row) => ({
      id: typeof row.id === 'string' ? row.id : '',
      name: typeof row.nombre === 'string' ? row.nombre : null,
      categories: strings(row.categorias),
      incompatibilities: strings(row.incompatibilidades),
      minimum: number(row.dilucion_min_ml_por_litro),
      maximum: number(row.dilucion_max_ml_por_litro),
      ph: number(row.ph),
    })),
  }
}

/** Solo usa el escenario aislado ante una carga local vacía, sin ocultar errores remotos. */
export async function loadAssistantData() {
  const [snapshot, catalog] = await Promise.all([
    obtenerDatosExplicadorSupervisor(),
    loadCatalog(),
  ])
  if (
    snapshot.origin === 'local' &&
    !snapshot.tasks.length &&
    !snapshot.limitations.includes('remote_unavailable') &&
    catalog.simulated
  )
    return { ...createAssistantSimulation(), simulatedScenario: true }
  return { snapshot, catalog, simulatedScenario: false }
}
