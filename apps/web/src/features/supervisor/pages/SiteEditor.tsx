import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card } from '../../../components/ui'
import { actualizarSitioConfiguracion, obtenerSitio } from '../../../services/sitios'

export default function SiteEditor() {
  const { siteId = '' } = useParams()
  const [site, setSite] = useState<any>(null)
  const [criteria, setCriteria] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { let active = true; obtenerSitio(siteId).then((data) => { if (!active || !data) { if (active) setError('No se encontró el sitio'); return }; setSite(data); setCriteria((data.criterios_limpieza ?? []).join('\n')) }); return () => { active = false } }, [siteId])
  const save = async (e: React.FormEvent) => { e.preventDefault(); try { setError(''); await actualizarSitioConfiguracion({ id: site.id, nombre: site.nombre, tipo: site.tipo, criterios_limpieza: criteria.split('\n').map((x) => x.trim()).filter(Boolean), areas: [] }); setMessage('Sitio actualizado.') } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el sitio') } }
  return <div className="supervisor-shell report-page"><header className="supervisor-header report-header-bar"><div><Link className="supervisor-header-btn" to="/supervisor/sitios">Volver a sitios</Link><p className="eyebrow">EcoCleaner · Supervisor</p><h1>Editar sitio</h1></div></header><main className="report-main"><Card className="report-card-section">{!site ? error || 'Cargando sitio…' : <form onSubmit={save} className="config-form-grid"><label>Nombre del sitio<input required minLength={2} value={site.nombre} onChange={(e) => setSite({ ...site, nombre: e.target.value })} /></label><label>Tipo de sitio<input required value={site.tipo} onChange={(e) => setSite({ ...site, tipo: e.target.value })} /></label><label className="config-field-wide">Criterios base de limpieza (uno por línea)<textarea rows={6} value={criteria} onChange={(e) => setCriteria(e.target.value)} /></label><div className="config-field-wide">{message && <Alert tone="success">{message}</Alert>}{error && <Alert tone="error">{error}</Alert>}<Button type="submit">Guardar sitio</Button></div></form>}</Card></main></div>
}
