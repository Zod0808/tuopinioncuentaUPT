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

// ─────────────────────────────────────────────────────────────────────────────
// Escalas de calificación — dos reglamentos coexisten:
//   · Legacy (Res. 200-2019): ciclos ≤ 2026-I. 4 niveles.
//   · 2026   (Res. 245-2026-UPT-CU, Anexo 05): ciclos ≥ 2026-II. 5 niveles.
// La clasificación depende del ciclo del registro, no es una tabla global.
// ─────────────────────────────────────────────────────────────────────────────

export type Calificacion2026 =
  | 'EXCELENTE'
  | 'MUY_SATISFACTORIO'
  | 'SATISFACTORIO'
  | 'INSATISFACTORIO'
  | 'MUY_INSATISFACTORIO';

export type CalificacionLegacy =
  | 'DESTACADO'
  | 'BUENO'
  | 'ACEPTABLE'
  | 'INSATISFACTORIO';

export type Calificacion = Calificacion2026 | CalificacionLegacy;

interface EscalaEntry {
  min: number;
  max: number;
  color: string;
  etiqueta: string;
  interpretacion: string;
}

export const ESCALA_CALIFICACION: Record<Calificacion2026, EscalaEntry> = {
  EXCELENTE: {
    min: 18.0, max: 20.0, color: '#276749', etiqueta: 'Excelente (sobresaliente)',
    interpretacion: 'Desempeño docente altamente valorado. Destaca por su puntualidad, didáctica, uso de TICs y empatía.',
  },
  MUY_SATISFACTORIO: {
    min: 15.0, max: 17.99, color: '#2f855a', etiqueta: 'Muy satisfactorio (esperado)',
    interpretacion: 'Desempeño constante y efectivo. Cumple adecuadamente con la docencia en aula y el trato respetuoso.',
  },
  SATISFACTORIO: {
    min: 12.0, max: 14.99, color: '#2b6cb0', etiqueta: 'Satisfactorio (regular)',
    interpretacion: 'Muestra aspectos por mejorar en dinamismo, entrega oportuna de notas o dinamización de clases.',
  },
  INSATISFACTORIO: {
    min: 8.0, max: 11.99, color: '#c05621', etiqueta: 'Insatisfactorio (deficiente)',
    interpretacion: 'Insatisfacción recurrente de los estudiantes en el cumplimiento de horarios, didáctica o trato.',
  },
  MUY_INSATISFACTORIO: {
    min: 0, max: 7.99, color: '#c53030', etiqueta: 'Muy insatisfactorio (crítico)',
    interpretacion: 'Desempeño severamente cuestionado. Requiere intervención pedagógica o acompañamiento inmediato.',
  },
};

export const ESCALA_CALIFICACION_LEGACY: Record<CalificacionLegacy, EscalaEntry> = {
  DESTACADO: {
    min: 17.1, max: 20.0, color: '#276749', etiqueta: 'Destacado',
    interpretacion: 'Desempeño docente altamente valorado por los estudiantes.',
  },
  BUENO: {
    min: 15.1, max: 17.0, color: '#2b6cb0', etiqueta: 'Bueno',
    interpretacion: 'Desempeño docente adecuado y consistente.',
  },
  ACEPTABLE: {
    min: 11.0, max: 15.0, color: '#c05621', etiqueta: 'Aceptable',
    interpretacion: 'Desempeño docente con aspectos por mejorar.',
  },
  INSATISFACTORIO: {
    min: 0, max: 10.9, color: '#c53030', etiqueta: 'Insatisfactorio',
    interpretacion: 'Desempeño docente que requiere intervención pedagógica.',
  },
};

/**
 * Primer ciclo bajo la Res. 245-2026-UPT-CU (aprobada 18-ago-2026). Los ciclos
 * lexicográficamente ≥ a este valor usan la escala nueva; los anteriores
 * conservan la clasificación del reglamento vigente en su momento (Res. 200-2019).
 */
export const CICLO_INICIO_REGLAMENTO_2026 = '2026-II';

export function esNuevoReglamento(ciclo: string): boolean {
  return ciclo >= CICLO_INICIO_REGLAMENTO_2026;
}

export const CALIFICACIONES_2026: Calificacion2026[] = [
  'EXCELENTE', 'MUY_SATISFACTORIO', 'SATISFACTORIO', 'INSATISFACTORIO', 'MUY_INSATISFACTORIO',
];

export const CALIFICACIONES_LEGACY: CalificacionLegacy[] = [
  'DESTACADO', 'BUENO', 'ACEPTABLE', 'INSATISFACTORIO',
];

/** Lista ordenada de calificaciones aplicables al ciclo (mejor → peor). */
export function calificacionesPorCiclo(ciclo: string): Calificacion[] {
  return esNuevoReglamento(ciclo) ? CALIFICACIONES_2026 : CALIFICACIONES_LEGACY;
}

/**
 * Metadata (color, etiqueta, interpretación) de una calificación, resolviendo
 * la tabla correcta según ciclo. Útil cuando `c` puede ser legacy o 2026.
 */
export function escalaMetadata(c: Calificacion, ciclo?: string): EscalaEntry {
  const usarLegacy = ciclo
    ? !esNuevoReglamento(ciclo)
    : (c === 'DESTACADO' || c === 'BUENO' || c === 'ACEPTABLE');
  if (usarLegacy && c in ESCALA_CALIFICACION_LEGACY) {
    return ESCALA_CALIFICACION_LEGACY[c as CalificacionLegacy];
  }
  if (c in ESCALA_CALIFICACION) {
    return ESCALA_CALIFICACION[c as Calificacion2026];
  }
  return ESCALA_CALIFICACION_LEGACY[c as CalificacionLegacy];
}

