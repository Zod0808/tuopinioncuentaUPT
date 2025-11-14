import { useRef, useEffect } from 'react';
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
import { Users, TrendingUp } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface InstitutionalReportsProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

export default function InstitutionalReports({ datos, onGraficoReady }: InstitutionalReportsProps) {
  const grafico1Ref = useRef<HTMLDivElement>(null);
  const grafico2Ref = useRef<HTMLDivElement>(null);
  const grafico3Ref = useRef<HTMLDivElement>(null);
  const grafico4Ref = useRef<HTMLDivElement>(null);
  const grafico5Ref = useRef<HTMLDivElement>(null);
  const grafico6Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onGraficoReady) {
      grafico1Ref.current && onGraficoReady(grafico1Ref.current, 0);
      grafico2Ref.current && onGraficoReady(grafico2Ref.current, 1);
      grafico3Ref.current && onGraficoReady(grafico3Ref.current, 2);
      grafico4Ref.current && onGraficoReady(grafico4Ref.current, 3);
      grafico5Ref.current && onGraficoReady(grafico5Ref.current, 4);
      grafico6Ref.current && onGraficoReady(grafico6Ref.current, 5);
    }
  }, [datos, onGraficoReady]);

  if (datos.length === 0) {
    return (
      <div className="institutional-reports">
        <p className="no-data">No hay datos para generar reportes institucionales. Importa datos primero.</p>
      </div>
    );
  }

  // Calcular totales generales
  const totalEncuestados = datos.reduce((sum, d) => sum + d.encuestados, 0);
  const totalNoEncuestados = datos.reduce((sum, d) => sum + d.noEncuestados, 0);
  const totalEstudiantes = totalEncuestados + totalNoEncuestados;
  const porcentajeEncuestados = totalEstudiantes > 0 
    ? ((totalEncuestados / totalEstudiantes) * 100).toFixed(2) 
    : '0.00';
  const porcentajeNoEncuestados = totalEstudiantes > 0 
    ? ((totalNoEncuestados / totalEstudiantes) * 100).toFixed(2) 
    : '0.00';

  // Calcular promedios institucionales por aspectos académicos
  const promedioAE01 = datos.length > 0 
    ? datos.reduce((sum, d) => sum + d.ae01, 0) / datos.length 
    : 0;
  const promedioAE02 = datos.length > 0 
    ? datos.reduce((sum, d) => sum + d.ae02, 0) / datos.length 
    : 0;
  const promedioAE03 = datos.length > 0 
    ? datos.reduce((sum, d) => sum + d.ae03, 0) / datos.length 
    : 0;
  const promedioAE04 = datos.length > 0 
    ? datos.reduce((sum, d) => sum + d.ae04, 0) / datos.length 
    : 0;
  const notaPromedioGeneral = datos.length > 0
    ? datos.reduce((sum, d) => sum + d.nota, 0) / datos.length
    : 0;

  // Agrupar por facultad
  const facultades = ['FAING', 'FAU', 'FACSA', 'FAEDCOH', 'FACEM', 'FADE'];
  const datosPorFacultad = facultades.map(facultad => {
    const datosFacultad = datos.filter(d => d.facultad === facultad);
    const encuestados = datosFacultad.reduce((sum, d) => sum + d.encuestados, 0);
    const noEncuestados = datosFacultad.reduce((sum, d) => sum + d.noEncuestados, 0);
    const total = encuestados + noEncuestados;
    const porcentajeEnc = total > 0 ? ((encuestados / total) * 100).toFixed(2) : '0.00';
    const porcentajeNoEnc = total > 0 ? ((noEncuestados / total) * 100).toFixed(2) : '0.00';
    
    // Promedios por aspectos académicos por facultad
    const promedioAE01Fac = datosFacultad.length > 0
      ? datosFacultad.reduce((sum, d) => sum + d.ae01, 0) / datosFacultad.length
      : 0;
    const promedioAE02Fac = datosFacultad.length > 0
      ? datosFacultad.reduce((sum, d) => sum + d.ae02, 0) / datosFacultad.length
      : 0;
    const promedioAE03Fac = datosFacultad.length > 0
      ? datosFacultad.reduce((sum, d) => sum + d.ae03, 0) / datosFacultad.length
      : 0;
    const promedioAE04Fac = datosFacultad.length > 0
      ? datosFacultad.reduce((sum, d) => sum + d.ae04, 0) / datosFacultad.length
      : 0;
    
    return {
      facultad,
      encuestados,
      noEncuestados,
      total,
      porcentajeEnc: parseFloat(porcentajeEnc),
      porcentajeNoEnc: parseFloat(porcentajeNoEnc),
      promedioAE01: promedioAE01Fac,
      promedioAE02: promedioAE02Fac,
      promedioAE03: promedioAE03Fac,
      promedioAE04: promedioAE04Fac
    };
  }).filter(f => f.total > 0); // Solo mostrar facultades con datos

  // Gráfico 1: Pie chart general
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

  // Gráfico 2: Barras agrupadas por facultad (números absolutos)
  const chart2Data = {
    labels: datosPorFacultad.map(f => f.facultad),
    datasets: [
      {
        label: 'Encuestados',
        data: datosPorFacultad.map(f => f.encuestados),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      },
      {
        label: 'No Encuestados',
        data: datosPorFacultad.map(f => f.noEncuestados),
        backgroundColor: 'rgba(255, 206, 86, 0.8)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 2
      }
    ]
  };

  // Gráfico 3: Barras apiladas por facultad (porcentajes)
  const chart3Data = {
    labels: datosPorFacultad.map(f => f.facultad),
    datasets: [
      {
        label: 'Encuestados (%)',
        data: datosPorFacultad.map(f => f.porcentajeEnc),
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 2
      },
      {
        label: 'No Encuestados (%)',
        data: datosPorFacultad.map(f => f.porcentajeNoEnc),
        backgroundColor: 'rgba(255, 206, 86, 0.8)',
        borderColor: 'rgba(255, 206, 86, 1)',
        borderWidth: 2
      }
    ]
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
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              if (context.datasetIndex === 1 && context.chart.data.labels?.includes('No Encuestados')) {
                // Para el gráfico de porcentajes
                label += context.parsed.y.toFixed(2) + '%';
              } else if (context.chart.id === 'chart3') {
                // Gráfico de porcentajes apilados
                label += context.parsed.y.toFixed(2) + '%';
              } else {
                label += context.parsed.y;
              }
            }
            return label;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value: any) {
            if (typeof value === 'number') {
              return value.toFixed(0);
            }
            return value;
          }
        }
      }
    }
  };

  const chartOptionsStacked = {
    ...chartOptions,
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: any) {
            return value + '%';
          }
        }
      }
    }
  };

  // Gráfico 4: Promedio institucional por aspectos académicos
  const aspectosLabels = [
    'Calidad de presentación y contenido sílabico',
    'Ejecución del proceso enseñanza-aprendizaje',
    'Aplicación de la evaluación',
    'Formación actitudinal e interpersonales'
  ];
  const chart4Data = {
    labels: aspectosLabels,
    datasets: [{
      label: 'Promedio',
      data: [promedioAE01, promedioAE02, promedioAE03, promedioAE04],
      backgroundColor: 'rgba(54, 162, 235, 0.8)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 5: Promedio por aspectos académicos por facultad
  const chart5Data = {
    labels: aspectosLabels,
    datasets: datosPorFacultad.map((facultad, index) => {
      const colors = [
        'rgba(54, 162, 235, 0.8)',   // Azul - FADE
        'rgba(255, 159, 64, 0.8)',   // Naranja - FAEDCOH
        'rgba(75, 192, 192, 0.8)',   // Verde - FAING
        'rgba(153, 102, 255, 0.8)',  // Púrpura - FACEM
        'rgba(255, 99, 132, 0.8)',   // Rosa - FAU
        'rgba(255, 206, 86, 0.8)'    // Amarillo - FACSA
      ];
      return {
        label: facultad.facultad,
        data: [
          facultad.promedioAE01,
          facultad.promedioAE02,
          facultad.promedioAE03,
          facultad.promedioAE04
        ],
        backgroundColor: colors[index % colors.length],
        borderColor: colors[index % colors.length].replace('0.8', '1'),
        borderWidth: 2
      };
    })
  };

  const chartOptionsAcademic = {
    ...chartOptions,
    scales: {
      ...chartOptions.scales,
      y: {
        beginAtZero: true,
        max: 20,
        ticks: {
          callback: function(value: any) {
            return value.toFixed(2);
          }
        }
      }
    },
    plugins: {
      ...chartOptions.plugins,
      tooltip: {
        callbacks: {
          label: function(context: any) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(2);
            }
            return label;
          }
        }
      }
    }
  };

  return (
    <div className="institutional-reports">
      <h2>Reportes Institucionales - Participación Estudiantil</h2>

      {/* Estadísticas generales */}
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
        <div className="stat-card stat-warning">
          <div className="stat-icon">
            <Users size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{totalNoEncuestados.toLocaleString()}</div>
            <div className="stat-label">Estudiantes No Encuestados</div>
            <div className="stat-percentage">{porcentajeNoEncuestados}%</div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
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
                  text: 'Estudiantes Encuestados y No Encuestados'
                }
              }
            }}
          />
        </div>

        <div className="report-chart-card" ref={grafico2Ref}>
          <Bar 
            data={chart2Data} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: 'Resumen de Participación por Facultad'
                }
              }
            }}
          />
        </div>

        <div className="report-chart-card full-width" ref={grafico3Ref}>
          <Bar 
            data={chart3Data} 
            options={chartOptionsStacked}
            id="chart3"
          />
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="summary-table-container">
        <h3>Resumen por Facultad</h3>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Facultad</th>
              <th>Total Estudiantes</th>
              <th>Encuestados</th>
              <th>No Encuestados</th>
              <th>% Encuestados</th>
              <th>% No Encuestados</th>
            </tr>
          </thead>
          <tbody>
            {datosPorFacultad.map((facultad) => (
              <tr key={facultad.facultad}>
                <td><strong>{facultad.facultad}</strong></td>
                <td>{facultad.total.toLocaleString()}</td>
                <td>{facultad.encuestados.toLocaleString()}</td>
                <td>{facultad.noEncuestados.toLocaleString()}</td>
                <td>{facultad.porcentajeEnc.toFixed(2)}%</td>
                <td>{facultad.porcentajeNoEnc.toFixed(2)}%</td>
              </tr>
            ))}
            <tr className="total-row">
              <td><strong>TOTAL</strong></td>
              <td><strong>{totalEstudiantes.toLocaleString()}</strong></td>
              <td><strong>{totalEncuestados.toLocaleString()}</strong></td>
              <td><strong>{totalNoEncuestados.toLocaleString()}</strong></td>
              <td><strong>{porcentajeEncuestados}%</strong></td>
              <td><strong>{porcentajeNoEncuestados}%</strong></td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sección de Evaluación Académica */}
      <div className="academic-evaluation-section">
        <h2>Reportes Institucionales - Evaluación Académica</h2>

        {/* Nota promedio general */}
        <div className="average-grade-card">
          <div className="average-grade-value">{notaPromedioGeneral.toFixed(2)}</div>
          <div className="average-grade-label">NOTA PROMEDIO GENERAL</div>
        </div>

        {/* Gráficos de evaluación académica */}
        <div className="reports-grid">
          <div className="report-chart-card full-width" ref={grafico4Ref}>
            <Bar 
              data={chart4Data} 
              options={{
                ...chartOptionsAcademic,
                plugins: {
                  ...chartOptionsAcademic.plugins,
                  title: {
                    ...chartOptionsAcademic.plugins.title,
                    text: 'Resumen General de la Universidad por Aspectos Evaluados'
                  }
                }
              }}
            />
          </div>

          <div className="report-chart-card full-width" ref={grafico5Ref}>
            <Bar 
              data={chart5Data} 
              options={{
                ...chartOptionsAcademic,
                plugins: {
                  ...chartOptionsAcademic.plugins,
                  title: {
                    ...chartOptionsAcademic.plugins.title,
                    text: 'Resumen de Resultados de Facultades por Aspecto Evaluado'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Tabla de promedios por facultad */}
        <div className="summary-table-container">
          <h3>Promedios por Aspectos Académicos por Facultad</h3>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Facultad</th>
                <th>AE-01: Sílabo</th>
                <th>AE-02: Enseñanza</th>
                <th>AE-03: Evaluación</th>
                <th>AE-04: Actitudinal</th>
                <th>Promedio General</th>
              </tr>
            </thead>
            <tbody>
              {datosPorFacultad.map((facultad) => {
                const promedioGeneral = (facultad.promedioAE01 + facultad.promedioAE02 + 
                                        facultad.promedioAE03 + facultad.promedioAE04) / 4;
                return (
                  <tr key={facultad.facultad}>
                    <td><strong>{facultad.facultad}</strong></td>
                    <td>{facultad.promedioAE01.toFixed(2)}</td>
                    <td>{facultad.promedioAE02.toFixed(2)}</td>
                    <td>{facultad.promedioAE03.toFixed(2)}</td>
                    <td>{facultad.promedioAE04.toFixed(2)}</td>
                    <td><strong>{promedioGeneral.toFixed(2)}</strong></td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td><strong>PROMEDIO INSTITUCIONAL</strong></td>
                <td><strong>{promedioAE01.toFixed(2)}</strong></td>
                <td><strong>{promedioAE02.toFixed(2)}</strong></td>
                <td><strong>{promedioAE03.toFixed(2)}</strong></td>
                <td><strong>{promedioAE04.toFixed(2)}</strong></td>
                <td><strong>{notaPromedioGeneral.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

