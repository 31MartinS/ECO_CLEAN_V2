import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Card, PageHeader } from '../../../components/ui'
import { validarProductoCompleto } from '@ecocleaner/core'
import { listarProductosCatalogo } from '../../../services/productos'
import type { ProductoOperario } from '../../../services/operarioMock'

export default function ProductsCatalog() {
  const [items, setItems] = useState<ProductoOperario[]>([])
  useEffect(() => { listarProductosCatalogo().then(setItems) }, [])
  return <div className="supervisor-shell report-page">
    <header className="supervisor-header report-header-bar"><div><p className="eyebrow">EcoCleaner · Supervisor</p><h1>Catálogo de productos</h1></div><Link className="supervisor-header-btn" to="/supervisor/productos/nuevo">Nuevo producto</Link></header>
    <main className="report-main"><PageHeader eyebrow="Preparación del sistema" title="Fichas técnicas" description="Revisa qué productos pueden ofrecerse al operario y completa los datos faltantes." />
      <div className="config-catalog-list">{items.map((p) => { const missing = validarProductoCompleto(p).faltantes; const incomplete = p.incompleto ?? !validarProductoCompleto(p).completo; return <Card key={p.id} className="config-catalog-item"><div><strong>{p.nombre}</strong><span>{p.categorias?.join(', ') || 'Sin categoría'} · {p.dilucion_min_ml_por_litro}–{p.dilucion_max_ml_por_litro} ml/L</span><small>Ficha v{p.ficha_version ?? 1}</small>{incomplete && <AlertMissing fields={missing} />}</div><span className={`config-status ${incomplete ? 'is-missing' : 'is-ready'}`}>{incomplete ? 'Incompleto · bloqueado para operario' : 'Habilitado'}</span><Link className="supervisor-header-btn" to={`/supervisor/productos/nuevo?id=${p.id}`}>Editar ficha</Link></Card> })}</div>
    </main>
  </div>
}

function AlertMissing({ fields }: { fields: string[] }) { return <small className="config-missing-fields">Falta: {fields.join(' · ') || 'revisar compatibilidad en HDS'}</small> }
