import {
  areas as areasMock,
  sitios as sitiosMock,
  type AreaOperario,
  type SitioOperario,
} from './operarioMock'
import { isSupabaseConfigured, supabase } from './supabase'

const SITIOS_STORAGE_KEY = 'ecocleaner:sitios_custom'
const AREAS_STORAGE_KEY = 'ecocleaner:areas_custom'

function getLocalCustomSitios(): SitioOperario[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(SITIOS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SitioOperario[]) : []
  } catch {
    return []
  }
}

function getLocalCustomAreas(): AreaOperario[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(AREAS_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as AreaOperario[]) : []
  } catch {
    return []
  }
}

function saveLocalCustom(sitio: SitioOperario, areas: AreaOperario[]) {
  if (typeof localStorage === 'undefined') return
  try {
    const customSitios = getLocalCustomSitios()
    customSitios.push(sitio)
    localStorage.setItem(SITIOS_STORAGE_KEY, JSON.stringify(customSitios))

    const customAreas = getLocalCustomAreas()
    customAreas.push(...areas)
    localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(customAreas))
  } catch (err) {
    console.error('Error al guardar en localStorage:', err)
  }
}

/**
 * Consulta la lista de sitios registrados.
 */
export async function listarSitios(): Promise<SitioOperario[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sitios')
      .select('*')
      .order('nombre')
    if (!error && data && data.length > 0) {
      return data as SitioOperario[]
    }
  }

  const custom = getLocalCustomSitios()
  return [...sitiosMock.map((s) => custom.find((x) => x.id === s.id) ?? s), ...custom.filter((s) => !sitiosMock.some((x) => x.id === s.id))]
}

/**
 * Consulta todas las áreas registradas en el sistema.
 */
export async function listarTodasLasAreas(): Promise<AreaOperario[]> {
  return (await listarTodasLasAreasConfiguracion()).filter(areaOperativa)
}

function areaOperativa(area: AreaOperario): boolean {
  return Number(area.superficie_m2) > 0 && Boolean(area.tipo_superficie?.trim()) && Number(area.litros_solucion_por_m2) > 0 && Boolean(area.criterios_limpieza?.some((c) => c.trim().length >= 3))
}

export async function listarTodasLasAreasConfiguracion(): Promise<AreaOperario[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .order('nombre')
    if (!error && data && data.length > 0) {
      return data as AreaOperario[]
    }
  }

  const custom = getLocalCustomAreas()
  return [...areasMock.map((a) => custom.find((x) => x.id === a.id) ?? a), ...custom.filter((a) => !areasMock.some((x) => x.id === a.id))]
}

/**
 * Consulta las áreas pertenecientes a un sitio.
 */
export async function listarAreasDeSitio(
  sitioId: string,
): Promise<AreaOperario[]> {
  return (await listarAreasDeSitioConfiguracion(sitioId)).filter(areaOperativa)
}

export async function listarAreasDeSitioConfiguracion(sitioId: string): Promise<AreaOperario[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('sitio_id', sitioId)
      .order('nombre')

    if (!error && data && data.length > 0) {
      return data as AreaOperario[]
    }
  }

  const todas = await listarTodasLasAreasConfiguracion()
  return todas.filter((area) => area.sitio_id === sitioId)
}

/**
 * Obtiene un sitio por su ID.
 */
export async function obtenerSitio(
  id: string,
): Promise<SitioOperario | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('sitios')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      return data as SitioOperario
    }
  }

  const sitios = await listarSitios()
  return sitios.find((s) => s.id === id)
}

/**
 * Obtiene un área por su ID.
 */
export async function obtenerArea(
  id: string,
): Promise<AreaOperario | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('areas')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      const area = data as AreaOperario
      return areaOperativa(area) ? area : undefined
    }
  }

  const areas = await listarTodasLasAreas()
  return areas.find((a) => a.id === id)
}

/**
 * Crea un nuevo sitio con sus áreas asociadas (usado por el Supervisor).
 */
