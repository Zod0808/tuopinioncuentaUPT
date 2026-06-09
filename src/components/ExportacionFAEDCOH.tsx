import { useState, useRef, useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Download, FileSpreadsheet, FileText, Filter, AlertTriangle } from 'lucide-react';
import { EvaluacionData } from '../types';
import { calcularCalificacion, FACULTADES, ORDEN_FACULTADES, UMBRAL_PARTICIPACION_MINIMA } from '../config/universityStructure';
import { esValidoParaReporte } from '../services/reportCalculations';
import {
  exportarReporteI, exportarReporteII, exportarReporteIII,
  exportarReporteIV, exportarReporteV, exportarReporteVI,
  exportarBaseDatos,
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

type TipoReporte = 'BD' | 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
type Formato = 'pdf' | 'excel';

const REPORTES: { id: TipoReporte; titulo: string; desc: string; esMaestra?: boolean }[] = [
  { id: 'BD',  titulo: 'Base de Datos',  desc: 'Tabla maestra — todas las facultades, todos los campos, lista para automatización por filtro de facultad', esMaestra: true },
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

export default function ExportacionReportes({ datos }: Props) {
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

  // ── Métricas en vivo del ámbito activo ─────────────────────────────────────
  const metricas = useMemo(() => {
    const totalEnc = base.reduce((s, d) => s + d.encuestados, 0);
    const totalNoEnc = base.reduce((s, d) => s + d.noEncuestados, 0);
    const totalPartic = totalEnc + totalNoEnc;
    const porcPartic = totalPartic > 0 ? totalEnc / totalPartic * 100 : 0;

    const validos = base.filter(d => {
      if (d.validez !== 'Válido' || d.encuestados === 0 || d.nota === 0) return false;
      const t = d.encuestados + d.noEncuestados;
      return t === 0 || d.encuestados / t >= UMBRAL_PARTICIPACION_MINIMA;
    });
    const promedioGeneral = validos.length
      ? validos.reduce((s, d) => s + d.nota, 0) / validos.length
      : 0;
    const nInsatisfactorios = validos.filter(d => d.nota <= 10.9).length;
    const nBajaParticipacion = base.filter(d => {
      const t = d.encuestados + d.noEncuestados;
      return t > 0 && d.encuestados / t < UMBRAL_PARTICIPACION_MINIMA;
    }).length;

    return { porcPartic, promedioGeneral, nInsatisfactorios, nBajaParticipacion, seccionesValidas: validos.length };
  }, [base]);

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
        const regs = base.filter(d => d.carreraProfesional === c && esValidoParaReporte(d));
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
        label: 'Resp. de Encuesta (Interacciones)',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.encuestados, 0)),
        backgroundColor: '#2b6cb0',
      },
      {
        label: 'No Respondieron',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.noEncuestados, 0)),
        backgroundColor: '#c53030',
      },
    ],
  };

  const datosGraficoVI = {
    labels: carrerasParaGrafico.map(shortLabel),
    datasets: [
      {
        label: 'Encuestas Realizadas (Interacciones)',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.encuestados, 0)),
        backgroundColor: '#276749',
      },
      {
        label: 'Encuestas No Realizadas',
        data: carrerasParaGrafico.map(c => base.filter(d => d.carreraProfesional === c).reduce((s, d) => s + d.noEncuestados, 0)),
        backgroundColor: '#c05621',
      },
    ],
  };

  const opApiladas = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true, max: 100 } }, plugins: { legend: { position: 'top' as const } } };
  const opApiladasAbs = { responsive: true, scales: { x: { stacked: true }, y: { stacked: true } }, plugins: { legend: { position: 'top' as const } } };
  const opAgrupadas = { responsive: true, scales: { y: { min: 0, max: 20 } }, plugins: { legend: { position: 'top' as const } } };

  const graficosPorReporte: Record<TipoReporte, React.ReactNode> = {
    BD: null, I: null, II: null,
    III: <Bar data={datosGraficoIII} options={opAgrupadas} />,
    IV:  <Bar data={datosGraficoIV}  options={opApiladas} />,
    V:   <Bar data={datosGraficoV}   options={opApiladasAbs} />,
    VI:  <Bar data={datosGraficoVI}  options={opApiladasAbs} />,
  };

  const handleGenerar = async () => {
    if (generando) return;
    setGenerando(true);
    try {
      // Base de Datos siempre exporta todo el dataset en Excel, ignora filtros y formato
      if (reporteActivo === 'BD') {
        exportarBaseDatos(datos);
        return;
      }
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
      <div className="exportacion-panel">
        <div className="no-data-container">
          <AlertTriangle size={48} />
          <p className="no-data">No hay datos cargados para este ciclo.</p>
          <p className="hint">Importa el Excel de la campaña "Tu Opinión Cuenta" desde Ingreso de Datos.</p>
        </div>
      </div>
    );
  }

  const reporte = REPORTES.find(r => r.id === reporteActivo)!;
  const esBD = reporteActivo === 'BD';
  const tieneGrafico = ['III', 'IV', 'V', 'VI'].includes(reporteActivo);
  const nombreFacultadSelec = facultadFiltro
    ? (FACULTADES[facultadFiltro]?.nombre ?? facultadFiltro)
    : 'Todas las Facultades';

  return (
    <div className="exportacion-panel">
      <div className="exportacion-header">
        <h2>Exportación de Reportes Analíticos</h2>
        <p className="exportacion-subtitle">
          Base de Datos maestra + 6 reportes analíticos (Excel/PDF) + 5 reportes DOCX por facultad.
        </p>
        <span className="exportacion-badge">{datos.length} registros totales cargados</span>
      </div>

      {/* ── Filtros en cascada ── */}
      <div className="exportacion-filtros">
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

        {/* Métricas en vivo */}
        {base.length > 0 && (
          <div className="metricas-grid">
            <div className="metrica-card">
              <span className="metrica-label">% Participación</span>
              <span className="metrica-valor" style={{
                color: metricas.porcPartic < 70 ? '#c53030' : metricas.porcPartic < 85 ? '#c05621' : '#276749',
              }}>
                {metricas.porcPartic.toFixed(1)}%
              </span>
            </div>
            <div className="metrica-card">
              <span className="metrica-label">Promedio General</span>
              <span className="metrica-valor" style={{
                color: metricas.promedioGeneral >= 17.1 ? '#276749' : metricas.promedioGeneral >= 15.1 ? '#2b6cb0' : metricas.promedioGeneral >= 11.0 ? '#c05621' : '#c53030',
              }}>
                {metricas.seccionesValidas > 0 ? metricas.promedioGeneral.toFixed(2) : '—'}
              </span>
            </div>
            <div className="metrica-card">
              <span className="metrica-label">Secc. Válidas</span>
              <span className="metrica-valor">{metricas.seccionesValidas}</span>
            </div>
            <div className="metrica-card">
              <span className="metrica-label">Insatisfactorios</span>
              <span className="metrica-valor" style={{ color: metricas.nInsatisfactorios > 0 ? '#c53030' : '#276749' }}>
                {metricas.nInsatisfactorios}
              </span>
            </div>
            <div className="metrica-card">
              <span className="metrica-label">Baja Participación</span>
              <span className="metrica-valor" style={{ color: metricas.nBajaParticipacion > 0 ? '#6B21A8' : '#276749' }}>
                {metricas.nBajaParticipacion}
              </span>
              {metricas.nBajaParticipacion > 0 && (
                <span className="metrica-hint">&lt;{UMBRAL_PARTICIPACION_MINIMA * 100}% Part.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Selección de reporte ── */}
      <div className="exportacion-reportes">
        <strong>Seleccionar tipo de exportación</strong>
        <div className="reportes-grid">
          {REPORTES.map(r => (
            <button
              key={r.id}
              className={`reporte-btn ${reporteActivo === r.id ? 'reporte-btn-active' : ''} ${r.esMaestra ? 'reporte-btn-maestra' : ''}`}
              onClick={() => setReporteActivo(r.id)}
            >
              <span className="reporte-id">
                {r.esMaestra && <FileSpreadsheet size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                {r.titulo}
              </span>
              <span className="reporte-desc">{r.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Nota Base de Datos ── */}
      {esBD && (
        <div className="exportacion-alerta" style={{ borderColor: '#2b6cb0', backgroundColor: '#ebf8ff' }}>
          <FileSpreadsheet size={16} color="#2b6cb0" />
          <span style={{ color: '#2b6cb0' }}>
            <strong>Exportación maestra</strong> — Genera un único Excel con <strong>{datos.length} registros</strong> de todas las
            facultades. Usa el filtro de la columna <code>ID_Facultad</code> en Excel (o cualquier script) para
            generar los 6 reportes por facultad en segundos. Los filtros de la izquierda no aplican aquí.
          </span>
        </div>
      )}

      {/* ── Formato de exportación (solo para reportes analíticos) ── */}
      {!esBD && (
        <div className="exportacion-formato">
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
      )}

      {/* ── Vista previa del gráfico ── */}
      {tieneGrafico && formato === 'pdf' && (
        <div className="exportacion-grafico-preview">
          <p className="grafico-label">Vista previa del gráfico que se incluirá en el PDF:</p>
          <div ref={graficoRef} className="grafico-captura" style={{ background: '#fff', padding: '12px' }}>
            {graficosPorReporte[reporteActivo]}
          </div>
        </div>
      )}

      {/* ── Alerta Reporte II ── */}
      {reporteActivo === 'II' && (() => {
        const insatisfactorios = base.filter(d => esValidoParaReporte(d) && d.nota <= 10.9);
        const conQuorum = insatisfactorios.filter(d => d.encuestados >= 3);
        const sinQuorum = insatisfactorios.filter(d => d.encuestados < 3);
        const muestraInsuf = conQuorum.filter(d => {
          const total = d.encuestados + d.noEncuestados;
          return total > 0 && d.encuestados / total < 0.15;
        });
        return (
          <div className="exportacion-alerta">
            <AlertTriangle size={16} color="#c53030" />
            <span>
              Filtra secciones con <strong>nota ≤ 10.9</strong>, <strong>validez = Válido</strong> y <strong>encuestados &gt; 0</strong>.
              Detectados: <strong>{conQuorum.length}</strong> registro(s) con quórum mínimo (n≥3).
              {sinQuorum.length > 0 && (
                <> — <strong style={{ color: '#6B21A8' }}>{sinQuorum.length} excluidas por sub-quórum (&lt;3 encuestados)</strong>: sin representatividad estadística, en hoja separada.</>
              )}
              {muestraInsuf.length > 0 && (
                <> — <strong style={{ color: '#c05621' }}>{muestraInsuf.length} con muestra insuficiente (&lt;15%)</strong>, marcados con [!] en el reporte.</>
              )}
            </span>
          </div>
        );
      })()}

      {reporteActivo === 'IV' && (() => {
        const totalBase = base.length;
        const validos = base.filter(d => esValidoParaReporte(d)).length;
        const excluidas = totalBase - validos;
        if (excluidas === 0) return null;
        return (
          <div className="exportacion-alerta" style={{ borderColor: '#c05621', backgroundColor: '#fffbeb' }}>
            <AlertTriangle size={16} color="#c05621" />
            <span style={{ color: '#92400e' }}>
              <strong>Nota de auditoría (Reporte IV):</strong> De las <strong>{totalBase}</strong> secciones en el ámbito
              seleccionado, <strong>{validos}</strong> son válidas para el cálculo de Juicio de Valor y{' '}
              <strong>{excluidas}</strong> fueron excluidas (sin encuestados o baja participación &lt;30%).
              Los porcentajes se calculan sobre las <strong>{validos}</strong> secciones válidas únicamente.
              Esta diferencia es esperada y correcta metodológicamente.
            </span>
          </div>
        );
      })()}

      {/* ── Botón generar ── */}
      <div className="exportacion-accion">
        <button
          className="btn-generar-reporte"
          onClick={handleGenerar}
          disabled={generando || (!esBD && base.length === 0)}
        >
          {generando ? (
            <span>Generando...</span>
          ) : (
            <>
              <Download size={18} />
              <span>{esBD ? `Exportar Base de Datos (${datos.length} registros)` : `Generar y Exportar ${reporte.titulo}`}</span>
            </>
          )}
        </button>
        {!esBD && base.length === 0 && (
          <p className="hint" style={{ color: '#c53030' }}>No hay datos para los filtros seleccionados.</p>
        )}
      </div>
    </div>
  );
}
