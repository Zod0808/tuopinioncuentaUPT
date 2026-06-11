import { EvaluacionData } from '../types';
import { Calificacion, ESCALA_CALIFICACION, ASPECTOS_EVALUADOS, calcularCalificacion, FACULTADES, UMBRAL_PARTICIPACION_MINIMA } from '../config/universityStructure';

export interface MatriculadosEntry {
  facultad: string;
  carrera: string;
  totalMatriculados: number;
  totalEncuestados?: number;
}

export interface DatosCarrera {
  facultad: string;
  carrera: string;
  totalMatriculados: number;
  totalEncuestados: number;
  totalNoEncuestados: number;
  porcentajeEncuestados: number;
  promedioAE01: number;
  promedioAE02: number;
  promedioAE03: number;
  promedioAE04: number;
  promedioGeneral: number;
  /** Secciones incluidas en el cálculo de juicio de valor (pasan esValidoParaReporte). */
  seccionesCalificadas: number;
  /** Total de secciones registradas en la carrera (incluye excluidas). */
  seccionesTotales: number;
  /** Secciones excluidas del cálculo: sin encuestados, nota cero o baja participación. */
  seccionesExcluidas: number;
  /** Desglose de motivos de exclusión. */
  exclusionDetalle: { sinDatos: number; bajaParticipacion: number; noValido: number };
  distribucion: Record<Calificacion, { cantidad: number; porcentaje: number }>;
  registros: EvaluacionData[];
}

export interface DatosFacultad {
  facultad: string;
  totalMatriculados: number;
  totalEncuestados: number;
  porcentajeEncuestados: number;
  promedioAE01: number;
  promedioAE02: number;
  promedioAE03: number;
  promedioAE04: number;
  promedioGeneral: number;
  porcBueno: number;
  porcDestacado: number;
  indicadorPlanEstrategico: number;
  carreras: Map<string, DatosCarrera>;
}

export interface ResumenInstitucional {
  totalMatriculados: number;
  totalEncuestados: number;
  totalNoEncuestados: number;
  porcentajeEncuestados: number;
  promedioAE01: number;
  promedioAE02: number;
  promedioAE03: number;
  promedioAE04: number;
  promedioGeneral: number;
  indicadorPlanEstrategico: number;
  porcBueno: number;
  porcDestacado: number;
  facultades: Map<string, DatosFacultad>;
}

const CALIFICACIONES: Calificacion[] = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'INSATISFACTORIO'];

