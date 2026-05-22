import { EvaluacionData } from '../types';
import { Calificacion, ESCALA_CALIFICACION, ASPECTOS_EVALUADOS, calcularCalificacion } from '../config/universityStructure';

export interface MatriculadosEntry {
  facultad: string;
  carrera: string;
  totalMatriculados: number;
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
  porcentajeEncuestados: number;
  promedioAE01: number;
  promedioAE02: number;
  promedioAE03: number;
  promedioAE04: number;
  promedioGeneral: number;
  indicadorPlanEstrategico: number;
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
  const matriculadosMap = new Map<string, number>();
  for (const m of matriculados) {
    matriculadosMap.set(`${m.facultad}||${m.carrera}`, m.totalMatriculados);
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
      const totalMatr = matriculadosMap.get(`${facultad}||${carrera}`) ?? 0;
      const totalEnc = regs.reduce((s, r) => s + r.encuestados, 0);
      const totalNoEnc = regs.reduce((s, r) => s + r.noEncuestados, 0);
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

  return {
    totalMatriculados: totalMatr, totalEncuestados: totalEnc,
    porcentajeEncuestados: totalMatr > 0 ? (totalEnc / totalMatr) * 100 : 0,
    promedioAE01: avg(allFac.map(f => f.promedioAE01)),
    promedioAE02: avg(allFac.map(f => f.promedioAE02)),
    promedioAE03: avg(allFac.map(f => f.promedioAE03)),
    promedioAE04: avg(allFac.map(f => f.promedioAE04)),
    promedioGeneral: avg(allFac.map(f => f.promedioGeneral)),
    indicadorPlanEstrategico: allRegsGlobal.length ? (buenoDestGlobal / allRegsGlobal.length) * 100 : 0,
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
  return `Del total de ${totalMatr.toLocaleString()} estudiantes matriculados en ${nombre}, ` +
    `${totalEnc.toLocaleString()} han aplicado la encuesta de evaluación docente, ` +
    `lo que representa un ${porc}% de participación estudiantil.`;
}
