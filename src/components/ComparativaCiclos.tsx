import { useState, useEffect } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { TrendingUp, Users, Award, BookOpen, AlertCircle } from 'lucide-react';
import { EvaluacionData } from '../types';
import { loadAllCyclesData, isSupabaseConfigured } from '../services/supabaseService';
import {
  esNuevoReglamento, CICLO_INICIO_REGLAMENTO_2026,
} from '../config/universityStructure';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

/**
 * Buckets por rango de nota vigesimal — único eje realmente comparable entre
 * Res. 200-2019 y Res. 245-2026. Los nombres de los niveles cambian entre
 * reglamentos (BUENO ≠ MUY_SATISFACTORIO en umbral y semántica), pero la nota
 * en escala 0–20 significa lo mismo en ambos.
 *
 * Los rangos corresponden a los cortes clave que coinciden en ambas escalas:
 *   nota ≥ 17.1  → tier superior (Destacado legacy / Excelente+ 2026)
 *   15.0–17.09   → tier medio-alto (Bueno legacy / MuySatisfactorio 2026)
 *   11.0–14.99   → tier medio (Aceptable legacy / Satisfactorio 2026)
 *   nota < 11.0  → tier bajo (Insatisfactorio en ambos)
 */
interface RangoNota {
  key: 'tierSuperior' | 'tierMedioAlto' | 'tierMedio' | 'tierBajo';
  etiqueta: string;
  min: number;
  max: number;  // exclusivo del siguiente rango
  color: string;
}

const RANGOS: readonly RangoNota[] = [
  { key: 'tierSuperior',   etiqueta: 'Nota ≥ 17.1',   min: 17.1,         max: 20.01, color: '#276749' },
  { key: 'tierMedioAlto',  etiqueta: 'Nota 15.0–17.09', min: 15.0,       max: 17.1,  color: '#2b6cb0' },
  { key: 'tierMedio',      etiqueta: 'Nota 11.0–14.99', min: 11.0,       max: 15.0,  color: '#c05621' },
  { key: 'tierBajo',       etiqueta: 'Nota < 11.0',   min: -Infinity,    max: 11.0,  color: '#c53030' },
] as const;

function clasificarPorRango(nota: number): RangoNota['key'] {
  for (const r of RANGOS) {
    if (nota >= r.min && nota < r.max) return r.key;
  }
  return 'tierBajo';
}

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

/**
 * Eje Y ajustado al rango real de las notas (con margen) en lugar de 0–20 fijo:
 * entre ciclos las diferencias suelen ser de décimas y en 0–20 se ven planas.
 */
function ejeNotaAjustado(valores: number[]) {
  const v = valores.filter(n => n > 0);
  const lo = v.length ? Math.min(...v) : 0;
  const hi = v.length ? Math.max(...v) : 20;
  const margen = Math.max(0.2, (hi - lo) * 0.15);
  return {
    min: Math.max(0, Math.floor((lo - margen) * 10) / 10),
    max: Math.min(20, Math.ceil((hi + margen) * 10) / 10),
    ticks: { callback: (value: string | number) => Number(value).toFixed(2) },
  };
}

interface ComparativaCiclosProps {
  cicloActual: string;
  datosCicloActual: EvaluacionData[];
}

interface MetricaCiclo {
  ciclo: string;
  total: number;
  notaPromedio: number;
  ae01: number;
  ae02: number;
  ae03: number;
  ae04: number;
  totalEncuestados: number;
  docentesUnicos: number;
  rangos: Record<RangoNota['key'], number>;
  reglamentoNuevo: boolean;
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

  const metrics: MetricaCiclo[] = ciclos.map(ciclo => {
    const d = allData[ciclo] || [];
    const notaPromedio = d.length ? d.reduce((s, x) => s + x.nota, 0) / d.length : 0;
    const ae01 = d.length ? d.reduce((s, x) => s + x.ae01, 0) / d.length : 0;
    const ae02 = d.length ? d.reduce((s, x) => s + x.ae02, 0) / d.length : 0;
    const ae03 = d.length ? d.reduce((s, x) => s + x.ae03, 0) / d.length : 0;
    const ae04 = d.length ? d.reduce((s, x) => s + x.ae04, 0) / d.length : 0;
    const totalEncuestados = d.reduce((s, x) => s + x.encuestados, 0);
    const docentesUnicos = new Set(d.map(x => x.docente)).size;

    const rangos: Record<RangoNota['key'], number> = {
      tierSuperior: 0, tierMedioAlto: 0, tierMedio: 0, tierBajo: 0,
    };
    for (const x of d) rangos[clasificarPorRango(x.nota)]++;

    return {
      ciclo, total: d.length, notaPromedio, ae01, ae02, ae03, ae04,
      totalEncuestados, docentesUnicos, rangos,
      reglamentoNuevo: esNuevoReglamento(ciclo),
    };
  });

  const notaPromChart = {
    labels: ciclos,
    datasets: [{
      label: 'Nota promedio',
      data: metrics.map(m => parseFloat(m.notaPromedio.toFixed(2))),
      backgroundColor: ciclos.map(c => c === cicloActual ? 'rgba(0,48,135,0.85)' : 'rgba(0,48,135,0.45)'),
      borderColor: '#003087',
      borderWidth: 2,
      borderRadius: 6,
    }],
  };

  const notaTendChart = {
    labels: ciclos,
    datasets: [{
      label: 'Tendencia nota promedio',
      data: metrics.map(m => parseFloat(m.notaPromedio.toFixed(2))),
      borderColor: '#003087',
      backgroundColor: 'rgba(0,48,135,0.15)',
      pointBackgroundColor: ciclos.map(c => c === cicloActual ? '#1a4ab5' : '#003087'),
      pointRadius: 6,
      tension: 0.35,
      fill: true,
    }],
  };

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

