import { EvaluacionData } from '../types';
import { ResumenInstitucional, DatosCarrera, DatosFacultad } from '../services/reportCalculations';
import { FACULTADES, ORDEN_FACULTADES, ASPECTOS_EVALUADOS } from '../config/universityStructure';
import {
  RecomendacionDocente, RecomendacionCarrera, RecomendacionFacultad,
  RecomendacionInstitucional, IndiceMejora, AreaMejora, ResultadosIA,
} from './types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function criterioMasDebil(ae01: number, ae02: number, ae03: number, ae04: number): string {
  const aes = [
    { c: 'AE-01', v: ae01 }, { c: 'AE-02', v: ae02 },
    { c: 'AE-03', v: ae03 }, { c: 'AE-04', v: ae04 },
  ];
  return aes.reduce((a, b) => (a.v <= b.v ? a : b)).c;
}

function severidadNota(n: number): 'critica' | 'moderada' | 'leve' {
  if (n <= 11) return 'critica';
  if (n <= 14) return 'moderada';
  return 'leve';
}

// ── Recomendaciones base por criterio (reglas) ────────────────────────────────

const ACCIONES_AE: Record<string, { critica: string[]; moderada: string[]; leve: string[] }> = {
  'AE-01': {
    critica: [
      'Reestructurar completamente el sílabo siguiendo la plantilla institucional vigente, asegurando la inclusión de competencias, indicadores de logro y referencias actualizadas.',
      'Participar en el taller institucional de diseño curricular y elaboración de sílabos para el próximo ciclo.',
      'Someter el sílabo a revisión del coordinador de escuela antes del inicio del semestre.',
      'Incorporar al menos el 50% de bibliografía publicada en los últimos 5 años.',
    ],
    moderada: [
      'Revisar y actualizar el contenido silábico, verificando la coherencia entre competencias, unidades temáticas e indicadores de evaluación.',
      'Actualizar las referencias bibliográficas con fuentes de los últimos 3 años.',
      'Asegurar que el sílabo refleje con precisión las actividades de aprendizaje planificadas.',
      'Coordinar con el área académica para alinear el sílabo con el perfil de egreso.',
    ],
    leve: [
      'Revisar la redacción de los resultados de aprendizaje para mayor precisión.',
      'Incluir recursos digitales complementarios en el sílabo.',
    ],
  },
  'AE-02': {
    critica: [
      'Implementar estrategias activas de aprendizaje (aprendizaje basado en problemas, aula invertida, aprendizaje cooperativo) en al menos el 60% de las sesiones.',
      'Participar en un programa de formación pedagógica certificado durante el período intersemestral.',
      'Diseñar materiales didácticos diversificados (casos prácticos, simulaciones, guías de laboratorio) adaptados a la carrera.',
      'Establecer mecanismos de retroalimentación continua con los estudiantes durante el desarrollo de la asignatura.',
      'Incorporar el uso de plataformas digitales educativas para complementar las clases presenciales.',
    ],
    moderada: [
      'Diversificar las estrategias metodológicas incorporando dinámicas colaborativas y trabajo en equipo.',
      'Incorporar recursos tecnológicos y multimedia en el desarrollo de las sesiones de aprendizaje.',
      'Realizar actividades de resolución de casos reales vinculados a la carrera profesional.',
      'Mejorar la claridad expositiva mediante ensayos de presentación y autoevaluación.',
    ],
    leve: [
      'Enriquecer las sesiones con ejemplos prácticos vinculados al contexto laboral actual.',
      'Incorporar actividades de reflexión y metacognición al cierre de cada unidad.',
    ],
  },
  'AE-03': {
    critica: [
      'Rediseñar completamente el sistema de evaluación de la asignatura alineando instrumentos con las competencias declaradas en el sílabo.',
      'Aplicar evaluación formativa continua (rúbricas, listas de cotejo) en lugar de concentrar la evaluación en exámenes finales únicos.',
      'Comunicar con claridad los criterios de evaluación al inicio de cada unidad y antes de cada actividad evaluativa.',
      'Capacitarse en la elaboración de rúbricas holísticas y analíticas para evaluación de competencias.',
      'Devolver evaluaciones corregidas en un plazo máximo de 7 días con retroalimentación escrita.',
    ],
    moderada: [
      'Mejorar la transparencia del proceso evaluativo, comunicando criterios y ponderaciones con anticipación.',
      'Incorporar autoevaluación y coevaluación como instrumentos complementarios.',
      'Diversificar los instrumentos de evaluación (portafolio, rúbricas, evaluación por pares, proyectos).',
      'Asegurar que los criterios de evaluación sean coherentes con los resultados de aprendizaje del sílabo.',
    ],
    leve: [
      'Clarificar el sistema de calificación en la primera sesión de clases.',
      'Proporcionar retroalimentación oportuna y específica sobre el desempeño de los estudiantes.',
    ],
  },
  'AE-04': {
    critica: [
      'Participar en un programa de desarrollo de habilidades socioemocionales y comunicación asertiva en el contexto universitario.',
      'Establecer canales de comunicación claros y accesibles para los estudiantes (horario de atención, correo electrónico, plataforma virtual).',
      'Desarrollar un clima de aula basado en el respeto mutuo: evitar comentarios descalificadores y promover la participación sin temor al error.',
      'Implementar acuerdos de convivencia al inicio del semestre con participación activa de los estudiantes.',
      'Solicitar retroalimentación semestral de los estudiantes sobre el clima de aula y actuar sobre los resultados.',
    ],
    moderada: [
      'Mejorar la accesibilidad y disposición para atender dudas y consultas de los estudiantes, tanto en clase como fuera de ella.',
      'Fortalecer el uso de lenguaje inclusivo y motivador durante el desarrollo de las sesiones.',
      'Crear un ambiente de confianza que incentive la participación activa y la expresión de ideas sin temor.',
      'Reconocer públicamente los logros y avances de los estudiantes para fortalecer su motivación.',
    ],
    leve: [
      'Mantener una actitud empática y receptiva ante las dificultades de aprendizaje de los estudiantes.',
      'Implementar dinámicas de apertura al inicio de clases para fortalecer el vínculo con el grupo.',
    ],
  },
};

