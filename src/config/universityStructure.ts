export const FACULTADES: Record<string, { nombre: string; carreras: string[] }> = {
  FADE: {
    nombre: 'Facultad de Derecho y Ciencias Políticas',
    carreras: ['Escuela Profesional de Derecho'],
  },
  FAEDCOH: {
    nombre: 'Facultad de Educación, Ciencias de la Comunicación y Humanidades',
    carreras: [
      'Carrera de Educación Inicial',
      'Carrera de Educación Primaria',
      'Carrera de Educación Física y Deportes',
      'Escuela Profesional de Ciencias de la Comunicación',
      'Carrera de Psicología',
    ],
  },
  FAING: {
    nombre: 'Facultad de Ingeniería',
    carreras: [
      'Escuela Profesional de Ingeniería Civil',
      'Escuela Profesional de Ingeniería de Sistemas',
      'Escuela Profesional de Ingeniería Electrónica',
      'Escuela Profesional de Ingeniería Agroindustrial',
      'Escuela Profesional de Ingeniería Ambiental',
      'Escuela Profesional de Ingeniería Industrial',
    ],
  },
  FACEM: {
    nombre: 'Facultad de Ciencias Empresariales',
    carreras: [
      'Escuela Profesional de Ingeniería Comercial',
      'Escuela Profesional de Ciencias Contables y Financieras',
      'Escuela Profesional de Economía',
      'Administración de Negocios Internacionales',
      'Administración Turístico-Hotelera',
      'Administración de Empresas',
    ],
  },
  FAU: {
    nombre: 'Facultad de Arquitectura y Urbanismo',
    carreras: ['Escuela Profesional de Arquitectura'],
  },
  FACSA: {
    nombre: 'Facultad de Ciencias de la Salud',
    carreras: [
      'Escuela Profesional de Medicina Humana',
      'Escuela Profesional de Odontología',
      'Laboratorio Clínico y Anatomía Patológica',
      'Terapia Física y Rehabilitación',
    ],
  },
};

export const ORDEN_FACULTADES = ['FADE', 'FAEDCOH', 'FAING', 'FACEM', 'FAU', 'FACSA'];

export type Calificacion = 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';

export const ESCALA_CALIFICACION: Record<Calificacion, { min: number; max: number; color: string; interpretacion: string }> = {
  DESTACADO:       { min: 17.1, max: 20,   color: '#276749', interpretacion: 'El docente tiene excelente desempeño y merece ser reconocido.' },
  BUENO:           { min: 15.1, max: 17.0, color: '#2b6cb0', interpretacion: 'Tiene un buen desempeño, pero puede superarlo atendiendo los aspectos que requieren mejora.' },
  ACEPTABLE:       { min: 11.0, max: 15.0, color: '#c05621', interpretacion: 'El docente debe examinar los resultados de su evaluación y afianzar los aspectos observados.' },
  INSATISFACTORIO: { min: 0,    max: 10.9, color: '#c53030', interpretacion: 'El docente no tiene un buen desempeño, tiene que replantear radicalmente su desempeño profesional.' },
};

export const ASPECTOS_EVALUADOS: Record<string, string> = {
  'AE-01': 'Calidad de la presentación y contenido silábico de la asignatura',
  'AE-02': 'Ejecución del proceso enseñanza aprendizaje',
  'AE-03': 'Aplicación de la evaluación de la asignatura',
  'AE-04': 'Formación actitudinal y relaciones interpersonales con los estudiantes',
};

export const PERIODO_ACADEMICO = '2025-II';

/** Porcentaje mínimo de participación (Enc / (Enc+NoEnc)) para que una sección
 *  sea considerada válida. Por debajo de este umbral la nota no se promedia y
 *  la calificación se muestra como "Baja Participación". */
export const UMBRAL_PARTICIPACION_MINIMA = 0.50;

/**
 * Quórum mínimo de estudiantes encuestados para que una calificación INSATISFACTORIO
 * pueda generar una alerta institucional. Secciones con menos encuestados que este
 * umbral carecen de representatividad estadística y se reportan como "Sub-Quórum"
 * (informativo) en lugar de activar una alerta de riesgo docente.
 *
 * Base: con n < 3 la desviación estándar es indeterminable y 1 solo respondente
 * puede mover la nota de 20 a 0. Se fija en 3 como mínimo absoluto; las buenas
 * prácticas de evaluación docente recomiendan n ≥ 5 para estudios de carrera.
 */
export const QUORUM_MINIMO_ENCUESTADOS = 3;

export function calcularCalificacion(nota: number): Calificacion {
  if (nota >= 17.1) return 'DESTACADO';
  if (nota >= 15.1) return 'BUENO';
  if (nota >= 11.0) return 'ACEPTABLE';
  return 'INSATISFACTORIO';
}
