import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { agregarProductoAContenedor, calcularReceta, calcularDesvio, eppRequerido, validarCargaTotal, validarDosis, validarMezcla } from '@ecocleaner/core'
import type { NivelSuciedad } from '@ecocleaner/schemas'
import { Alert, Button, Card, Field, NumberStepper, OperarioHeader, PageHeader, Select, Spinner } from '../../../components/ui'
import { formatNumber } from '../../../lib/format'
import { operarioConfig, type AreaOperario, type ProductoOperario } from '../../../services/operarioMock'
import { listarProductos } from '../../../services/productos'
import { listarTodasLasAreas } from '../../../services/sitios'
import { crearTarea, registrarUso } from '../../../services/tareas'
import { obtenerUsuarioActual } from '../../../services/usuarios'
import { useOperarioFlow } from '../../../context/OperarioFlowContext'

const AREA_KEY = 'ecocleaner:operario:area-receta'
const PALETA = ['#2563eb', '#16a34a', '#d97706', '#7c3aed', '#db2777', '#0891b2']
const TIEMPOS = [15, 30, 45, 60, 90, 120]
const esUuid = (valor: string | undefined): valor is string => Boolean(valor && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor))

function mensajeErrorGuardadoReceta(fallo: unknown): string {
  const detalle = typeof fallo === 'object' && fallo !== null ? fallo as Record<string, unknown> : {}
  const mensaje = fallo instanceof Error
    ? fallo.message
    : [detalle.message, detalle.details, detalle.hint].filter((valor): valor is string => typeof valor === 'string' && valor.trim().length > 0).join(' ')
  const causa = mensaje.toLocaleLowerCase()

  if (causa.includes('requiere al menos un producto')) return 'La receta no tiene productos válidos. Qué hacer: agrega nuevamente al menos un producto antes de enviarla.'
  if (causa.includes('producto inexistente')) return 'Uno de los productos ya no está disponible en el catálogo. Qué hacer: quítalo de la receta, selecciónalo de nuevo o pide al supervisor que lo habilite.'
  if (causa.includes('producto principal') || causa.includes('dosis principal') || causa.includes('cantidad esperada')) return 'La composición calculada ya no coincide con el producto principal. Qué hacer: revisa los productos, vuelve a usar las cantidades calculadas y envía la receta otra vez.'
  if (causa.includes('polic') || causa.includes('permission') || causa.includes('not authorized')) return 'Tu sesión no tiene permiso para registrar esta receta. Qué hacer: verifica que ingresaste como operario y que el área esté asignada a tu cuenta; si el problema continúa, solicita acceso al supervisor.'
  if (causa.includes('area') && (causa.includes('tasa') || causa.includes('coeficiente') || causa.includes('volumen esperado'))) return 'El área no tiene una configuración compatible con esta receta. Qué hacer: solicita al supervisor que complete los litros por m² y los criterios de limpieza del área antes de continuar.'
  if (causa.includes('producto incompleto') || causa.includes('categorías químicas completas')) return 'El producto no está habilitado para uso operativo. Qué hacer: solicita al supervisor que complete la ficha técnica, categorías químicas, incompatibilidades y hoja de seguridad del producto.'

  return 'El servidor rechazó la receta por una validación de seguridad. Qué hacer: revisa los bloqueos de dosis, mezcla y requisitos ambientales mostrados arriba. Si no hay bloqueos, actualiza la página e informa al supervisor para que revise la configuración del área y los productos.'
}

