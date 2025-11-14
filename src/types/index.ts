export interface EvaluacionData {
  id?: string;
  facultad: string;
  carreraProfesional: string;
  docente: string;
  curso: string;
  seccion: string;
  calificacion: 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'REGULAR' | 'DEFICIENTE';
  ae01: number;
  ae02: number;
  ae03: number;
  ae04: number;
  nota: number;
  encuestados: number;
  noEncuestados: number;
  validez: 'Válido' | 'Inválido';
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

