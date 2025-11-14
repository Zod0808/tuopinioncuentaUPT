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
import { Users, TrendingUp, Award, GraduationCap } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReportePorFacultadProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

export default function ReportePorFacultad({ datos, onGraficoReady }: ReportePorFacultadProps) {
  const [facultadSeleccionada, setFacultadSeleccionada] = useState<string>('');
  const grafico1Ref = useRef<HTMLDivElement>(null);
  const grafico2Ref = useRef<HTMLDivElement>(null);
  const grafico3Ref = useRef<HTMLDivElement>(null);
  const grafico4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onGraficoReady && facultadSeleccionada) {
      grafico1Ref.current && onGraficoReady(grafico1Ref.current, 0);
      grafico2Ref.current && onGraficoReady(grafico2Ref.current, 1);
      grafico3Ref.current && onGraficoReady(grafico3Ref.current, 2);
      grafico4Ref.current && onGraficoReady(grafico4Ref.current, 3);
    }
  }, [datos, facultadSeleccionada, onGraficoReady]);

  if (datos.length === 0) {
    return (
      <div className="reporte-facultad">
        <p className="no-data">No hay datos para generar reportes por facultad. Importa datos primero.</p>
      </div>
    );
  }

  // Obtener facultades disponibles
  const facultades = [...new Set(datos.map(d => d.facultad))].sort();

  // Si no hay facultad seleccionada, seleccionar la primera por defecto
  useEffect(() => {
    if (!facultadSeleccionada && facultades.length > 0) {
      setFacultadSeleccionada(facultades[0]);
    }
  }, [facultades, facultadSeleccionada]);

  if (!facultadSeleccionada) {
    return (
      <div className="reporte-facultad">
        <p className="no-data">Cargando...</p>
      </div>
    );
  }

  // Filtrar datos por facultad seleccionada
  const datosFacultad = datos.filter(d => d.facultad === facultadSeleccionada);

  if (datosFacultad.length === 0) {
    return (
      <div className="reporte-facultad">
        <div className="faculty-selector">
          <label htmlFor="facultad-select">Seleccionar Facultad:</label>
          <select
            id="facultad-select"
            value={facultadSeleccionada}
            onChange={(e) => setFacultadSeleccionada(e.target.value)}
            className="faculty-select"
          >
            {facultades.map(facultad => (
              <option key={facultad} value={facultad}>
                {facultad}
              </option>
            ))}
          </select>
        </div>
        <p className="no-data">No hay datos para la facultad seleccionada.</p>
      </div>
    );
  }

  // Calcular estadísticas de la facultad
  const totalEncuestados = datosFacultad.reduce((sum, d) => sum + d.encuestados, 0);
  const totalNoEncuestados = datosFacultad.reduce((sum, d) => sum + d.noEncuestados, 0);
  const totalEstudiantes = totalEncuestados + totalNoEncuestados;
  const porcentajeEncuestados = totalEstudiantes > 0 
    ? ((totalEncuestados / totalEstudiantes) * 100).toFixed(2) 
    : '0.00';

  const promedioAE01 = datosFacultad.length > 0 
    ? datosFacultad.reduce((sum, d) => sum + d.ae01, 0) / datosFacultad.length 
    : 0;
  const promedioAE02 = datosFacultad.length > 0 
    ? datosFacultad.reduce((sum, d) => sum + d.ae02, 0) / datosFacultad.length 
    : 0;
  const promedioAE03 = datosFacultad.length > 0 
    ? datosFacultad.reduce((sum, d) => sum + d.ae03, 0) / datosFacultad.length 
    : 0;
  const promedioAE04 = datosFacultad.length > 0 
    ? datosFacultad.reduce((sum, d) => sum + d.ae04, 0) / datosFacultad.length 
    : 0;
  const notaPromedioGeneral = datosFacultad.length > 0
    ? datosFacultad.reduce((sum, d) => sum + d.nota, 0) / datosFacultad.length
    : 0;

  // Agrupar por carrera profesional
  const carreras = [...new Set(datosFacultad.map(d => d.carreraProfesional))].sort();
  const datosPorCarrera = carreras.map(carrera => {
    const datosCarrera = datosFacultad.filter(d => d.carreraProfesional === carrera);
    const promedio = datosCarrera.reduce((sum, d) => sum + d.nota, 0) / datosCarrera.length;
    return { carrera, promedio, cantidad: datosCarrera.length };
  });

  // Gráfico 1: Participación
  const chart1Data = {
    labels: ['Encuestados', 'No Encuestados'],
    datasets: [{
      data: [totalEncuestados, totalNoEncuestados],
      backgroundColor: [
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)'
      ],
      borderColor: [
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 2
    }]
  };

  // Gráfico 2: Promedios por aspectos académicos
  const aspectosLabels = [
    'AE-01: Sílabo',
    'AE-02: Enseñanza',
    'AE-03: Evaluación',
    'AE-04: Actitudinal'
  ];
  const chart2Data = {
    labels: aspectosLabels,
    datasets: [{
      label: 'Promedio',
      data: [promedioAE01, promedioAE02, promedioAE03, promedioAE04],
      backgroundColor: 'rgba(75, 192, 192, 0.8)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 3: Promedio por carrera
  const chart3Data = {
    labels: datosPorCarrera.map(c => c.carrera.length > 30 ? c.carrera.substring(0, 30) + '...' : c.carrera),
    datasets: [{
      label: 'Promedio',
      data: datosPorCarrera.map(c => c.promedio),
      backgroundColor: 'rgba(153, 102, 255, 0.8)',
      borderColor: 'rgba(153, 102, 255, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 4: Distribución de calificaciones
  const calificaciones = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'REGULAR', 'DEFICIENTE'];
  const distribucionCalificaciones = calificaciones.map(cal => ({
    calificacion: cal,
    cantidad: datosFacultad.filter(d => d.calificacion === cal).length
  }));

  const chart4Data = {
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
    <div className="reporte-facultad">
      <div className="report-header">
        <div className="faculty-selector">
          <label htmlFor="facultad-select">
            <GraduationCap size={20} />
            Seleccionar Facultad:
          </label>
          <select
            id="facultad-select"
            value={facultadSeleccionada}
            onChange={(e) => setFacultadSeleccionada(e.target.value)}
            className="faculty-select"
          >
            {facultades.map(facultad => (
              <option key={facultad} value={facultad}>
                {facultad}
              </option>
            ))}
          </select>
        </div>
        <h2>Reporte de {facultadSeleccionada}</h2>
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
            <GraduationCap size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{carreras.length}</div>
            <div className="stat-label">Carreras Profesionales</div>
          </div>
        </div>
      </div>

      {/* Participación */}
      <div className="report-section">
        <h3>Participación Estudiantil</h3>
        <div className="reports-grid">
          <div className="report-chart-card" ref={grafico1Ref}>
            <Pie 
              data={chart1Data} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    ...chartOptions.plugins.title,
                    text: `Participación - ${facultadSeleccionada}`
                  }
                }
              }}
            />
          </div>
        </div>
      </div>

      {/* Evaluación Académica */}
      <div className="report-section">
        <h3>Evaluación Académica</h3>
        <div className="average-grade-card">
          <div className="average-grade-value">{notaPromedioGeneral.toFixed(2)}</div>
          <div className="average-grade-label">NOTA PROMEDIO - {facultadSeleccionada}</div>
        </div>

        <div className="reports-grid">
          <div className="report-chart-card full-width" ref={grafico2Ref}>
            <Bar 
              data={chart2Data} 
              options={{
                ...chartOptionsAcademic,
                plugins: {
                  ...chartOptionsAcademic.plugins,
                  title: {
                    ...chartOptionsAcademic.plugins.title,
                    text: `Promedios por Aspectos Académicos - ${facultadSeleccionada}`
                  }
                }
              }}
            />
          </div>

          {datosPorCarrera.length > 0 && (
            <div className="report-chart-card full-width" ref={grafico3Ref}>
              <Bar 
                data={chart3Data} 
                options={{
                  ...chartOptionsAcademic,
                  plugins: {
                    ...chartOptionsAcademic.plugins,
                    title: {
                      ...chartOptionsAcademic.plugins.title,
                      text: `Promedio por Carrera Profesional - ${facultadSeleccionada}`
                    }
                  }
                }}
              />
            </div>
          )}

          <div className="report-chart-card" ref={grafico4Ref}>
            <Pie 
              data={chart4Data} 
              options={{
                ...chartOptions,
                plugins: {
                  ...chartOptions.plugins,
                  title: {
                    ...chartOptions.plugins.title,
                    text: `Distribución de Calificaciones - ${facultadSeleccionada}`
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

        {datosPorCarrera.length > 0 && (
          <div className="summary-table-container">
            <h4>Promedio por Carrera Profesional</h4>
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Carrera Profesional</th>
                  <th>Promedio</th>
                  <th>Cantidad de Cursos</th>
                </tr>
              </thead>
              <tbody>
                {datosPorCarrera.map((carrera) => (
                  <tr key={carrera.carrera}>
                    <td>{carrera.carrera}</td>
                    <td><strong>{carrera.promedio.toFixed(2)}</strong></td>
                    <td>{carrera.cantidad}</td>
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

