import { useEffect, useState } from 'react'
import { Alert, Card } from '../../../components/ui'
import type { SitioOperario } from '../../../services/operarioMock'
import { obtenerMetricasReto, type MetricasReto } from '../../../services/metricasAmbientales'

function indicador(value: number | null, suffix = '%') {
  return value === null ? 'Sin datos' : `${new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(value)}${suffix}`
}

export function ImpactoAmbientalDashboard({ sitios }: { sitios: SitioOperario[] }) {
  const [sitioId, setSitioId] = useState('')
  const [metricas, setMetricas] = useState<MetricasReto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!sitioId && sitios.length) setSitioId(sitios[0].id)
  }, [sitioId, sitios])

  useEffect(() => {
    if (!sitioId) return
    let active = true
    setLoading(true)
    setError(null)
    obtenerMetricasReto(sitioId).then((result) => {
      if (active) setMetricas(result)
    }).catch((cause) => {
      if (active) {
        setMetricas(null)
        setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las métricas ambientales.')
      }
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [sitioId])

  const selectedSite = sitios.find((site) => site.id === sitioId)

  return <Card className="environment-impact-card">
    <div className="environment-impact-heading">
      <div><p className="section-kicker">Reto 4</p><h3>Impacto Ambiental</h3><p className="muted">Indicadores de tareas registradas por sitio.</p></div>
      {sitios.length > 1 && <label className="environment-impact-site">Sitio<select value={sitioId} onChange={(event) => setSitioId(event.target.value)}>{sitios.map((site) => <option value={site.id} key={site.id}>{site.nombre}</option>)}</select></label>}
    </div>
    {error && <Alert tone="error" title="Métricas no disponibles">{error}</Alert>}
    {!sitios.length && <Alert tone="warning" title="Sin sitios">Configura un sitio para consultar el impacto.</Alert>}
    {metricas && <>
      <div className="environment-impact-grid">
        <article><small>Agua ahorrada estimada</small><strong>{new Intl.NumberFormat('es-EC', { maximumFractionDigits: 1 }).format(metricas.aguaAhorradaL)} L</strong><span>Frente a {metricas.lineaBaseLitrosPorM2} L/m² · {metricas.tareasEvaluadas} registros</span></article>
        <article><small>Dosificación dentro del máximo</small><strong>{indicador(metricas.dosificacionExactaPct)}</strong><span>{metricas.dosisEvaluadas} registros con ficha completa</span></article>
        <article><small>Uso biodegradable</small><strong>{indicador(metricas.usoBiodegradablePct)}</strong><span>{metricas.biodegradabilidadEvaluada} registros con bandera explícita</span></article>
        <article><small>Eficiencia de limpieza</small><strong>{indicador(metricas.eficienciaLimpiezaPct)}</strong><span>{metricas.limpiezasEvaluadas} resultados evaluados</span></article>
      </div>
      <p className="environment-impact-note">{selectedSite?.nombre ?? 'Sitio'} · Los porcentajes excluyen datos ausentes y los registros simulados. El ahorro es una estimación contra la línea base de 3,0 L/m², no una medición de reducción verificada.</p>
      {metricas.biodegradabilidadEvaluada === 0 && <Alert tone="warning" title="Biodegradabilidad sin datos verificables">El esquema/catálogo actual no aporta una bandera biodegradable explícita para los productos registrados; no se infiere por el nombre comercial.</Alert>}
    </>}
    {loading && <p className="muted" role="status">Calculando indicadores ambientales…</p>}
  </Card>
}
