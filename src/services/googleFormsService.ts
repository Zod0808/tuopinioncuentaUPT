import { EvaluacionData } from '../types';
import { calcularCalificacion } from '../config/universityStructure';

export interface GoogleFormsStats {
  totalRespuestas: number;
  totalDocentes: number;
  validos: number;
  noValidos: number;
  errors: string[];
}

export interface GoogleFormsResult {
  data: EvaluacionData[];
  stats: GoogleFormsStats;
}

const QUORUM_MINIMO = 3;

// AE → índices de preguntas (base 0 sobre las 10 preguntas Likert)
const AE_PREGUNTAS: Record<string, number[]> = {
  ae01: [0, 1],       // Q1, Q2 — Responsabilidad y planificación
  ae02: [2, 3, 4, 5], // Q3-Q6 — Dominio metodológico
  ae03: [6, 7],       // Q7, Q8 — Evaluación del aprendizaje
  ae04: [8, 9],       // Q9, Q10 — Relaciones humanas
};

function primerValor(row: unknown[], desde: number, hasta: number): string {
  for (let i = desde; i <= hasta; i++) {
    const v = String(row[i] ?? '').trim();
    if (v) return v;
  }
  return '';
}

function parseLikert(v: unknown): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  if (isNaN(n)) return 0;
  return Math.max(1, Math.min(5, n));
}

/** Convierte promedio Likert 1-5 a escala vigesimal: ×4 → rango 4-20 */
function likertA20(promLikert: number): number {
  return Math.round(promLikert * 4 * 100) / 100;
}

