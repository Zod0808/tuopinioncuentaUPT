import { useState, useEffect, useMemo } from 'react';
import { FileText, Calendar, Download, Trash2, Eye, BarChart3, TrendingUp, Info } from 'lucide-react';
import { ReporteData, EvaluacionData } from '../types';
import { MatriculadosEntry } from '../services/reportCalculations';
import { getCicloFromDate, esNuevoReglamento } from '../config/universityStructure';
import ReportsTabs from './ReportsTabs';
import ComparativaCiclos from './ComparativaCiclos';

interface ReporteGuardado extends ReporteData {
  id: string;
  fechaCreacion: string;
}

interface ReportsViewProps {
  datos: EvaluacionData[];
  cicloActual: string;
  onGraficoReady?: (element: HTMLElement, index: number) => void;
  esPublico?: boolean;
  matriculados?: MatriculadosEntry[];
}

export default function ReportsView({ datos, cicloActual, onGraficoReady, esPublico = false, matriculados = [] }: ReportsViewProps) {
  const [reportes, setReportes] = useState<ReporteGuardado[]>([]);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteGuardado | null>(null);
  const [vistaReportes, setVistaReportes] = useState<'interactivos' | 'comparativa' | 'generados'>('interactivos');

  useEffect(() => {
    const reportesGuardados = localStorage.getItem('reportesGenerados');
    if (reportesGuardados) {
      try { setReportes(JSON.parse(reportesGuardados)); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    if (reportes.length > 0) localStorage.setItem('reportesGenerados', JSON.stringify(reportes));
  }, [reportes]);

  useEffect(() => {
    const handleReporteGenerado = (event: Event) => {
      const customEvent = event as CustomEvent<ReporteData>;
      const nuevoReporte: ReporteGuardado = {
        ...customEvent.detail,
        id: Date.now().toString(),
        fechaCreacion: new Date().toISOString(),
      };
      setReportes(prev => [nuevoReporte, ...prev]);
    };
    window.addEventListener('reporteGenerado', handleReporteGenerado);
    return () => window.removeEventListener('reporteGenerado', handleReporteGenerado);
  }, []);

  const handleEliminarReporte = (id: string) => {
    if (confirm('¿Está seguro de eliminar este reporte?')) {
      setReportes(prev => prev.filter(r => r.id !== id));
      if (reporteSeleccionado?.id === id) setReporteSeleccionado(null);
    }
  };

  const formatearFecha = (fechaISO: string) =>
    new Date(fechaISO).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });

  const heroStats = useMemo(() => {
    const totalMat = matriculados.reduce((s, m) => s + m.totalMatriculados, 0);
    const totalEnc = matriculados.reduce((s, m) => s + (m.totalEncuestados ?? 0), 0);
    const pct = totalMat > 0 ? (totalEnc / totalMat) * 100 : 0;
    const promedio = datos.length > 0 ? datos.reduce((s, d) => s + d.nota, 0) / datos.length : 0;
    return { totalMat, totalEnc, pct, promedio };
  }, [datos, matriculados]);

  const escalaActual = useMemo(() => {
    if (!esNuevoReglamento(cicloActual)) return [
      { label: 'Destacado', rango: '≥ 17.1', color: '#276749' },
      { label: 'Bueno', rango: '≥ 15.1', color: '#2e7d32' },
      { label: 'Aceptable', rango: '≥ 11.0', color: '#f57c00' },
      { label: 'Insatisfactorio', rango: '< 11.0', color: '#c62828' },
    ];
    return [
      { label: 'Excelente', rango: '≥ 18.0', color: '#276749' },
      { label: 'Muy satisfactorio', rango: '≥ 15.0', color: '#388e3c' },
      { label: 'Satisfactorio', rango: '≥ 12.0', color: '#f57c00' },
      { label: 'Insatisfactorio', rango: '≥ 8.0', color: '#c62828' },
      { label: 'Muy insatisfactorio', rango: '< 8.0', color: '#7f0000' },
    ];
  }, [cicloActual]);

  return (
    <div className="reports-view">
      <div className="reports-view-header">
        <div className="view-switcher">
          <button
            className={`view-switch-button ${vistaReportes === 'interactivos' ? 'active' : ''}`}
            onClick={() => setVistaReportes('interactivos')}
          >
            <BarChart3 size={20} />
            <span>Reportes del Ciclo</span>
          </button>
          {!esPublico && (
            <button
              className={`view-switch-button ${vistaReportes === 'comparativa' ? 'active' : ''}`}
              onClick={() => setVistaReportes('comparativa')}
            >
              <TrendingUp size={20} />
              <span>Comparativa entre Ciclos</span>
            </button>
          )}
          {!esPublico && (
            <button
              className={`view-switch-button ${vistaReportes === 'generados' ? 'active' : ''}`}
              onClick={() => setVistaReportes('generados')}
            >
              <FileText size={20} />
              <span>Reportes Generados</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Reportes del ciclo actual ── */}
      {vistaReportes === 'interactivos' && (
        <div className="reports-interactive">
          {esPublico ? (
            <div className="public-hero">
              <div className="public-hero-text">
                <p className="public-hero-label">Encuesta de Satisfacción Estudiantil</p>
                <h1 className="public-hero-ciclo">Ciclo {cicloActual}</h1>
                <p className="public-hero-desc">
                  Resultados de la evaluación que los estudiantes realizaron sobre el desempeño de sus docentes durante este ciclo académico.
                </p>
              </div>
              {heroStats.totalMat > 0 && (
                <div className="public-hero-stats">
                  <div className="public-hero-stat">
                    <span className="public-hero-num">{heroStats.totalMat.toLocaleString('es-PE')}</span>
                    <span className="public-hero-stat-label">Matriculados</span>
                  </div>
                  <div className="public-hero-divider" />
                  <div className="public-hero-stat">
                    <span className="public-hero-num">{heroStats.pct.toFixed(1)}%</span>
                    <span className="public-hero-stat-label">Participación</span>
                  </div>
                  <div className="public-hero-divider" />
                  <div className="public-hero-stat">
                    <span className="public-hero-num">{heroStats.promedio.toFixed(2)}</span>
                    <span className="public-hero-stat-label">Promedio / 20</span>
                  </div>
                </div>
              )}
              <div className="public-scale-legend">
                <span className="public-scale-legend-title">Escala de calificación:</span>
                {escalaActual.map(e => (
                  <span key={e.label} className="public-scale-pill">
                    <span className="public-scale-dot" style={{ background: e.color }} />
                    {e.label} <span className="public-scale-rango">({e.rango})</span>
                  </span>
                ))}
              </div>
              {(() => {
                const cicloEnCurso = getCicloFromDate();
                if (cicloEnCurso !== cicloActual) return (
                  <div className="public-hero-notice">
                    <Info size={14} />
                    El ciclo {cicloEnCurso} está en curso — se muestran los resultados del ciclo {cicloActual}.
                  </div>
                );
                return null;
              })()}
            </div>
          ) : (
            <div className="ciclo-badge-header">
              <Calendar size={16} />
              Mostrando datos del ciclo: <strong>{cicloActual}</strong>
              {datos.length > 0 && <span className="ciclo-badge-count">{datos.length} registros</span>}
            </div>
          )}
          {datos.length === 0 ? (
            <div className="no-data-container">
              <BarChart3 size={64} />
              <p className="no-data">No hay datos para el ciclo {cicloActual}.</p>
              {esPublico
                ? <p className="hint">Los resultados de este ciclo aún no están disponibles. Vuelve a consultar cuando finalice el período de encuestas.</p>
                : <p className="hint">Importa un Excel desde "Ingreso de Datos" y selecciona el ciclo correcto.</p>
              }
            </div>
          ) : (
            <ReportsTabs datos={datos} onGraficoReady={onGraficoReady} esPublico={esPublico} matriculados={matriculados} cicloActual={cicloActual} />
          )}
        </div>
      )}

      {/* ── Comparativa entre ciclos ── */}
      {vistaReportes === 'comparativa' && (
        <div className="reports-interactive">
          <ComparativaCiclos cicloActual={cicloActual} datosCicloActual={datos} />
        </div>
      )}

      {/* ── Reportes generados (PDF) ── */}
      {vistaReportes === 'generados' && (
        <div className="reports-container">
          <div className="reports-list">
            <h2>Reportes Generados</h2>
            {reportes.length === 0 ? (
              <div className="no-reports">
                <FileText size={48} />
                <p>No hay reportes generados aún</p>
                <p className="hint">Genera un reporte desde la vista de "Ingreso de Datos"</p>
              </div>
            ) : (
              <div className="reports-grid">
                {reportes.map((reporte) => (
                  <div
                    key={reporte.id}
                    className={`report-card ${reporteSeleccionado?.id === reporte.id ? 'selected' : ''}`}
                    onClick={() => setReporteSeleccionado(reporte)}
                  >
                    <div className="report-card-header">
                      <FileText size={24} />
                      <h3>{reporte.titulo}</h3>
                    </div>
                    <div className="report-card-body">
                      <div className="report-info">
                        <Calendar size={16} />
                        <span>{formatearFecha(reporte.fechaCreacion)}</span>
                      </div>
                      <div className="report-stats">
                        <span>{reporte.datos.length} registros</span>
                        <span>{reporte.interpretaciones.length} interpretaciones</span>
                      </div>
                    </div>
                    <div className="report-card-actions">
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); setReporteSeleccionado(reporte); }} title="Ver detalles"><Eye size={18} /></button>
                      <button className="btn-icon" onClick={e => { e.stopPropagation(); alert('Para regenerar el PDF, genera un nuevo reporte desde Ingreso de Datos.'); }} title="Regenerar PDF"><Download size={18} /></button>
                      <button className="btn-icon btn-danger" onClick={e => { e.stopPropagation(); handleEliminarReporte(reporte.id); }} title="Eliminar"><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {reporteSeleccionado && (
            <div className="report-details">
              <div className="report-details-header">
                <h2>Detalles del Reporte</h2>
                <button className="btn-close" onClick={() => setReporteSeleccionado(null)}>×</button>
              </div>
              <div className="report-details-body">
                <div className="detail-section">
                  <h3>Información General</h3>
                  <p><strong>Título:</strong> {reporteSeleccionado.titulo}</p>
                  <p><strong>Fecha generación:</strong> {reporteSeleccionado.fecha}</p>
                  <p><strong>Fecha creación:</strong> {formatearFecha(reporteSeleccionado.fechaCreacion)}</p>
                  <p><strong>Total registros:</strong> {reporteSeleccionado.datos.length}</p>
                </div>
                <div className="detail-section">
                  <h3>Resumen</h3>
                  <div className="summary-stats">
                    <div className="stat-item"><span className="stat-label">Registros:</span><span className="stat-value">{reporteSeleccionado.datos.length}</span></div>
                    <div className="stat-item"><span className="stat-label">Nota promedio:</span><span className="stat-value">{(reporteSeleccionado.datos.reduce((s, d) => s + d.nota, 0) / reporteSeleccionado.datos.length).toFixed(2)}</span></div>
                    <div className="stat-item"><span className="stat-label">Encuestados:</span><span className="stat-value">{reporteSeleccionado.datos.reduce((s, d) => s + d.encuestados, 0)}</span></div>
                  </div>
                </div>
                {reporteSeleccionado.interpretaciones.length > 0 && (
                  <div className="detail-section">
                    <h3>Interpretaciones</h3>
                    {reporteSeleccionado.interpretaciones.map((interp, i) => (
                      <div key={i} className="interpretacion-item"><h4>Gráfico {i + 1}</h4><p>{interp}</p></div>
                    ))}
                  </div>
                )}
                <div className="detail-section">
                  <h3>Vista previa de datos</h3>
                  <table className="preview-table">
                    <thead><tr><th>Docente</th><th>Curso</th><th>Sección</th><th>Nota</th><th>Calificación</th></tr></thead>
                    <tbody>
                      {reporteSeleccionado.datos.slice(0, 10).map((item, i) => (
                        <tr key={i}><td>{item.docente}</td><td>{item.curso}</td><td>{item.seccion}</td><td>{item.nota.toFixed(2)}</td><td>{item.calificacion}</td></tr>
                      ))}
                    </tbody>
                  </table>
                  {reporteSeleccionado.datos.length > 10 && <p className="more-data">... y {reporteSeleccionado.datos.length - 10} registros más</p>}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
