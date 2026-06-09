export interface EvaluacionData {
  id?: string;
  facultad: string;
  carreraProfesional: string;
  docente: string;
  curso: string;
  seccion: string;
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
  ae01: number;
  ae02: number;
  ae03: number;
  ae04: number;
  nota: number;
  /**
   * RESPUESTAS DE ENCUESTA para esta sección específica (interacciones totales).
   * Un mismo alumno puede aparecer en múltiples secciones/cursos, por lo que
   * la suma de este campo a nivel de carrera representa INTERACCIONES TOTALES,
   * no alumnos únicos. Ver `MatriculadosEntry.totalEncuestados` para alumnos únicos.
   */
  encuestados: number;
  noEncuestados: number;
  validez: 'Válido' | 'No válido';
}

export interface GraficoData {
  tipo: 'bar' | 'line' | 'pie' | 'doughnut';
  titulo: string;
  datos: any;
  interpretacion?: string;
}

export interface ReporteData {
  titulo: string;
  fecha: string;
  datos: EvaluacionData[];
  graficos: GraficoData[];
  interpretaciones: string[];
}

