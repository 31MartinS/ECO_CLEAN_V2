import type { CategoriaQuimica } from '@ecocleaner/schemas'
import { productos as productosMock, type ProductoOperario } from './operarioMock'
import { isSupabaseConfigured, supabase } from './supabase'
import { validarProductoCompleto } from '@ecocleaner/core'

const PRODUCTOS_STORAGE_KEY = 'ecocleaner:productos_custom'

function getLocalProducts(): ProductoOperario[] {
  if (typeof localStorage === 'undefined') return []
  try { const value = JSON.parse(localStorage.getItem(PRODUCTOS_STORAGE_KEY) || '[]'); return Array.isArray(value) ? value : [] } catch { return [] }
}

function saveLocalProducts(products: ProductoOperario[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(PRODUCTOS_STORAGE_KEY, JSON.stringify(products))
}

export type NuevoProductoInput = {
  nombre: string
  tipo_quimico?: string | null
  categorias: CategoriaQuimica[]
  incompatibilidades?: CategoriaQuimica[]
  dilucion_min_ml_por_litro: number
  dilucion_ml_por_litro: number
  dilucion_max_ml_por_litro: number
  dilucion_texto_ficha?: string | null
  ph?: number | null
  concentracion_ph?: string | null
  ph_medido_a_ml_por_litro?: number | null
  indicaciones_disposicion?: string | null
  url_ficha_tecnica?: string | null
  url_hoja_seguridad?: string | null
  epp_requerido?: string[]
  incompatibilidades_revisadas?: boolean
  biodegradable?: boolean
}

/**
 * Consulta el catálogo de productos químicos.
 * Si Supabase está disponible, consulta la tabla 'productos';
 * de lo contrario, recurre a los productos iniciales validados.
 */
export async function listarProductos(): Promise<ProductoOperario[]> {
  const catalogo = await listarProductosCatalogo()
  return catalogo.filter((p) => p.incompleto === false || (!p.incompleto && validarProductoCompleto(p).completo))
}

export async function listarProductosCatalogo(): Promise<ProductoOperario[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre')

    if (!error && data && data.length > 0) {
      return data as ProductoOperario[]
    }
  }

  const custom = getLocalProducts()
  return [...productosMock.map((p) => custom.find((x) => x.id === p.id) ?? p), ...custom.filter((p) => !productosMock.some((x) => x.id === p.id))]
}

/**
 * Obtiene un producto por su id.
 */
export async function obtenerProducto(
  id: string,
): Promise<ProductoOperario | undefined> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .eq('id', id)
      .single()

    if (!error && data) {
      return data as ProductoOperario
    }
  }

  return (await listarProductosCatalogo()).find((producto) => producto.id === id)
}

/**
 * Registra un nuevo producto químico en el catálogo (usado por el Supervisor).
 * Si Supabase está configurado, persiste en la base de datos; de lo contrario,
 * lo agrega a la memoria de productos local.
 */
export async function crearProducto(
  input: NuevoProductoInput,
): Promise<ProductoOperario> {
  const payload = {
    nombre: input.nombre,
    tipo_quimico: input.tipo_quimico || null,
    categorias: input.categorias,
    incompatibilidades: input.incompatibilidades || [],
    dilucion_min_ml_por_litro: input.dilucion_min_ml_por_litro,
    dilucion_ml_por_litro: input.dilucion_ml_por_litro,
    dilucion_max_ml_por_litro: input.dilucion_max_ml_por_litro,
    dilucion_texto_ficha: input.dilucion_texto_ficha || null,
    ph: input.ph ?? null,
    concentracion_ph: input.concentracion_ph || null,
    ph_medido_a_ml_por_litro: input.ph_medido_a_ml_por_litro ?? null,
    indicaciones_disposicion: input.indicaciones_disposicion || null,
    url_ficha_tecnica: input.url_ficha_tecnica || null,
    url_hoja_seguridad: input.url_hoja_seguridad || null,
    epp_requerido: input.epp_requerido ?? [],
    incompatibilidades_revisadas: input.incompatibilidades_revisadas ?? false,
    biodegradable: input.biodegradable === true,
    unidad_dosis: 'ml/L' as const,
    incompleto: !validarProductoCompleto({ ...input, epp_requerido: input.epp_requerido ?? [], incompatibilidades_revisadas: input.incompatibilidades_revisadas ?? false }).completo,
    ficha_version: 1,
  }

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from('productos')
      .insert(payload)
      .select('*')
      .single()

    if (error || !data) {
      throw error ?? new Error('No se pudo registrar el producto en Supabase')
    }

    return data as ProductoOperario
  }

  // Fallback local en memoria
  const nuevoProducto: ProductoOperario = {
    id: `prod-local-${Date.now()}`,
    ...payload,
  }

  productosMock.push(nuevoProducto)
  saveLocalProducts([...getLocalProducts(), nuevoProducto])
  return nuevoProducto
}

export async function actualizarProducto(id: string, input: NuevoProductoInput): Promise<ProductoOperario> {
  const payload = {
    nombre: input.nombre,
    tipo_quimico: input.tipo_quimico || null,
    categorias: input.categorias,
    incompatibilidades: input.incompatibilidades ?? [],
    incompatibilidades_revisadas: input.incompatibilidades_revisadas ?? false,
    biodegradable: input.biodegradable === true,
    dilucion_min_ml_por_litro: input.dilucion_min_ml_por_litro,
    dilucion_ml_por_litro: input.dilucion_ml_por_litro,
    dilucion_max_ml_por_litro: input.dilucion_max_ml_por_litro,
    dilucion_texto_ficha: input.dilucion_texto_ficha || null,
    ph: input.ph ?? null,
    concentracion_ph: input.concentracion_ph || null,
    ph_medido_a_ml_por_litro: input.ph_medido_a_ml_por_litro ?? null,
    indicaciones_disposicion: input.indicaciones_disposicion || null,
    url_ficha_tecnica: input.url_ficha_tecnica || null,
    url_hoja_seguridad: input.url_hoja_seguridad || null,
    epp_requerido: input.epp_requerido ?? [],
    unidad_dosis: 'ml/L' as const,
  }
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from('productos').update(payload).eq('id', id).select('*').single()
    if (error || !data) throw error ?? new Error('No se pudo actualizar el producto')
    return data as ProductoOperario
  }
  const current = (await listarProductosCatalogo()).find((p) => p.id === id)
  if (!current) throw new Error('No se encontró el producto')
  const updated = { ...current, ...payload, incompleto: !validarProductoCompleto({ ...payload, id }).completo, ficha_version: (current.ficha_version ?? 1) + 1 }
  const index = productosMock.findIndex((p) => p.id === id)
  if (index >= 0) productosMock[index] = updated
  saveLocalProducts([...getLocalProducts().filter((p) => p.id !== id), updated])
  return updated
}

