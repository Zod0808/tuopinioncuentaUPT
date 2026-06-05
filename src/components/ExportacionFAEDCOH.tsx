import { useState, useRef } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Download, FileSpreadsheet, FileText, Filter, AlertTriangle } from 'lucide-react';
import { EvaluacionData } from '../types';
import { calcularCalificacion, FACULTADES, ORDEN_FACULTADES } from '../config/universityStructure';
import {
  exportarReporteI, exportarReporteII, exportarReporteIII,
  exportarReporteIV, exportarReporteV, exportarReporteVI,
} from '../services/excelService';
import {
  generarPDFReporteI, generarPDFReporteII, generarPDFReporteIII,
  generarPDFReporteIV, generarPDFReporteV, generarPDFReporteVI,
} from '../services/pdfService';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

interface Props { datos: EvaluacionData[] }

const COLORES_CAL = ['#276749', '#2b6cb0', '#c05621', '#c53030'];
const LABELS_CAL = ['Destacado', 'Bueno', 'Aceptable', 'Insatisfactorio'];
const CAL_KEYS = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'INSATISFACTORIO'];

type TipoReporte = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
type Formato = 'pdf' | 'excel';

const REPORTES: { id: TipoReporte; titulo: string; desc: string }[] = [
  { id: 'I',   titulo: 'Reporte I',   desc: 'Evaluación General por Docente (tabla completa)' },
  { id: 'II',  titulo: 'Reporte II',  desc: 'Docentes Insatisfactorios — nota ≤ 10.9 y válidos' },
  { id: 'III', titulo: 'Reporte III', desc: 'Promedios AE-01 a AE-04 por Carrera (con gráfico)' },
  { id: 'IV',  titulo: 'Reporte IV',  desc: 'Distribución % Juicio de Valor por Carrera (con gráfico)' },
  { id: 'V',   titulo: 'Reporte V',   desc: 'Estudiantes Encuestados vs Matriculados (con gráfico)' },
  { id: 'VI',  titulo: 'Reporte VI',  desc: 'Encuestas Realizadas vs Proyectadas (con gráfico)' },
];

function avg(arr: number[]) { return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0; }

