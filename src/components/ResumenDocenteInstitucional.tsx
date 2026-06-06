import { EvaluacionData } from '../types';
import { Building2, Users, BookOpen, Download } from 'lucide-react';
import { generarPDFResumenDocente } from '../services/pdfService';
import { esValidoParaReporte, getExclusionReason } from '../services/reportCalculations';
import { calcularCalificacion, UMBRAL_PARTICIPACION_MINIMA } from '../config/universityStructure';

interface ResumenDocenteInstitucionalProps {
  datos: EvaluacionData[];
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

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
}

export default function ResumenDocenteInstitucional({ datos }: ResumenDocenteInstitucionalProps) {
  if (datos.length === 0) {
    return (
      <div className="resumen-docente-institucional">
        <p className="no-data">No hay datos para generar el resumen docente institucional. Importa datos primero.</p>
      </div>
    );
  }

  // Agrupar por docente usando solo registros válidos para los promedios
  const docentesMap = new Map<string, EvaluacionData[]>();
  datos.filter(esValidoParaReporte).forEach(dato => {
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
      // Si solo tiene un curso, usar la nota directamente
      promedioNota = cursos[0].nota;
    } else {
      // Si tiene 2 o más cursos, promediar las notas
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

  // Ordenar alfabéticamente por docente
  docentesResumen.sort((a, b) => a.docente.localeCompare(b.docente));

  // Docentes cuyos cursos todos fueron excluidos
  const todosDocentes = [...new Set(datos.map(d => d.docente))];
  const docentesExcluidos = todosDocentes
    .filter(doc => !docentesMap.has(doc))
    .map(doc => {
      const cursos = datos.filter(d => d.docente === doc);
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

  // Calcular totales institucionales
  const totalDocentes = docentesResumen.length;
  const totalCursos = datos.length;
  const promedioGeneral = docentesResumen.reduce((sum, d) => sum + d.promedioNota, 0) / totalDocentes;

  // Crear un mapa de promedios por docente para usar en la segunda tabla
  const promediosPorDocente = new Map<string, number>();
  docentesResumen.forEach(docente => {
    promediosPorDocente.set(docente.docente, docente.promedioNota);
  });

  // Ordenar todos los datos alfabéticamente por docente
  const datosOrdenados = [...datos].sort((a, b) => a.docente.localeCompare(b.docente));

  const handleExportarPDF = async () => {
    try {
      const resumenParaPDF = {
        nombre: 'INSTITUCIONAL',
        docentes: docentesResumen.map(d => ({
          docente: d.docente,
          promedioNota: d.promedioNota,
          cantidadCursos: d.cantidadCursos,
          calificacion: d.calificacion
        })),
        totalDocentes,
        totalCursos,
        promedioGeneral,
        datosDetalle: datosOrdenados,
        promediosPorDocente: new Map<string, number>(
          docentesResumen.map(d => [d.docente, d.promedioNota])
        )
      };

      await generarPDFResumenDocente(
        [resumenParaPDF],
        'institucional',
        'Reporte de Notas de la Plana Docente Institucional'
      );
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('Error al exportar el PDF. Por favor, intente nuevamente.');
    }
  };

  return (
    <div className="resumen-docente-institucional">
      <div className="report-header">
        <div className="report-header-right">
          <h2>Resumen Docente Institucional</h2>
          <button 
            onClick={handleExportarPDF}
            className="btn-export-pdf"
            title="Exportar a PDF"
          >
            <Download size={20} />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      <div className="institutional-summary">
        <div className="institutional-header">
          <Building2 size={24} />
          <h3>Resumen General de la Universidad</h3>
        </div>

        <div className="institutional-stats">
          <div className="institutional-stat-item">
            <Users size={20} />
            <span><strong>{totalDocentes}</strong> Docentes</span>
          </div>
          <div className="institutional-stat-item">
            <BookOpen size={20} />
            <span><strong>{totalCursos}</strong> Cursos</span>
          </div>
          <div className="institutional-stat-item">
            <span>Promedio General: <strong>{promedioGeneral.toFixed(2)}</strong></span>
          </div>
        </div>

        {/* Primera tabla: Resumen Docente Institucional */}
        <div className="table-section">
          <h4>Resumen Docente Institucional</h4>
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
                {docentesResumen.map((docente, index) => (
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
                  <td className="text-right"><strong>{promedioGeneral.toFixed(2)}</strong></td>
                  <td className="text-center"><strong>{totalCursos}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Segunda tabla: Detalle de todos los cursos */}
        <div className="table-section">
          <h4>Detalle de Cursos - Institucional</h4>
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
                  // Pre-calcular rowSpans para todas las filas
                  // IMPORTANTE: Esta lógica asume que los datos están ordenados alfabéticamente por docente,
                  // de manera que todos los cursos del mismo docente aparecen consecutivamente
                  const rowSpanMap = new Map<number, number>();
                  for (let i = 0; i < datosOrdenados.length; i++) {
                    const esPrimeraFila = i === 0 || datosOrdenados[i].docente !== datosOrdenados[i - 1].docente;
                    if (esPrimeraFila) {
                      let contador = 1;
                      for (let j = i + 1; j < datosOrdenados.length; j++) {
                        if (datosOrdenados[j].docente === datosOrdenados[i].docente) {
                          contador++;
                        } else {
                          break;
                        }
                      }
                      if (contador > 1) {
                        rowSpanMap.set(i, contador);
                      }
                    }
                  }

                  return datosOrdenados.map((dato, index) => {
                    const promedioDocente = promediosPorDocente.get(dato.docente) || dato.nota;
                    const calificacionCorrecta = resolverCalDisplay(dato);
                    const rowSpanPromedio = rowSpanMap.get(index);
                    
                    // Verificar si esta fila está dentro de un grupo combinado (pero no es la primera)
                    let estaDentroDeGrupoCombinado = false;
                    for (const [inicio, rowSpan] of rowSpanMap.entries()) {
                      if (inicio < index && index < inicio + rowSpan) {
                        estaDentroDeGrupoCombinado = true;
                        break;
                      }
                    }

                    return (
                      <tr key={dato.id || index}>
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
                        {!estaDentroDeGrupoCombinado && (
                          <td className="text-right" rowSpan={rowSpanPromedio || 1}>
                            <strong>{promedioDocente.toFixed(2)}</strong>
                          </td>
                        )}
                        <td className="text-center">{dato.encuestados}</td>
                        <td className="text-center">{dato.noEncuestados}</td>
                        <td>
                          {(() => {
                            const reason = getExclusionReason(dato);
                            const badgeClass = reason === null ? 'badge-success' : 'badge-warning';
                            const badgeText = reason === null ? 'Válido' : reason === 'sin_datos' ? 'Sin datos' : 'No válido';
                            return <span className={`badge ${badgeClass}`}>{badgeText}</span>;
                          })()}
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
          const cursosNoValidos = [...datos]
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
                      <th>Facultad</th>
                      <th>Carrera</th>
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
                        <td>{dato.facultad}</td>
                        <td>{dato.carreraProfesional}</td>
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
        {docentesExcluidos.length > 0 && (
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
                  {docentesExcluidos.map((exc, idx) => (
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
    </div>
  );
}

