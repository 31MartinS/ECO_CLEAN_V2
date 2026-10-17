import type { CategoriaQuimica, Producto } from '@ecocleaner/schemas'
import { calcularReceta } from './receta'
import { detectarIncompatibilidades, type InformeIncompatibilidades, type ProductoIncompatibilidad } from './incompatibilidades'

export type NivelValidacion = 'informacion' | 'recomendacion' | 'precaucion' | 'bloqueo'
export interface ValidacionMezcla {
  nivel: NivelValidacion
  bloquea: boolean
  mensajes: string[]
  informe: InformeIncompatibilidades
}

export function validarMezcla(productos: ProductoIncompatibilidad[], modo: 'tanque' | 'secuencial' = 'tanque'): ValidacionMezcla {
  const informe = detectarIncompatibilidades(productos, { detallado: true })
  const mensajes: string[] = []
  if (modo === 'tanque' && informe.conflictos.length) mensajes.push('Los productos seleccionados tienen incompatibilidades documentadas; no se pueden mezclar en el mismo tanque.')
  if (informe.estado === 'datos_insuficientes') mensajes.push('La compatibilidad de esta combinación es desconocida; completa los datos del catálogo antes de preparar la receta.')
  if (modo === 'tanque' && productos.length > 1 && informe.estado === 'sin_coincidencias_documentadas') mensajes.push('No hay incompatibilidades registradas para esta combinación, pero eso no demuestra que sea segura.')
  if (modo === 'secuencial' && informe.conflictos.length) mensajes.push('Uso secuencial: preparar y aplicar cada producto por separado, nunca en el mismo tanque.')
  const bloquea = informe.estado === 'datos_insuficientes' || (modo === 'tanque' && informe.conflictos.length > 0)
  const nivel = bloquea ? 'bloqueo' : modo === 'secuencial' && informe.conflictos.length ? 'precaucion' : productos.length > 1 && informe.estado === 'sin_coincidencias_documentadas' ? 'recomendacion' : 'informacion'
  return { nivel, bloquea, mensajes, informe }
}

export function eppRequerido(productos: Array<Pick<Producto, 'id' | 'nombre'> & { epp_requerido?: string[] | null }>): string[] {
  return [...new Set(productos.flatMap((p) => p.epp_requerido ?? []).map((x) => x.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b))
}

export interface ProductoContenedor { id: string; nombre: string; color: string; ml_producto: number }
export interface ItemContenedor extends ProductoContenedor { proporcion_pct: number }
const COLORES = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2']
export function agregarProductoAContenedor(actual: ProductoContenedor[], producto: Omit<ProductoContenedor, 'color'> & { color?: string }): ItemContenedor[] {
  const existentes = actual.filter((p) => p.id !== producto.id)
  const color = producto.color ?? COLORES[actual.findIndex((p) => p.id === producto.id) >= 0 ? actual.findIndex((p) => p.id === producto.id) % COLORES.length : actual.length % COLORES.length]
  const items = [...existentes, { ...producto, color }]
  const total = items.reduce((sum, p) => sum + p.ml_producto, 0)
  return items.map((p) => ({ ...p, proporcion_pct: total > 0 ? Math.round((p.ml_producto / total) * 10000) / 100 : 0 }))
}

export interface ResultadoDosis { bloquea: boolean; medible: boolean; dentro_rango: boolean; mensajes: string[] }
export function validarDosis(input: { producto: Pick<Producto, 'dilucion_min_ml_por_litro' | 'dilucion_max_ml_por_litro'>; ml_por_litro: number; litros_solucion: number; incremento_medible_ml?: number }): ResultadoDosis {
  const { producto } = input
  const dentro_rango = Number.isFinite(input.ml_por_litro) && input.ml_por_litro >= producto.dilucion_min_ml_por_litro && input.ml_por_litro <= producto.dilucion_max_ml_por_litro
  const cantidad = input.ml_por_litro * input.litros_solucion
  const incremento = input.incremento_medible_ml ?? 1
  const medible = Number.isFinite(cantidad) && cantidad >= incremento
  const mensajes = [!dentro_rango ? `La dosis debe estar entre ${producto.dilucion_min_ml_por_litro} y ${producto.dilucion_max_ml_por_litro} ml/L.` : '', !medible ? `La dosis calculada es menor que la medida mínima de ${incremento} ml.` : ''].filter(Boolean)
  return { bloquea: !dentro_rango || !medible, medible, dentro_rango, mensajes }
}

export function validarCargaTotal(mlProductos: number[], litrosSolucion: number): { bloquea: boolean; ml_totales: number; mensajes: string[] } {
  const ml_totales = mlProductos.reduce((sum, ml) => sum + ml, 0)
  const bloquea = !Number.isFinite(litrosSolucion) || litrosSolucion <= 0 || mlProductos.some((ml) => !Number.isFinite(ml) || ml <= 0) || ml_totales > litrosSolucion * 1000
  return { bloquea, ml_totales, mensajes: bloquea ? ['El volumen total de producto excede el volumen base disponible para la solución.'] : [] }
}

export { calcularReceta }
export type { CategoriaQuimica }
