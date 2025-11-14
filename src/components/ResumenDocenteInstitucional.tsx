import { EvaluacionData } from '../types';
import { Building2, Users, BookOpen, Download } from 'lucide-react';
import { generarPDFResumenDocente } from '../services/pdfService';

interface ResumenDocenteInstitucionalProps {
  datos: EvaluacionData[];
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

  // Agrupar todos los datos por docente (sin importar facultad o carrera)
  const docentesMap = new Map<string, EvaluacionData[]>();
  datos.forEach(dato => {
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
        'carrera', // Usamos 'carrera' pero el nombre será 'INSTITUCIONAL'
        'Tu Opinión Cuenta 2025-II'
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
                </tr>
              </thead>
              <tbody>
                {datosOrdenados.map((dato, index) => {
                  const promedioDocente = promediosPorDocente.get(dato.docente) || dato.nota;
                  // Calcular la calificación correcta basada en la nota del curso
                  const calificacionCorrecta = calcularCalificacion(dato.nota);
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
                      <td className="text-right">
                        <strong>{promedioDocente.toFixed(2)}</strong>
                      </td>
                      <td className="text-center">{dato.encuestados}</td>
                      <td className="text-center">{dato.noEncuestados}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

