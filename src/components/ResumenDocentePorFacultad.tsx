import { useState } from 'react';
import { EvaluacionData } from '../types';
import { Building2, Users, BookOpen, Download } from 'lucide-react';
import { generarPDFResumenDocente } from '../services/pdfService';
import { esValidoParaReporte, getExclusionReason } from '../services/reportCalculations';
import { calcularCalificacion, UMBRAL_PARTICIPACION_MINIMA } from '../config/universityStructure';

interface ResumenDocentePorFacultadProps {
  datos: EvaluacionData[];
  cicloActual?: string;
}

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
}

interface DocenteExcluido {
  docente: string;
  cantidadCursos: number;
  motivo: string;
}

function resolverCalDisplay(d: EvaluacionData): string {
  if (d.encuestados === 0) return 'No Aplica';
  if (d.nota === 0) return 'Sin Evaluar';
  const total = d.encuestados + d.noEncuestados;
  if (total > 0 && d.encuestados / total < UMBRAL_PARTICIPACION_MINIMA) return 'Baja Participación';
  return calcularCalificacion(d.nota);
}

function badgeClaseCal(cal: string): string {
  const map: Record<string, string> = {
    DESTACADO: 'badge-destacado', BUENO: 'badge-bueno',
    ACEPTABLE: 'badge-aceptable', INSATISFACTORIO: 'badge-insatisfactorio',
    'Baja Participación': 'badge-baja-participacion',
  };
  return map[cal] ?? 'badge-warning';
}

interface FacultadResumen {
  facultad: string;
  docentes: DocenteResumen[];
  docentesExcluidos: DocenteExcluido[];
  totalDocentes: number;
  totalCursos: number;
  promedioGeneral: number;
}

