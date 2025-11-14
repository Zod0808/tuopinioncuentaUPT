import { useState } from 'react';
import { EvaluacionData } from '../types';
import { GraduationCap, PieChart, BarChart3 } from 'lucide-react';
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
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
}

interface CalificacionStats {
  INSATISFACTORIO: number;
  ACEPTABLE: number;
  BUENO: number;
  DESTACADO: number;
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

  // Función para calcular calificación basada en nota
  const calcularCalificacion = (nota: number): 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO' => {
    if (nota > 17 && nota <= 20) {
      return 'DESTACADO';
    } else if (nota > 15 && nota <= 17) {
      return 'BUENO';
    } else if (nota > 11 && nota <= 15) {
      return 'ACEPTABLE';
    } else {
      return 'INSATISFACTORIO';
    }
  };

  // Obtener todas las carreras profesionales
  const carreras = [...new Set(datos.map(d => d.carreraProfesional))].sort();

  // Procesar datos por carrera
  const procesarCarrera = (carrera: string): { stats: CalificacionStats; docentes: DocenteResumen[] } => {
    const datosCarrera = datos.filter(d => d.carreraProfesional === carrera);
    
    // Agrupar por docente
    const docentesMap = new Map<string, EvaluacionData[]>();
    datosCarrera.forEach(dato => {
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

      const calificacion = calcularCalificacion(promedioNota);

      return {
        docente,
        promedioNota,
        cantidadCursos,
        calificacion
      };
    });

    // Contar docentes por calificación
    const stats: CalificacionStats = {
      INSATISFACTORIO: 0,
      ACEPTABLE: 0,
      BUENO: 0,
      DESTACADO: 0
    };

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
        const stats: CalificacionStats = {
          INSATISFACTORIO: 0,
          ACEPTABLE: 0,
          BUENO: 0,
          DESTACADO: 0
        };

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
  const porcentajes = {
    INSATISFACTORIO: totalDocentes > 0 ? (datosActuales.stats.INSATISFACTORIO / totalDocentes * 100).toFixed(1) : '0.0',
    ACEPTABLE: totalDocentes > 0 ? (datosActuales.stats.ACEPTABLE / totalDocentes * 100).toFixed(1) : '0.0',
    BUENO: totalDocentes > 0 ? (datosActuales.stats.BUENO / totalDocentes * 100).toFixed(1) : '0.0',
    DESTACADO: totalDocentes > 0 ? (datosActuales.stats.DESTACADO / totalDocentes * 100).toFixed(1) : '0.0'
  };

  // Datos para gráfico de pastel
  const pieData = {
    labels: ['INSATISFACTORIO', 'ACEPTABLE', 'BUENO', 'DESTACADO'],
    datasets: [
      {
        label: 'Docentes',
        data: [
          datosActuales.stats.INSATISFACTORIO,
          datosActuales.stats.ACEPTABLE,
          datosActuales.stats.BUENO,
          datosActuales.stats.DESTACADO
        ],
        backgroundColor: [
          'rgba(244, 67, 54, 0.8)',   // Rojo para INSATISFACTORIO
          'rgba(255, 152, 0, 0.8)',   // Naranja para ACEPTABLE
          'rgba(76, 175, 80, 0.8)',   // Verde para BUENO
          'rgba(33, 150, 243, 0.8)'   // Azul para DESTACADO
        ],
        borderColor: [
          'rgba(244, 67, 54, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Datos para gráfico de barras
  const barData = {
    labels: ['INSATISFACTORIO', 'ACEPTABLE', 'BUENO', 'DESTACADO'],
    datasets: [
      {
        label: 'Cantidad de Docentes',
        data: [
          datosActuales.stats.INSATISFACTORIO,
          datosActuales.stats.ACEPTABLE,
          datosActuales.stats.BUENO,
          datosActuales.stats.DESTACADO
        ],
        backgroundColor: [
          'rgba(244, 67, 54, 0.8)',
          'rgba(255, 152, 0, 0.8)',
          'rgba(76, 175, 80, 0.8)',
          'rgba(33, 150, 243, 0.8)'
        ],
        borderColor: [
          'rgba(244, 67, 54, 1)',
          'rgba(255, 152, 0, 1)',
          'rgba(76, 175, 80, 1)',
          'rgba(33, 150, 243, 1)'
        ],
        borderWidth: 2
      }
    ]
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
          <div className="calificacion-stat-card">
            <div className="stat-badge stat-insatisfactorio">
              <span className="stat-label">INSATISFACTORIO</span>
              <span className="stat-value">{datosActuales.stats.INSATISFACTORIO}</span>
              <span className="stat-percentage">{porcentajes.INSATISFACTORIO}%</span>
            </div>
          </div>
          <div className="calificacion-stat-card">
            <div className="stat-badge stat-aceptable">
              <span className="stat-label">ACEPTABLE</span>
              <span className="stat-value">{datosActuales.stats.ACEPTABLE}</span>
              <span className="stat-percentage">{porcentajes.ACEPTABLE}%</span>
            </div>
          </div>
          <div className="calificacion-stat-card">
            <div className="stat-badge stat-bueno">
              <span className="stat-label">BUENO</span>
              <span className="stat-value">{datosActuales.stats.BUENO}</span>
              <span className="stat-percentage">{porcentajes.BUENO}%</span>
            </div>
          </div>
          <div className="calificacion-stat-card">
            <div className="stat-badge stat-destacado">
              <span className="stat-label">DESTACADO</span>
              <span className="stat-value">{datosActuales.stats.DESTACADO}</span>
              <span className="stat-percentage">{porcentajes.DESTACADO}%</span>
            </div>
          </div>
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

