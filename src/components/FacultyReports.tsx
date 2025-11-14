import { useState } from 'react';
import { EvaluacionData } from '../types';
import { GraduationCap, Users, BookOpen } from 'lucide-react';

interface FacultyReportsProps {
  datos: EvaluacionData[];
}

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
}

interface CarreraResumen {
  carrera: string;
  docentes: DocenteResumen[];
  totalDocentes: number;
  totalCursos: number;
  promedioGeneral: number;
}

export default function FacultyReports({ datos }: FacultyReportsProps) {
  const [carreraSeleccionada, setCarreraSeleccionada] = useState<string>('');

  if (datos.length === 0) {
    return (
      <div className="faculty-reports">
        <p className="no-data">No hay datos para generar reportes por carrera profesional. Importa datos primero.</p>
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

  // Obtener todas las carreras profesionales
  const carreras = [...new Set(datos.map(d => d.carreraProfesional))].sort();

  // Procesar datos por carrera
  const resumenesPorCarrera: CarreraResumen[] = carreras.map(carrera => {
    const datosCarrera = datos.filter(d => d.carreraProfesional === carrera);
    
    // Agrupar por docente
    const docentesMap = new Map<string, EvaluacionData[]>();
    datosCarrera.forEach(dato => {
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

    // Ordenar por promedio de nota descendente
    docentesResumen.sort((a, b) => b.promedioNota - a.promedioNota);

    // Calcular totales de la carrera
    const totalDocentes = docentesResumen.length;
    const totalCursos = datosCarrera.length;
    const promedioGeneral = docentesResumen.reduce((sum, d) => sum + d.promedioNota, 0) / totalDocentes;

    return {
      carrera,
      docentes: docentesResumen,
      totalDocentes,
      totalCursos,
      promedioGeneral
    };
  });

  // Si hay una carrera seleccionada, mostrar solo esa, sino mostrar todas
  const carrerasAMostrar = carreraSeleccionada
    ? resumenesPorCarrera.filter(r => r.carrera === carreraSeleccionada)
    : resumenesPorCarrera;

  return (
    <div className="faculty-reports">
      <h2>Resumen Docente por Carrera Profesional</h2>

      {/* Selector de carrera */}
      <div className="career-selector">
        <label htmlFor="carrera-select">Filtrar por Carrera Profesional:</label>
        <select
          id="carrera-select"
          value={carreraSeleccionada}
          onChange={(e) => setCarreraSeleccionada(e.target.value)}
          className="career-select"
        >
          <option value="">Todas las Carreras</option>
          {carreras.map(carrera => (
            <option key={carrera} value={carrera}>
              {carrera}
            </option>
          ))}
        </select>
      </div>

      {/* Tablas por carrera */}
      {carrerasAMostrar.map((resumen) => (
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
      ))}
    </div>
  );
}

