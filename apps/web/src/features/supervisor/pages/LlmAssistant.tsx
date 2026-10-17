import { Link, Navigate } from 'react-router-dom'
import { IconArrowLeft } from '../../../components/ui'
import { obtenerUsuarioActual } from '../../../services/usuarios'
import { canShowDemo } from '../explainer/config'
import { DemoErrorBoundary } from '../explainer/DemoExplainer'
import { DemoChatAssistant } from '../explainer/DemoChatAssistant'
import '../explainer/live-assistant.css'

export default function LlmAssistant() {
  const role = obtenerUsuarioActual()?.rol
  if (!canShowDemo(role, import.meta.env.VITE_LLM_MODE))
    return <Navigate to="/supervisor" replace />

  return (
    <div className="supervisor-shell llm-assistant-page">
      <header className="supervisor-header">
        <div>
          <p className="eyebrow">EcoCleaner / Supervisor</p>
          <div className="llm-title-row">
            <h1>Asistente EcoCleaner</h1>
            <span className="llm-local-badge">Modo demostración</span>
          </div>
        </div>
        <Link className="supervisor-header-btn" to="/supervisor">
          <IconArrowLeft size={16} /> Volver al panel
        </Link>
      </header>
      <DemoErrorBoundary>
        <DemoChatAssistant />
      </DemoErrorBoundary>
    </div>
  )
}
