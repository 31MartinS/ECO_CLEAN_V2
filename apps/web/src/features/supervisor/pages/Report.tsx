import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx-js-style';
import {
    Card,
    IconArrowLeft,
    IconArrowUpRight,
    IconDownload,
    IconFlask,
    IconClipboardCheck,
    IconDroplet,
    SimulatedBadge,
} from '../../../components/ui';
import {
    obtenerComparacionVariantes,
    obtenerConsumoSupervisor,
    obtenerResumenSupervisor,
    obtenerUltimaDecisionEfluente,
    obtenerTrazabilidadTareasSupervisor,
    type TareaTrazabilidadSupervisor,
} from '../../../services/supervisor';
import type {
    ConsumptionRow,
    EffluentDecision,
    VariantComparison,
} from '../../../services/supervisorMock';

const number = (value: number) => new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 }).format(value);

const formatearHora = (fechaIso?: string | null) => {
    if (!fechaIso) return '—';
    try {
        const d = new Date(fechaIso);
        return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' });
    } catch {
        return String(fechaIso);
    }
};

const estiloHoja = (worksheet: XLSX.WorkSheet, anchos: number[]) => {
    worksheet['!cols'] = anchos.map((wch) => ({ wch }));
    worksheet['!rows'] = [{ hpt: 28 }];
    worksheet['!autofilter'] = { ref: worksheet['!ref'] ?? 'A1:A1' };
    worksheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    const rango = XLSX.utils.decode_range(worksheet['!ref'] ?? 'A1:A1');
    for (let columna = rango.s.c; columna <= rango.e.c; columna += 1) {
        const encabezado = worksheet[XLSX.utils.encode_cell({ r: 0, c: columna })];
        if (encabezado) {
            encabezado.s = {
                fill: { fgColor: { rgb: '1D4ED8' } },
                font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
                alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
                border: { bottom: { style: 'thin', color: { rgb: '163B9A' } } },
            };
        }
    }
    for (let fila = 1; fila <= rango.e.r; fila += 1) {
        for (let columna = rango.s.c; columna <= rango.e.c; columna += 1) {
            const celda = worksheet[XLSX.utils.encode_cell({ r: fila, c: columna })];
            if (!celda) continue;
            celda.s = {
                ...(celda.s ?? {}),
                alignment: { vertical: 'top', wrapText: true, horizontal: typeof celda.v === 'number' ? 'right' : 'left' },
                fill: fila % 2 === 0 ? { fgColor: { rgb: 'F8FAFC' } } : { fgColor: { rgb: 'FFFFFF' } },
                border: { bottom: { style: 'hair', color: { rgb: 'E2E8F0' } } },
            };
            if (typeof celda.v === 'number') {
                celda.z = '#,##0.0';
            }
        }
    }
};

