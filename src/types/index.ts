import type { Calificacion } from '../config/universityStructure';

export interface EvaluacionData {
  id?: string;
  /**
   * Ciclo académico del registro (ej. '2025-II', '2026-I', '2026-II'). Define
   * cuál reglamento aplica para clasificar la nota: ciclos ≤ 2026-I usan la
   * escala legacy (Res. 200-2019, 4 niveles); desde 2026-II la nueva
   * (Res. 245-2026, 5 niveles). Opcional por compatibilidad con cargas
   * previas; si falta, se asume `PERIODO_ACADEMICO` global.
   */
  ciclo?: string;
  facultad: string;
  carreraProfesional: string;
  docente: string;
  curso: string;
  seccion: string;
  /**
   * Clasificación textual del docente, calculada a partir de la nota y el
   * ciclo del registro. Puede ser cualquier label válido en el union
   * `Calificacion` (legacy o 2026).
   */
  calificacion: Calificacion;
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

