import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Alert, Button, Card } from '../../../components/ui'
import { validarAreaCompleta } from '@ecocleaner/core'
import { actualizarAreaConfiguracion, listarTodasLasAreasConfiguracion, obtenerSitio } from '../../../services/sitios'

export default function AreaEditor() {
  const { areaId = '' } = useParams()
  const [area, setArea] = useState<any>(null)
  const [criterios, setCriterios] = useState('')
  const [sitioNombre, setSitioNombre] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { let active = true; listarTodasLasAreasConfiguracion().then(async (areas) => { const found = areas.find((x) => x.id === areaId); if (!active || !found) return; const site = await obtenerSitio(found.sitio_id); if (!active) return; setArea(found); setCriterios((found.criterios_limpieza ?? site?.criterios_limpieza ?? []).join('\n')); setSitioNombre(site?.nombre ?? '') }); return () => { active = false } }, [areaId])
  if (!area) return <div className="supervisor-shell report-page"><main className="report-main"><Card>{error || 'Cargando área…'}</Card></main></div>
  const form = { ...area, criterios_limpieza: criterios.split('\n').map((x) => x.trim()).filter(Boolean) }
  const status = validarAreaCompleta(form)
  const save = async (event: React.FormEvent) => { event.preventDefault(); setError(''); setMessage(''); try { const rate = areaRate(); const updated = await actualizarAreaConfiguracion({ id: area.id, nombre: area.nombre.trim(), superficie_m2: Number(area.superficie_m2), tipo_superficie: area.tipo_superficie.trim(), litros_solucion_por_m2: rate, criterios_limpieza: form.criterios_limpieza }); setArea(updated); setMessage('Área actualizada. Las tareas anteriores conservarán su procedencia original.') } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar el área') } }
  function areaRate() { const n = area.litros_solucion_por_m2; return n === '' || n == null ? null : Number(n) }
  return <div className="supervisor-shell report-page"><header className="supervisor-header report-header-bar"><div><Link className="supervisor-header-btn" to="/supervisor/sitios">Volver a sitios</Link><p className="eyebrow">{sitioNombre} · Supervisor</p><h1>Editar área: {area.nombre}</h1></div></header><main className="report-main"><Card className="report-card-section"><div className={`config-completeness ${status.completo ? 'is-ready' : 'is-missing'}`}><strong>{status.completo ? 'Área lista para uso' : 'Área incompleta'}</strong>{!status.completo && <span>Falta: {status.faltantes.join(' · ')}</span>}</div>{message && <Alert tone="success">{message}</Alert>}{error && <Alert tone="error">{error}</Alert>}<form onSubmit={save} className="config-form-grid"><label>Nombre<input required minLength={2} value={area.nombre} onChange={(e) => setArea({ ...area, nombre: e.target.value })} /></label><label>Superficie (m²)<input required type="number" min="0.01" step="any" value={area.superficie_m2} onChange={(e) => setArea({ ...area, superficie_m2: Number(e.target.value) })} /></label><label>Tipo de superficie<input required value={area.tipo_superficie} onChange={(e) => setArea({ ...area, tipo_superficie: e.target.value })} /></label><label>Tasa solución (L/m²)<input type="number" min="0.001" step="any" value={area.litros_solucion_por_m2 ?? ''} onChange={(e) => setArea({ ...area, litros_solucion_por_m2: e.target.value === '' ? null : Number(e.target.value) })} /></label><label className="config-field-wide">Criterios de limpieza (uno por línea)<textarea rows={5} value={criterios} onChange={(e) => setCriterios(e.target.value)} /></label><div className="config-field-wide"><Button type="submit">Guardar cambios</Button></div></form></Card></main></div>
}
