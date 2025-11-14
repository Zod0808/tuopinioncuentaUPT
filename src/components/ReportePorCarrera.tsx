import { useState, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import { EvaluacionData } from '../types';
import { Users, TrendingUp, Award, BookOpen } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReportePorCarreraProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

export default function ReportePorCarrera({ datos, onGraficoReady }: ReportePorCarreraProps) {
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');
  const grafico1Ref = useRef<HTMLDivElement>(null);
  const grafico2Ref = useRef<HTMLDivElement>(null);
  const grafico3Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onGraficoReady && carreraSeleccionada) {
      grafico1Ref.current && onGraficoReady(grafico1Ref.current, 0);
      grafico2Ref.current && onGraficoReady(grafico2Ref.current, 1);
      grafico3Ref.current && onGraficoReady(grafico3Ref.current, 2);
    }
  }, [datos, carreraSeleccionada, onGraficoReady]);

  if (datos.length === 0) {
    return (
      <div className="reporte-carrera">
        <p className="no-data">No hay datos para generar reportes por carrera. Importa datos primero.</p>
      </div>
    );
  }

  // Obtener carreras disponibles
  const carreras = [...new Set(datos.map(d => d.carreraProfesional))].sort();

  // Si no hay carrera seleccionada, seleccionar la primera por defecto
  useEffect(() => {
    if (!carreraSeleccionada && carreras.length > 0) {
      setCarreraSeleccionada(carreras[0]);
    }
  }, [carreras, carreraSeleccionada]);

  if (!carreraSeleccionada) {
    return (
      <div className="reporte-carrera">
        <p className="no-data">Cargando...</p>
      </div>
    );
  }

  // Filtrar datos por carrera seleccionada
  const datosCarrera = datos.filter(d => d.carreraProfesional === carreraSeleccionada);

  if (datosCarrera.length === 0) {
    return (
      <div className="reporte-carrera">
        <div className="career-selector">
          <label htmlFor="carrera-select">
            <BookOpen size={20} />
            Seleccionar Carrera Profesional:
          </label>
          <select
            id="carrera-select"
            value={carreraSeleccionada}
            onChange={(e) => setCarreraSeleccionada(e.target.value)}
            className="career-select"
          >
            {carreras.map(carrera => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
        </div>
        <p className="no-data">No hay datos para la carrera seleccionada.</p>
      </div>
    );
  }

  // Calcular estadísticas de la carrera
  const totalEncuestados = datosCarrera.reduce((sum, d) => sum + d.encuestados, 0);
  const totalNoEncuestados = datosCarrera.reduce((sum, d) => sum + d.noEncuestados, 0);
  const totalEstudiantes = totalEncuestados + totalNoEncuestados;
  const porcentajeEncuestados = totalEstudiantes > 0 
    ? ((totalEncuestados / totalEstudiantes) * 100).toFixed(2) 
    : '0.00';

  const promedioAE01 = datosCarrera.length > 0 
    ? datosCarrera.reduce((sum, d) => sum + d.ae01, 0) / datosCarrera.length 
    : 0;
  const promedioAE02 = datosCarrera.length > 0 
    ? datosCarrera.reduce((sum, d) => sum + d.ae02, 0) / datosCarrera.length 
    : 0;
  const promedioAE03 = datosCarrera.length > 0 
    ? datosCarrera.reduce((sum, d) => sum + d.ae03, 0) / datosCarrera.length 
    : 0;
  const promedioAE04 = datosCarrera.length > 0 
    ? datosCarrera.reduce((sum, d) => sum + d.ae04, 0) / datosCarrera.length 
    : 0;
  const notaPromedioGeneral = datosCarrera.length > 0
    ? datosCarrera.reduce((sum, d) => sum + d.nota, 0) / datosCarrera.length
    : 0;

  // Agrupar por docente
  const docentes = [...new Set(datosCarrera.map(d => d.docente))].sort();
  const datosPorDocente = docentes.map(docente => {
    const datosDocente = datosCarrera.filter(d => d.docente === docente);
    const promedio = datosDocente.reduce((sum, d) => sum + d.nota, 0) / datosDocente.length;
    return { docente, promedio, cantidad: datosDocente.length };
  }).sort((a, b) => b.promedio - a.promedio);

  // Gráfico 1: Promedios por aspectos académicos
  const aspectosLabels = [
    'AE-01: Sílabo',
    'AE-02: Enseñanza',
    'AE-03: Evaluación',
    'AE-04: Actitudinal'
  ];
  const chart1Data = {
    labels: aspectosLabels,
    datasets: [{
      label: 'Promedio',
      data: [promedioAE01, promedioAE02, promedioAE03, promedioAE04],
      backgroundColor: 'rgba(75, 192, 192, 0.8)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 2: Top 10 docentes por promedio
  const topDocentes = datosPorDocente.slice(0, 10);
  const chart2Data = {
    labels: topDocentes.map(d => d.docente.length > 25 ? d.docente.substring(0, 25) + '...' : d.docente),
    datasets: [{
      label: 'Promedio',
      data: topDocentes.map(d => d.promedio),
      backgroundColor: 'rgba(153, 102, 255, 0.8)',
      borderColor: 'rgba(153, 102, 255, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 3: Distribución de calificaciones
  const calificaciones = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'REGULAR', 'DEFICIENTE'];
  const distribucionCalificaciones = calificaciones.map(cal => ({
    calificacion: cal,
    cantidad: datosCarrera.filter(d => d.calificacion === cal).length
  }));

  const chart3Data = {
    labels: distribucionCalificaciones.map(c => c.calificacion),
    datasets: [{
      data: distribucionCalificaciones.map(c => c.cantidad),
      backgroundColor: [
        'rgba(75, 192, 192, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(255, 159, 64, 0.8)',
        'rgba(255, 99, 132, 0.8)'
      ],
      borderWidth: 2
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold' as const
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  const chartOptionsAcademic = {
    ...chartOptions,
    scales: {
      y: {
        beginAtZero: true,
        max: 20,
        ticks: {
          callback: function(value: any) {
            return value.toFixed(2);
          }
        }
      }
    }
  };

  return (
    <div className="reporte-carrera">
      <div className="report-header">
        <div className="career-selector">
          <label htmlFor="carrera-select">
            <BookOpen size={20} />
            Seleccionar Carrera Profesional:
          </label>
          <select
            id="carrera-select"
            value={carreraSeleccionada}
            onChange={(e) => setCarreraSeleccionada(e.target.value)}
            className="career-select"
          >
            {carreras.map(carrera => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
        </div>
        <h2>Reporte de {carreraSeleccionada}</h2>
      </div>

      {/* Estadísticas */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalEstudiantes.toLocaleString()}</div>
            <div className="stat-label">Total de Estudiantes</div>
          </div>
        </div>
        <div className="stat-card stat-success">
          <div className="stat-icon">
            <TrendingUp size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalEncuestados.toLocaleString()}</div>
            <div className="stat-label">Estudiantes Encuestados</div>
            <div className="stat-percentage">{porcentajeEncuestados}%</div>
          </div>
        </div>
        <div className="stat-card stat-primary">
          <div className="stat-icon">
            <Award size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{notaPromedioGeneral.toFixed(2)}</div>
            <div className="stat-label">Nota Promedio</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <BookOpen size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{docentes.length}</div>
            <div className="stat-label">Docentes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <BookOpen size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{datosCarrera.length}</div>
            <div className="stat-label">Cursos</div>
          </div>
        </div>
      </div>

      {/* Evaluación Académica */}
      <div className="report-section">
        <h3>Evaluación Académica</h3>
        <div className="average-grade-card">
          <div className="average-grade-value">{notaPromedioGeneral.toFixed(2)}</div>
          <div className="average-grade-label">NOTA PROMEDIO - {carreraSeleccionada}</div>
        </div>

        <div className="reports-grid">
          <div className="report-chart-card full-width" ref={grafico1Ref}>
            <Bar 
              data={chart1Data} 
              options={{
                ...chartOptionsAcademic,
                plugins: {
                  ...chartOptionsAcademic.plugins,
                  title: {
                    ...chartOptionsAcademic.plugins.title,
                    text: `Promedios por Aspectos Académicos - ${carreraSeleccionada}`
                  }
                }
              }}
            />
          </div>

          {topDocentes.length > 0 && (
            <div className="report-chart-card full-width" ref={grafico2Ref}>
              <Bar 
                data={chart2Data} 
                options={{
                  ...chartOptionsAcademic,
                  plugins: {
                    ...chartOptionsAcademic.plugins,
                    title: {
                      ...chartOptionsAcademic.plugins.title,
                      text: `Top 10 Docentes por Promedio - ${carreraSeleccionada}`
                    }
                  }
                }}
              />
            </div>
          )}

          <div className="report-chart-card" ref={grafico3Ref}>
            <Pie 
              data={chart3Data} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    ...chartOptions.plugins.title,
                    text: `Distribución de Calificaciones - ${carreraSeleccionada}`
                  }
                }
              }}
            />
          </div>
        </div>

        <div className="summary-table-container">
          <table className="summary-table">
            <thead>
              <tr>
                <th>Aspecto Académico</th>
                <th>Promedio</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AE-01: Calidad de presentación y contenido sílabico</td>
                <td><strong>{promedioAE01.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>AE-02: Ejecución del proceso enseñanza-aprendizaje</td>
                <td><strong>{promedioAE02.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>AE-03: Aplicación de la evaluación</td>
                <td><strong>{promedioAE03.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>AE-04: Formación actitudinal e interpersonales</td>
                <td><strong>{promedioAE04.toFixed(2)}</strong></td>
              </tr>
              <tr className="total-row">
                <td><strong>PROMEDIO GENERAL</strong></td>
                <td><strong>{notaPromedioGeneral.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {datosPorDocente.length > 0 && (
          <div className="summary-table-container">
            <h4>Promedio por Docente</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>N°</th>
                  <th>Docente</th>
                  <th>Promedio</th>
                  <th>Cantidad de Cursos</th>
                </tr>
              </thead>
              <tbody>
                {datosPorDocente.map((docente, index) => (
                  <tr key={docente.docente}>
                    <td>{index + 1}</td>
                    <td>{docente.docente}</td>
                    <td><strong>{docente.promedio.toFixed(2)}</strong></td>
                    <td>{docente.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