function accionesParaCriterio(ae: string, nota: number): string[] {
  const sev = severidadNota(nota);
  return (ACCIONES_AE[ae]?.[sev] ?? ACCIONES_AE[ae]?.['leve'] ?? []);
}

function metaNota(nota: number): number {
  if (nota <= 11) return Math.min(nota + 4, 15);
  if (nota <= 14) return Math.min(nota + 3, 17);
  return Math.min(nota + 1, 18);
}

// ── Generadores de recomendaciones por nivel ──────────────────────────────────

function generarRecomendacionDocente(r: EvaluacionData): RecomendacionDocente {
  const aes = [
    { codigo: 'AE-01', desc: ASPECTOS_EVALUADOS['AE-01'], val: r.ae01 },
    { codigo: 'AE-02', desc: ASPECTOS_EVALUADOS['AE-02'], val: r.ae02 },
    { codigo: 'AE-03', desc: ASPECTOS_EVALUADOS['AE-03'], val: r.ae03 },
    { codigo: 'AE-04', desc: ASPECTOS_EVALUADOS['AE-04'], val: r.ae04 },
  ].filter(a => a.val <= 14);

  const areasMejora: AreaMejora[] = aes.map(a => ({
    codigo: a.codigo,
    descripcion: a.desc,
    puntuacion: a.val,
    severidad: severidadNota(a.val),
  }));

  const peor = aes.length > 0 ? aes.reduce((a, b) => (a.val <= b.val ? a : b)) : null;
  const accionesPrimarias = peor ? accionesParaCriterio(peor.codigo, peor.val) : ['Mantener el nivel de desempeño actual y buscar la excelencia en todas las dimensiones evaluadas.'];

  const accionesCruce = aes.length > 1
    ? [`Integrar la mejora de ${aes.map(a => a.codigo).join(', ')} en un plan de desarrollo profesional semestral con revisión mensual.`]
    : [];

  const calificacion = r.nota <= 11 ? 'INSATISFACTORIO' : 'ACEPTABLE';
  const diagnostico = calificacion === 'INSATISFACTORIO'
    ? `El docente ${r.docente} requiere intervención urgente. Con una nota de ${r.nota.toFixed(2)}/20 en la asignatura "${r.curso}" (sección ${r.seccion}), los estudiantes reportaron deficiencias significativas que comprometen la calidad del aprendizaje.`
    : `El docente ${r.docente} presenta un desempeño aceptable (${r.nota.toFixed(2)}/20) en la asignatura "${r.curso}" (sección ${r.seccion}), con oportunidades claras de mejora que deben atenderse en el siguiente ciclo académico.`;

  return {
    docente: r.docente,
    curso: r.curso,
    seccion: r.seccion,
    carrera: r.carreraProfesional,
    facultad: r.facultad,
    nota: r.nota,
    ae01: r.ae01, ae02: r.ae02, ae03: r.ae03, ae04: r.ae04,
    calificacion,
    diagnostico,
    areasMejora,
    accionesSugeridas: [...accionesPrimarias, ...accionesCruce],
    metaProximoCiclo: metaNota(r.nota),
    plazoEjecucion: calificacion === 'INSATISFACTORIO' ? 'Inmediato (primer mes del ciclo)' : 'Durante el ciclo actual',
  };
}

