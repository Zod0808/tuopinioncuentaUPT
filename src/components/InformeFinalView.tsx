import { useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { EvaluacionData } from '../types';
import { MatriculadosEntry, calcularResumen, DatosCarrera, interpretarTablaAE, interpretarDistribucion, interpretarParticipacion, interpretarInstitucionAE, generarConclusion1, generarRecomendacion1 } from '../services/reportCalculations';
import { generarInformeFinalDocx, generarInformesFacultadDocx, ConfigInforme } from '../services/docxReportService';
import { exportarBaseDatos } from '../services/excelService';
import { FACULTADES, ORDEN_FACULTADES, ESCALA_CALIFICACION, ASPECTOS_EVALUADOS } from '../config/universityStructure';
import type { Calificacion } from '../config/universityStructure';
import AlertasAutomaticas from './AlertasAutomaticas';

ChartJS.register(ArcElement, Tooltip, Legend);

interface InformeFinalViewProps {
  datos: EvaluacionData[];
  matriculados: MatriculadosEntry[];
  cicloActual: string;
}

const CALIFICACIONES: Calificacion[] = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'INSATISFACTORIO'];
const COLORES = ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000'];

function PieParticipacion({ enc, total }: { enc: number; total: number }) {
  const noEnc = Math.max(0, total - enc);
  const data = {
    labels: ['Encuestados', 'No Encuestados'],
    datasets: [{
      data: [enc, noEnc],
      backgroundColor: ['#1a365d', '#c5a059'],
      borderColor: ['#1a365d', '#c5a059'],
      borderWidth: 1,
    }],
  };
  const opts = {
    plugins: {
      legend: { position: 'bottom' as const, labels: { font: { size: 11 } } },
      tooltip: {
        callbacks: {
          label: (ctx: any) => {
            const v = ctx.parsed;
            const pct = total > 0 ? ((v / total) * 100).toFixed(2) : '0.00';
            return `${ctx.label}: ${v.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
    responsive: true,
    maintainAspectRatio: true,
  };
  if (total === 0) return null;
  return (
    <div className="informe-pie-participacion">
      <Pie data={data} options={opts} />
    </div>
  );
}

function PieCarrera({ carrera }: { carrera: DatosCarrera }) {
  const data = {
    labels: CALIFICACIONES,
    datasets: [{
      data: CALIFICACIONES.map(c => carrera.distribucion[c]?.cantidad ?? 0),
      backgroundColor: COLORES,
      borderWidth: 1,
    }],
  };
  return (
    <div style={{ width: 180, height: 180 }}>
      <Pie data={data} options={{ plugins: { legend: { display: false } }, responsive: true, maintainAspectRatio: true }} />
    </div>
  );
}

const CONFIG_KEY = 'informe_config_v1';

function cargarConfig(): ConfigInforme {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function InformeFinalView({ datos, matriculados, cicloActual }: InformeFinalViewProps) {
  const [generando, setGenerando] = useState(false);
  const [generandoFacultad, setGenerandoFacultad] = useState<string | null>(null);
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>('3.1');
  const [configAbierta, setConfigAbierta] = useState(false);
  const [config, setConfig] = useState<ConfigInforme>(cargarConfig);

  const actualizarConfig = (campo: keyof ConfigInforme, valor: string) => {
    setConfig(prev => {
      const nuevo = { ...prev, [campo]: valor };
      try { localStorage.setItem(CONFIG_KEY, JSON.stringify(nuevo)); } catch { /* quota */ }
      return nuevo;
    });
  };

  if (datos.length === 0) {
    return (
      <div className="informe-empty">
        <p>No hay datos para el ciclo {cicloActual}. Importa el Excel en la sección "Ingreso de Datos".</p>
      </div>
    );
  }

  const resumen = calcularResumen(datos, matriculados);

  const handleDescargarDocx = async () => {
    setGenerando(true);
    try {
      await generarInformeFinalDocx(cicloActual, resumen, config);
    } finally {
      setGenerando(false);
    }
  };

  const handleDescargarFacultad = async (cod: string) => {
    const f = resumen.facultades.get(cod);
    if (!f) return;
    setGenerandoFacultad(cod);
    try {
      await generarInformesFacultadDocx(cicloActual, cod, f, config);
    } finally {
      setGenerandoFacultad(null);
    }
  };

  const toggle = (s: string) => setSeccionAbierta(prev => prev === s ? null : s);

  return (
    <div className="informe-final">
      {/* ── Cabecera ── */}
      <div className="informe-header">
        <div>
          <h2>Informe Final · Ciclo {cicloActual}</h2>
          <span className="informe-subtitle">Encuesta "Tu Opinión Cuenta" — Universidad Privada de Tacna</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={() => setConfigAbierta(v => !v)}
            title="Configurar datos del informe DOCX"
          >
            ⚙ Configurar informe
          </button>
          <button
            type="button"
            className="btn-primary btn-descarga"
            onClick={handleDescargarDocx}
            disabled={generando}
          >
            {generando ? 'Generando...' : '⬇ Descargar Informe (.docx)'}
          </button>
        </div>
      </div>

      {/* ── Panel de configuración del informe ── */}
      {configAbierta && (
        <div className="informe-config-panel">
          <h4 style={{ margin: '0 0 12px', color: '#1a365d' }}>⚙ Configuración del Informe DOCX</h4>
          <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
            Estos datos se guardan localmente y se incluyen en el documento exportado.
          </p>
          <div className="informe-config-grid">
            <label>
              N° de Informe
              <input
                type="text"
                value={config.numeroInforme ?? ''}
                onChange={e => actualizarConfig('numeroInforme', e.target.value)}
                placeholder="Ej: 008-2025-GPAD-UPT"
              />
            </label>
            <label>
              Nombre del Responsable
              <input
                type="text"
                value={config.nombreResponsable ?? ''}
                onChange={e => actualizarConfig('nombreResponsable', e.target.value)}
                placeholder="Ej: Mg. Juan Pérez Torres"
              />
            </label>
            <label>
              Cargo del Responsable
              <input
                type="text"
                value={config.cargoResponsable ?? ''}
                onChange={e => actualizarConfig('cargoResponsable', e.target.value)}
                placeholder="Ej: Director de Gestión de la Calidad"
              />
            </label>
            <label>
              Nombre Firmante (cierre)
              <input
                type="text"
                value={config.nombreFirmante ?? ''}
                onChange={e => actualizarConfig('nombreFirmante', e.target.value)}
                placeholder="Ej: Mg. Juan Pérez Torres"
              />
            </label>
            <label>
              Cargo Firmante
              <input
                type="text"
                value={config.cargoFirmante ?? ''}
                onChange={e => actualizarConfig('cargoFirmante', e.target.value)}
                placeholder="Ej: Gerente de Planificación y Desarrollo Académico"
              />
            </label>
            <label className="informe-config-col-full">
              Texto Sección 2 — Difusión de Resultados
              <textarea
                rows={3}
                value={config.textoDifusion ?? ''}
                onChange={e => actualizarConfig('textoDifusion', e.target.value)}
                placeholder="Mediante Oficio Circular N° ... los resultados fueron comunicados a las Facultades..."
              />
            </label>
          </div>
        </div>
      )}

      {/* ── Alertas ── */}
      <AlertasAutomaticas datos={datos} matriculados={matriculados} cicloActual={cicloActual} />

      {/* ── 3.1 Participación institucional ── */}
      <div className="informe-seccion">
        <button type="button" className="informe-seccion-titulo" onClick={() => toggle('3.1')}>
          <span>3.1. Participación Estudiantil Institucional</span>
          <span>{seccionAbierta === '3.1' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === '3.1' && (
          <div className="informe-seccion-body">
            <table className="informe-table">
              <thead>
                <tr>
                  <th>Facultad</th>
                  <th>N° Matriculados</th>
                  <th title="Alumnos únicos que completaron al menos una encuesta (fuente: MatriculadosImporter)">Alumnos Encuestados</th>
                  <th>% Encuestados</th>
                </tr>
              </thead>
              <tbody>
                {ORDEN_FACULTADES.map(cod => {
                  const f = resumen.facultades.get(cod);
                  if (!f) return null;
                  return (
                    <tr key={cod}>
                      <td>{FACULTADES[cod]?.nombre ?? cod}</td>
                      <td className="text-right">{f.totalMatriculados.toLocaleString()}</td>
                      <td className="text-right">{f.totalEncuestados.toLocaleString()}</td>
                      <td className={`text-right ${f.porcentajeEncuestados < 70 ? 'text-warning' : 'text-ok'}`}>
                        {f.porcentajeEncuestados.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>TOTAL</strong></td>
                  <td className="text-right"><strong>{resumen.totalMatriculados.toLocaleString()}</strong></td>
                  <td className="text-right"><strong>{resumen.totalEncuestados.toLocaleString()}</strong></td>
                  <td className="text-right"><strong>{resumen.porcentajeEncuestados.toFixed(2)}%</strong></td>
                </tr>
              </tfoot>
            </table>
            <div className="informe-participacion-chart-row">
              <PieParticipacion enc={resumen.totalEncuestados} total={resumen.totalMatriculados} />
            </div>
            <p className="informe-interpretacion">
              {interpretarParticipacion(resumen.totalEncuestados, resumen.totalMatriculados, 'la Universidad Privada de Tacna')}
            </p>
            <p className="informe-nota-diccionario">
              <strong>Nota del diccionario de datos:</strong> "Alumnos Encuestados" en esta sección representa
              alumnos únicos que respondieron al menos una encuesta (fuente: padrón de matriculados).
              El campo "Resp. Enc." de la tabla de datos individuales representa respuestas por sección,
              donde un mismo alumno puede aparecer múltiples veces (una por cada curso/docente evaluado).
              Ambas métricas son correctas en su contexto y no deben sumarse entre sí.
            </p>
          </div>
        )}
      </div>

      {/* ── 3.2 Participación por facultad ── */}
      <div className="informe-seccion">
        <button type="button" className="informe-seccion-titulo" onClick={() => toggle('3.2')}>
          <span>3.2. Participación Estudiantil por Facultad</span>
          <span>{seccionAbierta === '3.2' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === '3.2' && (
          <div className="informe-seccion-body">
            {ORDEN_FACULTADES.map(cod => {
              const f = resumen.facultades.get(cod);
              if (!f) return null;
              return (
                <div key={cod} className="informe-subseccion">
                  <h4>{FACULTADES[cod]?.nombre ?? cod}</h4>
                  <table className="informe-table">
                    <thead>
                      <tr>
                        <th>Carrera Profesional</th>
                        <th>N° Matriculados</th>
                        <th title="Alumnos únicos que completaron al menos una encuesta (fuente: MatriculadosImporter)">Alumnos Encuestados</th>
                        <th>% Encuestados</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...f.carreras.values()].map(c => (
                        <tr key={c.carrera}>
                          <td>{c.carrera}</td>
                          <td className="text-right">{c.totalMatriculados.toLocaleString()}</td>
                          <td className="text-right">{c.totalEncuestados.toLocaleString()}</td>
                          <td className={`text-right ${c.porcentajeEncuestados < 70 ? 'text-warning' : 'text-ok'}`}>
                            {c.porcentajeEncuestados.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="total-row">
                        <td><strong>TOTAL</strong></td>
                        <td className="text-right"><strong>{f.totalMatriculados.toLocaleString()}</strong></td>
                        <td className="text-right"><strong>{f.totalEncuestados.toLocaleString()}</strong></td>
                        <td className="text-right"><strong>{f.porcentajeEncuestados.toFixed(2)}%</strong></td>
                      </tr>
                    </tfoot>
                  </table>
                  <div className="informe-participacion-chart-row">
                    <PieParticipacion enc={f.totalEncuestados} total={f.totalMatriculados} />
                  </div>
                  <p className="informe-interpretacion">
                    {interpretarParticipacion(f.totalEncuestados, f.totalMatriculados, FACULTADES[cod]?.nombre ?? cod)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 3.3.1 AE institucional ── */}
      <div className="informe-seccion">
        <button type="button" className="informe-seccion-titulo" onClick={() => toggle('3.3.1')}>
          <span>3.3.1. Aspectos Evaluados — Resumen Institucional</span>
          <span>{seccionAbierta === '3.3.1' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === '3.3.1' && (
          <div className="informe-seccion-body">
            <table className="informe-table">
              <thead>
                <tr>
                  <th>Facultad</th>
                  <th>AE-01</th>
                  <th>AE-02</th>
                  <th>AE-03</th>
                  <th>AE-04</th>
                  <th>Promedio</th>
                </tr>
              </thead>
              <tbody>
                {ORDEN_FACULTADES.map(cod => {
                  const f = resumen.facultades.get(cod);
                  if (!f) return null;
                  return (
                    <tr key={cod}>
                      <td>{FACULTADES[cod]?.nombre ?? cod}</td>
                      <td className="text-right">{f.promedioAE01.toFixed(2)}</td>
                      <td className="text-right">{f.promedioAE02.toFixed(2)}</td>
                      <td className="text-right">{f.promedioAE03.toFixed(2)}</td>
                      <td className="text-right">{f.promedioAE04.toFixed(2)}</td>
                      <td className="text-right"><strong>{f.promedioGeneral.toFixed(2)}</strong></td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>PROMEDIO</strong></td>
                  <td className="text-right"><strong>{resumen.promedioAE01.toFixed(2)}</strong></td>
                  <td className="text-right"><strong>{resumen.promedioAE02.toFixed(2)}</strong></td>
                  <td className="text-right"><strong>{resumen.promedioAE03.toFixed(2)}</strong></td>
                  <td className="text-right"><strong>{resumen.promedioAE04.toFixed(2)}</strong></td>
                  <td className="text-right"><strong>{resumen.promedioGeneral.toFixed(2)}</strong></td>
                </tr>
              </tfoot>
            </table>
            <div className="informe-ae-leyenda">
              {Object.entries(ASPECTOS_EVALUADOS).map(([codigo, desc]) => (
                <div key={codigo} className="ae-leyenda-item">
                  <strong>{codigo}:</strong> {desc}
                </div>
              ))}
            </div>
            <p className="informe-interpretacion informe-interpretacion-highlight">
              {interpretarInstitucionAE(resumen)}
            </p>
          </div>
        )}
      </div>

      {/* ── 3.3.2 AE por carrera con distribución ── */}
      <div className="informe-seccion">
        <button type="button" className="informe-seccion-titulo" onClick={() => toggle('3.3.2')}>
          <span>3.3.2. Aspectos Evaluados y Distribución por Carrera</span>
          <span>{seccionAbierta === '3.3.2' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === '3.3.2' && (
          <div className="informe-seccion-body">
            {ORDEN_FACULTADES.map(cod => {
              const f = resumen.facultades.get(cod);
              if (!f) return null;
              return (
                <div key={cod} className="informe-subseccion">
                  <h4>{FACULTADES[cod]?.nombre ?? cod}</h4>
                  {[...f.carreras.values()].map(c => (
                    <div key={c.carrera} className="informe-carrera-bloque">
                      <h5>{c.carrera}</h5>
                      <div className="informe-carrera-content">
                        <div className="informe-carrera-tablas">
                          {/* Tabla AE */}
                          <table className="informe-table informe-table-sm">
                            <thead>
                              <tr>
                                <th>Código</th>
                                <th>Aspecto Evaluado</th>
                                <th>Promedio</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr>
                                <td>AE-01</td>
                                <td>{ASPECTOS_EVALUADOS['AE-01']}</td>
                                <td className="text-right">{c.promedioAE01.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td>AE-02</td>
                                <td>{ASPECTOS_EVALUADOS['AE-02']}</td>
                                <td className="text-right">{c.promedioAE02.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td>AE-03</td>
                                <td>{ASPECTOS_EVALUADOS['AE-03']}</td>
                                <td className="text-right">{c.promedioAE03.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td>AE-04</td>
                                <td>{ASPECTOS_EVALUADOS['AE-04']}</td>
                                <td className="text-right">{c.promedioAE04.toFixed(2)}</td>
                              </tr>
                            </tbody>
                            <tfoot>
                              <tr className="total-row">
                                <td colSpan={2}><strong>PROMEDIO GENERAL</strong></td>
                                <td className="text-right"><strong>{c.promedioGeneral.toFixed(2)}</strong></td>
                              </tr>
                            </tfoot>
                          </table>
                          <p className="informe-interpretacion">{interpretarTablaAE(c)}</p>

                          {/* Tabla distribución — solo secciones válidas */}
                          {c.seccionesExcluidas > 0 && (
                            <div className="informe-exclusion-banner">
                              <strong>Nota de auditoría:</strong> De las <strong>{c.seccionesTotales}</strong> secciones
                              registradas en esta carrera, <strong>{c.seccionesCalificadas}</strong> son válidas para el
                              Juicio de Valor y <strong>{c.seccionesExcluidas}</strong> fueron excluidas del cálculo
                              {(() => {
                                const parts: string[] = [];
                                if (c.exclusionDetalle.sinDatos > 0) parts.push(`${c.exclusionDetalle.sinDatos} sin encuestados/nota`);
                                if (c.exclusionDetalle.bajaParticipacion > 0) parts.push(`${c.exclusionDetalle.bajaParticipacion} con baja participación <30%`);
                                if (c.exclusionDetalle.noValido > 0) parts.push(`${c.exclusionDetalle.noValido} marcadas "No válido"`);
                                return parts.length > 0 ? ` (${parts.join(', ')})` : '';
                              })()}. Los
                              porcentajes a continuación se calculan sobre las secciones válidas únicamente.
                            </div>
                          )}
                          <table className="informe-table informe-table-sm">
                            <thead>
                              <tr>
                                <th>Calificación</th>
                                <th>N° secciones válidas</th>
                                <th>% (sobre válidas)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {CALIFICACIONES.map(cal => (
                                <tr key={cal}>
                                  <td>
                                    <span className="cal-badge" style={{ backgroundColor: ESCALA_CALIFICACION[cal].color, color: '#fff' }}>
                                      {cal}
                                    </span>
                                  </td>
                                  <td className="text-right">{c.distribucion[cal]?.cantidad ?? 0}</td>
                                  <td className="text-right">{(c.distribucion[cal]?.porcentaje ?? 0).toFixed(2)}%</td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot>
                              <tr className="total-row">
                                <td><strong>TOTAL VÁLIDAS</strong></td>
                                <td className="text-right"><strong>{c.seccionesCalificadas}</strong></td>
                                <td className="text-right"><strong>100%</strong></td>
                              </tr>
                              {c.seccionesExcluidas > 0 && (
                                <tr style={{ backgroundColor: '#fef9c3' }}>
                                  <td style={{ color: '#92400e', fontStyle: 'italic' }}>Excluidas del cálculo</td>
                                  <td className="text-right" style={{ color: '#92400e', fontStyle: 'italic' }}>{c.seccionesExcluidas}</td>
                                  <td className="text-right" style={{ color: '#92400e', fontStyle: 'italic' }}>—</td>
                                </tr>
                              )}
                              <tr className="total-row" style={{ borderTop: '2px solid #1a365d' }}>
                                <td><strong>TOTAL REGISTRADAS</strong></td>
                                <td className="text-right"><strong>{c.seccionesTotales}</strong></td>
                                <td className="text-right" style={{ color: '#6b7280', fontSize: '0.85em' }}>base total</td>
                              </tr>
                            </tfoot>
                          </table>
                          <p className="informe-interpretacion">{interpretarDistribucion(c)}</p>
                        </div>

                        {/* Gráfico de torta */}
                        <div className="informe-pie-wrapper">
                          <PieCarrera carrera={c} />
                          <div className="pie-leyenda">
                            {CALIFICACIONES.map((cal, i) => (
                              <div key={cal} className="pie-leyenda-item">
                                <span className="pie-leyenda-color" style={{ backgroundColor: COLORES[i] }} />
                                <span>{cal}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── 4. Indicador plan estratégico ── */}
      <div className="informe-seccion">
        <button type="button" className="informe-seccion-titulo" onClick={() => toggle('4')}>
          <span>4. Indicador del Plan Estratégico Institucional</span>
          <span>{seccionAbierta === '4' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === '4' && (
          <div className="informe-seccion-body">
            <table className="informe-table">
              <thead>
                <tr>
                  <th>Facultad</th>
                  <th>% BUENO</th>
                  <th>% DESTACADO</th>
                  <th>Indicador (BUENO + DESTACADO)</th>
                </tr>
              </thead>
              <tbody>
                {ORDEN_FACULTADES.map(cod => {
                  const f = resumen.facultades.get(cod);
                  if (!f) return null;
                  return (
                    <tr key={cod}>
                      <td>{FACULTADES[cod]?.nombre ?? cod}</td>
                      <td className="text-right">{f.porcBueno.toFixed(2)}%</td>
                      <td className="text-right">{f.porcDestacado.toFixed(2)}%</td>
                      <td className={`text-right ${f.indicadorPlanEstrategico >= 70 ? 'text-ok' : 'text-warning'}`}>
                        <strong>{f.indicadorPlanEstrategico.toFixed(2)}%</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="total-row">
                  <td><strong>PROMEDIO INSTITUCIONAL</strong></td>
                  <td className="text-right"><strong>{resumen.porcBueno.toFixed(2)}%</strong></td>
                  <td className="text-right"><strong>{resumen.porcDestacado.toFixed(2)}%</strong></td>
                  <td className={`text-right ${resumen.indicadorPlanEstrategico >= 70 ? 'text-ok' : 'text-warning'}`}>
                    <strong>{resumen.indicadorPlanEstrategico.toFixed(2)}%</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
            <p className="informe-interpretacion">
              El indicador del plan estratégico institucional para el ciclo {cicloActual} es del{' '}
              <strong>{resumen.indicadorPlanEstrategico.toFixed(2)}%</strong>, que representa la proporción de secciones con calificación BUENO o DESTACADO.
              {resumen.indicadorPlanEstrategico >= 70
                ? ' Se alcanza la meta institucional del 70%.'
                : ' No se alcanza aún la meta institucional del 70%.'}
            </p>
          </div>
        )}
      </div>

      {/* ── 5. Conclusiones y Recomendaciones ── */}
      <div className="informe-seccion">
        <button type="button" className="informe-seccion-titulo" onClick={() => toggle('5')}>
          <span>5. Conclusiones y Recomendaciones</span>
          <span>{seccionAbierta === '5' ? '▲' : '▼'}</span>
        </button>
        {seccionAbierta === '5' && (
          <div className="informe-seccion-body">
            <div className="informe-conclusiones">
              <h4>Conclusiones</h4>
              <div className="informe-conclusion-item">
                <span className="informe-conclusion-num">1.</span>
                <p>{generarConclusion1(resumen, cicloActual)}</p>
              </div>
              <div className="informe-conclusion-item">
                <span className="informe-conclusion-num">2.</span>
                <p>
                  El promedio general institucional del desempeño docente para el ciclo {cicloActual} es de{' '}
                  <strong>{resumen.promedioGeneral.toFixed(2)}</strong>, lo que corresponde a la categoría{' '}
                  <strong>{resumen.promedioGeneral > 17 ? 'DESTACADO' : resumen.promedioGeneral > 14 ? 'BUENO' : resumen.promedioGeneral > 11 ? 'ACEPTABLE' : 'INSATISFACTORIO'}</strong>{' '}
                  según la escala de calificación institucional.
                </p>
              </div>
              <div className="informe-conclusion-item">
                <span className="informe-conclusion-num">3.</span>
                <p>
                  El indicador del Plan Estratégico Institucional (secciones calificadas como BUENO o DESTACADO) alcanzó el{' '}
                  <strong>{resumen.indicadorPlanEstrategico.toFixed(2)}%</strong>
                  {resumen.indicadorPlanEstrategico >= 70
                    ? ', superando la meta institucional del 70%.'
                    : ', sin alcanzar aún la meta institucional del 70%, lo que requiere atención prioritaria.'}
                </p>
              </div>
            </div>

            <div className="informe-conclusiones informe-recomendaciones">
              <h4>Recomendaciones</h4>
              <div className="informe-conclusion-item">
                <span className="informe-conclusion-num">1.</span>
                <p>{generarRecomendacion1(resumen)}</p>
              </div>
              {resumen.indicadorPlanEstrategico < 70 && (
                <div className="informe-conclusion-item">
                  <span className="informe-conclusion-num">2.</span>
                  <p>
                    Se recomienda realizar un seguimiento focalizado en las carreras y secciones con calificación{' '}
                    ACEPTABLE o INSATISFACTORIO, priorizando planes de mejora individualizados que contribuyan al{' '}
                    incremento del indicador estratégico institucional.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Botones de descarga al pie ── */}
      <div className="informe-footer-actions">
        <button
          type="button"
          className="btn-primary btn-descarga-lg"
          onClick={handleDescargarDocx}
          disabled={generando || generandoFacultad !== null}
        >
          {generando ? 'Generando documento...' : '⬇ Descargar Informe Institucional Completo (.docx)'}
        </button>

        <button
          type="button"
          className="btn-secondary btn-descarga-lg"
          onClick={() => exportarBaseDatos(datos)}
          title="Exporta toda la base de datos en un único Excel con columna Carrera en cada fila — ideal para filtros rápidos internos"
        >
          ⬇ Exportar Base de Datos Plana (.xlsx)
        </button>

        <div className="informe-facultad-descargas">
          <p className="informe-facultad-descargas-titulo">Informes individuales por facultad:</p>
          <div className="informe-facultad-descargas-grid">
            {ORDEN_FACULTADES.map(cod => {
              const f = resumen.facultades.get(cod);
              if (!f) return null;
              const ocupado = generando || generandoFacultad !== null;
              const esteGenerando = generandoFacultad === cod;
              return (
                <button
                  key={cod}
                  type="button"
                  className="btn-secondary btn-descarga-facultad"
                  onClick={() => handleDescargarFacultad(cod)}
                  disabled={ocupado}
                  title={`Generar 5 reportes DOCX — ${FACULTADES[cod]?.nombre ?? cod}`}
                >
                  {esteGenerando ? 'Generando...' : `⬇ ${cod}`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