export function procesarGoogleForms(rows: unknown[][], ciclo: string): GoogleFormsResult {
  if (rows.length < 2) {
    return { data: [], stats: { totalRespuestas: 0, totalDocentes: 0, validos: 0, noValidos: 0, errors: ['El archivo no contiene datos.'] } };
  }

  const headers = rows[0].map(h => String(h ?? '').toLowerCase());

  // Detectar columnas dinámicamente por keyword en el header
  const findLast = (arr: string[], pred: (h: string) => boolean) => {
    for (let i = arr.length - 1; i >= 0; i--) if (pred(arr[i])) return i;
    return -1;
  };

  // Usamos frases específicas de cada sección del form para evitar colisiones
  // Col ciclo:   "¿A qué ciclo pertenece..." — contiene "ciclo pertenece"
  // Col asignat: "¿Qué asignatura deseas..."  — no contiene "ciclo"
  // Col docente: "Selecciona el docente..."   — empieza con "selecciona"
  const colEscuela    = headers.findIndex((h: string) => h.includes('escuela') || (h.includes('carrera') && h.includes('perteneces')));
  const colCicloIni   = headers.findIndex((h: string) => h.includes('ciclo pertenece') || h.includes('ciclo de la asignatura'));
  const colCicloFin   = findLast(headers, (h: string) => h.includes('ciclo pertenece') || h.includes('ciclo de la asignatura'));
  const colCursoIni   = headers.findIndex((h: string) => h.includes('asignatura') && !h.includes('ciclo') && !h.includes('pertenece'));
  const colCursoFin   = findLast(headers, (h: string) => h.includes('asignatura') && !h.includes('ciclo') && !h.includes('pertenece'));
  const colDocenteIni = headers.findIndex((h: string) => h.includes('selecciona') && h.includes('docente'));
  const colDocenteFin = findLast(headers, (h: string) => h.includes('selecciona') && h.includes('docente'));

  // Detectar las 10 preguntas Likert por número al inicio del header
  const colsLikert: number[] = [];
  for (let q = 1; q <= 10; q++) {
    const idx = headers.findIndex(h => h.trimStart().startsWith(`${q}.`));
    if (idx !== -1) colsLikert.push(idx);
  }

  const errors: string[] = [];
  if (colEscuela === -1)       errors.push('No se encontró columna de Escuela/Carrera.');
  if (colCicloIni === -1)      errors.push('No se encontró columna de Ciclo.');
  if (colCursoIni === -1)      errors.push('No se encontró columna de Asignatura/Curso.');
  if (colDocenteIni === -1)    errors.push('No se encontró columna de Docente.');
  if (colsLikert.length < 10) errors.push(`Se encontraron ${colsLikert.length} preguntas Likert, se esperaban 10.`);

  if (errors.length > 0) {
    return { data: [], stats: { totalRespuestas: 0, totalDocentes: 0, validos: 0, noValidos: 0, errors } };
  }

  type Grupo = { escuela: string; ciclo: string; curso: string; docente: string; respuestas: number[][] };
  const grupos = new Map<string, Grupo>();
  let filasSinDatos = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) { filasSinDatos++; continue; }

    const escuela = String(row[colEscuela] ?? '').trim() || 'FACSA';
    const cicloVal = primerValor(row, colCicloIni, colCicloFin);
    const curso    = primerValor(row, colCursoIni,  colCursoFin);
    const docente  = primerValor(row, colDocenteIni, colDocenteFin);

    if (!cicloVal || !curso || !docente) continue;
    // Excluir respuestas de "mi docente no aparece"
    if (docente.includes('no aparece') || docente.startsWith('—')) continue;

    const clave = `${escuela}||${cicloVal}||${curso}||${docente}`;
    if (!grupos.has(clave)) grupos.set(clave, { escuela, ciclo: cicloVal, curso, docente, respuestas: [] });

    const likerts = colsLikert.map(ci => parseLikert(row[ci]));
    grupos.get(clave)!.respuestas.push(likerts);
  }

  const data: EvaluacionData[] = [];
  let validos = 0, noValidos = 0;

  grupos.forEach((g) => {
    const n = g.respuestas.length;
    const esValido = n >= QUORUM_MINIMO;
    if (esValido) validos++; else noValidos++;

    // Promedio por pregunta
    const promPregunta = Array(10).fill(0) as number[];
    for (const r of g.respuestas) r.forEach((v, k) => { promPregunta[k] += v / n; });

    // AE scores (Likert → vigesimal)
    const ae01 = likertA20(AE_PREGUNTAS.ae01.reduce((s, k) => s + promPregunta[k], 0) / AE_PREGUNTAS.ae01.length);
    const ae02 = likertA20(AE_PREGUNTAS.ae02.reduce((s, k) => s + promPregunta[k], 0) / AE_PREGUNTAS.ae02.length);
    const ae03 = likertA20(AE_PREGUNTAS.ae03.reduce((s, k) => s + promPregunta[k], 0) / AE_PREGUNTAS.ae03.length);
    const ae04 = likertA20(AE_PREGUNTAS.ae04.reduce((s, k) => s + promPregunta[k], 0) / AE_PREGUNTAS.ae04.length);
    const nota = Math.round((ae01 + ae02 + ae03 + ae04) / 4 * 100) / 100;

    data.push({
      id: `gf-${Date.now()}-${data.length}`,
      ciclo,
      facultad: 'FACSA',
      carreraProfesional: g.escuela,
      docente: g.docente,
      curso: g.curso,
      seccion: g.ciclo,
      calificacion: calcularCalificacion(nota, ciclo) as EvaluacionData['calificacion'],
      ae01, ae02, ae03, ae04, nota,
      encuestados: n,
      noEncuestados: 0,
      validez: esValido ? 'Válido' : 'No válido',
    });
  });

  return {
    data,
    stats: {
      totalRespuestas: rows.length - 1 - filasSinDatos,
      totalDocentes: grupos.size,
      validos,
      noValidos,
      errors,
    },
  };
}

/** Detecta si un archivo Excel es formato Google Forms buscando "Marca temporal" en el header */
export function esFormatoGoogleForms(rows: unknown[][]): boolean {
  if (!rows || rows.length === 0) return false;
  const primerHeader = String(rows[0][0] ?? '').toLowerCase();
  return primerHeader.includes('marca temporal') || primerHeader.includes('timestamp');
}
