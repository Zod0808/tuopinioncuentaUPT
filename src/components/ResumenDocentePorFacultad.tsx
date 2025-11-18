import { useState } from 'react';
import { EvaluacionData } from '../types';
import { Building2, Users, BookOpen, Download } from 'lucide-react';
import { generarPDFResumenDocente } from '../services/pdfService';

interface ResumenDocentePorFacultadProps {
  datos: EvaluacionData[];
}

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
}

interface FacultadResumen {
  facultad: string;
  docentes: DocenteResumen[];
  totalDocentes: number;
  totalCursos: number;
  promedioGeneral: number;
}

export default function ResumenDocentePorFacultad({ datos }: ResumenDocentePorFacultadProps) {
  const [facultadSeleccionada, setFacultadSeleccionada] = useState<string>('');

  if (datos.length === 0) {
    return (
      <div className="resumen-docente-facultad">
        <p className="no-data">No hay datos para generar el resumen docente por facultad. Importa datos primero.</p>
      </div>
    );
  }

  // Función para calcular calificación basada en nota
  // Rangos: 0-11: INSATISFACTORIO, 11.01-15: ACEPTABLE, 15.01-17: BUENO, 17.01-20: SATISFACTORIO
  const calcularCalificacion = (nota: number): 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO' => {
    if (nota > 17 && nota <= 20) {
      return 'DESTACADO'; // SATISFACTORIO en el sistema, pero mantenemos DESTACADO para compatibilidad
    } else if (nota > 15 && nota <= 17) {
      return 'BUENO';
    } else if (nota > 11 && nota <= 15) {
      return 'ACEPTABLE';
    } else {
      return 'INSATISFACTORIO'; // 0 a 11 (incluye 11)
    }
  };

  // Obtener todas las facultades
  const facultades = [...new Set(datos.map(d => d.facultad))].sort();

  // Procesar datos por facultad
  const resumenesPorFacultad: FacultadResumen[] = facultades.map(facultad => {
    const datosFacultad = datos.filter(d => d.facultad === facultad);
    
    // Agrupar por docente
    const docentesMap = new Map<string, EvaluacionData[]>();
    datosFacultad.forEach(dato => {
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

    // Calcular totales de la facultad
    const totalDocentes = docentesResumen.length;
    const totalCursos = datosFacultad.length;
    const promedioGeneral = docentesResumen.reduce((sum, d) => sum + d.promedioNota, 0) / totalDocentes;

    return {
      facultad,
      docentes: docentesResumen,
      totalDocentes,
      totalCursos,
      promedioGeneral
    };
  });

  // Crear un mapa de promedios por docente para usar en la segunda tabla
  const promediosPorDocente = new Map<string, number>();
  resumenesPorFacultad.forEach(resumen => {
    resumen.docentes.forEach(docente => {
      promediosPorDocente.set(docente.docente, docente.promedioNota);
    });
  });

  // Si hay una facultad seleccionada, mostrar solo esa, sino mostrar todas
  const facultadesAMostrar = facultadSeleccionada
    ? resumenesPorFacultad.filter(r => r.facultad === facultadSeleccionada)
    : resumenesPorFacultad;

  const handleExportarPDF = async () => {
    try {
      const resumenesParaPDF = facultadesAMostrar.map(resumen => {
        const datosFacultad = datos.filter(d => d.facultad === resumen.facultad);
        const datosFacultadOrdenados = [...datosFacultad].sort((a, b) => a.docente.localeCompare(b.docente));
        
        return {
          nombre: resumen.facultad,
          docentes: resumen.docentes.map(d => ({
            docente: d.docente,
            promedioNota: d.promedioNota,
            cantidadCursos: d.cantidadCursos,
            calificacion: d.calificacion
          })),
          totalDocentes: resumen.totalDocentes,
          totalCursos: resumen.totalCursos,
          promedioGeneral: resumen.promedioGeneral,
          datosDetalle: datosFacultadOrdenados,
          promediosPorDocente: new Map<string, number>(
            resumen.docentes.map(d => [d.docente, d.promedioNota])
          )
        };
      });

      await generarPDFResumenDocente(
        resumenesParaPDF,
        'facultad',
        'Reporte de Notas de la Plana Docente por Facultad'
      );
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
              <option key={facultad} value={facultad}>
                {facultad}
              </option>
            ))}
          </select>
        </div>
        <div className="report-header-right">
          <h2>Resumen Docente por Facultad</h2>
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

      {/* Tablas por facultad */}
      {facultadesAMostrar.map((resumen) => {
        // Obtener todos los cursos de la facultad y ordenarlos alfabéticamente por docente
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

            {/* Primera tabla: Resumen Docente */}
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

            {/* Segunda tabla: Detalle de todos los cursos */}
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
                      // Pre-calcular rowSpans para todas las filas
                      // IMPORTANTE: Esta lógica asume que los datos están ordenados alfabéticamente por docente,
                      // de manera que todos los cursos del mismo docente aparecen consecutivamente
                      const rowSpanMap = new Map<number, number>();
                      for (let i = 0; i < datosFacultadOrdenados.length; i++) {
                        const esPrimeraFila = i === 0 || datosFacultadOrdenados[i].docente !== datosFacultadOrdenados[i - 1].docente;
                        if (esPrimeraFila) {
                          let contador = 1;
                          for (let j = i + 1; j < datosFacultadOrdenados.length; j++) {
                            if (datosFacultadOrdenados[j].docente === datosFacultadOrdenados[i].docente) {
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

                      return datosFacultadOrdenados.map((dato, index) => {
                        const promedioDocente = promediosPorDocente.get(dato.docente) || dato.nota;
                        const calificacionCorrecta = calcularCalificacion(dato.nota);
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
                              <span className={`badge badge-${calificacionCorrecta.toLowerCase()}`}>
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
                              <span className={`badge ${dato.validez === 'Válido' ? 'badge-success' : 'badge-warning'}`}>
                                {dato.validez}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