/** Normaliza strings para comparación robusta: sin tildes, minúsculas, espacios colapsados. */
export function normalizeStr(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Extrae el nombre central de una carrera eliminando prefijos institucionales variables
 *  ("Carrera Profesional de", "Carrera de", "Escuela Profesional de") y normalizando guiones. */
export function coreCarreraStr(s: string): string {
  return normalizeStr(s)
    .replace(/^(carrera profesional de |carrera de |escuela profesional de )/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Devuelve todas las claves normalizadas de facultad para un registro de matriculados
 *  (soporta código 'FAEDCOH' Y nombre completo 'Facultad de Educación...'). */
function facKeys(facultad: string): string[] {
  const keys = [normalizeStr(facultad)];
  const byCode = FACULTADES[facultad]?.nombre;
  if (byCode) keys.push(normalizeStr(byCode));
  else {
    const code = Object.keys(FACULTADES).find(k => normalizeStr(FACULTADES[k].nombre) === normalizeStr(facultad));
    if (code) keys.push(normalizeStr(code));
  }
  return [...new Set(keys)];
}

/** Convierte r.facultad (código o nombre completo) al código estándar (FADE, FAEDCOH...).
 *  Garantiza que facultadesMap use siempre el mismo código que ORDEN_FACULTADES. */
function resolveFacultadCode(facultad: string): string {
  if (FACULTADES[facultad]) return facultad;
  const code = Object.keys(FACULTADES).find(k =>
    normalizeStr(FACULTADES[k].nombre) === normalizeStr(facultad)
  );
  return code ?? facultad;
}

/** Devuelve la ortografía canónica de la carrera según FACULTADES (comparación sin tildes ni mayúsculas).
 *  Corrige errores tipográficos presentes en el Excel (ej. "Fisica" → "Física"). */
function resolveCarreraName(facultadCode: string, carrera: string): string {
  const canonicas = FACULTADES[facultadCode]?.carreras ?? [];
  const norm = normalizeStr(carrera);
  return canonicas.find(c => normalizeStr(c) === norm) ?? carrera;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function getExclusionReason(r: EvaluacionData): 'sin_datos' | 'baja_participacion' | 'no_valido' | null {
  if (r.validez !== 'Válido') return 'no_valido';
  if (r.encuestados === 0 || r.nota === 0) return 'sin_datos';
  const total = r.encuestados + r.noEncuestados;
  if (total > 0 && r.encuestados / total < UMBRAL_PARTICIPACION_MINIMA) return 'baja_participacion';
  return null;
}

export function esValidoParaReporte(r: EvaluacionData): boolean {
  return getExclusionReason(r) === null;
}

/** Display label and CSS class for a record's calificacion — overrides stored value for edge cases. */
export function resolverCalDisplay(r: EvaluacionData): { label: string; cssClass: string } {
  if (r.encuestados === 0) return { label: 'Sin Datos', cssClass: 'sin-datos' };
  if (r.nota === 0) return { label: 'Sin Evaluar', cssClass: 'sin-evaluar' };
  const total = r.encuestados + r.noEncuestados;
  if (total > 0 && r.encuestados / total < UMBRAL_PARTICIPACION_MINIMA)
    return { label: 'Baja Part.', cssClass: 'baja-participacion' };
  const c = calcularCalificacion(r.nota);
  return { label: c, cssClass: c.toLowerCase() };
}

export function calcularResumen(
  registros: EvaluacionData[],
  matriculados: MatriculadosEntry[]
): ResumenInstitucional {
  const matriculadosMap = new Map<string, MatriculadosEntry>();

  // Totales directos por facultad desde matriculados (no depende del match por carrera)
  const facSums = new Map<string, { mat: number; enc: number }>();

  for (const m of matriculados) {
    const carKey = normalizeStr(m.carrera);
    const coreKey = coreCarreraStr(m.carrera);
    for (const fk of facKeys(m.facultad)) {
      matriculadosMap.set(`${fk}||${carKey}`, m);
      if (coreKey !== carKey) matriculadosMap.set(`${fk}||${coreKey}`, m);
      // Acumular totales a nivel de facultad
      const prev = facSums.get(fk) ?? { mat: 0, enc: 0 };
      facSums.set(fk, { mat: prev.mat + m.totalMatriculados, enc: prev.enc + (m.totalEncuestados ?? 0) });
    }
  }

  // Agrupar por facultad → carrera (normaliza códigos y corrige ortografía de carreras)
  const byFacultad = new Map<string, Map<string, EvaluacionData[]>>();
  for (const r of registros) {
    const facCode    = resolveFacultadCode(r.facultad);
    const carreraKey = resolveCarreraName(facCode, r.carreraProfesional);
    if (!byFacultad.has(facCode)) byFacultad.set(facCode, new Map());
    const byCarrera = byFacultad.get(facCode)!;
    if (!byCarrera.has(carreraKey)) byCarrera.set(carreraKey, []);
    byCarrera.get(carreraKey)!.push(r);
  }

  const facultadesMap = new Map<string, DatosFacultad>();

  for (const [facultad, carreraMap] of byFacultad) {
    const carrerasResult = new Map<string, DatosCarrera>();
    let facTotalMatr = 0, facTotalEnc = 0;
    const facAE01: number[] = [], facAE02: number[] = [], facAE03: number[] = [], facAE04: number[] = [];

    for (const [carrera, regs] of carreraMap) {
      const normFac = normalizeStr(facultad);
      const matEntry = matriculadosMap.get(`${normFac}||${normalizeStr(carrera)}`)
        ?? matriculadosMap.get(`${normFac}||${coreCarreraStr(carrera)}`);
      const totalMatr = matEntry?.totalMatriculados ?? 0;
      const encOficial = matEntry?.totalEncuestados ?? 0;
      const useOficial = encOficial > 0;
      const totalEnc = useOficial ? encOficial : regs.reduce((s, r) => s + r.encuestados, 0);
      const totalNoEnc = useOficial
        ? Math.max(0, totalMatr - totalEnc)
        : regs.reduce((s, r) => s + r.noEncuestados, 0);
      const regsValidos = regs.filter(esValidoParaReporte);
      const ae01 = avg(regsValidos.map(r => r.ae01));
      const ae02 = avg(regsValidos.map(r => r.ae02));
      const ae03 = avg(regsValidos.map(r => r.ae03));
      const ae04 = avg(regsValidos.map(r => r.ae04));
      const general = avg([ae01, ae02, ae03, ae04]);

      const distrib = {} as Record<Calificacion, { cantidad: number; porcentaje: number }>;
      for (const cal of CALIFICACIONES) {
        const cnt = regsValidos.filter(r => calcularCalificacion(r.nota) === cal).length;
        distrib[cal] = { cantidad: cnt, porcentaje: regsValidos.length ? (cnt / regsValidos.length) * 100 : 0 };
      }

      const sinDatos = regs.filter(r => getExclusionReason(r) === 'sin_datos').length;
      const bajaPartic = regs.filter(r => getExclusionReason(r) === 'baja_participacion').length;
      const noValido = regs.filter(r => getExclusionReason(r) === 'no_valido').length;

      carrerasResult.set(carrera, {
        facultad, carrera, totalMatriculados: totalMatr, totalEncuestados: totalEnc,
        totalNoEncuestados: totalNoEnc,
        porcentajeEncuestados: totalMatr > 0 ? (totalEnc / totalMatr) * 100 : 0,
        promedioAE01: ae01, promedioAE02: ae02, promedioAE03: ae03, promedioAE04: ae04,
        promedioGeneral: general,
        seccionesCalificadas: regsValidos.length,
        seccionesTotales: regs.length,
        seccionesExcluidas: regs.length - regsValidos.length,
        exclusionDetalle: { sinDatos, bajaParticipacion: bajaPartic, noValido },
        distribucion: distrib, registros: regs,
      });

      facTotalMatr += totalMatr;
      facTotalEnc += totalEnc;
      facAE01.push(ae01); facAE02.push(ae02); facAE03.push(ae03); facAE04.push(ae04);
    }

    const facAE01p = avg(facAE01), facAE02p = avg(facAE02), facAE03p = avg(facAE03), facAE04p = avg(facAE04);
    const facGeneral = avg([facAE01p, facAE02p, facAE03p, facAE04p]);

    // Indicador plan estratégico = % BUENO + DESTACADO entre secciones válidas de la facultad
    const allRegsValidos = [...carreraMap.values()].flat().filter(esValidoParaReporte);
    const buenoDestacado = allRegsValidos.filter(r => {
      const c = calcularCalificacion(r.nota);
      return c === 'BUENO' || c === 'DESTACADO';
    }).length;
    const pBueno = allRegsValidos.length
      ? allRegsValidos.filter(r => calcularCalificacion(r.nota) === 'BUENO').length / allRegsValidos.length * 100
      : 0;
    const pDestacado = allRegsValidos.length
      ? allRegsValidos.filter(r => calcularCalificacion(r.nota) === 'DESTACADO').length / allRegsValidos.length * 100
      : 0;

    // Usar totales directos de matriculados a nivel de facultad si están disponibles,
    // sin importar si el match por carrera funcionó o no.
    const directFac = facSums.get(normalizeStr(facultad));
    const facFinalMatr = (directFac?.mat ?? 0) > 0 ? directFac!.mat : facTotalMatr;
    const facFinalEnc  = (directFac?.enc ?? 0) > 0 ? directFac!.enc  : facTotalEnc;

    facultadesMap.set(facultad, {
      facultad, totalMatriculados: facFinalMatr, totalEncuestados: facFinalEnc,
      porcentajeEncuestados: facFinalMatr > 0 ? (facFinalEnc / facFinalMatr) * 100 : 0,
      promedioAE01: facAE01p, promedioAE02: facAE02p, promedioAE03: facAE03p, promedioAE04: facAE04p,
      promedioGeneral: facGeneral,
      porcBueno: pBueno, porcDestacado: pDestacado,
      indicadorPlanEstrategico: allRegsValidos.length ? (buenoDestacado / allRegsValidos.length) * 100 : 0,
      carreras: carrerasResult,
    });
  }

  // Totales institucionales
  const allFac = [...facultadesMap.values()];
  const totalMatr = allFac.reduce((s, f) => s + f.totalMatriculados, 0);
  const totalEnc = allFac.reduce((s, f) => s + f.totalEncuestados, 0);
  const allRegsGlobal = registros.filter(esValidoParaReporte);
  const buenoDestGlobal = allRegsGlobal.filter(r => {
    const c = calcularCalificacion(r.nota);
    return c === 'BUENO' || c === 'DESTACADO';
  }).length;

  // Promedios ponderados institucionales: se calculan directo sobre cada sección válida,
  // no como promedio de promedios de facultad (que daría igual peso a facultades pequeñas y grandes).
  const pBuenoInst = allRegsGlobal.length > 0
    ? allRegsGlobal.filter(r => calcularCalificacion(r.nota) === 'BUENO').length / allRegsGlobal.length * 100
    : 0;
  const pDestacadoInst = allRegsGlobal.length > 0
    ? allRegsGlobal.filter(r => calcularCalificacion(r.nota) === 'DESTACADO').length / allRegsGlobal.length * 100
    : 0;

  return {
    totalMatriculados: totalMatr, totalEncuestados: totalEnc,
    totalNoEncuestados: totalMatr - totalEnc,
    porcentajeEncuestados: totalMatr > 0 ? (totalEnc / totalMatr) * 100 : 0,
    promedioAE01: avg(allRegsGlobal.map(r => r.ae01)),
    promedioAE02: avg(allRegsGlobal.map(r => r.ae02)),
    promedioAE03: avg(allRegsGlobal.map(r => r.ae03)),
    promedioAE04: avg(allRegsGlobal.map(r => r.ae04)),
    promedioGeneral: avg(allRegsGlobal.map(r => (r.ae01 + r.ae02 + r.ae03 + r.ae04) / 4)),
    indicadorPlanEstrategico: allRegsGlobal.length ? (buenoDestGlobal / allRegsGlobal.length) * 100 : 0,
    porcBueno: pBuenoInst,
    porcDestacado: pDestacadoInst,
    facultades: facultadesMap,
  };
}

// ── Interpretaciones con plantilla ───────────────────────────────────────────

export function interpretarTablaAE(d: DatosCarrera): string {
  const aes = [
    { codigo: 'AE-01', valor: d.promedioAE01 },
    { codigo: 'AE-02', valor: d.promedioAE02 },
    { codigo: 'AE-03', valor: d.promedioAE03 },
    { codigo: 'AE-04', valor: d.promedioAE04 },
  ];
  const mejor = aes.reduce((a, b) => (a.valor >= b.valor ? a : b));
  const peor  = aes.reduce((a, b) => (a.valor <= b.valor ? a : b));
  return `De los cuatro criterios evaluados por los estudiantes en la encuesta académica, se obtuvo una calificación promedio de ${d.promedioGeneral.toFixed(2)}. ` +
    `El criterio ${mejor.codigo}: ${ASPECTOS_EVALUADOS[mejor.codigo]}, alcanzó la puntuación más alta con ${mejor.valor.toFixed(2)}, ` +
    `mientras que el criterio ${peor.codigo}: ${ASPECTOS_EVALUADOS[peor.codigo]} registró la calificación más baja con ${peor.valor.toFixed(2)}.`;
}

export function interpretarDistribucion(d: DatosCarrera): string {
  const califs = Object.entries(d.distribucion)
    .filter(([, v]) => v.cantidad > 0)
    .sort(([, a], [, b]) => b.porcentaje - a.porcentaje);
  if (califs.length === 0) return 'No hay datos suficientes para generar una interpretación.';

  const nombresLower: Record<string, string> = {
    DESTACADO: 'destacado', BUENO: 'bueno', ACEPTABLE: 'aceptable', INSATISFACTORIO: 'insatisfactorio',
  };
  const [mayorKey, mayorVal] = califs[0];
  const mayorNombre = nombresLower[mayorKey] ?? mayorKey.toLowerCase();

  if (califs.length === 1) {
    const interp = ESCALA_CALIFICACION[mayorKey as Calificacion]?.interpretacion ?? '';
    return `De acuerdo con la escala de calificación aplicada, el ${mayorVal.porcentaje.toFixed(2)}% de los estudiantes considera que el docente demuestra un desempeño ${mayorNombre} en el aula. ${interp}.`;
  }

  const [menorKey, menorVal] = califs[califs.length - 1];
  const menorNombre = nombresLower[menorKey] ?? menorKey.toLowerCase();
  const menorInterp = ESCALA_CALIFICACION[menorKey as Calificacion]?.interpretacion ?? '';
  const menorInterpLower = menorInterp.length > 0
    ? menorInterp.charAt(0).toLowerCase() + menorInterp.slice(1)
    : '';

  return `De acuerdo con la escala de calificación aplicada, el ${mayorVal.porcentaje.toFixed(2)}% de los estudiantes considera que el docente demuestra un desempeño ${mayorNombre} en el aula, mientras que el ${menorVal.porcentaje.toFixed(2)}% lo califica como ${menorNombre}, que indica que ${menorInterpLower}.`;
}

export function interpretarParticipacion(totalEnc: number, totalMatr: number, nombre: string): string {
  const porc = totalMatr > 0 ? (totalEnc / totalMatr * 100).toFixed(2) : '0.00';
  return `Del total de ${totalMatr.toLocaleString('es-PE')} estudiantes matriculados en ${nombre}, ` +
    `${totalEnc.toLocaleString('es-PE')} han aplicado la encuesta de evaluación docente, ` +
    `lo que representa un ${porc}% de participación estudiantil.`;
}

export function interpretarInstitucionAE(resumen: ResumenInstitucional): string {
  const aes = [
    { codigo: 'AE-01', nombre: ASPECTOS_EVALUADOS['AE-01'], valor: resumen.promedioAE01 },
    { codigo: 'AE-02', nombre: ASPECTOS_EVALUADOS['AE-02'], valor: resumen.promedioAE02 },
    { codigo: 'AE-03', nombre: ASPECTOS_EVALUADOS['AE-03'], valor: resumen.promedioAE03 },
    { codigo: 'AE-04', nombre: ASPECTOS_EVALUADOS['AE-04'], valor: resumen.promedioAE04 },
  ];
  const mejor = aes.reduce((a, b) => a.valor >= b.valor ? a : b);
  const peor  = aes.reduce((a, b) => a.valor <= b.valor ? a : b);
  return `El aspecto mejor calificado en todas las facultades es ${mejor.codigo}: "${mejor.nombre}" con una nota de ${mejor.valor.toFixed(2)}. ` +
    `En cambio, el aspecto con menor calificación es ${peor.codigo}: "${peor.nombre}" con una nota de ${peor.valor.toFixed(2)}.`;
}

export function generarConclusion1(resumen: ResumenInstitucional, ciclo: string): string {
  const porc = resumen.porcentajeEncuestados.toFixed(2);
  if (resumen.porcentajeEncuestados >= 80) {
    return `Del total de ${resumen.totalMatriculados.toLocaleString('es-PE')} estudiantes matriculados en el semestre académico ${ciclo}, ` +
      `el ${porc}% participó en la aplicación de la encuesta académica, lo que refleja un nivel de participación ` +
      `alto y representativo de la comunidad estudiantil, evidenciando un compromiso significativo con la mejora continua de la calidad educativa.`;
  }
  return `Del total de ${resumen.totalMatriculados.toLocaleString('es-PE')} estudiantes matriculados en el semestre académico ${ciclo}, ` +
    `el ${porc}% participó en la aplicación de la encuesta académica. Se recomienda implementar estrategias ` +
    `para incrementar la participación estudiantil en futuros ciclos, buscando alcanzar el umbral del 80%.`;
}

export function generarRecomendacion1(resumen: ResumenInstitucional): string {
  const aes = [
    { codigo: 'AE-01', nombre: ASPECTOS_EVALUADOS['AE-01'], valor: resumen.promedioAE01 },
    { codigo: 'AE-02', nombre: ASPECTOS_EVALUADOS['AE-02'], valor: resumen.promedioAE02 },
    { codigo: 'AE-03', nombre: ASPECTOS_EVALUADOS['AE-03'], valor: resumen.promedioAE03 },
    { codigo: 'AE-04', nombre: ASPECTOS_EVALUADOS['AE-04'], valor: resumen.promedioAE04 },
  ];
  const peor = aes.reduce((a, b) => a.valor <= b.valor ? a : b);
  return `Dado que el indicador con menor porcentaje fue "${peor.nombre}" (${peor.codigo} = ${peor.valor.toFixed(2)}), ` +
    `se recomienda, en el marco del proceso de mejora continua de la calidad académica, implementar estrategias ` +
    `orientadas al fortalecimiento de las competencias correspondientes a este criterio mediante el ` +
    `Plan Anual de Capacitación Docente.`;
}
