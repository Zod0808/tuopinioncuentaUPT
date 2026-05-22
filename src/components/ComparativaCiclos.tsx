import { useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { TrendingUp, Users, Award, BookOpen, AlertCircle } from 'lucide-react';
import { EvaluacionData } from '../types';
import { loadAllCyclesData, isSupabaseConfigured } from '../services/supabaseService';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const CALIFICACIONES = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'INSATISFACTORIO'] as const;
const COLORES_CALIFICACION: Record<string, string> = {
  DESTACADO: '#4472C4', BUENO: '#ED7D31', ACEPTABLE: '#A5A5A5', INSATISFACTORIO: '#FFC000',
};

function sortCiclos(ciclos: string[]): string[] {
  return [...ciclos].sort((a, b) => {
    const [ya, sa] = a.split('-'); const [yb, sb] = b.split('-');
    if (ya !== yb) return parseInt(ya) - parseInt(yb);
    return sa.localeCompare(sb);
  });
}

const chartOptions = (titulo: string) => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'top' as const },
    title: { display: true, text: titulo, font: { size: 14 } },
  },
  scales: { y: { beginAtZero: true } },
});

interface ComparativaCiclosProps {
  cicloActual: string;
  datosCicloActual: EvaluacionData[];
}

export default function ComparativaCiclos({ cicloActual, datosCicloActual }: ComparativaCiclosProps) {
  const [allData, setAllData] = useState<Record<string, EvaluacionData[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (!isSupabaseConfigured()) { setError('Inicia sesión para ver la comparativa entre ciclos.'); return; }
        const data = await loadAllCyclesData();
        // Incluir el ciclo actual (puede tener datos no guardados aún)
        if (datosCicloActual.length > 0) data[cicloActual] = datosCicloActual;
        setAllData(data);
      } catch {
        setError('Error al cargar los datos de todos los ciclos.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [cicloActual, datosCicloActual]);

  if (loading) return <div className="loading-container"><div className="spinner" /><p>Cargando datos de todos los ciclos...</p></div>;
  if (error) return <div className="comparativa-error"><AlertCircle size={40} /><p>{error}</p></div>;

  const ciclos = sortCiclos(Object.keys(allData));
  if (ciclos.length === 0) return (
    <div className="no-data-container">
      <TrendingUp size={64} />
      <p className="no-data">Aún no hay datos de ciclos anteriores.</p>
      <p className="hint">Importa datos de distintos ciclos para ver la comparativa.</p>
    </div>
  );

  // ── Métricas por ciclo ───────────────────────────────────────────────────
  const metrics = ciclos.map(ciclo => {
    const d = allData[ciclo] || [];
    const notaPromedio = d.length ? d.reduce((s, x) => s + x.nota, 0) / d.length : 0;
    const ae01 = d.length ? d.reduce((s, x) => s + x.ae01, 0) / d.length : 0;
    const ae02 = d.length ? d.reduce((s, x) => s + x.ae02, 0) / d.length : 0;
    const ae03 = d.length ? d.reduce((s, x) => s + x.ae03, 0) / d.length : 0;
    const ae04 = d.length ? d.reduce((s, x) => s + x.ae04, 0) / d.length : 0;
    const totalEncuestados = d.reduce((s, x) => s + x.encuestados, 0);
    const docentesUnicos = new Set(d.map(x => x.docente)).size;
    const califs: Record<string, number> = {};
    CALIFICACIONES.forEach(c => { califs[c] = d.filter(x => x.calificacion === c).length; });
    return { ciclo, total: d.length, notaPromedio, ae01, ae02, ae03, ae04, totalEncuestados, docentesUnicos, califs };
  });

  // ── Gráfico 1: Nota promedio por ciclo ───────────────────────────────────
  const notaPromChart = {
    labels: ciclos,
    datasets: [{
      label: 'Nota promedio',
      data: metrics.map(m => parseFloat(m.notaPromedio.toFixed(2))),
      backgroundColor: ciclos.map(c => c === cicloActual ? 'rgba(102,126,234,0.85)' : 'rgba(102,126,234,0.45)'),
      borderColor: '#667eea',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // ── Gráfico 2: Línea de tendencia nota promedio ──────────────────────────
  const notaTendChart = {
    labels: ciclos,
    datasets: [{
      label: 'Tendencia nota promedio',
      data: metrics.map(m => parseFloat(m.notaPromedio.toFixed(2))),
      borderColor: '#667eea',
      backgroundColor: 'rgba(102,126,234,0.15)',
      pointBackgroundColor: ciclos.map(c => c === cicloActual ? '#764ba2' : '#667eea'),
      pointRadius: 6,
      tension: 0.35,
      fill: true,
    }],
  };

  // ── Gráfico 3: Docentes evaluados por ciclo ──────────────────────────────
  const docentesChart = {
    labels: ciclos,
    datasets: [{
      label: 'Docentes evaluados',
      data: metrics.map(m => m.docentesUnicos),
      backgroundColor: 'rgba(76,175,80,0.7)',
      borderColor: '#4caf50',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  // ── Gráfico 4: Distribución de calificaciones por ciclo ──────────────────
  const califDistChart = {
    labels: ciclos,
    datasets: CALIFICACIONES.map(cal => ({
      label: cal,
      data: metrics.map(m => m.califs[cal] || 0),
      backgroundColor: COLORES_CALIFICACION[cal] + 'cc',
      borderColor: COLORES_CALIFICACION[cal],
      borderWidth: 1,
    })),
  };

  // ── Gráfico 5: Aspectos evaluados (AE01-04) por ciclo ───────────────────
  const aspectosChart = {
    labels: ciclos,
    datasets: [
      { label: 'AE-01 Sílabo', data: metrics.map(m => parseFloat(m.ae01.toFixed(2))), backgroundColor: 'rgba(33,150,243,0.7)', borderColor: '#2196f3', borderWidth: 1, borderRadius: 4 },
      { label: 'AE-02 Enseñanza', data: metrics.map(m => parseFloat(m.ae02.toFixed(2))), backgroundColor: 'rgba(76,175,80,0.7)', borderColor: '#4caf50', borderWidth: 1, borderRadius: 4 },
      { label: 'AE-03 Evaluación', data: metrics.map(m => parseFloat(m.ae03.toFixed(2))), backgroundColor: 'rgba(255,152,0,0.7)', borderColor: '#ff9800', borderWidth: 1, borderRadius: 4 },
      { label: 'AE-04 Actitudinal', data: metrics.map(m => parseFloat(m.ae04.toFixed(2))), backgroundColor: 'rgba(156,39,176,0.7)', borderColor: '#9c27b0', borderWidth: 1, borderRadius: 4 },
    ],
  };

  const stackedOpts = {
    ...chartOptions('Distribución de Calificaciones por Ciclo'),
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
  };

  return (
    <div className="comparativa-ciclos">
      <div className="comparativa-header">
        <TrendingUp size={28} color="#667eea" />
        <div>
          <h2>Comparativa entre Ciclos</h2>
          <p>{ciclos.length} ciclo{ciclos.length !== 1 ? 's' : ''} con datos · Ciclo actual resaltado: <strong>{cicloActual}</strong></p>
        </div>
      </div>

      {/* Tarjetas resumen rápido */}
      <div className="comparativa-summary-cards">
        <div className="comp-card">
          <BookOpen size={22} color="#667eea" />
          <div><span className="comp-card-value">{ciclos.length}</span><span className="comp-card-label">Ciclos con datos</span></div>
        </div>
        <div className="comp-card">
          <Users size={22} color="#4caf50" />
          <div>
            <span className="comp-card-value">{metrics.reduce((s, m) => s + m.docentesUnicos, 0)}</span>
            <span className="comp-card-label">Evaluaciones de docentes (total)</span>
          </div>
        </div>
        <div className="comp-card">
          <Award size={22} color="#ff9800" />
          <div>
            <span className="comp-card-value">
              {metrics.length ? (metrics.reduce((s, m) => s + m.notaPromedio, 0) / metrics.length).toFixed(2) : '—'}
            </span>
            <span className="comp-card-label">Nota promedio histórica</span>
          </div>
        </div>
        <div className="comp-card">
          <TrendingUp size={22} color="#2196f3" />
          <div>
            <span className="comp-card-value">{metrics.reduce((s, m) => s + m.totalEncuestados, 0).toLocaleString()}</span>
            <span className="comp-card-label">Total encuestados histórico</span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="comparativa-charts-grid">
        <div className="comp-chart-card comp-chart-wide">
          <div className="chart-wrapper" style={{ height: 300 }}>
            <Line data={notaTendChart} options={{ ...chartOptions('Tendencia de Nota Promedio por Ciclo'), scales: { y: { min: 0, max: 20 } } }} />
          </div>
        </div>

        <div className="comp-chart-card">
          <div className="chart-wrapper" style={{ height: 300 }}>
            <Bar data={notaPromChart} options={{ ...chartOptions('Nota Promedio por Ciclo'), scales: { y: { min: 0, max: 20 } } }} />
          </div>
        </div>

        <div className="comp-chart-card">
          <div className="chart-wrapper" style={{ height: 300 }}>
            <Bar data={docentesChart} options={chartOptions('Docentes Evaluados por Ciclo')} />
          </div>
        </div>

        <div className="comp-chart-card comp-chart-wide">
          <div className="chart-wrapper" style={{ height: 320 }}>
            <Bar data={califDistChart} options={stackedOpts} />
          </div>
        </div>

        <div className="comp-chart-card comp-chart-wide">
          <div className="chart-wrapper" style={{ height: 320 }}>
            <Bar data={aspectosChart} options={{ ...chartOptions('Promedios AE-01 al AE-04 por Ciclo'), scales: { y: { min: 0, max: 20 } } }} />
          </div>
        </div>
      </div>

      {/* Tabla resumen */}
      <div className="comparativa-table-section">
        <h3>Resumen por Ciclo</h3>
        <div className="comparativa-table-wrapper">
          <table className="comparativa-table">
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Registros</th>
                <th>Docentes</th>
                <th>Encuestados</th>
                <th>Nota Prom.</th>
                <th>AE-01</th>
                <th>AE-02</th>
                <th>AE-03</th>
                <th>AE-04</th>
                <th>Destacado</th>
                <th>Bueno</th>
                <th>Aceptable</th>
                <th>Insatisfactorio</th>
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.ciclo} className={m.ciclo === cicloActual ? 'comp-row-actual' : ''}>
                  <td><strong>{m.ciclo}</strong>{m.ciclo === cicloActual && <span className="comp-badge-actual"> actual</span>}</td>
                  <td className="text-right">{m.total}</td>
                  <td className="text-right">{m.docentesUnicos}</td>
                  <td className="text-right">{m.totalEncuestados.toLocaleString()}</td>
                  <td className="text-right"><strong style={{ color: m.notaPromedio >= 15 ? '#4caf50' : m.notaPromedio >= 11 ? '#ff9800' : '#f44336' }}>{m.notaPromedio.toFixed(2)}</strong></td>
                  <td className="text-right">{m.ae01.toFixed(2)}</td>
                  <td className="text-right">{m.ae02.toFixed(2)}</td>
                  <td className="text-right">{m.ae03.toFixed(2)}</td>
                  <td className="text-right">{m.ae04.toFixed(2)}</td>
                  <td className="text-right text-blue">{m.califs.DESTACADO || 0}</td>
                  <td className="text-right text-green">{m.califs.BUENO || 0}</td>
                  <td className="text-right text-orange">{m.califs.ACEPTABLE || 0}</td>
                  <td className="text-right text-orange">{m.califs.INSATISFACTORIO || 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
