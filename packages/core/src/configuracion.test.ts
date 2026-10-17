import { describe, expect, it } from 'vitest'
import { detectarFaltantesConfiguracion, procedenciaDeDatos, validarAreaCompleta, validarParametrosSistema, validarProductoCompleto } from './configuracion'
import { CATEGORIAS_QUIMICAS } from '@ecocleaner/schemas'

const producto = { id: 'prod', nombre: 'Limpiador', categorias: ['alcalino'], incompatibilidades: [], incompatibilidades_revisadas: true, epp_requerido: ['Guantes'], dilucion_min_ml_por_litro: 2, dilucion_ml_por_litro: 4, dilucion_max_ml_por_litro: 8, ph: 10, concentracion_ph: '1%', ph_medido_a_ml_por_litro: 10, url_ficha_tecnica: 'https://example.test/tds', url_hoja_seguridad: 'https://example.test/sds' }
const area = { id: 'area', nombre: 'Piso', superficie_m2: 20, tipo_superficie: 'Hormigón', litros_solucion_por_m2: 0.4, criterios_limpieza: ['Sin residuos'] }
const parametros = { tolerancia_sobredosis_pct: 10, rango_ph_descarga: { min: 6, max: 9 }, min_repeticiones: 3, vocabulario_categorias: CATEGORIAS_QUIMICAS.map((clave) => ({ clave, etiqueta: clave })), configurado: false }

describe('configuración del supervisor', () => {
  it('distingue ficha de producto completa e incompleta', () => {
    expect(validarProductoCompleto(producto).completo).toBe(true)
    expect(validarProductoCompleto({ ...producto, epp_requerido: [] }).faltantes).toContain('EPP requerido')
  })
  it('distingue área completa e incompleta', () => {
    expect(validarAreaCompleta(area).completo).toBe(true)
    expect(validarAreaCompleta({ ...area, litros_solucion_por_m2: null }).faltantes).toContain('litros_solucion_por_m2')
  })
  it('detecta parámetros incompletos y los faltantes operativos con enlaces', () => {
    expect(validarParametrosSistema(null).completo).toBe(false)
    const faltantes = detectarFaltantesConfiguracion({ productos: [{ ...producto, epp_requerido: [] }], areas: [{ ...area, criterios_limpieza: [] }], parametros: null })
    expect(faltantes.some((f) => f.tipo === 'producto' && f.href.includes('id=prod'))).toBe(true)
    expect(faltantes.some((f) => f.tipo === 'area' && f.href.includes('/editar'))).toBe(true)
    expect(faltantes.some((f) => f.tipo === 'parametros' && f.href === '/supervisor/parametros')).toBe(true)
    expect(detectarFaltantesConfiguracion({ productos: [], areas: [], parametros }).some((f) => f.campo === 'confirmación de parámetros')).toBe(true)
  })
  it('registra procedencia configurada, predeterminada o simulada sin perder la versión de ficha', () => {
    expect(procedenciaDeDatos({ producto: { id: 'p', ficha_version: 4 }, area, parametrosConfigurados: false }).parametros.origen).toBe('por_defecto')
    expect(procedenciaDeDatos({ producto: { id: 'p', ficha_version: 4 }, area, parametrosConfigurados: true, simulated: true }).producto).toMatchObject({ version: 4, origen: 'simulado' })
  })
})