export default function ResumenDocentePorFacultad({ datos, cicloActual = '' }: ResumenDocentePorFacultadProps) {
  const [facultadSeleccionada, setFacultadSeleccionada] = useState<string>('');

  if (datos.length === 0) {
    return (
      <div className="resumen-docente-facultad">
        <p className="no-data">No hay datos para generar el resumen docente por facultad. Importa datos primero.</p>
      </div>
    );
  }

  const facultades = [...new Set(datos.map(d => d.facultad))].sort();

  const resumenesPorFacultad: FacultadResumen[] = facultades.map(facultad => {
    const datosFacultad = datos.filter(d => d.facultad === facultad);

    // Solo registros válidos para calcular promedios
    const docentesMap = new Map<string, EvaluacionData[]>();
    datosFacultad.filter(esValidoParaReporte).forEach(dato => {
      if (!docentesMap.has(dato.docente)) docentesMap.set(dato.docente, []);
      docentesMap.get(dato.docente)!.push(dato);
    });

    const docentesResumen: DocenteResumen[] = Array.from(docentesMap.entries()).map(([docente, cursos]) => {
      const cantidadCursos = cursos.length;
      const promedioNota = cantidadCursos === 1
        ? cursos[0].nota
        : cursos.reduce((sum, c) => sum + c.nota, 0) / cantidadCursos;
      return { docente, promedioNota, cantidadCursos, calificacion: calcularCalificacion(promedioNota) };
    });
    docentesResumen.sort((a, b) => a.docente.localeCompare(b.docente));

    // Docentes cuyos cursos todos fueron excluidos
    const todosDocentes = [...new Set(datosFacultad.map(d => d.docente))];
    const docentesExcluidos: DocenteExcluido[] = todosDocentes
      .filter(doc => !docentesMap.has(doc))
      .map(doc => {
        const cursos = datosFacultad.filter(d => d.docente === doc);
        const razones = new Set(cursos.map(c => getExclusionReason(c)));
        let motivo: string;
        if (razones.has('sin_datos') && !razones.has('baja_participacion')) {
          motivo = 'Sin estudiantes registrados (0 encuestados y/o nota 0)';
        } else if (!razones.has('sin_datos') && razones.has('baja_participacion')) {
          motivo = 'Baja participación: menos del 30% de la sección respondió la encuesta';
        } else {
          motivo = 'Combinación: cursos sin datos y/o secciones con baja participación';
        }
        return { docente: doc, cantidadCursos: cursos.length, motivo };
      })
      .sort((a, b) => a.docente.localeCompare(b.docente));

    const totalDocentes = docentesResumen.length;
    const totalCursos = datosFacultad.length;
    const promedioGeneral = totalDocentes > 0
      ? docentesResumen.reduce((sum, d) => sum + d.promedioNota, 0) / totalDocentes
      : 0;

    return { facultad, docentes: docentesResumen, docentesExcluidos, totalDocentes, totalCursos, promedioGeneral };
  });

  const promediosPorDocente = new Map<string, number>();
  resumenesPorFacultad.forEach(resumen => {
    resumen.docentes.forEach(d => promediosPorDocente.set(d.docente, d.promedioNota));
  });

  const facultadesAMostrar = facultadSeleccionada
    ? resumenesPorFacultad.filter(r => r.facultad === facultadSeleccionada)
    : resumenesPorFacultad;

  const handleExportarPDF = async () => {
    try {
      const resumenesParaPDF = facultadesAMostrar.map(resumen => {
        const datosFacultad = datos.filter(d => d.facultad === resumen.facultad);
        const datosFacultadOrdenados = [...datosFacultad].sort((a, b) => a.docente.localeCompare(b.docente));
        const cursosNoValidos = datosFacultad
          .filter(d => getExclusionReason(d) === 'baja_participacion')
          .sort((a, b) => a.docente.localeCompare(b.docente) || a.curso.localeCompare(b.curso));
        return {
          nombre: resumen.facultad,
          docentes: resumen.docentes.map(d => ({
            docente: d.docente, promedioNota: d.promedioNota,
            cantidadCursos: d.cantidadCursos, calificacion: d.calificacion
          })),
          totalDocentes: resumen.totalDocentes,
          totalCursos: resumen.totalCursos,
          promedioGeneral: resumen.promedioGeneral,
          datosDetalle: datosFacultadOrdenados,
          promediosPorDocente: new Map<string, number>(resumen.docentes.map(d => [d.docente, d.promedioNota])),
          cursosNoValidos,
          docentesExcluidos: resumen.docentesExcluidos,
        };
      });
      await generarPDFResumenDocente(resumenesParaPDF, 'facultad', 'Reporte general de evaluación por docente', facultadSeleccionada || undefined, cicloActual);
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el PDF. Por favor, intente nuevamente.');
    }
  };

  return (
    <div className="resumen-docente-facultad">
      <div className="report-header">
        <div className="faculty-selector">
          <label htmlFor="facultad-select">
            <Building2 size={20} />
            Filtrar por Facultad:
          </label>
          <select
            id="facultad-select"
            value={facultadSeleccionada}
            onChange={(e) => setFacultadSeleccionada(e.target.value)}
            className="faculty-select"
          >
            <option value="">Todas las Facultades</option>
            {facultades.map(facultad => (
              <option key={facultad} value={facultad}>{facultad}</option>
            ))}
          </select>
        </div>
        <div className="report-header-right">
          <h2>Resumen Docente por Facultad</h2>
          <button onClick={handleExportarPDF} className="btn-export-pdf" title="Exportar a PDF">
            <Download size={20} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {facultadesAMostrar.map((resumen) => {
        const datosFacultad = datos.filter(d => d.facultad === resumen.facultad);
        const datosFacultadOrdenados = [...datosFacultad].sort((a, b) => a.docente.localeCompare(b.docente));

        return (
          <div key={resumen.facultad} className="faculty-summary">
            <div className="faculty-header">
              <Building2 size={24} />
              <h3>{resumen.facultad}</h3>
            </div>

            <div className="faculty-stats">
              <div className="faculty-stat-item">
                <Users size={20} />
                <span><strong>{resumen.totalDocentes}</strong> Docentes</span>
              </div>
              <div className="faculty-stat-item">
                <BookOpen size={20} />
                <span><strong>{resumen.totalCursos}</strong> Cursos</span>
              </div>
              <div className="faculty-stat-item">
                <span>Promedio General: <strong>{resumen.promedioGeneral.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Tabla 1: Resumen Docente */}
            <div className="table-section">
              <h4>Resumen Docente por Facultad</h4>
              <div className="faculty-table-container">
                <table className="faculty-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Docente</th>
                      <th>Promedio Nota</th>
                      <th>Cantidad Cursos</th>
                      <th>Calificación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.docentes.map((docente, index) => (
                      <tr key={docente.docente}>
                        <td>{index + 1}</td>
                        <td>{docente.docente}</td>
                        <td className="text-right">{docente.promedioNota.toFixed(2)}</td>
                        <td className="text-center">{docente.cantidadCursos}</td>
                        <td className="text-center">
                          <span className={`badge badge-${docente.calificacion.toLowerCase()}`}>
                            {docente.calificacion}
                          </span>
                        </td>
                      </tr>
                    ))}
                    <tr className="summary-row">
                      <td colSpan={2}><strong>PROMEDIO GENERAL</strong></td>
                      <td className="text-right"><strong>{resumen.promedioGeneral.toFixed(2)}</strong></td>
                      <td className="text-center"><strong>{resumen.totalCursos}</strong></td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla 2: Detalle de todos los cursos */}
            <div className="table-section">
              <h4>Detalle de Cursos - {resumen.facultad}</h4>
              <div className="faculty-table-container">
                <table className="faculty-table">
                  <thead>
                    <tr>
                      <th>N°</th>
                      <th>Docente</th>
                      <th>Curso</th>
                      <th>Sección</th>
                      <th>Calificación</th>
                      <th>AE-01</th>
                      <th>AE-02</th>
                      <th>AE-03</th>
                      <th>AE-04</th>
                      <th>Nota</th>
                      <th>Promedio</th>
                      <th>Encuestados</th>
                      <th>No Encuestados</th>
                      <th>Validez</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const rowSpanMap = new Map<number, number>();
                      for (let i = 0; i < datosFacultadOrdenados.length; i++) {
                        const esPrimera = i === 0 || datosFacultadOrdenados[i].docente !== datosFacultadOrdenados[i - 1].docente;
                        if (esPrimera) {
                          let cnt = 1;
                          for (let j = i + 1; j < datosFacultadOrdenados.length; j++) {
                            if (datosFacultadOrdenados[j].docente === datosFacultadOrdenados[i].docente) cnt++;
                            else break;
                          }
                          if (cnt > 1) rowSpanMap.set(i, cnt);
                        }
                      }
                      return datosFacultadOrdenados.map((dato, index) => {
                        const promedioDocente = promediosPorDocente.get(dato.docente) ?? dato.nota;
                        const calificacionCorrecta = resolverCalDisplay(dato);
                        const rowSpanPromedio = rowSpanMap.get(index);
                        let estaDentroDeGrupo = false;
                        for (const [inicio, span] of rowSpanMap.entries()) {
                          if (inicio < index && index < inicio + span) { estaDentroDeGrupo = true; break; }
                        }
                        const reason = getExclusionReason(dato);
                        const badgeClass = reason === null ? 'badge-success' : 'badge-warning';
                        const badgeText = reason === null ? 'Válido' : reason === 'sin_datos' ? 'Sin datos' : 'No válido';
                        return (
                          <tr key={dato.id || index} className={reason ? 'row-excluded' : ''}>
                            <td>{index + 1}</td>
                            <td>{dato.docente}</td>
                            <td>{dato.curso}</td>
                            <td>{dato.seccion}</td>
                            <td>
                              <span className={`badge ${badgeClaseCal(calificacionCorrecta)}`}>
                                {calificacionCorrecta}
                              </span>
                            </td>
                            <td className="text-right">{dato.ae01.toFixed(2)}</td>
                            <td className="text-right">{dato.ae02.toFixed(2)}</td>
                            <td className="text-right">{dato.ae03.toFixed(2)}</td>
                            <td className="text-right">{dato.ae04.toFixed(2)}</td>
                            <td className="text-right"><strong>{dato.nota.toFixed(2)}</strong></td>
                            {!estaDentroDeGrupo && (
                              <td className="text-right" rowSpan={rowSpanPromedio || 1}>
                                <strong>{promedioDocente.toFixed(2)}</strong>
                              </td>
                            )}
                            <td className="text-center">{dato.encuestados}</td>
                            <td className="text-center">{dato.noEncuestados}</td>
                            <td>
                              <span className={`badge ${badgeClass}`}>{badgeText}</span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Tabla 3: Encuestas no válidas */}
            {(() => {
              const cursosNoValidos = datosFacultad
                .filter(d => getExclusionReason(d) === 'baja_participacion')
                .sort((a, b) => a.docente.localeCompare(b.docente) || a.curso.localeCompare(b.curso));
              if (cursosNoValidos.length === 0) return null;
              return (
                <div className="table-section no-valido-section">
                  <h4>Encuestas No Válidas (Excluidas del Reporte)</h4>
                  <p className="exclusion-notice">
                    Las siguientes evaluaciones fueron excluidas porque la mayoría de estudiantes
                    no respondió la encuesta y la calificación resultó INSATISFACTORIO, lo que podría
                    indicar una situación irregular en contra del docente:
                  </p>
                  <div className="faculty-table-container">
                    <table className="faculty-table">
                      <thead>
                        <tr>
                          <th>N°</th>
                          <th>Docente</th>
                          <th>Curso</th>
                          <th>Sección</th>
                          <th>Encuestados</th>
                          <th>No Encuestados</th>
                          <th>Calificación</th>
                          <th>Nota</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cursosNoValidos.map((dato, idx) => (
                          <tr key={dato.id || idx} className="row-no-valido">
                            <td>{idx + 1}</td>
                            <td>{dato.docente}</td>
                            <td>{dato.curso}</td>
                            <td>{dato.seccion}</td>
                            <td className="text-center">{dato.encuestados}</td>
                            <td className="text-center">{dato.noEncuestados}</td>
                            <td className="text-center">
                              <span className={`badge ${badgeClaseCal(resolverCalDisplay(dato))}`}>{resolverCalDisplay(dato)}</span>
                            </td>
                            <td className="text-right">{dato.nota.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Tabla 4: Docentes excluidos del reporte */}
            {resumen.docentesExcluidos.length > 0 && (
              <div className="table-section excluded-section">
                <h4>Docentes sin promedio calculable</h4>
                <p className="exclusion-notice">
                  Los siguientes docentes no cuentan con registros válidos para el cálculo de promedio
                  y han sido excluidos del reporte estadístico:
                </p>
                <div className="faculty-table-container">
                  <table className="faculty-table">
                    <thead>
                      <tr>
                        <th>N°</th>
                        <th>Docente</th>
                        <th>Cursos Registrados</th>
                        <th>Motivo de Exclusión</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.docentesExcluidos.map((exc, idx) => (
                        <tr key={exc.docente} className="row-excluded">
                          <td>{idx + 1}</td>
                          <td>{exc.docente}</td>
                          <td className="text-center">{exc.cantidadCursos}</td>
                          <td><span className="badge badge-warning">{exc.motivo}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
