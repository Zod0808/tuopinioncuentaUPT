import { useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Pie, Doughnut } from 'react-chartjs-2';
import { EvaluacionData } from '../types';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

interface ChartsProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

export default function Charts({ datos, onGraficoReady }: ChartsProps) {
  const grafico1Ref = useRef<HTMLDivElement>(null);
  const grafico2Ref = useRef<HTMLDivElement>(null);
  const grafico3Ref = useRef<HTMLDivElement>(null);
  const grafico4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (onGraficoReady) {
      // Usar setTimeout para evitar loops infinitos
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
      <div className="charts-container">
        <p className="no-data">No hay datos para mostrar. Agrega registros primero.</p>
      </div>
    );
  }

  // Gráfico 1: Notas por curso
  const cursos = [...new Set(datos.map(d => d.curso))];
  const notasPorCurso = cursos.map(curso => {
    const cursoDatos = datos.filter(d => d.curso === curso);
    return cursoDatos.reduce((sum, d) => sum + d.nota, 0) / cursoDatos.length;
  });

  const chart1Data = {
    labels: cursos,
    datasets: [{
      label: 'Nota Promedio',
      data: notasPorCurso,
      backgroundColor: 'rgba(102, 126, 234, 0.8)',
      borderColor: 'rgba(102, 126, 234, 1)',
      borderWidth: 2
    }]
  };

  // Gráfico 2: Distribución de calificaciones
  const calificaciones = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'REGULAR', 'DEFICIENTE'];
  const distribucionCalificaciones = calificaciones.map(cal => 
    datos.filter(d => d.calificacion === cal).length
  );

  const chart2Data = {
    labels: calificaciones,
    datasets: [{
      label: 'Cantidad',
      data: distribucionCalificaciones,
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

  // Gráfico 3: Promedio de Aspectos Académicos (AE)
  const aspectosLabels = [
    'AE-01: Sílabo',
    'AE-02: Enseñanza',
    'AE-03: Evaluación',
    'AE-04: Actitudinal'
  ];
  const promedioAspectos = [
    datos.reduce((sum, d) => sum + d.ae01, 0) / datos.length,
    datos.reduce((sum, d) => sum + d.ae02, 0) / datos.length,
    datos.reduce((sum, d) => sum + d.ae03, 0) / datos.length,
    datos.reduce((sum, d) => sum + d.ae04, 0) / datos.length
  ];

  const chart3Data = {
    labels: aspectosLabels,
    datasets: [{
      label: 'Promedio por Aspecto Académico',
      data: promedioAspectos,
      backgroundColor: [
        'rgba(75, 192, 192, 0.8)',
        'rgba(54, 162, 235, 0.8)',
        'rgba(255, 206, 86, 0.8)',
        'rgba(255, 159, 64, 0.8)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(255, 206, 86, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 2
    }]
  };

  // Gráfico 4: Encuestados vs No Encuestados
  const totalEncuestados = datos.reduce((sum, d) => sum + d.encuestados, 0);
  const totalNoEncuestados = datos.reduce((sum, d) => sum + d.noEncuestados, 0);

  const chart4Data = {
    labels: ['Encuestados', 'No Encuestados'],
    datasets: [{
      data: [totalEncuestados, totalNoEncuestados],
      backgroundColor: [
        'rgba(102, 126, 234, 0.8)',
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
    }
  };

  return (
    <div className="charts-container">
      <h2>Gráficos de Análisis</h2>
      
      <div className="charts-grid">
        <div className="chart-card" ref={grafico1Ref}>
          <Bar 
            data={chart1Data} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: 'Nota Promedio por Curso'
                }
              }
            }}
          />
        </div>

        <div className="chart-card" ref={grafico2Ref}>
          <Pie 
            data={chart2Data} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: 'Distribución de Calificaciones'
                }
              }
            }}
          />
        </div>

        <div className="chart-card" ref={grafico3Ref}>
          <Bar 
            data={chart3Data} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: 'Promedio por Aspectos Académicos Evaluados'
                }
              }
            }}
          />
        </div>

        <div className="chart-card" ref={grafico4Ref}>
          <Doughnut 
            data={chart4Data} 
            options={{
              ...chartOptions,
              plugins: {
                ...chartOptions.plugins,
                title: {
                  ...chartOptions.plugins.title,
                  text: 'Encuestados vs No Encuestados'
                }
              }
            }}
          />
        </div>
      </div>
    </div>
  );
}

