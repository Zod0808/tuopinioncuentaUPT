export type NivelRecomendacion = 'docente' | 'carrera' | 'facultad' | 'institucional';

export interface AreaMejora {
  codigo: string;        // AE-01…AE-04
  descripcion: string;
  puntuacion: number;
  severidad: 'critica' | 'moderada' | 'leve';
}

export interface RecomendacionDocente {
  docente: string;
  curso: string;
  seccion: string;
  carrera: string;
  facultad: string;
  nota: number;
  ae01: number;
  ae02: number;
  ae03: number;
  ae04: number;
  calificacion: 'INSATISFACTORIO' | 'ACEPTABLE';
  diagnostico: string;
  areasMejora: AreaMejora[];
  accionesSugeridas: string[];
  metaProximoCiclo: number;
  plazoEjecucion: string;
}

export interface RecomendacionCarrera {
  carrera: string;
  facultad: string;
  promedioGeneral: number;
  ae01: number;
  ae02: number;
  ae03: number;
  ae04: number;
  porcInsatisfactorio: number;
  porcAceptable: number;
  seccionesTotal: number;
  seccionesCriticas: number;
  criterioMasDebil: string;
  diagnostico: string;
  estrategias: string[];
  indicadorActual: number;
  indicadorMeta: number;
  acciones: { accion: string; responsable: string; plazo: string }[];
}

export interface RecomendacionFacultad {
  facultad: string;
  codigoFacultad: string;
  promedioGeneral: number;
  indicadorActual: number;
  carrerasCriticas: string[];
  criterioMasDebil: string;
  diagnostico: string;
  planesAccion: string[];
  indicadorMeta: number;
  ciclosMeta: number;
}

export interface IndiceMejora {
  nombre: string;
  descripcion: string;
  valorActual: number;
  valorMeta: number;
  unidad: string;
  brecha: number;
  estrategia: string;
  acciones: string[];
}

export interface RecomendacionInstitucional {
  promedioGeneral: number;
  indicadorActual: number;
  porcInsatisfactorio: number;
  porcAceptable: number;
  porcBueno: number;
  porcDestacado: number;
  criterioMasDebil: string;
  diagnostico: string;
  indicesMejora: IndiceMejora[];
  planesEstrategicos: string[];
  resumenEjecutivo: string;
}

export interface ResultadosIA {
  docentes: RecomendacionDocente[];
  carreras: RecomendacionCarrera[];
  facultades: RecomendacionFacultad[];
  institucional: RecomendacionInstitucional;
  generadoEn: string;
  ciclo: string;
  usandoIA: boolean;
}
