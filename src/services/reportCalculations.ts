import { EvaluacionData } from '../types';
import { Calificacion, ESCALA_CALIFICACION, ASPECTOS_EVALUADOS, calcularCalificacion } from '../config/universityStructure';

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

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

export function calcularResumen(
  registros: EvaluacionData[],
  matriculados: MatriculadosEntry[]
): ResumenInstitucional {
  const matriculadosMap = new Map<string, MatriculadosEntry>();
  for (const m of matriculados) {
    matriculadosMap.set(`${m.facultad}||${m.carrera}`, m);
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
      const matEntry = matriculadosMap.get(`${facultad}||${carrera}`);
      const totalMatr = matEntry?.totalMatriculados ?? 0;
      const encOficial = matEntry?.totalEncuestados ?? 0;
      const useOficial = encOficial > 0;
      const totalEnc = useOficial ? encOficial : regs.reduce((s, r) => s + r.encuestados, 0);
      const totalNoEnc = useOficial
        ? Math.max(0, totalMatr - totalEnc)
        : regs.reduce((s, r) => s + r.noEncuestados, 0);
      const ae01 = avg(regs.map(r => r.ae01));
      const ae02 = avg(regs.map(r => r.ae02));
      const ae03 = avg(regs.map(r => r.ae03));
      const ae04 = avg(regs.map(r => r.ae04));
      const general = avg([ae01, ae02, ae03, ae04]);

      const distrib = {} as Record<Calificacion, { cantidad: number; porcentaje: number }>;
      for (const cal of CALIFICACIONES) {
        // Usar calificacion del registro; si no coincide, recalcular por nota
        const cnt = regs.filter(r => {
          const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
            ? r.calificacion as Calificacion
            : calcularCalificacion(r.nota);
          return c === cal;
        }).length;
        distrib[cal] = { cantidad: cnt, porcentaje: regs.length ? (cnt / regs.length) * 100 : 0 };
      }

      carrerasResult.set(carrera, {
        facultad, carrera, totalMatriculados: totalMatr, totalEncuestados: totalEnc,
        totalNoEncuestados: totalNoEnc,
        porcentajeEncuestados: totalMatr > 0 ? (totalEnc / totalMatr) * 100 : 0,
        promedioAE01: ae01, promedioAE02: ae02, promedioAE03: ae03, promedioAE04: ae04,
        promedioGeneral: general, seccionesCalificadas: regs.length, distribucion: distrib, registros: regs,
      });

      facTotalMatr += totalMatr;
      facTotalEnc += totalEnc;
      facAE01.push(ae01); facAE02.push(ae02); facAE03.push(ae03); facAE04.push(ae04);
    }

    const facAE01p = avg(facAE01), facAE02p = avg(facAE02), facAE03p = avg(facAE03), facAE04p = avg(facAE04);
    const facGeneral = avg([facAE01p, facAE02p, facAE03p, facAE04p]);

    // Indicador plan estratégico = % BUENO + DESTACADO entre todas las secciones de la facultad
    const allRegs = [...carreraMap.values()].flat();
    const buenoDestacado = allRegs.filter(r => {
      const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
        ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
      return c === 'BUENO' || c === 'DESTACADO';
    }).length;
    const pBueno = allRegs.length ? allRegs.filter(r => {
      const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
        ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
      return c === 'BUENO';
    }).length / allRegs.length * 100 : 0;
    const pDestacado = allRegs.length ? allRegs.filter(r => {
      const c = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(r.calificacion as Calificacion)
        ? r.calificacion as Calificacion : calcularCalificacion(r.nota);
      return c === 'DESTACADO';
    }).length / allRegs.length * 100 : 0;

    facultadesMap.set(facultad, {
      facultad, totalMatriculados: facTotalMatr, totalEncuestados: facTotalEnc,
      porcentajeEncuestados: facTotalMatr > 0 ? (facTotalEnc / facTotalMatr) * 100 : 0,
      promedioAE01: facAE01p, promedioAE02: facAE02p, promedioAE03: facAE03p, promedioAE04: facAE04p,
      promedioGeneral: facGeneral,
      porcBueno: pBueno, porcDestacado: pDestacado,
      indicadorPlanEstrategico: allRegs.length ? (buenoDestacado / allRegs.length) * 100 : 0,
      carreras: carrerasResult,
    });
  }

  // Totales institucionales
  const allFac = [...facultadesMap.values()];
  const totalMatr = allFac.reduce((s, f) => s + f.totalMatriculados, 0);
  const totalEnc = allFac.reduce((s, f) => s + f.totalEncuestados, 0);
  const allRegsGlobal = registros;
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
