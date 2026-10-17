import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, IconArrowLeft, IconClipboardCheck, IconFlask } from '../../../components/ui'
import { obtenerParametrosSistema } from '../../../services/parametrosSistema'
import { obtenerComparacionVariantesSupervisor } from '../../../services/supervisor'

const number = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value)

export default function Comparison() {
  const [minimum, setMinimum] = useState(3)
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  useEffect(() => { let active = true; obtenerParametrosSistema().then(async (params) => { if (!active) return; setMinimum(params.min_repeticiones); const result = await obtenerComparacionVariantesSupervisor(params.min_repeticiones); if (active) { setData(result); setLoading(false) } }).catch(() => setLoading(false)); return () => { active = false } }, [])
  const recommendedId = data?.recomendada
  return <div className="supervisor-shell report-page">
    <header className="supervisor-header report-header-bar"><div className="brand-lockup"><Link className="supervisor-header-btn" to="/supervisor" title="Volver al panel principal"><IconArrowLeft size={16}/><span>Volver al panel</span></Link><div><p className="eyebrow">EcoCleaner · Supervisor</p><h1>Comparación de variantes</h1></div></div><div className="report-header-actions"><Link className="supervisor-header-btn" to="/supervisor/reporte"><IconClipboardCheck size={15}/><span>Ver reporte</span></Link><Link className="supervisor-header-btn" to="/supervisor/efluente"><IconFlask size={15}/><span>Control de efluentes</span></Link></div></header>
    <main className="report-main"><Card className="report-meta-card"><div className="report-meta-grid"><div className="report-meta-item"><span className="report-meta-label">MÍNIMO CONFIGURADO</span><strong className="report-meta-val">{minimum} repeticiones medidas</strong></div><div className="report-meta-item"><span className="report-meta-label">CRITERIO</span><strong className="report-meta-val">Cumplimiento y menor consumo medio</strong></div><div className="report-meta-item"><span className="report-meta-label">DECISIÓN</span><strong className="report-meta-val">{recommendedId ? 'Variante elegible recomendada' : 'Sin recomendación elegible'}</strong></div></div></Card>
      <Card className="report-card-section"><p className="section-kicker">Evaluación calculada en core</p><p className="muted">Solo mediciones no simuladas cuentan para el mínimo. Los promedios de agua y producto se presentan por separado.</p>{loading ? <p className="muted">Cargando registros…</p> : <><div className="variant-live-list">{(data?.resumen ?? []).map((item: any) => <article className={`variant-live-row ${item.variante_id === recommendedId ? 'is-recommended' : ''}`} key={item.variante_id}><div><strong>{item.nombre ?? item.variante_id}</strong><span>{item.elegible ? 'Elegible' : item.motivo}</span></div><div><small>Medidas / simuladas</small><strong>{item.n_medidos} / {item.n_simulados}</strong></div><div><small>Producto promedio</small><strong>{number(item.producto_promedio)} ml</strong></div><div><small>Agua promedio</small><strong>{number(item.agua_promedio)} L</strong></div><div><small>Cumplimiento</small><strong>{number(item.tasa_cumplimiento * 100)}%</strong></div></article>)}</div><p className="variant-live-reason">{data?.motivo}</p></>}</Card>
      <div className="system-readiness-links"><Link to="/supervisor/parametros">Editar mínimo de repeticiones</Link><Link to="/supervisor/reporte">Consultar reporte</Link></div>
    </main>
  </div>
}