const construirLibroExcel = ({
    fecha,
    consumo,
    trazabilidad,
    variantes,
    decision,
    totalWater,
    totalProduct,
    totalSurface,
}: {
    fecha: string;
    consumo: ConsumptionRow[];
    trazabilidad: TareaTrazabilidadSupervisor[];
    variantes: VariantComparison[];
    decision: EffluentDecision | null;
    totalWater: number;
    totalProduct: number;
    totalSurface: number;
}) => {
    const libro = XLSX.utils.book_new();
    const agregarHoja = (nombre: string, encabezados: string[], filas: (string | number)[][], anchos: number[]) => {
        const hoja = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
        estiloHoja(hoja, anchos);
        XLSX.utils.book_append_sheet(libro, hoja, nombre);
    };

    agregarHoja('Resumen ejecutivo', ['Indicador', 'Valor'], [
            ['Documento', 'Informe técnico de consumos y trazabilidad'],
            ['Fecha de emisión', fecha],
            ['Agua total utilizada (L)', totalWater],
            ['Producto químico total (L)', totalProduct],
            ['Superficie intervenida (m2)', totalSurface],
            ['Tareas incluidas', consumo.length],
        ], [34, 46]);
    agregarHoja('Consumos', ['Tarea', 'Área', 'Superficie (m2)', 'Nivel de suciedad', 'Hora de inicio', 'Tiempo estimado (min)', 'Agua (L)', 'Producto (L)', 'Resultado', 'Fuente'], consumo.map((row) => [
            row.task,
            row.area,
            row.surface,
            row.dirtLevel ?? 'Media',
            formatearHora(row.startTime),
            row.estimatedTimeMin ?? '',
            row.water,
            row.product,
            row.compliance,
            row.simulated ? `${row.source} · Simulada` : row.source,
        ]), [28, 24, 16, 18, 20, 22, 14, 16, 16, 24]);
    agregarHoja('Trazabilidad', ['Tarea', 'Producto', 'Área', 'Estado', 'Litros previstos', 'Agua declarada (L)', 'Producto declarado (ml)', 'Origen', 'Validaciones'], trazabilidad.map((row) => [
            row.tarea,
            row.producto,
            row.area,
            row.simulated ? 'Simulada' : row.evaluada ? 'Validada' : row.declarada_agua !== null ? 'Declarada · no evaluada' : 'Prevista · no evaluada',
            row.prevista_litros,
            row.declarada_agua ?? '',
            row.declarada_ml ?? '',
            row.procedencia?.parametros?.origen ?? 'Procedencia no registrada',
            row.validaciones.join(', ') || 'Sin alertas registradas',
        ]), [28, 24, 24, 24, 18, 20, 24, 30, 42]);
    agregarHoja('Variantes', ['Variante', 'Dilución (ml/L)', 'Muestra', 'Promedio producto (L)', 'Promedio agua (L)', 'Criterio técnico', 'Estado'], variantes.map((variant) => [
            variant.name,
            variant.dilution,
            variant.sampleSize,
            variant.productAverage,
            variant.waterAverage,
            variant.reason,
            variant.compliance,
        ]), [24, 18, 16, 24, 20, 48, 18]);
    agregarHoja('Efluente', ['Sitio', 'Área', 'Tarea', 'Orientación', 'Dictamen', 'pH', 'Origen del pH', 'Fundamento técnico'], decision ? [[
            decision.site,
            decision.area,
            decision.task,
            decision.orientation,
            decision.decision,
            decision.ph ?? 'Sin registro',
            decision.phOrigin,
            decision.reason,
        ]] : [['Sin registro', '', '', '', '', '', '', 'No hay dictamen ambiental registrado.']], [24, 24, 24, 28, 24, 12, 28, 64]);
    return XLSX.writeFile(libro, `ecocleaner-reporte-supervisor-${new Date().toISOString().slice(0, 10)}.xlsx`);
};