export async function crearSitioConAreas(input: {
  nombre: string
  tipo: string
  criterios_limpieza: string[]
  areas: Array<{
    nombre: string
    superficie_m2: number
    tipo_superficie: string
    litros_solucion_por_m2?: number | null
    criterios_limpieza?: string[]
  }>
}): Promise<{ sitio: SitioOperario; areas: AreaOperario[] }> {
  if (isSupabaseConfigured && supabase) {
    // 1. Insertar sitio
    const { data: sitioData, error: sitioError } = await supabase
      .from('sitios')
      .insert({
        nombre: input.nombre,
        tipo: input.tipo,
        criterios_limpieza: input.criterios_limpieza,
      })
      .select('*')
      .single()

    if (sitioError || !sitioData) {
      throw sitioError ?? new Error('No se pudo crear el sitio en Supabase')
    }

    // 2. Insertar áreas vinculadas al sitio
    const areasPayload = input.areas.map((area) => ({
      sitio_id: sitioData.id,
      nombre: area.nombre,
      superficie_m2: area.superficie_m2,
      tipo_superficie: area.tipo_superficie,
      litros_solucion_por_m2: area.litros_solucion_por_m2 ?? null,
      criterios_limpieza: area.criterios_limpieza ?? input.criterios_limpieza,
    }))

    const { data: areasData, error: areasError } = await supabase
      .from('areas')
      .insert(areasPayload)
      .select('*')

    if (areasError || !areasData) {
      throw (
        areasError ?? new Error('No se pudieron crear las áreas en Supabase')
      )
    }

    return {
      sitio: sitioData as SitioOperario,
      areas: areasData as AreaOperario[],
    }
  }

  // Fallback local si no hay conexión
  const nuevoSitio: SitioOperario = {
    id: `sitio-local-${Date.now()}`,
    nombre: input.nombre,
    tipo: input.tipo,
    criterios_limpieza: input.criterios_limpieza,
  }

  const nuevasAreas: AreaOperario[] = input.areas.map((area, index) => {
    const id = `area-local-${Date.now()}-${index}`
    return {
      id,
      sitio_id: nuevoSitio.id,
      nombre: area.nombre,
      superficie_m2: area.superficie_m2,
      tipo_superficie: area.tipo_superficie,
      litros_solucion_por_m2: area.litros_solucion_por_m2 ?? null,
      criterios_limpieza: area.criterios_limpieza ?? input.criterios_limpieza,
      qr_path: `/areas/${id}`,
    }
  })

  sitiosMock.push(nuevoSitio)
  areasMock.push(...nuevasAreas)
  saveLocalCustom(nuevoSitio, nuevasAreas)

  return { sitio: nuevoSitio, areas: nuevasAreas }
}

export async function actualizarSitioConfiguracion(input: {
  id: string; nombre: string; tipo: string; criterios_limpieza: string[];
  areas: Array<{ id?: string; nombre: string; superficie_m2: number; tipo_superficie: string; litros_solucion_por_m2?: number | null; criterios_limpieza?: string[] }>
}): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from('sitios').update({ nombre: input.nombre, tipo: input.tipo, criterios_limpieza: input.criterios_limpieza }).eq('id', input.id)
    if (error) throw error
    for (const area of input.areas) {
      const payload = { nombre: area.nombre, superficie_m2: area.superficie_m2, tipo_superficie: area.tipo_superficie, litros_solucion_por_m2: area.litros_solucion_por_m2 ?? null, criterios_limpieza: area.criterios_limpieza ?? input.criterios_limpieza }
      const result = area.id
        ? await supabase.from('areas').update(payload).eq('id', area.id)
        : await supabase.from('areas').insert({ ...payload, sitio_id: input.id })
      if (result.error) throw result.error
    }
    return
  }
  const customSites = getLocalCustomSitios()
  const site = [...sitiosMock, ...customSites].find((x) => x.id === input.id)
  if (!site) throw new Error('No se encontró el sitio')
  site.nombre = input.nombre; site.tipo = input.tipo; site.criterios_limpieza = input.criterios_limpieza
  const savedSite = customSites.find((x) => x.id === input.id)
  if (savedSite) Object.assign(savedSite, site)
  else customSites.push({ ...site })
  const customAreas = getLocalCustomAreas()
  const currentAreas = [...areasMock, ...customAreas]
  for (const draft of input.areas) {
    const target = currentAreas.find((a) => a.id === draft.id)
    if (target) {
      Object.assign(target, draft)
      const savedArea = customAreas.find((a) => a.id === target.id)
      if (savedArea) Object.assign(savedArea, target)
      else customAreas.push({ ...target })
    } else customAreas.push({ id: `area-local-${Date.now()}-${currentAreas.length}`, sitio_id: input.id, ...draft, criterios_limpieza: draft.criterios_limpieza ?? input.criterios_limpieza })
  }
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(SITIOS_STORAGE_KEY, JSON.stringify(customSites))
    localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify(customAreas))
  }
}

export async function actualizarAreaConfiguracion(input: { id: string; nombre: string; superficie_m2: number; tipo_superficie: string; litros_solucion_por_m2: number | null; criterios_limpieza: string[] }): Promise<AreaOperario> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('areas').update({ nombre: input.nombre, superficie_m2: input.superficie_m2, tipo_superficie: input.tipo_superficie, litros_solucion_por_m2: input.litros_solucion_por_m2, criterios_limpieza: input.criterios_limpieza }).eq('id', input.id).select('*').single()
    if (error || !data) throw error ?? new Error('No se pudo actualizar el área')
    return data as AreaOperario
  }
  const area = [...areasMock, ...getLocalCustomAreas()].find((x) => x.id === input.id)
  if (!area) throw new Error('No se encontró el área')
  Object.assign(area, input)
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(AREAS_STORAGE_KEY, JSON.stringify([...getLocalCustomAreas().filter((x) => x.id !== input.id), area]))
  }
  return area
}