function generarRecomendacionCarrera(c: DatosCarrera): RecomendacionCarrera {
  const porcProblemas = c.distribucion.INSATISFACTORIO.porcentaje + c.distribucion.ACEPTABLE.porcentaje;
  const peorAE = criterioMasDebil(c.promedioAE01, c.promedioAE02, c.promedioAE03, c.promedioAE04);
  const indicadorActual = c.distribucion.BUENO.porcentaje + c.distribucion.DESTACADO.porcentaje;

  const estrategias: string[] = [
    `Implementar un Programa de Acompañamiento Docente (PAD) focalizado en ${ASPECTOS_EVALUADOS[peorAE]}, con sesiones mensuales de retroalimentación y buenas prácticas.`,
    `Organizar círculos de aprendizaje entre docentes de la carrera para compartir metodologías exitosas y co-diseñar estrategias de mejora.`,
    `Establecer un sistema de seguimiento semestral con el coordinador de carrera para monitorear el avance de los docentes con calificación ACEPTABLE o INSATISFACTORIO.`,
    `Diseñar e implementar un banco de recursos pedagógicos digitales compartidos entre los docentes de la carrera.`,
    `Incorporar observaciones de aula (con consentimiento) para identificar buenas prácticas e implementar mejoras en contexto real.`,
  ];

  const acciones = [
    { accion: `Diagnóstico individual de docentes con calificación crítica en ${peorAE}`, responsable: 'Coordinador de Carrera', plazo: 'Primeras 2 semanas del ciclo' },
    { accion: 'Diseñar plan de mejora individualizado para cada docente identificado', responsable: 'Coordinador + Docente', plazo: 'Semana 3 del ciclo' },
    { accion: 'Ejecutar talleres de formación pedagógica en áreas críticas', responsable: 'GPAD / Coord. de Carrera', plazo: 'Meses 1-3 del ciclo' },
    { accion: 'Evaluación de avance a mitad del ciclo', responsable: 'Coordinador de Carrera', plazo: 'Semana 8 del ciclo' },
    { accion: 'Evaluación final y ajuste del plan para el siguiente ciclo', responsable: 'Director de Escuela', plazo: 'Última semana del ciclo' },
  ];

  const diagnostico = porcProblemas > 20
    ? `La carrera de ${c.carrera} presenta el ${porcProblemas.toFixed(1)}% de secciones con calificación INSATISFACTORIO o ACEPTABLE. El criterio más crítico es ${peorAE} (${ASPECTOS_EVALUADOS[peorAE]}) con promedio de ${[c.promedioAE01, c.promedioAE02, c.promedioAE03, c.promedioAE04][[0,1,2,3].find(i => ['AE-01','AE-02','AE-03','AE-04'][i] === peorAE) ?? 0].toFixed(2)}/20. Se requiere intervención estructurada.`
    : `La carrera de ${c.carrera} muestra un desempeño general con ${porcProblemas.toFixed(1)}% de secciones que requieren atención. El criterio ${peorAE} es el de menor rendimiento y debe priorizarse en el plan de mejora.`;

  return {
    carrera: c.carrera,
    facultad: c.facultad,
    promedioGeneral: c.promedioGeneral,
    ae01: c.promedioAE01, ae02: c.promedioAE02, ae03: c.promedioAE03, ae04: c.promedioAE04,
    porcInsatisfactorio: c.distribucion.INSATISFACTORIO.porcentaje,
    porcAceptable: c.distribucion.ACEPTABLE.porcentaje,
    seccionesTotal: c.seccionesCalificadas,
    seccionesCriticas: c.distribucion.INSATISFACTORIO.cantidad + c.distribucion.ACEPTABLE.cantidad,
    criterioMasDebil: peorAE,
    diagnostico,
    estrategias,
    indicadorActual,
    indicadorMeta: Math.min(indicadorActual + 5, 98),
    acciones,
  };
}