  // Distribución apilada por rango de nota — cada barra = ciclo; segmentos
  // comparables entre reglamentos porque están definidos por nota, no por
  // nombre de nivel.
  const rangosDistChart = {
    labels: ciclos,
    datasets: RANGOS.map(r => ({
      label: r.etiqueta,
      data: metrics.map(m => m.rangos[r.key]),
      backgroundColor: r.color + 'cc',
      borderColor: r.color,
      borderWidth: 1,
    })),
  };

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
    ...chartOptions('Distribución de Notas por Rango — ciclos comparables'),
    scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
  };

  const ejeNotas = ejeNotaAjustado(metrics.map(m => m.notaPromedio));
  const ejeAspectos = ejeNotaAjustado(metrics.flatMap(m => [m.ae01, m.ae02, m.ae03, m.ae04]));

  const hayCambioReglamento = metrics.some(m => m.reglamentoNuevo) && metrics.some(m => !m.reglamentoNuevo);

  return (
    <div className="comparativa-ciclos">
      <div className="comparativa-header">
        <TrendingUp size={28} color="#003087" />
        <div>
          <h2>Comparativa entre Ciclos</h2>
          <p>{ciclos.length} ciclo{ciclos.length !== 1 ? 's' : ''} con datos · Ciclo actual resaltado: <strong>{cicloActual}</strong></p>
        </div>
      </div>

      {hayCambioReglamento && (
        <div className="comp-aviso-reglamento">
          <AlertCircle size={18} />
          <span>
            Los ciclos muestran datos de dos reglamentos (cambio en <strong>{CICLO_INICIO_REGLAMENTO_2026}</strong>, Res. 245-2026).
            La distribución se agrupa por <strong>rangos de nota</strong> en lugar de nombres de nivel para que las series sean comparables.
          </span>
        </div>
      )}

      <div className="comparativa-summary-cards">
        <div className="comp-card">
          <BookOpen size={22} color="#003087" />
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

      <div className="comparativa-charts-grid">
        <div className="comp-chart-card comp-chart-wide">
          <div className="chart-wrapper" style={{ height: 300 }}>
            <Line data={notaTendChart} options={{ ...chartOptions('Tendencia de Nota Promedio por Ciclo'), scales: { y: ejeNotas } }} />
          </div>
        </div>

        <div className="comp-chart-card">
          <div className="chart-wrapper" style={{ height: 300 }}>
            <Bar data={notaPromChart} options={{ ...chartOptions('Nota Promedio por Ciclo'), scales: { y: ejeNotas } }} />
          </div>
        </div>

        <div className="comp-chart-card">
          <div className="chart-wrapper" style={{ height: 300 }}>
            <Bar data={docentesChart} options={chartOptions('Docentes Evaluados por Ciclo')} />
          </div>
        </div>

        <div className="comp-chart-card comp-chart-wide">
          <div className="chart-wrapper" style={{ height: 320 }}>
            <Bar data={rangosDistChart} options={stackedOpts} />
          </div>
        </div>

        <div className="comp-chart-card comp-chart-wide">
          <div className="chart-wrapper" style={{ height: 320 }}>
            <Bar data={aspectosChart} options={{ ...chartOptions('Promedios AE-01 al AE-04 por Ciclo'), scales: { y: ejeAspectos } }} />
          </div>
        </div>
      </div>

      <div className="comparativa-table-section">
        <h3>Resumen por Ciclo</h3>
        <div className="comparativa-table-wrapper">
          <table className="comparativa-table">
            <thead>
              <tr>
                <th>Ciclo</th>
                <th>Reg.</th>
                <th>Registros</th>
                <th>Docentes</th>
                <th>Encuestados</th>
                <th>Nota Prom.</th>
                <th>AE-01</th>
                <th>AE-02</th>
                <th>AE-03</th>
                <th>AE-04</th>
                {RANGOS.map(r => <th key={r.key} title={r.etiqueta}>{r.etiqueta}</th>)}
              </tr>
            </thead>
            <tbody>
              {metrics.map(m => (
                <tr key={m.ciclo} className={m.ciclo === cicloActual ? 'comp-row-actual' : ''}>
                  <td><strong>{m.ciclo}</strong>{m.ciclo === cicloActual && <span className="comp-badge-actual"> actual</span>}</td>
                  <td className="text-center" title={m.reglamentoNuevo ? 'Res. 245-2026 (5 niveles)' : 'Res. 200-2019 (4 niveles)'}>
                    {m.reglamentoNuevo ? '2026' : '2019'}
                  </td>
                  <td className="text-right">{m.total}</td>
                  <td className="text-right">{m.docentesUnicos}</td>
                  <td className="text-right">{m.totalEncuestados.toLocaleString()}</td>
                  <td className="text-right"><strong style={{ color: m.notaPromedio >= 15 ? '#4caf50' : m.notaPromedio >= 11 ? '#ff9800' : '#f44336' }}>{m.notaPromedio.toFixed(2)}</strong></td>
                  <td className="text-right">{m.ae01.toFixed(2)}</td>
                  <td className="text-right">{m.ae02.toFixed(2)}</td>
                  <td className="text-right">{m.ae03.toFixed(2)}</td>
                  <td className="text-right">{m.ae04.toFixed(2)}</td>
                  {RANGOS.map(r => (
                    <td key={r.key} className="text-right" style={{ color: r.color, fontWeight: 500 }}>
                      {m.rangos[r.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
