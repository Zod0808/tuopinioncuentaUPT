import { useState } from 'react';
import { EvaluacionData } from '../types';
import { GraduationCap, PieChart, BarChart3 } from 'lucide-react';
import { calcularCalificacion, Calificacion, CalificacionStats, crearStatsVacios, calificacionesPorCiclo, escalaMetadata, PERIODO_ACADEMICO, claseCssCalificacion } from '../config/universityStructure';

const CALS_RENDER: Calificacion[] = [...calificacionesPorCiclo(PERIODO_ACADEMICO)].reverse();
import { esValidoParaReporte } from '../services/reportCalculations';
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

interface ReporteCalificacionPorCarreraProps {
  datos: EvaluacionData[];
}

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: Calificacion;
}


export default function ReporteCalificacionPorCarrera({ datos }: ReporteCalificacionPorCarreraProps) {
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');

  if (datos.length === 0) {
    return (
      <div className="reporte-calificacion-carrera">
        <p className="no-data">No hay datos para generar el reporte de calificación por carrera. Importa datos primero.</p>
      </div>
    );
  }

  // Obtener todas las carreras profesionales
  const carreras = [...new Set(datos.map(d => d.carreraProfesional))].sort();

  // Procesar datos por carrera
  const procesarCarrera = (carrera: string): { stats: CalificacionStats; docentes: DocenteResumen[] } => {
    const datosCarrera = datos.filter(d => d.carreraProfesional === carrera);
    
    // Agrupar por docente (solo registros válidos)
    const docentesMap = new Map<string, EvaluacionData[]>();
    datosCarrera.filter(esValidoParaReporte).forEach(dato => {
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

    // Contar docentes por calificación (8 keys; las que no apliquen al ciclo quedan en 0).
    const stats: CalificacionStats = crearStatsVacios();

    docentesResumen.forEach(docente => {
      stats[docente.calificacion]++;
    });

    return { stats, docentes: docentesResumen };
  };

  // Obtener datos de la carrera seleccionada o todas
  const carrerasAMostrar = carreraSeleccionada
    ? [carreraSeleccionada]
    : carreras;

  // Procesar todas las carreras a mostrar
  const datosProcesados = carrerasAMostrar.map(carrera => ({
    carrera,
    ...procesarCarrera(carrera)
  }));

  // Si hay una carrera seleccionada, mostrar solo esa
  const datosActuales = carreraSeleccionada
    ? datosProcesados[0]
    : (() => {
        // Agrupar todos los docentes de todas las carreras, evitando duplicados
        const docentesUnicos = new Map<string, DocenteResumen>();
        
        datosProcesados.forEach(({ docentes }) => {
          docentes.forEach(docente => {
            const docenteKey = docente.docente;
            if (!docentesUnicos.has(docenteKey)) {
              // Si el docente no existe, agregarlo
              docentesUnicos.set(docenteKey, docente);
            } else {
              // Si el docente ya existe, tomar el promedio más bajo (peor calificación)
              const existente = docentesUnicos.get(docenteKey)!;
              if (docente.promedioNota < existente.promedioNota) {
                docentesUnicos.set(docenteKey, docente);
              }
            }
          });
        });

        // Recalcular estadísticas basadas en docentes únicos
        const stats: CalificacionStats = crearStatsVacios();

        Array.from(docentesUnicos.values()).forEach(docente => {
          stats[docente.calificacion]++;
        });

        return {
          carrera: 'TODAS LAS CARRERAS',
          stats,
          docentes: Array.from(docentesUnicos.values())
        };
      })();

  const totalDocentes = datosActuales.docentes.length;
  const porcentaje = (c: Calificacion): string =>
    totalDocentes > 0 ? (datosActuales.stats[c] / totalDocentes * 100).toFixed(1) : '0.0';

  const chartLabels = CALS_RENDER.map(c => escalaMetadata(c).etiqueta);
  const chartData = CALS_RENDER.map(c => datosActuales.stats[c]);
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
    <div className="reporte-calificacion-carrera">
      <div className="report-header">
        <div className="career-selector">
          <label htmlFor="calificacion-carrera-select">
            <GraduationCap size={20} />
            Filtrar por Carrera Profesional:
          </label>
          <select
            id="calificacion-carrera-select"
            value={carreraSeleccionada}
            onChange={(e) => setCarreraSeleccionada(e.target.value)}
            className="career-select"
          >
            <option value="">Todas las Carreras</option>
            {carreras.map(carrera => (
              <option key={carrera} value={carrera}>
                {carrera}
              </option>
            ))}
          </select>
        </div>
        <h2>Distribución de Calificaciones por Carrera Profesional</h2>
      </div>

      <div className="calificacion-summary">
        <div className="calificacion-header">
          <GraduationCap size={24} />
          <h3>{carreraSeleccionada || 'Todas las Carreras Profesionales'}</h3>
        </div>

        <div className="calificacion-stats">
          {CALS_RENDER.map(cal => (
            <div className="calificacion-stat-card" key={cal}>
              <div
                className={`stat-badge stat-${claseCssCalificacion(cal)}`}
                style={{ backgroundColor: escalaMetadata(cal).color, color: '#fff' }}
              >
                <span className="stat-label">{escalaMetadata(cal).etiqueta}</span>
                <span className="stat-value">{datosActuales.stats[cal]}</span>
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

