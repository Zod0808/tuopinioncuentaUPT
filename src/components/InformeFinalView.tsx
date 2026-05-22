import { useState } from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { EvaluacionData } from '../types';
import { MatriculadosEntry, calcularResumen, DatosCarrera, interpretarTablaAE, interpretarDistribucion, interpretarParticipacion } from '../services/reportCalculations';
import { generarInformeFinalDocx } from '../services/docxReportService';
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

export default function InformeFinalView({ datos, matriculados, cicloActual }: InformeFinalViewProps) {
  const [generando, setGenerando] = useState(false);
  const [seccionAbierta, setSeccionAbierta] = useState<string | null>('3.1');

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
      await generarInformeFinalDocx(cicloActual, resumen);
    } finally {
      setGenerando(false);
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
        <button
          className="btn-primary btn-descarga"
          onClick={handleDescargarDocx}
          disabled={generando}
        >
          {generando ? 'Generando...' : '⬇ Descargar Informe (.docx)'}
        </button>
      </div>

      {/* ── Alertas ── */}
      <AlertasAutomaticas datos={datos} matriculados={matriculados} cicloActual={cicloActual} />

      {/* ── 3.1 Participación institucional ── */}
      <div className="informe-seccion">
        <button className="informe-seccion-titulo" onClick={() => toggle('3.1')}>
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
                  <th>N° Encuestados</th>
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
            <p className="informe-interpretacion">
              {interpretarParticipacion(resumen.totalEncuestados, resumen.totalMatriculados, 'la Universidad Privada de Tacna')}
            </p>
          </div>
        )}
      </div>

      {/* ── 3.2 Participación por facultad ── */}
      <div className="informe-seccion">
        <button className="informe-seccion-titulo" onClick={() => toggle('3.2')}>
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
                        <th>N° Encuestados</th>
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
        <button className="informe-seccion-titulo" onClick={() => toggle('3.3.1')}>
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
          </div>
        )}
      </div>

      {/* ── 3.3.2 AE por carrera con distribución ── */}
      <div className="informe-seccion">
        <button className="informe-seccion-titulo" onClick={() => toggle('3.3.2')}>
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

                          {/* Tabla distribución */}
                          <table className="informe-table informe-table-sm">
                            <thead>
                              <tr>
                                <th>Calificación</th>
                                <th>N° secciones</th>
                                <th>%</th>
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
                                <td><strong>TOTAL</strong></td>
                                <td className="text-right"><strong>{c.seccionesCalificadas}</strong></td>
                                <td className="text-right"><strong>100%</strong></td>
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
        <button className="informe-seccion-titulo" onClick={() => toggle('4')}>
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
                  <td><strong>INSTITUCIONAL</strong></td>
                  <td className="text-right">—</td>
                  <td className="text-right">—</td>
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

      {/* ── Botón de descarga al pie ── */}
      <div className="informe-footer-actions">
        <button
          className="btn-primary btn-descarga-lg"
          onClick={handleDescargarDocx}
          disabled={generando}
        >
          {generando ? 'Generando documento...' : '⬇ Descargar Informe Completo (.docx)'}
        </button>
      </div>
    </div>
  );
}