/**
 * Contador de docentes/registros por calificación. Union completo de 8 keys:
 * cada reporte itera solo las que aplican a su ciclo. Los buckets que no
 * aplican quedan en 0 (son keys muertas pero no estorban al render).
 */
export type CalificacionStats = Record<Calificacion, number>;

/**
 * Calcula el ciclo académico UPT a partir de una fecha (sin argumento = hoy).
 *   - Mar–Jul (meses 3-7) → semestre I del año en curso
 *   - Ago–Dic (meses 8-12) → semestre II del año en curso
 *   - Ene–Feb (meses 1-2)  → semestre II del año anterior (período de cierre)
 */
export function getCicloFromDate(date: Date = new Date()): string {
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  if (month >= 3 && month <= 7) return `${year}-I`;
  if (month <= 2) return `${year - 1}-II`;
  return `${year}-II`;
}

export function crearStatsVacios(): CalificacionStats {
  return {
    EXCELENTE: 0, MUY_SATISFACTORIO: 0, SATISFACTORIO: 0, INSATISFACTORIO: 0, MUY_INSATISFACTORIO: 0,
    DESTACADO: 0, BUENO: 0, ACEPTABLE: 0,
  };
}

/**
 * Anexo 05: los 10 ítems de la encuesta se agrupan en 4 indicadores/dimensiones.
 * Los campos ae01..ae04 del modelo de datos legado corresponden a estos
 * indicadores actualizados (ver mapeo debajo).
 */
export const ASPECTOS_EVALUADOS: Record<string, string> = {
  'AE-01': 'Responsabilidad y planificación',
  'AE-02': 'Estrategias didácticas y uso de tecnología',
  'AE-03': 'Evaluación y retroalimentación',
  'AE-04': 'Clima del aula, participación y relaciones humanas',
};

export const PERIODO_ACADEMICO = '2025-II';

/**
 * Umbral mínimo de participación por sección (Art. 23 Res. 245-2026).
 * Devuelve la fracción mínima 0..1 en función del número total de estudiantes
 * matriculados en la sección.
 *
 *  - Secciones de 1 a 10 estudiantes: ≥ 70%
 *  - Secciones de 11 a 30 estudiantes: ≥ 50%
 *  - Secciones de 31 a más estudiantes: ≥ 40%
 */
export function umbralParticipacionPorSeccion(totalMatriculadosSeccion: number): number {
  if (totalMatriculadosSeccion <= 0) return 0.7;
  if (totalMatriculadosSeccion <= 10) return 0.7;
  if (totalMatriculadosSeccion <= 30) return 0.5;
  return 0.4;
}

/**
 * Quórum estadístico mínimo (salvaguarda propia, más estricta que el reglamento):
 * con n < 3, una sola respuesta puede mover la nota de 20 a 0 y la desviación
 * estándar es indeterminable. Secciones que cumplen el % del Art. 23 pero
 * tienen menos de 3 encuestados se marcan como "Sub-Quórum" (informativo).
 */
export const QUORUM_MINIMO_ENCUESTADOS = 3;

export function clasificar2026(nota: number): Calificacion2026 {
  if (nota >= 18.0) return 'EXCELENTE';
  if (nota >= 15.0) return 'MUY_SATISFACTORIO';
  if (nota >= 12.0) return 'SATISFACTORIO';
  if (nota >= 8.0) return 'INSATISFACTORIO';
  return 'MUY_INSATISFACTORIO';
}

export function clasificarLegacy(nota: number): CalificacionLegacy {
  if (nota >= 17.1) return 'DESTACADO';
  if (nota >= 15.1) return 'BUENO';
  if (nota >= 11.0) return 'ACEPTABLE';
  return 'INSATISFACTORIO';
}

/**
 * Clasifica una nota vigesimal según el reglamento vigente en el ciclo del
 * registro. No remapea históricos: ciclos previos a 2026-II conservan la
 * escala de 4 niveles (Res. 200-2019); desde 2026-II se aplica la escala de
 * 5 niveles (Res. 245-2026). Si no se pasa `ciclo`, usa `PERIODO_ACADEMICO`
 * como contexto global de la sesión.
 */
export function calcularCalificacion(nota: number, ciclo: string = PERIODO_ACADEMICO): Calificacion {
  return esNuevoReglamento(ciclo) ? clasificar2026(nota) : clasificarLegacy(nota);
}

/**
 * Etiqueta legible de una calificación. El ciclo desambigua el label
 * INSATISFACTORIO, que existe en ambas escalas con metadatos distintos
 * ("Insatisfactorio" en legacy vs "Insatisfactorio (deficiente)" en 2026).
 */
export function etiquetaCalificacion(c: Calificacion, ciclo?: string): string {
  const usarLegacy = ciclo ? !esNuevoReglamento(ciclo) : c === 'DESTACADO' || c === 'BUENO' || c === 'ACEPTABLE';
  if (usarLegacy && c in ESCALA_CALIFICACION_LEGACY) {
    return ESCALA_CALIFICACION_LEGACY[c as CalificacionLegacy].etiqueta;
  }
  if (c in ESCALA_CALIFICACION) {
    return ESCALA_CALIFICACION[c as Calificacion2026].etiqueta;
  }
  return ESCALA_CALIFICACION_LEGACY[c as CalificacionLegacy].etiqueta;
}

/** Clase CSS derivada de la calificación (para colorear badges/celdas). */
export function claseCssCalificacion(c: Calificacion): string {
  return c.toLowerCase().replace(/_/g, '-');
}