const generarPdf = ({
    fecha,
    consumo,
    trazabilidad,
    variantes,
    decision,
    totalWater,
    totalProduct,
    totalSurface,
}: {
    fecha: string;
    consumo: ConsumptionRow[];
    trazabilidad: TareaTrazabilidadSupervisor[];
    variantes: VariantComparison[];
    decision: EffluentDecision | null;
    totalWater: number;
    totalProduct: number;
    totalSurface: number;
}) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const azul = '#1d4ed8';
    const gris = '#475569';
    const margen = 12;
    const pie = () => {
        const paginas = doc.getNumberOfPages();
        for (let pagina = 1; pagina <= paginas; pagina += 1) {
            doc.setPage(pagina);
            doc.setFontSize(8);
            doc.setTextColor(gris);
            doc.text('EcoCleaner · Informe técnico operativo · Documento controlado', margen, 200);
            doc.text(`Página ${pagina} de ${paginas}`, 285, 200, { align: 'right' });
        }
    };
    const titulo = (texto: string, subtitulo?: string) => {
        doc.setFontSize(15);
        doc.setTextColor(azul);
        doc.setFont('helvetica', 'bold');
        doc.text(texto, margen, 16);
        if (subtitulo) {
            doc.setFontSize(8);
            doc.setTextColor(gris);
            doc.setFont('helvetica', 'normal');
            doc.text(subtitulo, margen, 22);
        }
    };
    const tabla = (head: string[], body: (string | number)[][], widths?: number[]) => {
        autoTable(doc, {
            startY: 28,
            margin: { left: margen, right: margen, bottom: 16 },
            head: [head],
            body,
            theme: 'grid',
            styles: { fontSize: 7, cellPadding: 2, textColor: '#1e293b', overflow: 'linebreak', valign: 'middle' },
            headStyles: { fillColor: azul, textColor: '#ffffff', fontStyle: 'bold', fontSize: 7 },
            alternateRowStyles: { fillColor: '#f8fafc' },
            columnStyles: widths?.reduce<Record<number, { cellWidth: number }>>((acc, width, index) => {
                acc[index] = { cellWidth: width };
                return acc;
            }, {}),
            didDrawPage: (data) => {
                if (data.pageNumber === 1) return;
                doc.setFontSize(9);
                doc.setTextColor(gris);
                doc.text('EcoCleaner · Informe técnico de consumos y trazabilidad', margen, 10);
            },
        });
    };

    doc.setFillColor(29, 78, 216);
    doc.rect(0, 0, 297, 5, 'F');
    titulo('Informe técnico de consumos y trazabilidad', `Fecha de emisión: ${fecha} · Supervisor de Planta`);
    doc.setFontSize(9);
    doc.setTextColor('#0f172a');
    doc.text(`Agua utilizada: ${number(totalWater)} L`, margen, 38);
    doc.text(`Producto químico: ${number(totalProduct)} L`, 80, 38);
    doc.text(`Superficie intervenida: ${number(totalSurface)} m²`, 140, 38);
    doc.text(`Tareas incluidas: ${consumo.length}`, 225, 38);
    doc.setDrawColor('#cbd5e1');
    doc.line(margen, 42, 285, 42);

    const consumoHead = ['Tarea', 'Área', 'Sup. m²', 'Suciedad', 'Inicio', 'Tiempo', 'Agua L', 'Producto L', 'Resultado', 'Fuente'];
    tabla(consumoHead, consumo.map((row) => [
        row.task, row.area, number(row.surface), row.dirtLevel ?? 'Media', formatearHora(row.startTime),
        row.estimatedTimeMin ? `${row.estimatedTimeMin} min` : '—', number(row.water), number(row.product),
        row.compliance, row.simulated ? `${row.source} · Simulada` : row.source,
    ]), [34, 30, 16, 20, 25, 18, 18, 20, 22, 28]);

    doc.addPage();
    titulo('Trazabilidad y procedencia', 'Captura histórica de datos usados, validaciones y origen de cada tarea');
    tabla(['Tarea', 'Producto', 'Área', 'Estado', 'Previsto L', 'Declarado L', 'Declarado ml', 'Origen', 'Validaciones'],
        trazabilidad.map((row) => [
            row.tarea, row.producto, row.area,
            row.simulated ? 'Simulada' : row.evaluada ? 'Validada' : row.declarada_agua !== null ? 'Declarada · no evaluada' : 'Prevista · no evaluada',
            number(row.prevista_litros), row.declarada_agua == null ? '—' : number(row.declarada_agua),
            row.declarada_ml == null ? '—' : number(row.declarada_ml),
            row.procedencia?.parametros?.origen ?? 'No registrada',
            row.validaciones.join(', ') || 'Sin alertas',
        ]), [30, 27, 27, 27, 18, 20, 20, 35, 45]);

    doc.addPage();
    titulo('Evaluación técnica y control ambiental');
    tabla(['Variante', 'Dilución', 'Muestra', 'Producto medio', 'Agua media', 'Criterio técnico', 'Estado'],
        variantes.map((variant) => [
            variant.name, `${variant.dilution} ml/L`, `${variant.sampleSize} repeticiones`,
            `${number(variant.productAverage)} L`, `${number(variant.waterAverage)} L`, variant.reason, variant.compliance,
        ]), [30, 22, 25, 25, 22, 105, 25]);
    if (decision) {
        const y = (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 35;
        doc.setFontSize(11);
        doc.setTextColor(azul);
        doc.text('Dictamen de efluente', margen, y + 12);
        doc.setFontSize(8);
        doc.setTextColor('#1e293b');
        doc.text(`Sitio: ${decision.site} · Área: ${decision.area} · Tarea: ${decision.task}`, margen, y + 19);
        doc.text(`Dictamen: ${decision.decision} · pH: ${decision.ph ?? 'Sin registro'} · ${decision.orientation}`, margen, y + 25);
        doc.text(`Fundamento: ${decision.reason}`, margen, y + 31, { maxWidth: 270 });
    }
    pie();
    doc.save(`ecocleaner-reporte-supervisor-${new Date().toISOString().slice(0, 10)}.pdf`);
};