export default function Recipe() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const { setRecetaActiva } = useOperarioFlow()
  const [area, setArea] = useState<AreaOperario | null>(null)
  const [productos, setProductos] = useState<ProductoOperario[]>([])
  const [productoId, setProductoId] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const [nivel, setNivel] = useState<NivelSuciedad>('media')
  const [nombre, setNombre] = useState('Lavado de pisos')
  const [inicio, setInicio] = useState(() => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16))
  const [tiempo, setTiempo] = useState(30)
  const [aguaUsada, setAguaUsada] = useState<number | ''>('')
  const [productoUsado, setProductoUsado] = useState<number | ''>('')
  const [cantidadesElegidas, setCantidadesElegidas] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmacion, setConfirmacion] = useState(false)

  useEffect(() => {
    let activo = true
    const areaId = params.get('area') || sessionStorage.getItem(AREA_KEY)
    if (!areaId) { navigate('/operario/sitios', { replace: true }); return }
    sessionStorage.setItem(AREA_KEY, areaId)
    Promise.all([listarTodasLasAreas(), listarProductos()]).then(([areas, catalogo]) => {
      if (!activo) return
      const areaEncontrada = areas.find((item) => item.id === areaId)
      if (!areaEncontrada) { navigate('/operario/sitios', { replace: true }); return }
      setArea(areaEncontrada)
      setProductos(catalogo)
      setProductoId(catalogo[0]?.id ?? '')
    })
    return () => { activo = false }
  }, [params, navigate])

  const seleccionados = useMemo(() => ids.map((id) => productos.find((p) => p.id === id)).filter((p): p is ProductoOperario => Boolean(p)), [ids, productos])
  const mezcla = useMemo(() => validarMezcla(seleccionados), [seleccionados])
  const requerimientosEpp = useMemo(() => eppRequerido(seleccionados), [seleccionados])
  const litrosBase = area?.superficie_m2 && area.litros_solucion_por_m2 ? area.superficie_m2 * area.litros_solucion_por_m2 : 0
  const calculos = useMemo(() => seleccionados.map((producto) => {
    try {
      const receta = calcularReceta({ superficie_m2: area?.superficie_m2 ?? 0, litros_solucion_por_m2: area?.litros_solucion_por_m2 ?? 0, nivel_suciedad: nivel, producto })
      const validacion = validarDosis({ producto, ml_por_litro: receta.ml_por_litro, litros_solucion: receta.litros_solucion })
      return { producto, receta, validacion }
    } catch {
      return { producto, receta: null, validacion: { bloquea: true, mensajes: ['No se pudo validar la dosis con los datos actuales.'] } }
    }
  }), [seleccionados, area, nivel])
  const bloqueosDosis = calculos.flatMap((x) => x.validacion.mensajes)
  const totalMl = calculos.reduce((sum, x) => sum + (x.receta?.ml_producto ?? 0), 0)
  const carga = validarCargaTotal(calculos.flatMap((x) => x.receta ? [x.receta.ml_producto] : []), litrosBase)
  const bloqueado = !area || !area.litros_solucion_por_m2 || seleccionados.length === 0 || mezcla.bloquea || calculos.some((x) => x.validacion.bloquea) || carga.bloquea
  const aguaBase = Math.max(0, litrosBase - totalMl / 1000)
  const recipiente = useMemo(() => calculos.reduce<ReturnType<typeof agregarProductoAContenedor>>((items, x, i) => x.receta ? agregarProductoAContenedor(items, { id: x.producto.id, nombre: x.producto.nombre, color: PALETA[i % PALETA.length], ml_producto: x.receta.ml_producto }) : items, []), [calculos])
  const recetaPrincipal = calculos[0]?.receta ?? null
  const validacionesAmbientales = [
    ...seleccionados.filter((producto) => producto.biodegradable !== true).map((producto) => `${producto.nombre}: biodegradabilidad no confirmada en el catálogo.`),
    ...calculos.filter((item) => item.receta && item.receta.ml_por_litro > item.producto.dilucion_max_ml_por_litro).map((item) => `${item.producto.nombre}: la dosis supera el máximo de ficha.`),
    ...(aguaUsada !== '' && Number(aguaUsada) <= 0 ? ['El volumen de agua debe ser mayor a 0 L.'] : []),
    ...(productoUsado !== '' && Number(productoUsado) <= 0 ? ['La dosis aplicada debe ser mayor a 0 ml.'] : []),
    ...(aguaUsada !== '' && productoUsado !== '' && Number(aguaUsada) > 0 && Number(productoUsado) > 0 ? (() => {
      const maximoCombinado = seleccionados.reduce((total, producto) => total + producto.dilucion_max_ml_por_litro, 0)
      const solucionReal = Number(aguaUsada) + Number(productoUsado) / 1000
      return Number(productoUsado) / solucionReal > maximoCombinado ? ['La dosis aplicada excede el máximo combinado del catálogo.'] : []
    })() : []),
  ]
  const puedeEnviar = !bloqueado && validacionesAmbientales.length === 0 && cantidadesElegidas && aguaUsada !== '' && Number(aguaUsada) > 0 && productoUsado !== '' && Number(productoUsado) > 0

  useEffect(() => { setRecetaActiva(recetaPrincipal) }, [recetaPrincipal, setRecetaActiva])

  const agregar = () => {
    if (productoId && !ids.includes(productoId)) setIds((actual) => [...actual, productoId])
  }
  const enviar = async () => {
    if (!puedeEnviar || !area || !recetaPrincipal) {
      if (validacionesAmbientales.length) setError(validacionesAmbientales.join(' '))
      return
    }
    setEnviando(true); setError(null)
    try {
      const primero = calculos[0]
      const receta = primero.receta!
      const desvio = calcularDesvio({ receta: primero.receta!, litros_agua_reales: Number(aguaUsada), ml_producto_reales: Number(productoUsado), dilucion_max_ml_por_litro: primero.producto.dilucion_max_ml_por_litro, tolerancia_pct: operarioConfig.toleranciaSobredosisPct })
      const usuario = obtenerUsuarioActual()
      const tarea = await crearTarea({ area_id: area.id, producto_id: primero.producto.id, productos_receta: calculos.map(({ producto, receta: r }) => ({ producto_id: producto.id, ml_por_litro: r!.ml_por_litro, ml_producto: r!.ml_producto })), tipo_tarea: nombre.trim() || 'Lavado de pisos', nivel_suciedad: nivel, superficie_m2: area.superficie_m2, litros_solucion_por_m2: area.litros_solucion_por_m2!, receta, estado: 'receta_enviada', hora_inicio: inicio ? new Date(inicio).toISOString() : new Date().toISOString(), tiempo_estimado_min: tiempo, operario_id: esUuid(usuario?.id) ? usuario.id : undefined })
      await registrarUso({ tarea_id: tarea.id, variante_id: tarea.variante_id, litros_agua_reales: Number(aguaUsada), ml_producto_reales: Number(productoUsado), duracion_min: tiempo, marca: 'medido', fuente: 'manual', alerta_sobredosis: Boolean(desvio.sobredosis || desvio.supera_maximo_ficha), desvio_pct: desvio.desvio_pct })
      setConfirmacion(true)
      setTimeout(() => navigate('/operario'), 1200)
    } catch (fallo) { setError(mensajeErrorGuardadoReceta(fallo)) }
    finally { setEnviando(false) }
  }

  if (!area) return <div className="operario-shell"><OperarioHeader title="Crear receta" backTo="/operario" /><main className="operario-main"><Spinner label="Cargando el área seleccionada…" /></main></div>

  return <div className="operario-shell">
    <OperarioHeader title="Crear receta" backTo="/operario" />
    <main className="operario-main">
      <PageHeader eyebrow="Operario" title="Preparar receta" description="El área y su superficie fijan el volumen base de la solución." />
      {confirmacion && <Alert tone="success" title="Tarea enviada">La receta fue enviada para revisión.</Alert>}
      <Card className="operario-card recipe-area-summary">
        <p className="section-kicker">Área seleccionada</p>
        <div className="recipe-area-data"><strong>{area.nombre}</strong><span>{formatNumber(area.superficie_m2)} m² · {area.tipo_superficie}</span><strong>{formatNumber(litrosBase)} L de solución base</strong></div>
        {!area.litros_solucion_por_m2 && <Alert tone="error" title="Falta configurar L/m²">El área no tiene un coeficiente de solución y no se puede calcular la receta.</Alert>}
      </Card>
      <Card className="operario-card">
        <p className="section-kicker">Preparación</p>
        <div className="form-grid">
          <Field id="tipo-tarea" label="Tipo o nombre de la tarea" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          <Select id="producto" label="Agregar producto" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
            {productos.map((p) => <option key={p.id} value={p.id}>{p.nombre} · {p.dilucion_min_ml_por_litro}–{p.dilucion_max_ml_por_litro} ml/L</option>)}
          </Select>
          <Button type="button" onClick={agregar} disabled={!productoId || ids.includes(productoId)}>Agregar producto</Button>
          <Select id="nivel-suciedad" label="Nivel de suciedad" value={nivel} onChange={(e) => setNivel(e.target.value as NivelSuciedad)}>
            <option value="baja">Baja</option><option value="media">Media</option><option value="alta">Alta</option>
          </Select>
          <Field id="hora-inicio" label="Hora de inicio" type="datetime-local" value={inicio} onChange={(e) => setInicio(e.target.value)} />
          <Select id="tiempo" label="Tiempo estimado" value={String(tiempo)} onChange={(e) => setTiempo(Number(e.target.value))}>{TIEMPOS.map((m) => <option key={m} value={m}>{m} minutos</option>)}</Select>
        </div>
      </Card>
      <Card className="operario-card">
        <p className="section-kicker">Contenedor de preparación</p>
        {recipiente.length ? <div className="recipe-tank" aria-label="Proporciones de productos en el contenedor"><div className="recipe-tank-liquid"><svg viewBox="0 0 100 100" role="img" aria-label="Distribución proporcional de productos">{recipiente.map((item, i) => <rect key={item.id} className={`recipe-color-${i % PALETA.length}`} x="0" y={recipiente.slice(0, i).reduce((n, part) => n + part.proporcion_pct, 0)} width="100" height={item.proporcion_pct}><title>{item.nombre}: {formatNumber(item.proporcion_pct)}%</title></rect>)}</svg></div><ul>{recipiente.map((item, i) => <li key={item.id}><span className={`recipe-swatch recipe-color-${i % PALETA.length}`} /><strong>{item.nombre}</strong><span>{formatNumber(item.ml_producto)} ml · {formatNumber(item.proporcion_pct)}%</span><Button type="button" variant="ghost" aria-label={`Quitar ${item.nombre}`} onClick={() => setIds((current) => current.filter((id) => id !== item.id))}>Quitar</Button></li>)}</ul></div> : <p className="muted">Agrega uno o más productos para calcular cantidades.</p>}
      </Card>
      <Card className="operario-card recipe-panels">
        <div><p className="section-kicker">Validaciones de seguridad</p>
          {validacionesAmbientales.map((mensaje) => <Alert key={mensaje} tone="error" title="Requisito ambiental no cumplido">{mensaje}</Alert>)}
          {mezcla.mensajes.map((m) => <Alert key={m} tone={mezcla.bloquea ? 'error' : 'warning'} title={mezcla.bloquea ? 'Bloqueo de mezcla' : 'Uso secuencial'}>{m}</Alert>)}
          {[...bloqueosDosis, ...carga.mensajes].map((m) => <Alert key={m} tone="error" title="Bloqueo de dosis">{m}</Alert>)}
          {!seleccionados.length && <Alert tone="warning" title="Receta pendiente">Agrega al menos un producto para habilitar la preparación.</Alert>}
          {seleccionados.length > 0 && !mezcla.bloquea && bloqueosDosis.length === 0 && !carga.bloquea && <Alert tone="success" title="Validaciones completadas">No se encontraron bloqueos en los datos disponibles.</Alert>}
        </div>
        <div><p className="section-kicker">EPP requerido</p>{requerimientosEpp.length ? <ul>{requerimientosEpp.map((item) => <li key={item}>{item}</li>)}</ul> : <Alert tone="warning">El catálogo no especifica EPP. Consulta la hoja de seguridad de cada producto.</Alert>}{seleccionados.map((p) => p.url_hoja_seguridad && <a key={p.id} href={p.url_hoja_seguridad} target="_blank" rel="noreferrer">HDS: {p.nombre}</a>)}</div>
      </Card>
      <Card className="operario-result">
        <p className="section-kicker">Solución calculada</p><div className="result-grid"><div className="result-item"><small>Solución base</small><strong>{formatNumber(litrosBase)} L</strong></div><div className="result-item"><small>Producto total</small><strong>{formatNumber(totalMl)} ml</strong></div><div className="result-item"><small>Agua calculada</small><strong>{formatNumber(aguaBase)} L</strong></div></div>
      </Card>
      {seleccionados.length > 0 && <Card className="operario-card">
        <p className="section-kicker">Declaración de uso real</p><div className="recipe-use-actions"><Button type="button" variant="ghost" disabled={!recetaPrincipal || bloqueado} onClick={() => { setAguaUsada(aguaBase); setProductoUsado(recetaPrincipal!.ml_producto); setCantidadesElegidas(true) }}>Usar cantidades calculadas</Button></div>
        <div className="stepper-grid"><NumberStepper id="agua-usada" label="Agua usada real" value={typeof aguaUsada === 'number' ? aguaUsada : 0} onChange={(v) => { setAguaUsada(v); setCantidadesElegidas(true) }} step={0.5} min={0} max={10000} unit="L"/><NumberStepper id="producto-usado" label={`Producto usado (${seleccionados[0].nombre})`} value={typeof productoUsado === 'number' ? productoUsado : 0} onChange={(v) => { setProductoUsado(v); setCantidadesElegidas(true) }} step={1} min={0} max={100000} unit="ml"/></div>
        {error && <Alert tone="error" title="No se pudo guardar la receta">{error}</Alert>}
        <div className="operario-actions"><Button type="button" onClick={enviar} disabled={!puedeEnviar || enviando}>{enviando ? <Spinner label="Enviando…" /> : 'Registrar uso y enviar a revisión'}</Button></div>
      </Card>}
    </main>
  </div>
}