function generarRecomendacionFacultad(cod: string, f: DatosFacultad): RecomendacionFacultad {
  const peorAE = criterioMasDebil(f.promedioAE01, f.promedioAE02, f.promedioAE03, f.promedioAE04);
  const nombreFac = FACULTADES[cod]?.nombre ?? cod;

  const carrerasCriticas = [...f.carreras.values()]
    .filter(c => (c.distribucion.INSATISFACTORIO.porcentaje + c.distribucion.ACEPTABLE.porcentaje) > 15)
    .map(c => c.carrera);

  const planesAccion = [
    `Implementar un "Plan de Mejora Continua Docente" a nivel de facultad, con seguimiento mensual por parte de la Dirección de ${nombreFac}.`,
    `Crear un Comité de Calidad Académica de la facultad que revise trimestralmente los indicadores de evaluación docente.`,
    `Organizar un ciclo de conferencias y talleres pedagógicos por semestre, con asistencia obligatoria para docentes con calificación ACEPTABLE o INSATISFACTORIO.`,
    `Establecer alianzas con universidades referentes para el intercambio de buenas prácticas docentes y metodologías innovadoras.`,
    carrerasCriticas.length > 0
      ? `Priorizar el acompañamiento en las carreras con mayor proporción de secciones críticas: ${carrerasCriticas.join(', ')}.`
      : `Mantener los programas de fortalecimiento docente para sostener el alto nivel de desempeño alcanzado.`,
    `Documentar y difundir las prácticas docentes exitosas (calificación DESTACADO) como modelos de referencia para la facultad.`,
  ];

  const diagnostico = carrerasCriticas.length > 0
    ? `La ${nombreFac} registra un promedio institucional de ${f.promedioGeneral.toFixed(2)}/20. El criterio con menor desempeño es ${peorAE} (${ASPECTOS_EVALUADOS[peorAE]}). Las carreras que requieren atención prioritaria son: ${carrerasCriticas.join(', ')}.`
    : `La ${nombreFac} presenta un desempeño docente global de ${f.promedioGeneral.toFixed(2)}/20, con el criterio ${peorAE} como área de oportunidad principal. Se recomienda mantener los programas de mejora continua.`;

  return {
    facultad: nombreFac,
    codigoFacultad: cod,
    promedioGeneral: f.promedioGeneral,
    indicadorActual: f.indicadorPlanEstrategico,
    carrerasCriticas,
    criterioMasDebil: peorAE,
    diagnostico,
    planesAccion,
    indicadorMeta: Math.min(f.indicadorPlanEstrategico + 5, 98),
    ciclosMeta: f.indicadorPlanEstrategico < 80 ? 2 : 1,
  };
}

