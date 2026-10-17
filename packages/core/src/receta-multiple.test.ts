import { describe, expect, it } from 'vitest'
import { agregarProductoAContenedor, eppRequerido, validarCargaTotal, validarDosis, validarMezcla } from './receta-multiple'

const a = { id: 'a', nombre: 'A', categorias: ['alcalino'] as const, incompatibilidades: ['acido'] as const, epp_requerido: ['Guantes', 'Gafas'] }
const b = { id: 'b', nombre: 'B', categorias: ['acido'] as const, incompatibilidades: [] as const }
describe('receta múltiple', () => {
  it('bloquea incompatibilidad declarada en ambos sentidos a través del detector existente', () => {
    expect(validarMezcla([a, b]).bloquea).toBe(true)
    expect(validarMezcla([{ ...a, incompatibilidades: [] }, { ...b, incompatibilidades: ['alcalino'] }]).bloquea).toBe(true)
    expect(validarMezcla([b, a], 'secuencial').bloquea).toBe(false)
  })
  it('bloquea combinaciones desconocidas', () => expect(validarMezcla([{ ...a, categorias: [] } as any, b]).bloquea).toBe(true))
  it('bloquea dosis fuera del rango y dosis no medibles', () => {
    const producto = { dilucion_min_ml_por_litro: 5, dilucion_max_ml_por_litro: 20 }
    expect(validarDosis({ producto, ml_por_litro: 21, litros_solucion: 10 }).bloquea).toBe(true)
    expect(validarDosis({ producto, ml_por_litro: 5, litros_solucion: 0.1 }).medible).toBe(false)
  })
  it('bloquea una carga total de producto que excede el volumen base', () => expect(validarCargaTotal([700, 400], 1).bloquea).toBe(true))
  it('combina EPP y acumula cantidades y proporciones', () => {
    expect(eppRequerido([a, { ...b, epp_requerido: ['Gafas'] }])).toEqual(['Gafas', 'Guantes'])
    const items = agregarProductoAContenedor([], { id: 'a', nombre: 'A', ml_producto: 25 })
    const both = agregarProductoAContenedor(items, { id: 'b', nombre: 'B', ml_producto: 75 })
    expect(both.map((p) => p.proporcion_pct)).toEqual([25, 75])
  })
})
