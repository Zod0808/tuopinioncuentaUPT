import { useState } from 'react';
import { EvaluacionData } from '../types';
import { GraduationCap, Users, BookOpen, Download } from 'lucide-react';
import { generarPDFResumenDocente } from '../services/pdfService';
import { esValidoParaReporte, getExclusionReason } from '../services/reportCalculations';

interface ResumenDocentePorCarreraProps {
  datos: EvaluacionData[];
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

interface CarreraResumen {
  carrera: string;
  docentes: DocenteResumen[];
  docentesExcluidos: DocenteExcluido[];
  totalDocentes: number;
  totalCursos: number;
  promedioGeneral: number;
}

export default function ResumenDocentePorCarrera({ datos }: ResumenDocentePorCarreraProps) {
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');

  if (datos.length === 0) {
    return (
      <div className="resumen-docente-carrera">
        <p className="no-data">No hay datos para generar el resumen docente por carrera. Importa datos primero.</p>
      </div>
    );
  }

  const calcularCalificacion = (nota: number): 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO' => {
    if (nota > 17 && nota <= 20) return 'DESTACADO';
    if (nota > 15 && nota <= 17) return 'BUENO';
    if (nota > 11 && nota <= 15) return 'ACEPTABLE';
    return 'INSATISFACTORIO';
  };

  const carreras = [...new Set(datos.map(d => d.carreraProfesional))].sort();

  const resumenesPorCarrera: CarreraResumen[] = carreras.map(carrera => {
    const datosCarrera = datos.filter(d => d.carreraProfesional === carrera);

    // Solo registros válidos para calcular promedios
    const docentesMap = new Map<string, EvaluacionData[]>();
    datosCarrera.filter(esValidoParaReporte).forEach(dato => {
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
    const todosDocentes = [...new Set(datosCarrera.map(d => d.docente))];
    const docentesExcluidos: DocenteExcluido[] = todosDocentes
      .filter(doc => !docentesMap.has(doc))
      .map(doc => {
        const cursos = datosCarrera.filter(d => d.docente === doc);
        const razones = new Set(cursos.map(c => getExclusionReason(c)));
        let motivo: string;
        if (razones.has('sin_datos') && !razones.has('no_valido')) {
          motivo = 'Sin estudiantes registrados (0 encuestados y 0 no encuestados)';
        } else if (!razones.has('sin_datos') && razones.has('no_valido')) {
          motivo = 'Evaluación no válida: mayoría no respondió con calificación INSATISFACTORIO';
        } else {
          motivo = 'Combinación: cursos sin datos y/o evaluaciones no válidas';
        }
        return { docente: doc, cantidadCursos: cursos.length, motivo };
      })
      .sort((a, b) => a.docente.localeCompare(b.docente));

    const totalDocentes = docentesResumen.length;
    const totalCursos = datosCarrera.length;
    const promedioGeneral = totalDocentes > 0
      ? docentesResumen.reduce((sum, d) => sum + d.promedioNota, 0) / totalDocentes
      : 0;

    return { carrera, docentes: docentesResumen, docentesExcluidos, totalDocentes, totalCursos, promedioGeneral };
  });

  const promediosPorDocente = new Map<string, number>();
  resumenesPorCarrera.forEach(resumen => {
    resumen.docentes.forEach(d => promediosPorDocente.set(d.docente, d.promedioNota));
  });

  const carrerasAMostrar = carreraSeleccionada
    ? resumenesPorCarrera.filter(r => r.carrera === carreraSeleccionada)
    : resumenesPorCarrera;

  const handleExportarPDF = async () => {
    try {
      const resumenesParaPDF = carrerasAMostrar.map(resumen => {
        const datosCarrera = datos.filter(d => d.carreraProfesional === resumen.carrera);
        const datosCarreraOrdenados = [...datosCarrera].sort((a, b) => a.docente.localeCompare(b.docente));
        return {
          nombre: resumen.carrera,
          docentes: resumen.docentes.map(d => ({
            docente: d.docente, promedioNota: d.promedioNota,
            cantidadCursos: d.cantidadCursos, calificacion: d.calificacion
          })),
          totalDocentes: resumen.totalDocentes,
          totalCursos: resumen.totalCursos,
          promedioGeneral: resumen.promedioGeneral,
          datosDetalle: datosCarreraOrdenados,
          promediosPorDocente: new Map<string, number>(resumen.docentes.map(d => [d.docente, d.promedioNota]))
        };
      });
      await generarPDFResumenDocente(resumenesParaPDF, 'carrera', 'Reporte de Notas de la Plana Docente por Carrera');
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el PDF. Por favor, intente nuevamente.');
    }
  };

  return (
    <div className="resumen-docente-carrera">
      <div className="report-header">
        <div className="career-selector">
          <label htmlFor="carrera-select">
            <GraduationCap size={20} />
            Filtrar por Carrera Profesional:
          </label>
          <select
            id="carrera-select"
            value={carreraSeleccionada}
            onChange={(e) => setCarreraSeleccionada(e.target.value)}
            className="career-select"
          >
            <option value="">Todas las Carreras</option>
            {carreras.map(carrera => (
              <option key={carrera} value={carrera}>{carrera}</option>
            ))}
          </select>
        </div>
        <div className="report-header-right">
          <h2>Resumen Docente por Carrera Profesional</h2>
          <button onClick={handleExportarPDF} className="btn-export-pdf" title="Exportar a PDF">
            <Download size={20} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {carrerasAMostrar.map((resumen) => {
        const datosCarrera = datos.filter(d => d.carreraProfesional === resumen.carrera);
        const datosCarreraOrdenados = [...datosCarrera].sort((a, b) => a.docente.localeCompare(b.docente));

        return (
          <div key={resumen.carrera} className="career-summary">
            <div className="career-header">
              <GraduationCap size={24} />
              <h3>{resumen.carrera}</h3>
            </div>

            <div className="career-stats">
              <div className="career-stat-item">
                <Users size={20} />
                <span><strong>{resumen.totalDocentes}</strong> Docentes</span>
              </div>
              <div className="career-stat-item">
                <BookOpen size={20} />
                <span><strong>{resumen.totalCursos}</strong> Cursos</span>
              </div>
              <div className="career-stat-item">
                <span>Promedio General: <strong>{resumen.promedioGeneral.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* Tabla 1: Resumen Docente */}
            <div className="table-section">
              <h4>Resumen Docente por Carrera Profesional</h4>
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
              <h4>Detalle de Cursos - {resumen.carrera}</h4>
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
                      for (let i = 0; i < datosCarreraOrdenados.length; i++) {
                        const esPrimera = i === 0 || datosCarreraOrdenados[i].docente !== datosCarreraOrdenados[i - 1].docente;
                        if (esPrimera) {
                          let cnt = 1;
                          for (let j = i + 1; j < datosCarreraOrdenados.length; j++) {
                            if (datosCarreraOrdenados[j].docente === datosCarreraOrdenados[i].docente) cnt++;
                            else break;
                          }
                          if (cnt > 1) rowSpanMap.set(i, cnt);
                        }
                      }
                      return datosCarreraOrdenados.map((dato, index) => {
                        const promedioDocente = promediosPorDocente.get(dato.docente) ?? dato.nota;
                        const calificacionCorrecta = calcularCalificacion(dato.nota);
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
                              <span className={`badge badge-${calificacionCorrecta.toLowerCase()}`}>
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

            {/* Tabla 3: Docentes excluidos del reporte */}
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