function generarRecomendacionInstitucional(resumen: ResumenInstitucional): RecomendacionInstitucional {
  const peorAE = criterioMasDebil(resumen.promedioAE01, resumen.promedioAE02, resumen.promedioAE03, resumen.promedioAE04);

  const todasLasCarreras = [...resumen.facultades.values()].flatMap(f => [...f.carreras.values()]);
  const totalSecciones = todasLasCarreras.reduce((s, c) => s + c.seccionesCalificadas, 0);
  const totalInsatisfactorio = todasLasCarreras.reduce((s, c) => s + c.distribucion.INSATISFACTORIO.cantidad, 0);
  const totalAceptable = todasLasCarreras.reduce((s, c) => s + c.distribucion.ACEPTABLE.cantidad, 0);
  const totalBueno = todasLasCarreras.reduce((s, c) => s + c.distribucion.BUENO.cantidad, 0);
  const totalDestacado = todasLasCarreras.reduce((s, c) => s + c.distribucion.DESTACADO.cantidad, 0);

  const pInsatisfactorio = totalSecciones > 0 ? (totalInsatisfactorio / totalSecciones) * 100 : 0;
  const pAceptable = totalSecciones > 0 ? (totalAceptable / totalSecciones) * 100 : 0;
  const pBueno = totalSecciones > 0 ? (totalBueno / totalSecciones) * 100 : 0;
  const pDestacado = totalSecciones > 0 ? (totalDestacado / totalSecciones) * 100 : 0;

  const indicesMejora: IndiceMejora[] = [
    {
      nombre: 'Indicador de Calidad Docente (BUENO + DESTACADO)',
      descripcion: 'Porcentaje de secciones con calificación BUENO o DESTACADO según el Plan Estratégico UPT',
      valorActual: resumen.indicadorPlanEstrategico,
      valorMeta: Math.min(resumen.indicadorPlanEstrategico + 5, 98),
      unidad: '%',
      brecha: Math.max(0, Math.min(resumen.indicadorPlanEstrategico + 5, 98) - resumen.indicadorPlanEstrategico),
      estrategia: 'Programa de acompañamiento docente focalizado en secciones con INSATISFACTORIO y ACEPTABLE',
      acciones: [
        'Identificar y asignar mentores docentes para los profesores con calificación crítica',
        'Diseñar talleres pedagógicos semestrales con asistencia certificada',
        'Establecer incentivos institucionales para docentes que logren mejorar su calificación',
      ],
    },
    {
      nombre: `Promedio ${peorAE}: ${ASPECTOS_EVALUADOS[peorAE]}`,
      descripcion: 'Criterio con menor calificación promedio a nivel institucional',
      valorActual: [resumen.promedioAE01, resumen.promedioAE02, resumen.promedioAE03, resumen.promedioAE04][
        ['AE-01','AE-02','AE-03','AE-04'].indexOf(peorAE)
      ],
      valorMeta: Math.min([resumen.promedioAE01, resumen.promedioAE02, resumen.promedioAE03, resumen.promedioAE04][
        ['AE-01','AE-02','AE-03','AE-04'].indexOf(peorAE)
      ] + 1, 18),
      unidad: 'puntos',
      brecha: 1,
      estrategia: `Programa específico de fortalecimiento en "${ASPECTOS_EVALUADOS[peorAE]}"`,
      acciones: [
        `Capacitación especializada en ${ASPECTOS_EVALUADOS[peorAE]} para toda la plana docente`,
        'Incorporar este criterio como eje transversal del plan de desarrollo docente institucional',
        'Monitorear mensualmente el avance en este criterio con reportes a cada facultad',
      ],
    },
    {
      nombre: 'Participación Estudiantil en la Encuesta',
      descripcion: 'Porcentaje de estudiantes matriculados que completan la encuesta',
      valorActual: resumen.porcentajeEncuestados,
      valorMeta: Math.min(resumen.porcentajeEncuestados + 3, 95),
      unidad: '%',
      brecha: Math.max(0, 95 - resumen.porcentajeEncuestados),
      estrategia: 'Campaña de sensibilización y vinculación de la participación con beneficios académicos',
      acciones: [
        'Comunicar oportunamente a los estudiantes la importancia de la encuesta',
        'Gestionar que la participación en la encuesta sea requisito previo a la consulta de notas',
        'Publicitar los cambios institucionales originados en resultados de encuestas anteriores',
      ],
    },
    {
      nombre: 'Reducción de Secciones con Calificación INSATISFACTORIO',
      descripcion: 'Porcentaje de secciones con nota ≤ 11',
      valorActual: pInsatisfactorio,
      valorMeta: Math.max(0, pInsatisfactorio - 2),
      unidad: '%',
      brecha: Math.min(pInsatisfactorio, 2),
      estrategia: 'Plan de intervención temprana para docentes con rendimiento crítico',
      acciones: [
        'Establecer sistema de alerta temprana durante el ciclo para detectar tendencias negativas',
        'Aplicar medidas de apoyo y acompañamiento antes del cierre del semestre',
        'Revisar contratación y renovación de docentes con historial reiterativo de INSATISFACTORIO',
      ],
    },
    {
      nombre: 'Índice de Docentes con Desempeño DESTACADO',
      descripcion: 'Porcentaje de secciones con calificación DESTACADO (18-20 puntos)',
      valorActual: pDestacado,
      valorMeta: Math.min(pDestacado + 3, 95),
      unidad: '%',
      brecha: 3,
      estrategia: 'Reconocimiento y difusión de buenas prácticas docentes',
      acciones: [
        'Crear programa de reconocimiento público para docentes con calificación DESTACADO',
        'Documentar y compartir metodologías de docentes DESTACADO como recursos institucionales',
        'Incorporar a los mejores docentes como facilitadores de talleres de formación pedagógica',
      ],
    },
  ];

  const planesEstrategicos = [
    'Implementar el "Sistema de Mejora Continua de la Calidad Docente UPT" con ciclos semestrales de: diagnóstico → planificación → ejecución → evaluación → retroalimentación.',
    'Fortalecer la oficina GPAD con recursos humanos y tecnológicos para el seguimiento continuo de los indicadores de desempeño docente.',
    'Establecer un convenio con instituciones nacionales e internacionales para programas de formación y actualización pedagógica.',
    'Crear una plataforma de gestión del conocimiento pedagógico institucional donde los docentes compartan experiencias, recursos y estrategias exitosas.',
    'Integrar los resultados de la encuesta "Tu Opinión Cuenta" con el sistema de evaluación de desempeño docente para la toma de decisiones de renovación y promoción.',
    'Diseñar un sistema de incentivos vinculado al desempeño docente (bonificaciones, becas de posgrado, reconocimientos públicos) para motivar la mejora continua.',
  ];

  const resumenEjecutivo = `En el ciclo evaluado, la UPT alcanzó un promedio institucional de ${resumen.promedioGeneral.toFixed(2)}/20 con un indicador del Plan Estratégico de ${resumen.indicadorPlanEstrategico.toFixed(1)}% de docentes con calificación BUENO o DESTACADO. El criterio con mayor área de oportunidad es ${peorAE} (${ASPECTOS_EVALUADOS[peorAE]}), con un promedio de ${[resumen.promedioAE01, resumen.promedioAE02, resumen.promedioAE03, resumen.promedioAE04][['AE-01','AE-02','AE-03','AE-04'].indexOf(peorAE)].toFixed(2)}/20. Se identificaron ${totalInsatisfactorio} secciones con calificación INSATISFACTORIO y ${totalAceptable} con ACEPTABLE que requieren atención prioritaria.`;

  return {
    promedioGeneral: resumen.promedioGeneral,
    indicadorActual: resumen.indicadorPlanEstrategico,
    porcInsatisfactorio: pInsatisfactorio,
    porcAceptable: pAceptable,
    porcBueno: pBueno,
    porcDestacado: pDestacado,
    criterioMasDebil: peorAE,
    diagnostico: resumenEjecutivo,
    indicesMejora,
    planesEstrategicos,
    resumenEjecutivo,
  };
}