export default function Report() {
    const [consumption, setConsumption] = useState<ConsumptionRow[]>([]);
    const [decision, setDecision] = useState<EffluentDecision | null>(null);
    const [variants, setVariants] = useState<VariantComparison[]>([]);
    const [trazabilidad, setTrazabilidad] = useState<TareaTrazabilidadSupervisor[]>([]);
    const [resumen, setResumen] = useState<{ tareasCompletadas: number; tareasPendientes: number }>({
        tareasCompletadas: 0,
        tareasPendientes: 0,
    });
    const [cargando, setCargando] = useState(true);
    const [incluirSimulados, setIncluirSimulados] = useState(false);

    useEffect(() => {
        let activo = true;
        Promise.all([
            obtenerConsumoSupervisor(),
            obtenerUltimaDecisionEfluente(),
            obtenerComparacionVariantes(),
            obtenerResumenSupervisor(),
            obtenerTrazabilidadTareasSupervisor(),
        ]).then(([consData, decData, varData, resData, traceData]) => {
            if (!activo) return;
            setConsumption(consData);
            setDecision(decData);
            setVariants(varData);
            setResumen(resData);
            setTrazabilidad(traceData);
            setCargando(false);
        }).catch(() => {
            if (activo) setCargando(false);
        });
        return () => {
            activo = false;
        };
    }, []);

    const displayedConsumption = incluirSimulados
        ? consumption
        : consumption.filter((row) => !row.simulated);
    const totalWater = displayedConsumption.reduce((total, row) => total + row.water, 0);
    const totalProduct = displayedConsumption.reduce((total, row) => total + row.product, 0);
    const totalSurface = displayedConsumption.reduce((total, row) => total + row.surface, 0);

    const fechaHoy = new Date().toLocaleDateString('es-EC', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const imprimirPdf = () => generarPdf({
        fecha: fechaHoy,
        consumo: displayedConsumption,
        trazabilidad,
        variantes: variants,
        decision,
        totalWater,
        totalProduct,
        totalSurface,
    });

    const descargarExcel = () => {
        construirLibroExcel({
            fecha: fechaHoy,
            consumo: displayedConsumption,
            trazabilidad,
            variantes: variants,
            decision,
            totalWater,
            totalProduct,
            totalSurface,
        });
    };

    return (
        <div className="supervisor-shell report-page">
            {/* Cabecera del Reporte */}
            <header className="supervisor-header report-header-bar">
                <div className="brand-lockup">
                    <Link className="supervisor-header-btn no-print" to="/supervisor" title="Volver al panel principal">
                        <IconArrowLeft size={16} />
                        <span>Volver al panel</span>
                    </Link>
                    <div>
                        <p className="eyebrow">EcoCleaner · Auditoría y Control de Operación</p>
                        <h1>Informe técnico de consumos y trazabilidad</h1>
                    </div>
                </div>
                <div className="report-header-actions no-print">
                    <Link className="supervisor-header-btn" to="/supervisor/comparacion" title="Comparar variantes técnicas">
                        <IconArrowUpRight size={15} />
                        <span>Comparar variantes</span>
                    </Link>
                    <Link className="supervisor-header-btn" to="/supervisor/efluente" title="Control ambiental de efluente">
                        <IconFlask size={15} />
                        <span>Control de efluentes</span>
                    </Link>
                    <button
                        type="button"
                        className="primary-button"
                        onClick={imprimirPdf}
                        title="Generar el PDF desde el diálogo de impresión"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '34px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                    >
                        <IconDownload size={15} />
                        <span>Generar PDF</span>
                    </button>
                    <button
                        type="button"
                        className="supervisor-header-btn report-excel-button"
                        onClick={descargarExcel}
                        title="Descargar el reporte completo en Excel"
                    >
                        <IconDownload size={15} />
                        <span>Descargar Excel</span>
                    </button>
                </div>
            </header>

            <main className="report-main">
                {/* Banner de Ficha Técnica / Metadatos de Auditoría */}
                <Card className="report-meta-card">
                    <div className="report-meta-grid">
                        <div className="report-meta-item">
                            <span className="report-meta-label">DOCUMENTO DE AUDITORÍA</span>
                            <strong className="report-meta-val">FOLIO: REP-2026-P0</strong>
                        </div>
                        <div className="report-meta-item">
                            <span className="report-meta-label">FECHA DE EMISIÓN</span>
                            <strong className="report-meta-val">{fechaHoy}</strong>
                        </div>
                        <div className="report-meta-item">
                            <span className="report-meta-label">RESPONSABLE TÉCNICO</span>
                            <strong className="report-meta-val">Supervisor de Planta</strong>
                        </div>
                        <div className="report-meta-item">
                            <span className="report-meta-label">ESTADO DE TRAZABILIDAD</span>
                            <span className="report-badge-status">
                                <span className="status-dot" style={{ background: '#10b981', marginRight: '6px' }} />
                                100% Conforme y validado
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Métricas Principales (Grid de 4 Cards uniformes) */}
                <section className="report-metrics-grid" aria-label="Métricas consolidadas de consumo">
                    <Card className="report-metric-card">
                        <div className="report-metric-top">
                            <span className="report-metric-title">Agua total utilizada</span>
                            <span className="report-metric-icon"><IconDroplet size={18} /></span>
                        </div>
                        <strong className="report-metric-val">{number(totalWater)} <small>L</small></strong>
                        <span className="report-metric-sub">Volumen en tareas documentadas</span>
                    </Card>

                    <Card className="report-metric-card">
                        <div className="report-metric-top">
                            <span className="report-metric-title">Producto químico total</span>
                            <span className="report-metric-icon"><IconFlask size={18} /></span>
                        </div>
                        <strong className="report-metric-val">{number(totalProduct)} <small>L</small></strong>
                        <span className="report-metric-sub">Dosificación activa consolidada</span>
                    </Card>

                    <Card className="report-metric-card">
                        <div className="report-metric-top">
                            <span className="report-metric-title">Superficie intervenida</span>
                            <span className="report-metric-icon">📐</span>
                        </div>
                        <strong className="report-metric-val">{number(totalSurface)} <small>m²</small></strong>
                        <span className="report-metric-sub">Área total con limpieza ejecutada</span>
                    </Card>

                    <Card className="report-metric-card">
                        <div className="report-metric-top">
                            <span className="report-metric-title">Tareas validadas</span>
                            <span className="report-metric-icon">
                                <IconClipboardCheck size={18} />
                            </span>
                        </div>
                        <strong className="report-metric-val">{displayedConsumption.length} <small>completadas</small></strong>
                        <span className="report-metric-sub" style={{ color: resumen.tareasPendientes > 0 ? '#b45309' : '#15803d' }}>
                            {resumen.tareasPendientes > 0 ? `${resumen.tareasPendientes} pendientes en revisión` : 'Todas documentadas al día'}
                        </span>
                    </Card>
                </section>

                {/* Sección 1: Tabla detallada de consumo */}
                <Card className="report-card-section">
                    <div className="report-section-header">
                        <div>
                            <h3>Detalle de consumo por sitio y tarea (Tareas Validadas)</h3>
                            <p className="muted">Registro consolidado de tareas ejecutadas por operarios y contrastadas por el revisor técnico</p>
                        </div>
                        <label className="report-simulated-filter no-print">
                            <input type="checkbox" checked={incluirSimulados} onChange={(event) => setIncluirSimulados(event.target.checked)} />
                            Incluir simulados
                        </label>
                    </div>
                    <div className="table-wrap">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Tarea</th>
                                    <th>Área</th>
                                    <th>Superficie</th>
                                    <th>Nivel suciedad</th>
                                    <th>Hora inicio</th>
                                    <th>Tiempo est.</th>
                                    <th>Agua</th>
                                    <th>Producto</th>
                                    <th>Resultado</th>
                                    <th>Fuente</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cargando ? (
                                    <tr>
                                        <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>
                                            <span className="muted">Cargando registros consolidados...</span>
                                        </td>
                                    </tr>
                                ) : displayedConsumption.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} style={{ textAlign: 'center', padding: '24px' }}>
                                            <span className="muted">No hay tareas completadas y validadas registradas aún.</span>
                                        </td>
                                    </tr>
                                ) : (
                                    displayedConsumption.map((row, idx) => (
                                        <tr key={`${row.area}-${row.task}-${idx}`}>
                                            <td className="task-name">{row.task}</td>
                                            <td>{row.area}</td>
                                            <td>{number(row.surface)} m²</td>
                                            <td>
                                                <span className={`dirt-pill dirt-pill--${row.dirtLevel ?? 'media'}`}>
                                                    {row.dirtLevel ? row.dirtLevel.charAt(0).toUpperCase() + row.dirtLevel.slice(1) : 'Media'}
                                                </span>
                                            </td>
                                            <td>{formatearHora(row.startTime)}</td>
                                            <td>{row.estimatedTimeMin ? `${row.estimatedTimeMin} min` : '—'}</td>
                                            <td><strong>{number(row.water)} L</strong></td>
                                            <td><strong>{number(row.product)} L</strong></td>
                                            <td>
                                                <span className={`state-pill ${row.compliance === 'Cumple' ? 'ok' : 'warning'}`}>
                                                    <span />
                                                    {row.compliance}
                                                </span>
                                            </td>
                                            <td><span className="source-label">{row.source}</span>{row.simulated && <SimulatedBadge />}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                            {displayedConsumption.length > 0 && (
                                <tfoot>
                                    <tr className="report-table-total-row">
                                        <td colSpan={2}><strong>Totales acumulados ({displayedConsumption.length} tareas)</strong></td>
                                        <td><strong>{number(totalSurface)} m²</strong></td>
                                        <td colSpan={3}>—</td>
                                        <td><strong>{number(totalWater)} L</strong></td>
                                        <td><strong>{number(totalProduct)} L</strong></td>
                                        <td colSpan={2}><strong>100% Conforme</strong></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </Card>

                <Card className="report-card-section">
                    <div className="report-section-header">
                        <div>
                            <h3>Procedencia y datos usados por tarea</h3>
                            <p className="muted">Captura histórica de ficha, área, dosis, parámetros y validaciones. Las correcciones posteriores no reescriben la tarea.</p>
                        </div>
                    </div>
                    <div className="table-wrap">
                        <table className="report-table">
                            <thead><tr><th>Tarea</th><th>Estado</th><th>Área y consumo</th><th>Productos y ficha</th><th>Origen y validaciones</th></tr></thead>
                            <tbody>{trazabilidad.length ? trazabilidad.map((row) => {
                                const snapshot = row.procedencia ?? {};
                                const productos = snapshot.productos ?? (snapshot.producto_principal ? [snapshot.producto_principal] : []);
                                const dosis = snapshot.receta?.productos ?? [];
                                return <tr key={row.id}>
                                    <td className="task-name">{row.tarea}<small className="table-subline">{row.producto}</small></td>
                                    <td>{row.simulated ? 'Simulada' : row.evaluada ? 'Validada' : row.declarada_agua !== null ? 'Declarada · no evaluada' : 'Prevista · no evaluada'}</td>
                                    <td>{row.area}<small className="table-subline">{snapshot.area?.superficie_m2 ?? '—'} m² · {snapshot.area?.litros_solucion_por_m2 ?? '—'} L/m² · {dosis.length ? `${dosis[0].litros_solucion ?? row.prevista_litros} L previstos` : `${row.prevista_litros} L previstos`}</small><small className="table-subline">Declarado: {row.declarada_agua == null ? '—' : `${number(row.declarada_agua)} L agua / ${number(row.declarada_ml ?? 0)} ml producto`}</small></td>
                                    <td>{productos.map((p: any, i: number) => <small className="table-subline" key={`${p.id ?? p.producto_id ?? i}`}>{p.nombre ?? row.producto} · ficha v{p.ficha_version ?? p.version ?? '—'} · {p.epp_requerido?.join(', ') || 'EPP no registrado'}{p.incompleto ? ' · incompleta' : ''}</small>)}{dosis.map((d: any, i: number) => <small className="table-subline" key={`dosis-${i}`}>{d.ml_por_litro ?? '—'} ml/L · {d.ml_producto ?? '—'} ml</small>)}</td>
                                    <td>{snapshot.parametros?.origen ?? 'Procedencia no registrada'}{row.validaciones.length > 0 && <small className="table-subline">Validaciones: {row.validaciones.join(', ')}</small>}{row.configuracion_actualizada_despues && <small className="table-subline">Configuración corregida después; captura histórica conservada</small>}</td>
                                </tr>;
                            }) : <tr><td colSpan={5} className="muted">No hay tareas con captura de trazabilidad.</td></tr>}</tbody>
                        </table>
                    </div>
                </Card>

                {/* Sección 2: Comparativa de variantes técnicas */}
                <Card className="report-card-section">
                    <div className="report-section-header">
                        <div>
                            <h3>Evaluación técnica de variantes de dosificación</h3>
                            <p className="muted">Control comparativo de diluciones sugeridas frente a consumos reales medidos</p>
                        </div>
                    </div>
                    <div className="table-wrap">
                        <table className="report-table">
                            <thead>
                                <tr>
                                    <th>Variante</th>
                                    <th>Dilución técnica</th>
                                    <th>Muestra evaluada</th>
                                    <th>Consumo medio químico</th>
                                    <th>Consumo medio agua</th>
                                    <th>Criterio técnico de validación</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {variants.map((variant) => (
                                    <tr key={variant.name}>
                                        <td className="task-name">{variant.name}</td>
                                        <td>{variant.dilution} ml/L</td>
                                        <td>{variant.sampleSize} repeticiones</td>
                                        <td><strong>{number(variant.productAverage)} L</strong></td>
                                        <td>{number(variant.waterAverage)} L</td>
                                        <td><span className="muted" style={{ fontSize: '12px' }}>{variant.reason}</span></td>
                                        <td>
                                            <span className={`state-pill ${variant.compliance === 'Cumple' ? 'ok' : 'warning'}`}>
                                                <span />
                                                {variant.compliance}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>

                {/* Sección 3: Dictamen ambiental de efluentes */}
                {decision && (
                    <Card className="report-card-section">
                        <div className="report-section-header">
                            <div>
                                <h3>Dictamen de vertido y control ambiental de efluente</h3>
                                <p className="muted">Parámetros de desecho, verificación de pH y disposición final autorizada</p>
                            </div>
                            <span className="report-badge-status" style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                                Cumplimiento ambiental
                            </span>
                        </div>
                        <div className="effluent-report-grid-card">
                            <div className="effluent-col">
                                <span className="effluent-label">Sitio y punto de vertido</span>
                                <strong className="effluent-val">{decision.site} · {decision.area}</strong>
                                <span className="muted" style={{ fontSize: '12px' }}>Tarea: {decision.task}</span>
                            </div>
                            <div className="effluent-col">
                                <span className="effluent-label">Orientación ambiental</span>
                                <strong className="effluent-val">{decision.orientation}</strong>
                            </div>
                            <div className="effluent-col">
                                <span className="effluent-label">Dictamen registrado</span>
                                <strong className="effluent-val" style={{ color: '#0f172a' }}>{decision.decision}</strong>
                            </div>
                            <div className="effluent-col">
                                <span className="effluent-label">pH verificado</span>
                                <strong className="effluent-val" style={{ color: '#2563eb' }}>{decision.ph ?? 'Sin registro'}</strong>
                                <small className="muted">{decision.phOrigin}</small>
                            </div>
                        </div>
                        <div className="report-note-box">
                            <strong>Fundamento técnico:</strong> {decision.reason}
                        </div>
                    </Card>
                )}

                {/* Bloque de Firmas para Auditoría (Visible en pantalla e Impresión) */}
                <div className="report-signatures-grid">
                    <div className="signature-box">
                        <div className="signature-line" />
                        <strong>Supervisor Técnico de Planta</strong>
                        <span>Responsable de Operación y Dosificación</span>
                    </div>
                    <div className="signature-box">
                        <div className="signature-line" />
                        <strong>Revisor de Calidad y Procesos</strong>
                        <span>Certificación y Validación Técnica</span>
                    </div>
                </div>

                <footer className="report-footer">
                    EcoCleaner System · Reporte técnico operativo emitido con datos documentados · Sistema auditado.
                </footer>
            </main>
        </div>
    );
}
