import { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Trash2, Eye, BarChart3 } from 'lucide-react';
import { ReporteData, EvaluacionData } from '../types';
import { generarPDF } from '../services/pdfService';
import ReportsTabs from './ReportsTabs';

interface ReporteGuardado extends ReporteData {
  id: string;
  fechaCreacion: string;
}

interface ReportsViewProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

export default function ReportsView({ datos, onGraficoReady }: ReportsViewProps) {
  const [reportes, setReportes] = useState<ReporteGuardado[]>([]);
  const [reporteSeleccionado, setReporteSeleccionado] = useState<ReporteGuardado | null>(null);

  // Cargar reportes del localStorage
  useEffect(() => {
    const reportesGuardados = localStorage.getItem('reportesGenerados');
    if (reportesGuardados) {
      try {
        setReportes(JSON.parse(reportesGuardados));
      } catch (error) {
        console.error('Error al cargar reportes:', error);
      }
    }
  }, []);

  // Guardar reportes en localStorage
  useEffect(() => {
    if (reportes.length > 0) {
      localStorage.setItem('reportesGenerados', JSON.stringify(reportes));
    }
  }, [reportes]);

  // Escuchar eventos de reporte generado
  useEffect(() => {
    const handleReporteGenerado = (event: Event) => {
      const customEvent = event as CustomEvent<ReporteData>;
      const nuevoReporte: ReporteGuardado = {
        ...customEvent.detail,
        id: Date.now().toString(),
        fechaCreacion: new Date().toISOString()
      };
      setReportes(prev => [nuevoReporte, ...prev]);
    };

    window.addEventListener('reporteGenerado', handleReporteGenerado);
    return () => {
      window.removeEventListener('reporteGenerado', handleReporteGenerado);
    };
  }, []);

  const handleEliminarReporte = (id: string) => {
    if (confirm('¿Está seguro de eliminar este reporte?')) {
      setReportes(prev => prev.filter(r => r.id !== id));
      if (reporteSeleccionado?.id === id) {
        setReporteSeleccionado(null);
      }
    }
  };

  const handleRegenerarPDF = async (reporte: ReporteGuardado) => {
    try {
      // Necesitamos los elementos de gráficos, pero como no los tenemos guardados,
      // mostramos un mensaje
      alert('Para regenerar el PDF, por favor genera un nuevo reporte desde la vista de Ingreso de Datos.');
    } catch (error) {
      console.error('Error al regenerar PDF:', error);
      alert('Error al regenerar el PDF');
    }
  };

  const formatearFecha = (fechaISO: string) => {
    const fecha = new Date(fechaISO);
    return fecha.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const [vistaReportes, setVistaReportes] = useState<'interactivos' | 'generados'>('interactivos');

  return (
    <div className="reports-view">
      <div className="reports-view-header">
        <div className="view-switcher">
          <button
            className={`view-switch-button ${vistaReportes === 'interactivos' ? 'active' : ''}`}
            onClick={() => setVistaReportes('interactivos')}
          >
            <BarChart3 size={20} />
            <span>Reportes Interactivos</span>
          </button>
          <button
            className={`view-switch-button ${vistaReportes === 'generados' ? 'active' : ''}`}
            onClick={() => setVistaReportes('generados')}
          >
            <FileText size={20} />
            <span>Reportes Generados</span>
          </button>
        </div>
      </div>

      {vistaReportes === 'interactivos' ? (
        <div className="reports-interactive">
          {datos.length === 0 ? (
            <div className="no-data-container">
              <BarChart3 size={64} />
              <p className="no-data">No hay datos para generar reportes interactivos.</p>
              <p className="hint">Importa datos desde la vista de "Ingreso de Datos"</p>
            </div>
          ) : (
            <ReportsTabs datos={datos} onGraficoReady={onGraficoReady} />
          )}
        </div>
      ) : (
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
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setReporteSeleccionado(reporte);
                      }}
                      title="Ver detalles"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRegenerarPDF(reporte);
                      }}
                      title="Regenerar PDF"
                    >
                      <Download size={18} />
                    </button>
                    <button
                      className="btn-icon btn-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEliminarReporte(reporte.id);
                      }}
                      title="Eliminar"
                    >
                      <Trash2 size={18} />
                    </button>
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
              <button
                className="btn-close"
                onClick={() => setReporteSeleccionado(null)}
              >
                ×
              </button>
            </div>
            <div className="report-details-body">
              <div className="detail-section">
                <h3>Información General</h3>
                <p><strong>Título:</strong> {reporteSeleccionado.titulo}</p>
                <p><strong>Fecha de generación:</strong> {reporteSeleccionado.fecha}</p>
                <p><strong>Fecha de creación:</strong> {formatearFecha(reporteSeleccionado.fechaCreacion)}</p>
                <p><strong>Total de registros:</strong> {reporteSeleccionado.datos.length}</p>
              </div>

              <div className="detail-section">
                <h3>Resumen de Datos</h3>
                <div className="summary-stats">
                  <div className="stat-item">
                    <span className="stat-label">Total de registros:</span>
                    <span className="stat-value">{reporteSeleccionado.datos.length}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Nota promedio:</span>
                    <span className="stat-value">
                      {(
                        reporteSeleccionado.datos.reduce((sum, d) => sum + d.nota, 0) /
                        reporteSeleccionado.datos.length
                      ).toFixed(2)}
                    </span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Total encuestados:</span>
                    <span className="stat-value">
                      {reporteSeleccionado.datos.reduce((sum, d) => sum + d.encuestados, 0)}
                    </span>
                  </div>
                </div>
              </div>

              {reporteSeleccionado.interpretaciones.length > 0 && (
                <div className="detail-section">
                  <h3>Interpretaciones</h3>
                  {reporteSeleccionado.interpretaciones.map((interp, index) => (
                    <div key={index} className="interpretacion-item">
                      <h4>Gráfico {index + 1}</h4>
                      <p>{interp}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="detail-section">
                <h3>Datos del Reporte</h3>
                <div className="data-preview">
                  <table className="preview-table">
                    <thead>
                      <tr>
                        <th>Docente</th>
                        <th>Curso</th>
                        <th>Sección</th>
                        <th>Nota</th>
                        <th>Calificación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reporteSeleccionado.datos.slice(0, 10).map((item, index) => (
                        <tr key={index}>
                          <td>{item.docente}</td>
                          <td>{item.curso}</td>
                          <td>{item.seccion}</td>
                          <td>{item.nota.toFixed(2)}</td>
                          <td>{item.calificacion}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {reporteSeleccionado.datos.length > 10 && (
                    <p className="more-data">
                      ... y {reporteSeleccionado.datos.length - 10} registros más
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      )}
    </div>
  );
}