// ── Mejora con IA (llamada al endpoint seguro de Vercel) ─────────────────────

async function mejorarConIA(resultado: ResultadosIA): Promise<ResultadosIA> {
  const valorPeorAE =
    resultado.institucional.indicesMejora.find(i => i.nombre.startsWith(resultado.institucional.criterioMasDebil))?.valorActual
    ?? resultado.institucional.promedioGeneral;

  const body = {
    contexto: {
      promedioGeneral: resultado.institucional.promedioGeneral,
      indicador: resultado.institucional.indicadorActual,
      criterioMasDebil: resultado.institucional.criterioMasDebil,
      criterioMasDebilDesc: ASPECTOS_EVALUADOS[resultado.institucional.criterioMasDebil] ?? '',
      valorCriterioMasDebil: valorPeorAE,
      porcInsatisfactorio: resultado.institucional.porcInsatisfactorio,
      porcAceptable: resultado.institucional.porcAceptable,
      ciclo: resultado.ciclo,
    },
    docentesCriticos: resultado.docentes
      .filter(d => d.calificacion === 'INSATISFACTORIO')
      .slice(0, 6)
      .map(d => ({ docente: d.docente, curso: d.curso, nota: d.nota, ae01: d.ae01, ae02: d.ae02, ae03: d.ae03, ae04: d.ae04 })),
  };

  // Llamada al endpoint seguro (nunca expone la API key al browser)
  const res = await fetch('/api/recommend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? `Error ${res.status}`);
  }

  const data = await res.json() as { resumenEjecutivo: string };
  if (data.resumenEjecutivo) {
    resultado.institucional.resumenEjecutivo = data.resumenEjecutivo;
  }
  return resultado;
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function generarRecomendaciones(
  datos: EvaluacionData[],
  resumen: ResumenInstitucional,
  ciclo: string,
  usarIA = false,
): Promise<ResultadosIA> {
  // ── Nivel docente: filtrar INSATISFACTORIO y ACEPTABLE ──
  const registrosCriticos = datos.filter(
    r => r.nota <= 14 && r.validez === 'Válido',
  );
  const docentesRec = registrosCriticos.map(generarRecomendacionDocente);

  // ── Nivel carrera ──
  const carrerasRec: RecomendacionCarrera[] = [];
  for (const f of resumen.facultades.values()) {
    for (const c of f.carreras.values()) {
      const pProblemas = c.distribucion.INSATISFACTORIO.porcentaje + c.distribucion.ACEPTABLE.porcentaje;
      if (pProblemas > 0 || c.promedioGeneral < 17) {
        carrerasRec.push(generarRecomendacionCarrera(c));
      }
    }
  }

  // ── Nivel facultad ──
  const facultadesRec: RecomendacionFacultad[] = [];
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    facultadesRec.push(generarRecomendacionFacultad(cod, f));
  }

  // ── Nivel institucional ──
  const institucionalRec = generarRecomendacionInstitucional(resumen);

  let resultado: ResultadosIA = {
    docentes: docentesRec,
    carreras: carrerasRec,
    facultades: facultadesRec,
    institucional: institucionalRec,
    generadoEn: new Date().toISOString(),
    ciclo,
    usandoIA: false,
  };

  // ── Mejora con IA si está disponible (vía endpoint seguro) ──
  if (usarIA) {
    try {
      resultado = await mejorarConIA(resultado);
      resultado.usandoIA = true;
    } catch (err) {
      console.warn('IA no disponible, usando análisis de reglas:', err);
    }
  }

  return resultado;
}
