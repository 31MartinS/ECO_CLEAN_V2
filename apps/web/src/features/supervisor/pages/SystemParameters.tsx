import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Alert, Button, Card } from '../../../components/ui'
import { CATEGORIAS_QUIMICAS, type CategoriaQuimica } from '@ecocleaner/schemas'
import { obtenerParametrosSistema, guardarParametrosSistema, PARAMETROS_POR_DEFECTO } from '../../../services/parametrosSistema'

export default function SystemParameters() {
  const [tolerancia, setTolerancia] = useState(String(PARAMETROS_POR_DEFECTO.tolerancia_sobredosis_pct))
  const [phMin, setPhMin] = useState(String(PARAMETROS_POR_DEFECTO.rango_ph_descarga.min))
  const [phMax, setPhMax] = useState(String(PARAMETROS_POR_DEFECTO.rango_ph_descarga.max))
  const [repeticiones, setRepeticiones] = useState(String(PARAMETROS_POR_DEFECTO.min_repeticiones))
  const [labels, setLabels] = useState<Record<CategoriaQuimica, string>>(() => Object.fromEntries(PARAMETROS_POR_DEFECTO.vocabulario_categorias.map((x) => [x.clave, x.etiqueta])) as Record<CategoriaQuimica, string>)
  const [configured, setConfigured] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { obtenerParametrosSistema().then((p) => { setTolerancia(String(p.tolerancia_sobredosis_pct)); setPhMin(String(p.rango_ph_descarga.min)); setPhMax(String(p.rango_ph_descarga.max)); setRepeticiones(String(p.min_repeticiones)); setLabels(Object.fromEntries(p.vocabulario_categorias.map((x) => [x.clave, x.etiqueta])) as Record<CategoriaQuimica, string>); setConfigured(p.configurado) }) }, [])
  const save = async () => {
    const min = Number(phMin), max = Number(phMax), tol = Number(tolerancia), reps = Number(repeticiones)
    if (!Number.isFinite(tol) || tol < 0 || tol > 100 || min < 0 || max > 14 || min >= max || !Number.isInteger(reps) || reps < 1 || CATEGORIAS_QUIMICAS.some((c) => !labels[c]?.trim())) { setError('Revisa los rangos y completa las etiquetas de todas las categorías.'); return }
    setSaving(true); setError(''); setMessage('')
    try { await guardarParametrosSistema({ tolerancia_sobredosis_pct: tol, rango_ph_descarga: { min, max }, min_repeticiones: reps, vocabulario_categorias: CATEGORIAS_QUIMICAS.map((clave) => ({ clave, etiqueta: labels[clave].trim() })) }); setConfigured(true); setMessage('Parámetros guardados. Las tareas nuevas guardarán una copia de estos valores.') }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron guardar los parámetros.') }
    finally { setSaving(false) }
  }
  return <div className="supervisor-shell report-page"><header className="supervisor-header report-header-bar"><div><Link className="supervisor-header-btn" to="/supervisor">Volver al panel</Link><p className="eyebrow">EcoCleaner · Supervisor</p><h1>Parámetros del sistema</h1></div></header><main className="report-main"><Card className="report-card-section"><p className="section-kicker">Reglas operativas</p>{!configured && <Alert tone="warning" title="Se usan parámetros por defecto">Tolerancia 10%, rango de pH 6–9 y mínimo de 3 repeticiones. Se marcarán como predeterminados en las nuevas tareas hasta que guardes una configuración.</Alert>}{message && <Alert tone="success">{message}</Alert>}{error && <Alert tone="error">{error}</Alert>}<div className="config-form-grid"><label>Tolerancia de sobredosis (%)<input type="number" min="0" max="100" value={tolerancia} onChange={(e) => setTolerancia(e.target.value)} /></label><label>pH de descarga mínimo<input type="number" min="0" max="14" step="any" value={phMin} onChange={(e) => setPhMin(e.target.value)} /></label><label>pH de descarga máximo<input type="number" min="0" max="14" step="any" value={phMax} onChange={(e) => setPhMax(e.target.value)} /></label><label>Mínimo de repeticiones medidas<input type="number" min="1" step="1" value={repeticiones} onChange={(e) => setRepeticiones(e.target.value)} /></label></div><h2>Vocabulario de categorías químicas</h2><p className="muted">Las claves se conservan para compatibilidad con el detector; puedes ajustar las etiquetas que verá el supervisor.</p><div className="config-form-grid">{CATEGORIAS_QUIMICAS.map((c) => <label key={c}>{c}<input value={labels[c]} onChange={(e) => setLabels((old) => ({ ...old, [c]: e.target.value }))} /></label>)}</div><div className="operario-actions"><Button onClick={save} disabled={saving}>{saving ? 'Guardando…' : 'Guardar parámetros'}</Button></div></Card></main></div>
}
