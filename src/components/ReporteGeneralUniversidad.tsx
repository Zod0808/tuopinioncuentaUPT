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
import { Users, TrendingUp, Award } from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReporteGeneralUniversidadProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

export default function ReporteGeneralUniversidad({ datos, onGraficoReady }: ReporteGeneralUniversidadProps) {
  const grafico1Ref = useRef<HTMLDivElement>(null);
  const grafico2Ref = useRef<HTMLDivElement>(null);
  const grafico3Ref = useRef<HTMLDivElement>(null);
  const grafico4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onGraficoReady) {
      const timeoutId = setTimeout(() => {
        grafico1Ref.current && onGraficoReady(grafico1Ref.current, 0);
        grafico2Ref.current && onGraficoReady(grafico2Ref.current, 1);
        grafico3Ref.current && onGraficoReady(grafico3Ref.current, 2);
        grafico4Ref.current && onGraficoReady(grafico4Ref.current, 3);
      }, 100);
      
      return () => clearTimeout(timeoutId);
    }
  }, [datos.length]); // Solo dependemos de la longitud, no de la función

  if (datos.length === 0) {
    return (
      <div className="reporte-general">
        <p className="no-data">No hay datos para generar el reporte general. Importa datos primero.</p>
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

  // Calcular promedios institucionales
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
  const facultades = ['FADE', 'FAEDCOH', 'FAING', 'FACEM', 'FAU', 'FACSA']; // Orden correcto según el usuario
  const datosPorFacultad = facultades.map(facultad => {
    const datosFacultad = datos.filter(d => d.facultad === facultad);
    const encuestados = datosFacultad.reduce((sum, d) => sum + d.encuestados, 0);
    const noEncuestados = datosFacultad.reduce((sum, d) => sum + d.noEncuestados, 0);
    const total = encuestados + noEncuestados;
    const porcentajeEnc = total > 0 ? ((encuestados / total) * 100).toFixed(2) : '0.00';
    
    // Calcular promedios por aspectos académicos por facultad
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
      promedioAE01: promedioAE01Fac,
      promedioAE02: promedioAE02Fac,
      promedioAE03: promedioAE03Fac,
      promedioAE04: promedioAE04Fac
    };
  }).filter(f => f.total > 0);

  // Calcular promedios institucionales usando el método "humano" (con redondeo intermedio)
  // Este cálculo toma los promedios por facultad ya redondeados a 2 decimales
  const promedioAE01Manual = datosPorFacultad.length > 0
    ? parseFloat((datosPorFacultad.reduce((sum, f) => 
        sum + parseFloat(f.promedioAE01.toFixed(2)), 0) / datosPorFacultad.length).toFixed(2))
    : 0;
  const promedioAE02Manual = datosPorFacultad.length > 0
    ? parseFloat((datosPorFacultad.reduce((sum, f) => 
        sum + parseFloat(f.promedioAE02.toFixed(2)), 0) / datosPorFacultad.length).toFixed(2))
    : 0;
  const promedioAE03Manual = datosPorFacultad.length > 0
    ? parseFloat((datosPorFacultad.reduce((sum, f) => 
        sum + parseFloat(f.promedioAE03.toFixed(2)), 0) / datosPorFacultad.length).toFixed(2))
    : 0;
  const promedioAE04Manual = datosPorFacultad.length > 0
    ? parseFloat((datosPorFacultad.reduce((sum, f) => 
        sum + parseFloat(f.promedioAE04.toFixed(2)), 0) / datosPorFacultad.length).toFixed(2))
    : 0;
  
  // Calcular promedio general institucional usando el método "humano"
  const promediosGeneralesPorFacultadRedondeados = datosPorFacultad.map(f => {
    const ae01 = parseFloat(f.promedioAE01.toFixed(2));
    const ae02 = parseFloat(f.promedioAE02.toFixed(2));
    const ae03 = parseFloat(f.promedioAE03.toFixed(2));
    const ae04 = parseFloat(f.promedioAE04.toFixed(2));
    return parseFloat(((ae01 + ae02 + ae03 + ae04) / 4).toFixed(2));
  });
  const notaPromedioGeneralManual = promediosGeneralesPorFacultadRedondeados.length > 0
    ? parseFloat((promediosGeneralesPorFacultadRedondeados.reduce((sum, pg) => sum + pg, 0) / 
                  promediosGeneralesPorFacultadRedondeados.length).toFixed(2))
    : 0;

  // Gráfico 1: Participación general
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

  // Gráfico 2: Participación por facultad
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

  // Gráfico 3: Promedios por aspectos académicos
  const aspectosLabels = [
    'AE-01: Sílabo',
    'AE-02: Enseñanza',
    'AE-03: Evaluación',
    'AE-04: Actitudinal'
  ];
  const chart3Data = {
    labels: aspectosLabels,
    datasets: [{
      label: 'Promedio',
      data: [promedioAE01, promedioAE02, promedioAE03, promedioAE04],
      backgroundColor: 'rgba(75, 192, 192, 0.8)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 4: Promedios por facultad
  const datosPorFacultadAcademicos = ['FADE', 'FAEDCOH', 'FAING', 'FACEM', 'FAU', 'FACSA'].map(facultad => {
    const datosFacultad = datos.filter(d => d.facultad === facultad);
    if (datosFacultad.length === 0) return null;
    
    const promedio = datosFacultad.reduce((sum, d) => sum + d.nota, 0) / datosFacultad.length;
    return { facultad, promedio };
  }).filter(f => f !== null) as { facultad: string; promedio: number }[];

  const chart4Data = {
    labels: datosPorFacultadAcademicos.map(f => f.facultad),
    datasets: [{
      label: 'Promedio General',
      data: datosPorFacultadAcademicos.map(f => f.promedio),
      backgroundColor: 'rgba(153, 102, 255, 0.8)',
      borderColor: 'rgba(153, 102, 255, 1)',
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
    <div className="reporte-general">
      <h2>Reporte General de la Universidad</h2>

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
        <div className="stat-card stat-primary">
          <div className="stat-icon">
            <Award size={32} />
          </div>
          <div className="stat-content">
            <div className="stat-value">{notaPromedioGeneral.toFixed(2)}</div>
            <div className="stat-label">Nota Promedio General</div>
          </div>
        </div>
      </div>

      {/* Participación Estudiantil */}
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
                    text: 'Participación General de Estudiantes'
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
                    text: 'Participación por Facultad'
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
                <th>Facultad</th>
                <th>Total Estudiantes</th>
                <th>Encuestados</th>
                <th>No Encuestados</th>
                <th>% Participación</th>
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
                </tr>
              ))}
              <tr className="total-row">
                <td><strong>TOTAL</strong></td>
                <td><strong>{totalEstudiantes.toLocaleString()}</strong></td>
                <td><strong>{totalEncuestados.toLocaleString()}</strong></td>
                <td><strong>{totalNoEncuestados.toLocaleString()}</strong></td>
                <td><strong>{porcentajeEncuestados}%</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Evaluación Académica */}
      <div className="report-section">
        <h3>Evaluación Académica</h3>
        <div className="average-grade-card">
          <div className="average-grade-value">{notaPromedioGeneral.toFixed(2)}</div>
          <div className="average-grade-label">NOTA PROMEDIO GENERAL</div>
        </div>

        <div className="reports-grid">
          <div className="report-chart-card full-width" ref={grafico3Ref}>
            <Bar 
              data={chart3Data} 
              options={{
                ...chartOptionsAcademic,
                plugins: {
                  ...chartOptionsAcademic.plugins,
                  title: {
                    ...chartOptionsAcademic.plugins.title,
                    text: 'Promedios por Aspectos Académicos'
                  }
                }
              }}
            />
          </div>

          <div className="report-chart-card full-width" ref={grafico4Ref}>
            <Bar 
              data={chart4Data} 
              options={{
                ...chartOptionsAcademic,
                plugins: {
                  ...chartOptionsAcademic.plugins,
                  title: {
                    ...chartOptionsAcademic.plugins.title,
                    text: 'Promedio General por Facultad'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Tabla de promedios por facultad - Cálculo del Sistema (precisión total) */}
        <div className="summary-table-container">
          <h3>Promedios por Aspectos Académicos por Facultad - Cálculo del Sistema</h3>
          <p className="table-description">
            Promedio institucional calculado directamente de todos los datos sin redondeo intermedio (máxima precisión).
          </p>
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
                    <td className="text-right">{facultad.promedioAE01.toFixed(2)}</td>
                    <td className="text-right">{facultad.promedioAE02.toFixed(2)}</td>
                    <td className="text-right">{facultad.promedioAE03.toFixed(2)}</td>
                    <td className="text-right">{facultad.promedioAE04.toFixed(2)}</td>
                    <td className="text-right"><strong>{promedioGeneral.toFixed(2)}</strong></td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td><strong>PROMEDIO INSTITUCIONAL (Sistema)</strong></td>
                <td className="text-right"><strong>{promedioAE01.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE02.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE03.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE04.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{notaPromedioGeneral.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabla de promedios por facultad - Cálculo Humano (redondeo intermedio) */}
        <div className="summary-table-container">
          <h3>Promedios por Aspectos Académicos por Facultad - Cálculo Manual</h3>
          <p className="table-description">
            Promedio institucional calculado a partir de los promedios por facultad redondeados a 2 decimales 
            (igual al cálculo manual realizado por los usuarios).
          </p>
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
                // Redondear a 2 decimales antes de calcular el promedio general
                const promedioAE01Redondeado = parseFloat(facultad.promedioAE01.toFixed(2));
                const promedioAE02Redondeado = parseFloat(facultad.promedioAE02.toFixed(2));
                const promedioAE03Redondeado = parseFloat(facultad.promedioAE03.toFixed(2));
                const promedioAE04Redondeado = parseFloat(facultad.promedioAE04.toFixed(2));
                const promedioGeneral = parseFloat(
                  ((promedioAE01Redondeado + promedioAE02Redondeado + 
                    promedioAE03Redondeado + promedioAE04Redondeado) / 4).toFixed(2)
                );
                return (
                  <tr key={facultad.facultad}>
                    <td><strong>{facultad.facultad}</strong></td>
                    <td className="text-right">{promedioAE01Redondeado.toFixed(2)}</td>
                    <td className="text-right">{promedioAE02Redondeado.toFixed(2)}</td>
                    <td className="text-right">{promedioAE03Redondeado.toFixed(2)}</td>
                    <td className="text-right">{promedioAE04Redondeado.toFixed(2)}</td>
                    <td className="text-right"><strong>{promedioGeneral.toFixed(2)}</strong></td>
                  </tr>
                );
              })}
              <tr className="total-row">
                <td><strong>PROMEDIO INSTITUCIONAL (Manual)</strong></td>
                <td className="text-right"><strong>{promedioAE01Manual.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE02Manual.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE03Manual.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE04Manual.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{notaPromedioGeneralManual.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Tabla resumen comparativa de Aspectos Académicos */}
        <div className="summary-table-container">
          <h3>Aspecto Académico - Comparación de Cálculos</h3>
          <table className="summary-table">
            <thead>
              <tr>
                <th>Aspecto Académico</th>
                <th className="text-right">Promedio (Sistema)</th>
                <th className="text-right">Promedio (Cálculo Manual)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>AE-01: Calidad de presentación y contenido sílabico</td>
                <td className="text-right"><strong>{promedioAE01.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE01Manual.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>AE-02: Ejecución del proceso enseñanza-aprendizaje</td>
                <td className="text-right"><strong>{promedioAE02.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE02Manual.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>AE-03: Aplicación de la evaluación</td>
                <td className="text-right"><strong>{promedioAE03.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE03Manual.toFixed(2)}</strong></td>
              </tr>
              <tr>
                <td>AE-04: Formación actitudinal e interpersonales</td>
                <td className="text-right"><strong>{promedioAE04.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{promedioAE04Manual.toFixed(2)}</strong></td>
              </tr>
              <tr className="total-row">
                <td><strong>PROMEDIO GENERAL</strong></td>
                <td className="text-right"><strong>{notaPromedioGeneral.toFixed(2)}</strong></td>
                <td className="text-right"><strong>{notaPromedioGeneralManual.toFixed(2)}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

