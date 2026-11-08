import { EvaluacionData } from '../types';
import { calcularCalificacion, Calificacion, CalificacionStats, crearStatsVacios, calificacionesPorCiclo, escalaMetadata, PERIODO_ACADEMICO, claseCssCalificacion } from '../config/universityStructure';

/** Calificaciones a renderizar, ordenadas peor → mejor (orden visual del informe). */
const CALS_RENDER: Calificacion[] = [...calificacionesPorCiclo(PERIODO_ACADEMICO)].reverse();
import { esValidoParaReporte } from '../services/reportCalculations';
import { Building2, PieChart, BarChart3 } from 'lucide-react';
import { Bar, Pie } from 'react-chartjs-2';
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

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ReporteCalificacionInstitucionalProps {
  datos: EvaluacionData[];
}

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: Calificacion;
}


export default function ReporteCalificacionInstitucional({ datos }: ReporteCalificacionInstitucionalProps) {
  if (datos.length === 0) {
    return (
      <div className="reporte-calificacion-institucional">
        <p className="no-data">No hay datos para generar el reporte de calificación institucional. Importa datos primero.</p>
      </div>
    );
  }

  // Agrupar todos los datos por docente (solo registros válidos)
  const docentesMap = new Map<string, EvaluacionData[]>();
  datos.filter(esValidoParaReporte).forEach(dato => {
    const docente = dato.docente;
    if (!docentesMap.has(docente)) {
      docentesMap.set(docente, []);
    }
    docentesMap.get(docente)!.push(dato);
  });

  // Calcular resumen por docente
  const docentesResumen: DocenteResumen[] = Array.from(docentesMap.entries()).map(([docente, cursos]) => {
    const cantidadCursos = cursos.length;
    let promedioNota: number;

    if (cantidadCursos === 1) {
      promedioNota = cursos[0].nota;
    } else {
      promedioNota = cursos.reduce((sum, curso) => sum + curso.nota, 0) / cantidadCursos;
    }

    const calificacion = calcularCalificacion(promedioNota, cursos[0]?.ciclo);

    return {
      docente,
      promedioNota,
      cantidadCursos,
      calificacion
    };
  });

  // Contar docentes por calificación (bucket completo de 8 keys; las que no
  // apliquen al reglamento del ciclo quedan en 0).
  const stats: CalificacionStats = crearStatsVacios();

  docentesResumen.forEach(docente => {
    stats[docente.calificacion]++;
  });

  const totalDocentes = docentesResumen.length;
  const porcentaje = (c: Calificacion): string =>
    totalDocentes > 0 ? (stats[c] / totalDocentes * 100).toFixed(1) : '0.0';

  const chartLabels = CALS_RENDER.map(c => escalaMetadata(c).etiqueta);
  const chartData = CALS_RENDER.map(c => stats[c]);
  const chartColors = CALS_RENDER.map(c => escalaMetadata(c).color);

  const pieData = {
    labels: chartLabels,
    datasets: [{
      label: 'Docentes',
      data: chartData,
      backgroundColor: chartColors.map(c => c + 'cc'),
      borderColor: chartColors,
      borderWidth: 2,
    }],
  };

  const barData = {
    labels: chartLabels,
    datasets: [{
      label: 'Cantidad de Docentes',
      data: chartData,
      backgroundColor: chartColors.map(c => c + 'cc'),
      borderColor: chartColors,
      borderWidth: 2,
    }],
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 15,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const percentage = totalDocentes > 0 ? ((value / totalDocentes) * 100).toFixed(1) : '0.0';
            return `${label}: ${value} docentes (${percentage}%)`;
          }
        }
      }
    }
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context: any) {
            const value = context.parsed.y || 0;
            const percentage = totalDocentes > 0 ? ((value / totalDocentes) * 100).toFixed(1) : '0.0';
            return `${value} docentes (${percentage}%)`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  };

  return (
    <div className="reporte-calificacion-institucional">
      <div className="report-header">
        <h2>Distribución de Calificaciones Institucional</h2>
      </div>

      <div className="calificacion-summary">
        <div className="calificacion-header">
          <Building2 size={24} />
          <h3>Resumen General de la Universidad</h3>
        </div>

        <div className="calificacion-stats">
          {CALS_RENDER.map(cal => (
            <div className="calificacion-stat-card" key={cal}>
              <div
                className={`stat-badge stat-${claseCssCalificacion(cal)}`}
                style={{ backgroundColor: escalaMetadata(cal).color, color: '#fff' }}
              >
                <span className="stat-label">{escalaMetadata(cal).etiqueta}</span>
                <span className="stat-value">{stats[cal]}</span>
                <span className="stat-percentage">{porcentaje(cal)}%</span>
              </div>
            </div>
          ))}
        </div>

        <div className="calificacion-charts">
          <div className="chart-container">
            <div className="chart-header">
              <PieChart size={20} />
              <h4>Distribución Porcentual de Docentes por Calificación</h4>
            </div>
            <div className="chart-wrapper">
              <Pie data={pieData} options={pieOptions} />
            </div>
          </div>

          <div className="chart-container">
            <div className="chart-header">
              <BarChart3 size={20} />
              <h4>Cantidad de Docentes por Calificación</h4>
            </div>
            <div className="chart-wrapper">
              <Bar data={barData} options={barOptions} />
            </div>
          </div>
        </div>

        <div className="calificacion-info">
          <p><strong>Total de Docentes:</strong> {totalDocentes}</p>
        </div>
      </div>
    </div>
  );
}