function normComp(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchesFacultad(recordFacultad: string, codigo: string): boolean {
  if (!codigo) return true;
  const rn = normComp(recordFacultad);
  const fac = FACULTADES[codigo];
  if (!fac) return false;
  return rn.includes(normComp(codigo)) || rn.includes(normComp(fac.nombre));
}

export default function ExportacionFAEDCOH({ datos }: Props) {
  const [facultadFiltro, setFacultadFiltro] = useState('');
  const [carreraFiltro, setCarreraFiltro] = useState('');
  const [docenteFiltro, setDocenteFiltro] = useState('');
  const [formato, setFormato] = useState<Formato>('pdf');
  const [reporteActivo, setReporteActivo] = useState<TipoReporte>('I');
  const [generando, setGenerando] = useState(false);

  const graficoRef = useRef<HTMLDivElement>(null);

  // Facultades presentes en los datos (códigos conocidos + los que vengan del Excel)
  const facultadesEnDatos = [...new Set(datos.map(d => d.facultad))];
  const facultadesConocidas = ORDEN_FACULTADES.filter(cod =>
    facultadesEnDatos.some(f => matchesFacultad(f, cod))
  );
  // Agregar las que no reconocemos por código pero existen en los datos
  const facultadesExtra = facultadesEnDatos.filter(f =>
    !ORDEN_FACULTADES.some(cod => matchesFacultad(f, cod))
  );

  // Base filtrada por facultad seleccionada
  const datosFacultad = datos.filter(d => matchesFacultad(d.facultad, facultadFiltro));

  const carreras = [...new Set(datosFacultad.map(d => d.carreraProfesional))].sort();

  const docentesFiltrados = [
    ...new Set(
      datosFacultad
        .filter(d => !carreraFiltro || d.carreraProfesional === carreraFiltro)
        .map(d => d.docente)
    ),
  ].sort();

  // Datos base con los tres niveles aplicados
  let base = datosFacultad;
  if (carreraFiltro) base = base.filter(d => d.carreraProfesional === carreraFiltro);
  if (docenteFiltro) base = base.filter(d => d.docente === docenteFiltro);

  const carrerasParaGrafico = carreraFiltro
    ? [carreraFiltro]
    : [...new Set(base.map(d => d.carreraProfesional))].sort();

  const shortLabel = (c: string) =>
    c.replace(/^(Carrera Profesional de |Carrera de |Escuela Profesional de )/i, '');

  // ── Gráficos ──────────────────────────────────────────────────────────────
  const datosGraficoIII = {
    labels: carrerasParaGrafico.map(shortLabel),
    datasets: ['AE-01', 'AE-02', 'AE-03', 'AE-04'].map((ae, idx) => ({
      label: ae,
      data: carrerasParaGrafico.map(c => {
        const regs = base.filter(d => d.carreraProfesional === c);
        const key = `ae0${idx + 1}` as keyof EvaluacionData;
        return +avg(regs.map(d => d[key] as number)).toFixed(2);
      }),
      backgroundColor: COLORES_CAL[idx],
    })),
  };

  const datosGraficoIV = {
    labels: carrerasParaGrafico.map(shortLabel),
    datasets: CAL_KEYS.map((cal, idx) => ({
      label: LABELS_CAL[idx],
      data: carrerasParaGrafico.map(c => {
        const regs = base.filter(d => d.carreraProfesional === c && d.validez === 'Válido');
        if (!regs.length) return 0;
        const n = regs.filter(d => calcularCalificacion(d.nota) === cal).length;
        return +(n / regs.length * 100).toFixed(1);
      }),
      backgroundColor: COLORES_CAL[idx],
    })),
  };

  const datosGraficoV = {
    labels: carrerasParaGrafico.map(shortLabel),
    datasets: [
      {
        label: 'Encuestados',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.encuestados, 0)),
        backgroundColor: '#2b6cb0',
      },
      {
        label: 'No Encuestados',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.noEncuestados, 0)),
        backgroundColor: '#c53030',
      },
    ],
  };

  const datosGraficoVI = {
    labels: carrerasParaGrafico.map(shortLabel),
    datasets: [
      {
        label: 'Realizadas',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.encuestados, 0)),
        backgroundColor: '#276749',
      },
      {
        label: 'No Realizadas',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.noEncuestados, 0)),
        backgroundColor: '#c05621',
      },
    ],
  };

  const opApiladas = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, max: 100 } }, plugins: { legend: { position: 'top' as const } } };
  const opApiladasAbs = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: 'top' as const } } };
  const opAgrupadas = { responsive: true, scales: { y: { min: 0, max: 20 } }, plugins: { legend: { position: 'top' as const } } };

  const graficosPorReporte: Record<TipoReporte, React.ReactNode> = {
    I: null, II: null,
    III: <Bar data={datosGraficoIII} options={opAgrupadas} />,
    IV:  <Bar data={datosGraficoIV}  options={opApiladas} />,
    V:   <Bar data={datosGraficoV}   options={opApiladasAbs} />,
    VI:  <Bar data={datosGraficoVI}  options={opApiladasAbs} />,
  };

  const handleGenerar = async () => {
    if (generando) return;
    setGenerando(true);
    try {
      if (formato === 'excel') {
        switch (reporteActivo) {
          case 'I':   exportarReporteI(datos, facultadFiltro, carreraFiltro, docenteFiltro); break;
          case 'II':  exportarReporteII(datos, facultadFiltro, carreraFiltro, docenteFiltro); break;
          case 'III': exportarReporteIII(datos, facultadFiltro, carreraFiltro); break;
          case 'IV':  exportarReporteIV(datos, facultadFiltro, carreraFiltro); break;
          case 'V':   exportarReporteV(datos, facultadFiltro, carreraFiltro); break;
          case 'VI':  exportarReporteVI(datos, facultadFiltro, carreraFiltro); break;
        }
      } else {
        const el = graficoRef.current;
        switch (reporteActivo) {
          case 'I':   await generarPDFReporteI(datos, facultadFiltro, carreraFiltro, docenteFiltro); break;
          case 'II':  await generarPDFReporteII(datos, facultadFiltro, carreraFiltro); break;
          case 'III': await generarPDFReporteIII(datos, facultadFiltro, carreraFiltro, el); break;
          case 'IV':  await generarPDFReporteIV(datos, facultadFiltro, carreraFiltro, el); break;
          case 'V':   await generarPDFReporteV(datos, facultadFiltro, carreraFiltro, el); break;
          case 'VI':  await generarPDFReporteVI(datos, facultadFiltro, carreraFiltro, el); break;
        }
      }
    } finally {
      setGenerando(false);
    }
  };

  if (datos.length === 0) {
    return (
      <div className="exportacion-faedcoh">
        <div className="no-data-container">
          <AlertTriangle size={48} />
          <p className="no-data">No hay datos cargados para este ciclo.</p>
          <p className="hint">Importa el Excel de la campaña "Tu Opinión Cuenta" desde Ingreso de Datos.</p>
        </div>
      </div>
    );
  }

  const reporte = REPORTES.find(r => r.id === reporteActivo)!;
  const tieneGrafico = ['III', 'IV', 'V', 'VI'].includes(reporteActivo);
  const nombreFacultadSelec = facultadFiltro
    ? (FACULTADES[facultadFiltro]?.nombre ?? facultadFiltro)
    : 'Todas las Facultades';

  return (
    <div className="exportacion-faedcoh">
      <div className="faedcoh-header">
        <h2>Exportación de Reportes Analíticos</h2>
        <p className="faedcoh-subtitle">
          Genera los 6 reportes de la campaña "Tu Opinión Cuenta 2025-II" para cualquier facultad, en PDF o Excel.
        </p>
        <span className="faedcoh-badge">{datos.length} registros totales cargados</span>
      </div>

      {/* ── Filtros en cascada ── */}
      <div className="faedcoh-filtros">
        <div className="filtro-bloque">
          <Filter size={16} />
          <strong>Filtros de segmentación jerárquica</strong>
        </div>
        <div className="filtros-grid">

          {/* Nivel 1: Facultad */}
          <div className="filtro-item">
            <label>Nivel 1 — Facultad</label>
            <select
              value={facultadFiltro}
              onChange={e => { setFacultadFiltro(e.target.value); setCarreraFiltro(''); setDocenteFiltro(''); }}
              className="filtro-select"
            >
              <option value="">Todas las facultades ({datos.length} reg.)</option>
              {facultadesConocidas.map(cod => {
                const cnt = datos.filter(d => matchesFacultad(d.facultad, cod)).length;
                return (
                  <option key={cod} value={cod}>
                    {cod} — {FACULTADES[cod].nombre} ({cnt} reg.)
                  </option>
                );
              })}
              {facultadesExtra.map(f => {
                const cnt = datos.filter(d => d.facultad === f).length;
                return <option key={f} value={f}>{f} ({cnt} reg.)</option>;
              })}
            </select>
          </div>

          {/* Nivel 2: Carrera */}
          <div className="filtro-item">
            <label>Nivel 2 — Escuela / Carrera Profesional</label>
            <select
              value={carreraFiltro}
              onChange={e => { setCarreraFiltro(e.target.value); setDocenteFiltro(''); }}
              className="filtro-select"
            >
              <option value="">Todas las carreras ({datosFacultad.length} reg.)</option>
              {carreras.map(c => {
                const cnt = datosFacultad.filter(d => d.carreraProfesional === c).length;
                return <option key={c} value={c}>{c} ({cnt} reg.)</option>;
              })}
            </select>
          </div>

          {/* Nivel 3: Docente */}
          <div className="filtro-item">
            <label>Nivel 3 — Docente (opcional)</label>
            <select
              value={docenteFiltro}
              onChange={e => setDocenteFiltro(e.target.value)}
              className="filtro-select"
              disabled={docentesFiltrados.length > 80 && !carreraFiltro}
            >
              <option value="">Todos los docentes</option>
              {docentesFiltrados.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            {docentesFiltrados.length > 80 && !carreraFiltro && (
              <small style={{ color: '#888' }}>Selecciona una carrera para habilitar el filtro por docente.</small>
            )}
          </div>
        </div>

        {/* Resumen del ámbito activo */}
        <div className="filtro-resumen">
          <span>Ámbito actual:</span>
          <strong>{nombreFacultadSelec}</strong>
          {carreraFiltro && <> → <strong>{carreraFiltro}</strong></>}
          {docenteFiltro && <> → <strong>{docenteFiltro}</strong></>}
          <span className="filtro-count">({base.length} registros)</span>
        </div>
      </div>

      {/* ── Selección de reporte ── */}
      <div className="faedcoh-reportes">
        <strong>Seleccionar tipo de reporte</strong>
        <div className="reportes-grid">
          {REPORTES.map(r => (
            <button
              key={r.id}
              className={`reporte-btn ${reporteActivo === r.id ? 'reporte-btn-active' : ''}`}
              onClick={() => setReporteActivo(r.id)}
            >
              <span className="reporte-id">{r.titulo}</span>
              <span className="reporte-desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Formato de exportación ── */}
      <div className="faedcoh-formato">
        <strong>Formato de exportación</strong>
        <div className="formato-opciones">
          <label className={`formato-opcion ${formato === 'pdf' ? 'formato-activo' : ''}`}>
            <input type="radio" name="formato" value="pdf" checked={formato === 'pdf'} onChange={() => setFormato('pdf')} />
            <FileText size={18} />
            <span>PDF Institucional</span>
            {tieneGrafico && <small>(incluye gráfico analítico)</small>}
          </label>
          <label className={`formato-opcion ${formato === 'excel' ? 'formato-activo' : ''}`}>
            <input type="radio" name="formato" value="excel" checked={formato === 'excel'} onChange={() => setFormato('excel')} />
            <FileSpreadsheet size={18} />
            <span>Excel (.xlsx)</span>
            <small>(con formato condicional de color)</small>
          </label>
        </div>
      </div>

      {/* ── Vista previa del gráfico ── */}
      {tieneGrafico && formato === 'pdf' && (
        <div className="faedcoh-grafico-preview">
          <p className="grafico-label">Vista previa del gráfico que se incluirá en el PDF:</p>
          <div ref={graficoRef} className="grafico-captura" style={{ background: '#fff', padding: '12px' }}>
            {graficosPorReporte[reporteActivo]}
          </div>
        </div>
      )}

      {/* ── Alerta Reporte II ── */}
      {reporteActivo === 'II' && (() => {
        const insatisfactorios = base.filter(d => d.nota <= 10.9 && d.validez === 'Válido' && d.encuestados > 0);
        const muestraInsuf = insatisfactorios.filter(d => {
          const total = d.encuestados + d.noEncuestados;
          return total > 0 && d.encuestados / total < 0.15;
        });
        return (
          <div className="faedcoh-alerta">
            <AlertTriangle size={16} color="#c53030" />
            <span>
              Filtra secciones con <strong>nota ≤ 10.9</strong>, <strong>validez = Válido</strong> y <strong>encuestados &gt; 0</strong>.
              Detectados: <strong>{insatisfactorios.length}</strong> registro(s).
              {muestraInsuf.length > 0 && (
                <> — <strong style={{ color: '#c05621' }}>{muestraInsuf.length} con muestra insuficiente (&lt;15%)</strong>, marcados con [!] en el reporte.</>
              )}
            </span>
          </div>
        );
      })()}

      {/* ── Botón generar ── */}
      <div className="faedcoh-accion">
        <button
          className="btn-generar-reporte"
          onClick={handleGenerar}
          disabled={generando || base.length === 0}
        >
          {generando ? (
            <span>Generando...</span>
          ) : (
            <>
              <Download size={18} />
              <span>Generar y Exportar {reporte.titulo}</span>
            </>
          )}
        </button>
        {base.length === 0 && (
          <p className="hint" style={{ color: '#c53030' }}>No hay datos para los filtros seleccionados.</p>
        )}
      </div>
    </div>
  );
}
