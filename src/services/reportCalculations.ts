import { EvaluacionData } from '../types';
import { Calificacion, ESCALA_CALIFICACION, ASPECTOS_EVALUADOS, calcularCalificacion, FACULTADES } from '../config/universityStructure';

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
  seccionesCalificadas: number;
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

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function getExclusionReason(r: EvaluacionData): 'sin_datos' | 'no_valido' | null {
  if (r.encuestados === 0 && r.noEncuestados === 0) return 'sin_datos';
  if (r.noEncuestados > r.encuestados && r.calificacion === 'INSATISFACTORIO') return 'no_valido';
  return null;
}

export function esValidoParaReporte(r: EvaluacionData): boolean {
  return getExclusionReason(r) === null;
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

  // Agrupar por facultad → carrera
  const byFacultad = new Map<string, Map<string, EvaluacionData[]>>();
  for (const r of registros) {
    if (!byFacultad.has(r.facultad)) byFacultad.set(r.facultad, new Map());
    const byCarrera = byFacultad.get(r.facultad)!;
    if (!byCarrera.has(r.carreraProfesional)) byCarrera.set(r.carreraProfesional, []);
    byCarrera.get(r.carreraProfesional)!.push(r);
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
        const cnt = regsValidos.filter(r => {
          const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
            ? r.calificacion as Calificacion
            : calcularCalificacion(r.nota);
          return c === cal;
        }).length;
        distrib[cal] = { cantidad: cnt, porcentaje: regsValidos.length ? (cnt / regsValidos.length) * 100 : 0 };
      }

      carrerasResult.set(carrera, {
        facultad, carrera, totalMatriculados: totalMatr, totalEncuestados: totalEnc,
        totalNoEncuestados: totalNoEnc,
        porcentajeEncuestados: totalMatr > 0 ? (totalEnc / totalMatr) * 100 : 0,
        promedioAE01: ae01, promedioAE02: ae02, promedioAE03: ae03, promedioAE04: ae04,
        promedioGeneral: general, seccionesCalificadas: regsValidos.length, distribucion: distrib, registros: regs,
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
      const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
        ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
      return c === 'BUENO' || c === 'DESTACADO';
    }).length;
    const pBueno = allRegsValidos.length ? allRegsValidos.filter(r => {
      const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
        ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
      return c === 'BUENO';
    }).length / allRegsValidos.length * 100 : 0;
    const pDestacado = allRegsValidos.length ? allRegsValidos.filter(r => {
      const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
        ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
      return c === 'DESTACADO';
    }).length / allRegsValidos.length * 100 : 0;

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
    const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
      ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
    return c === 'BUENO' || c === 'DESTACADO';
  }).length;

  const activeFac = allFac.filter(f => f.totalEncuestados > 0 || f.totalMatriculados > 0);
  const pBuenoInst = activeFac.length > 0 ? activeFac.reduce((s, f) => s + f.porcBueno, 0) / activeFac.length : 0;
  const pDestacadoInst = activeFac.length > 0 ? activeFac.reduce((s, f) => s + f.porcDestacado, 0) / activeFac.length : 0;

  return {
    totalMatriculados: totalMatr, totalEncuestados: totalEnc,
    totalNoEncuestados: totalMatr - totalEnc,
    porcentajeEncuestados: totalMatr > 0 ? (totalEnc / totalMatr) * 100 : 0,
    promedioAE01: avg(allFac.map(f => f.promedioAE01)),
    promedioAE02: avg(allFac.map(f => f.promedioAE02)),
    promedioAE03: avg(allFac.map(f => f.promedioAE03)),
    promedioAE04: avg(allFac.map(f => f.promedioAE04)),
    promedioGeneral: avg(allFac.map(f => f.promedioGeneral)),
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
  const [mayorKey, mayorVal] = califs[0];
  const [menorKey, menorVal] = califs[califs.length - 1];
  const interp = ESCALA_CALIFICACION[mayorKey as Calificacion]?.interpretacion ?? '';
  return `De acuerdo con la escala de calificación aplicada, el ${mayorVal.porcentaje.toFixed(2)}% de los estudiantes considera que el docente demuestra un desempeño ${mayorKey} en el aula. ` +
    `${interp}. El ${menorVal.porcentaje.toFixed(2)}% lo califica como ${menorKey}.`;
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
