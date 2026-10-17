import { detectarFaltantesConfiguracion } from '@ecocleaner/core'
import { listarProductosCatalogo } from './productos'
import { listarTodasLasAreasConfiguracion } from './sitios'
import { obtenerParametrosSistema } from './parametrosSistema'

export async function obtenerFaltantesConfiguracion() {
  const [productos, areas, parametros] = await Promise.all([listarProductosCatalogo(), listarTodasLasAreasConfiguracion(), obtenerParametrosSistema()])
  return detectarFaltantesConfiguracion({ productos, areas, parametros })
}
