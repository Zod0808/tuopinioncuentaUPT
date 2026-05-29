import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, AlignmentType, TextRun, HeadingLevel, ImageRun,
  PageBreak, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { ResumenInstitucional, DatosCarrera, DatosFacultad, interpretarTablaAE, interpretarDistribucion, interpretarParticipacion } from './reportCalculations';
import { FACULTADES, ORDEN_FACULTADES, ASPECTOS_EVALUADOS, ESCALA_CALIFICACION } from '../config/universityStructure';

// ── Helpers de celdas ─────────────────────────────────────────────────────────

const AZUL_HEADER = '2E5C8A';
const AZUL_OSCURO = '1a365d';
const GRIS_ROW = 'F2F2F2';

function celdaH(text: string, colspan = 1, rowspan = 1): TableCell {
  return new TableCell({
    columnSpan: colspan,
    rowSpan: rowspan,
    shading: { type: ShadingType.CLEAR, fill: AZUL_HEADER },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
    })],
  });
}

function celdaHOscura(text: string, colspan = 1): TableCell {
  return new TableCell({
    columnSpan: colspan,
    shading: { type: ShadingType.CLEAR, fill: AZUL_OSCURO },
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 18 })],
    })],
  });
}

function celda(text: string, center = false, bold = false, fill?: string): TableCell {
  return new TableCell({
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold, size: 18 })],
    })],
  });
}

function celdaN(value: number, decimals = 2, bold = false): TableCell {
  return celda(value.toFixed(decimals), true, bold);
}

function titulo(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function parrafo(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 22 })] });
}

function negrita(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 22, bold: true })] });
}

function salto(): Paragraph {
  return new Paragraph({ children: [new TextRun('')] });
}

// ── Tabla: Criterios de evaluación ───────────────────────────────────────────

function tablaCriteriosEvaluacion(): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('N° de preguntas'), celdaH('Código'), celdaH('Aspecto evaluado')] }),
    new TableRow({ children: [celda('2, 3, 4', true), celda('AE-01', true, true), celda(ASPECTOS_EVALUADOS['AE-01'])] }),
    new TableRow({ children: [celda('5, 6, 7, 8', true), celda('AE-02', true, true), celda(ASPECTOS_EVALUADOS['AE-02'])] }),
    new TableRow({ children: [celda('9, 10, 11', true), celda('AE-03', true, true), celda(ASPECTOS_EVALUADOS['AE-03'])] }),
    new TableRow({ children: [celda('12, 13, 14, 15', true), celda('AE-04', true, true), celda(ASPECTOS_EVALUADOS['AE-04'])] }),
  ];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Tabla: Escala de calificación ─────────────────────────────────────────────

function tablaEscalaCalificacion(): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Escala de calificación'), celdaH('Juicio de valor'), celdaH('Interpretación')] }),
    new TableRow({ children: [
      celda('11 puntos a menos', true, true),
      celda('INSATISFACTORIO', true, true),
      celda(ESCALA_CALIFICACION.INSATISFACTORIO.interpretacion),
    ]}),
    new TableRow({ children: [
      celda('De 12 a 14 puntos', true, true),
      celda('ACEPTABLE', true, true),
      celda(ESCALA_CALIFICACION.ACEPTABLE.interpretacion),
    ]}),
    new TableRow({ children: [
      celda('De 15 a 17 puntos', true, true),
      celda('BUENO', true, true),
      celda(ESCALA_CALIFICACION.BUENO.interpretacion),
    ]}),
    new TableRow({ children: [
      celda('De 18 a 20 puntos', true, true),
      celda('DESTACADO', true, true),
      celda(ESCALA_CALIFICACION.DESTACADO.interpretacion),
    ]}),
  ];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 3.1: Tabla institucional de participación ─────────────────────────

function tablaParticipacionInstitucional(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Facultad'), celdaH('N° de estudiantes'), celdaH('N° estudiantes encuestados'), celdaH('% de estudiantes encuestados')] }),
  ];

  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    rows.push(new TableRow({ children: [
      celda(FACULTADES[cod]?.nombre ?? cod),
      celda(f.totalMatriculados.toString(), true),
      celda(f.totalEncuestados.toString(), true),
      celda(f.porcentajeEncuestados.toFixed(2) + '%', true, true),
    ]}));
  }

  rows.push(new TableRow({ children: [
    celda('PROMEDIO', false, true, GRIS_ROW),
    celda(resumen.totalMatriculados.toString(), true, true, GRIS_ROW),
    celda(resumen.totalEncuestados.toString(), true, true, GRIS_ROW),
    celda(resumen.porcentajeEncuestados.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 3.2: Participación por facultad ───────────────────────────────────

function tablaParticipacionFacultad(cod: string, f: DatosFacultad): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaHOscura(FACULTADES[cod]?.nombre ?? cod, 4)] }),
    new TableRow({ children: [celdaH('Carrera Profesional'), celdaH('N° de estudiantes'), celdaH('N° de estudiantes encuestados'), celdaH('% de estudiantes encuestados')] }),
  ];
  for (const [, c] of f.carreras) {
    rows.push(new TableRow({ children: [
      celda(c.carrera), celda(c.totalMatriculados.toString(), true),
      celda(c.totalEncuestados.toString(), true), celda(c.porcentajeEncuestados.toFixed(2) + '%', true, true),
    ]}));
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW), celda(f.totalMatriculados.toString(), true, true, GRIS_ROW),
    celda(f.totalEncuestados.toString(), true, true, GRIS_ROW), celda(f.porcentajeEncuestados.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 3.3.1: Tabla institucional de AE ─────────────────────────────────

function tablaAEInstitucional(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [
      celdaH('Facultad'), celdaH('AE-01\nCalidad presentación y contenido silábico'),
      celdaH('AE-02\nEjecución del proceso enseñanza aprendizaje'),
      celdaH('AE-03\nAplicación de la evaluación'),
      celdaH('AE-04\nFormación actitudinal y relaciones interpersonales'),
      celdaH('PROMEDIO POR FACULTAD'),
    ] }),
  ];
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    rows.push(new TableRow({ children: [
      celda(FACULTADES[cod]?.nombre ?? cod),
      celdaN(f.promedioAE01), celdaN(f.promedioAE02), celdaN(f.promedioAE03), celdaN(f.promedioAE04),
      celdaN(f.promedioGeneral, 2, true),
    ]}));
  }
  rows.push(new TableRow({ children: [
    celda('PROMEDIO', false, true, GRIS_ROW),
    celdaN(resumen.promedioAE01), celdaN(resumen.promedioAE02), celdaN(resumen.promedioAE03), celdaN(resumen.promedioAE04),
    celdaN(resumen.promedioGeneral, 2, true),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 3.3.2: AE simple por carrera (facultad con una sola carrera) ──────

function tablaAECarreraSimple(c: DatosCarrera): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Código'), celdaH('Aspecto evaluado'), celdaH('Calificación promedio')] }),
    new TableRow({ children: [celda('AE-01', true, true), celda(ASPECTOS_EVALUADOS['AE-01']), celdaN(c.promedioAE01, 2, true)] }),
    new TableRow({ children: [celda('AE-02', true, true), celda(ASPECTOS_EVALUADOS['AE-02']), celdaN(c.promedioAE02, 2, true)] }),
    new TableRow({ children: [celda('AE-03', true, true), celda(ASPECTOS_EVALUADOS['AE-03']), celdaN(c.promedioAE03, 2, true)] }),
    new TableRow({ children: [celda('AE-04', true, true), celda(ASPECTOS_EVALUADOS['AE-04']), celdaN(c.promedioAE04, 2, true)] }),
    new TableRow({ children: [celda('', true, false, GRIS_ROW), celda('PROMEDIO', false, true, GRIS_ROW), celdaN(c.promedioGeneral, 2, true)] }),
  ];
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 3.3.2: AE por carrera dentro de facultad (multi-carrera) ──────────

function tablaAEPorCarrera(cod: string, f: DatosFacultad): Table {
  const carreras = [...f.carreras.values()];
  const carreraNames = carreras.map(c => c.carrera);
  const aeKeys = ['AE-01','AE-02','AE-03','AE-04'];
  const aeValues = [
    carreras.map(c => c.promedioAE01),
    carreras.map(c => c.promedioAE02),
    carreras.map(c => c.promedioAE03),
    carreras.map(c => c.promedioAE04),
  ];

  const rows: TableRow[] = [
    new TableRow({ children: [celdaHOscura(FACULTADES[cod]?.nombre ?? cod, 2 + carreras.length)] }),
    new TableRow({ children: [celdaH('Código'), celdaH('Aspecto evaluado'), ...carreraNames.map(n => celdaH(n))] }),
  ];

  aeKeys.forEach((ae, i) => {
    rows.push(new TableRow({ children: [
      celda(ae, true, true), celda(ASPECTOS_EVALUADOS[ae] ?? ''),
      ...aeValues[i].map(v => celdaN(v)),
    ]}));
  });

  rows.push(new TableRow({ children: [
    celda('PROMEDIO', true, true, GRIS_ROW), celda('', false, false, GRIS_ROW),
    ...carreras.map(c => celdaN(c.promedioGeneral, 2, true)),
  ]}));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Tabla distribución calificaciones (% secciones) ───────────────────────────

function tablaDistribucion(c: DatosCarrera): Table {
  const califs = ['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const;
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Juicio de valor'), celdaH('N° secciones calificadas'), celdaH('%')] }),
  ];
  for (const cal of califs) {
    const d = c.distribucion[cal];
    rows.push(new TableRow({ children: [celda(cal, true, true), celda(d.cantidad.toString(), true), celda(d.porcentaje.toFixed(2) + '%', true)] }));
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', true, true, GRIS_ROW),
    celda(c.seccionesCalificadas.toString(), true, true, GRIS_ROW),
    celda('100%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 70, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 4: Indicador del plan estratégico ─────────────────────────────────

function tablaIndicador(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [
      celdaHOscura('UNIVERSIDAD PRIVADA DE TACNA', 4),
    ]}),
    new TableRow({ children: [celdaH('FACULTAD'), celdaH('% BUENO'), celdaH('% DESTACADO'), celdaH('TOTAL')] }),
  ];
  let totalBueno = 0, totalDestacado = 0;
  let count = 0;
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    const sigla = cod;
    rows.push(new TableRow({ children: [
      celda(sigla, true, true),
      celda(f.porcBueno.toFixed(2) + '%', true),
      celda(f.porcDestacado.toFixed(2) + '%', true),
      celda(f.indicadorPlanEstrategico.toFixed(2) + '%', true, true),
    ]}));
    totalBueno += f.porcBueno; totalDestacado += f.porcDestacado; count++;
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(count > 0 ? (totalBueno/count).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(count > 0 ? (totalDestacado/count).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(resumen.indicadorPlanEstrategico.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Bloques reutilizables: carrera completa (AE + distribución) ───────────────

function bloquesCarrera(c: DatosCarrera, simple: boolean): (Paragraph | Table)[] {
  const items: (Paragraph | Table)[] = [];
  if (simple) {
    items.push(tablaAECarreraSimple(c), salto());
    items.push(parrafo(interpretarTablaAE(c)), salto());
  }
  items.push(
    parrafo(`N° de secciones calificadas: ${c.seccionesCalificadas}`),
    tablaDistribucion(c),
    salto(),
    parrafo(interpretarDistribucion(c)),
    salto(),
  );
  return items;
}

// ── Función principal: Informe institucional completo ─────────────────────────

export async function generarInformeFinalDocx(
  ciclo: string,
  resumen: ResumenInstitucional,
  graficosMap: Map<string, string> = new Map()
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // ── Portada ──
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000 }, children: [new TextRun({ text: 'UNIVERSIDAD PRIVADA DE TACNA', bold: true, size: 36 })] }),
    salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Informe final de la aplicación de encuesta académica`, bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `TU OPINIÓN CUENTA ${ciclo}`, bold: true, size: 32, color: AZUL_HEADER })] }),
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tacna, ${new Date().getFullYear()}`, size: 22 })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── 3. Procesamiento de resultados ──
  children.push(
    titulo('3. PROCESAMIENTO DE RESULTADOS DE LA ENCUESTA ACADÉMICA', HeadingLevel.HEADING_1),
    salto(),
  );

  // ── 3.1 Participación institucional ──
  children.push(
    titulo('3.1. Reporte del N° y % de estudiantes encuestados a nivel institucional', HeadingLevel.HEADING_2),
    salto(),
    tablaParticipacionInstitucional(resumen),
    salto(),
    parrafo(interpretarParticipacion(resumen.totalEncuestados, resumen.totalMatriculados, 'la Universidad Privada de Tacna')),
    salto(),
  );

  // ── 3.2 Participación por facultad ──
  children.push(titulo('3.2. Reporte del N° y % de estudiantes encuestados por Facultades', HeadingLevel.HEADING_2), salto());
  let subfac = 1;
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    children.push(
      titulo(`3.2.${subfac}. ${FACULTADES[cod]?.nombre ?? cod}`, HeadingLevel.HEADING_3),
      salto(),
      tablaParticipacionFacultad(cod, f),
      salto(),
      parrafo(interpretarParticipacion(f.totalEncuestados, f.totalMatriculados, FACULTADES[cod]?.nombre ?? cod)),
      salto(),
    );
    subfac++;
  }

  // ── 3.3 Notas y % por criterios ──
  children.push(
    titulo('3.3. Reporte de notas y % de docentes evaluados por criterios de evaluación y juicio de valor', HeadingLevel.HEADING_2),
    salto(),
    negrita('Criterios de evaluación'),
    salto(),
    tablaCriteriosEvaluacion(),
    salto(),
    negrita('Escala de calificación'),
    salto(),
    tablaEscalaCalificacion(),
    salto(),
  );

  // ── 3.3.1 AE institucional ──
  children.push(
    titulo('3.3.1. Nivel Institucional', HeadingLevel.HEADING_3),
    salto(),
    tablaAEInstitucional(resumen),
    salto(),
    parrafo(`Interpretación: El aspecto mejor calificado en todas las facultades es la calidad de la presentación y contenido del sílabo (${resumen.promedioAE01.toFixed(2)}). En cambio, el aspecto con menor calificación es la formación actitudinal y relaciones interpersonales con los estudiantes (${resumen.promedioAE04.toFixed(2)}).`),
    salto(),
  );

  // ── 3.3.2 AE por facultad y carrera ──
  children.push(titulo('3.3.2. Por Facultad', HeadingLevel.HEADING_3), salto());
  let subfac2 = 1;
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    const carreras = [...f.carreras.values()];
    const esSimple = carreras.length === 1;

    children.push(
      titulo(`3.3.2.${subfac2}. ${FACULTADES[cod]?.nombre ?? cod}`, HeadingLevel.HEADING_4),
      salto(),
    );

    if (esSimple) {
      // Facultad con una sola carrera: tabla AE simple + distribución
      const c = carreras[0];
      children.push(...bloquesCarrera(c, true));

      // Imagen si existe
      const imgData = graficosMap.get(c.carrera);
      if (imgData) {
        try {
          const b64 = imgData.split(',')[1];
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: Buffer.from(b64, 'base64'), transformation: { width: 300, height: 220 }, type: 'png' })],
          }));
        } catch { /* imagen no disponible */ }
      }
    } else {
      // Facultad multi-carrera: tabla AE cruzada + distribución por carrera
      children.push(tablaAEPorCarrera(cod, f), salto());

      for (const c of carreras) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: c.carrera, bold: true, size: 22, italics: true })] }),
          salto(),
          ...bloquesCarrera(c, false),
        );

        const imgData = graficosMap.get(c.carrera);
        if (imgData) {
          try {
            const b64 = imgData.split(',')[1];
            children.push(new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new ImageRun({ data: Buffer.from(b64, 'base64'), transformation: { width: 300, height: 220 }, type: 'png' })],
            }));
          } catch { /* imagen no disponible */ }
        }
        children.push(salto());
      }
    }
    subfac2++;
  }

  // ── Sección 4: Indicador plan estratégico ──
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    titulo('4. INDICADOR DEL PLAN ESTRATÉGICO DE LA UPT', HeadingLevel.HEADING_1),
    salto(),
    parrafo('4.1 Reporte del porcentaje de estudiantes que consideran como "BUENO Y DESTACADO" (Indicador del Plan Estratégico institucional) por Facultad.'),
    salto(),
    tablaIndicador(resumen),
    salto(),
  );

  // ── 5. Conclusiones ──
  children.push(
    titulo('5. CONCLUSIONES', HeadingLevel.HEADING_1), salto(),
    parrafo(`Los resultados de la encuesta académica empleadas por las Carreras Profesionales permitieron identificar fortalezas y oportunidades de mejora en el proceso de enseñanza aprendizaje, constituyendo un insumo clave para el cumplimiento de los objetivos institucionales respecto a la evaluación del desempeño docente como lo establece la normatividad vigente.`),
    salto(),
    parrafo(`Del total de ${resumen.totalMatriculados.toLocaleString()} estudiantes matriculados en el semestre académico ${ciclo}, ${resumen.totalEncuestados.toLocaleString()} estudiantes han aplicado la encuesta académica, lo que representa un ${resumen.porcentajeEncuestados.toFixed(2)}% de participación.`),
    salto(),
  );

  // ── 6. Recomendaciones ──
  children.push(
    titulo('6. RECOMENDACIONES', HeadingLevel.HEADING_1), salto(),
    parrafo('Dado que el indicador con menor porcentaje fue "Formación actitudinal y relaciones interpersonales con los estudiantes", se recomienda en el marco del proceso de mejora continua de la calidad académica, implementen estrategias orientadas al fortalecimiento de las competencias actitudinales, comunicativas y socioemocionales del docente. Estas acciones deben promover un clima educativo basado en el respeto, la empatía y la comunicación asertiva, factores esenciales para favorecer la motivación, la participación activa y el bienestar de los estudiantes.'),
    salto(),
    parrafo('Se recomienda incentivar y motivar la participación activa de los estudiantes en la aplicación de la encuesta académica, considerando que los criterios evaluados constituyen aspectos fundamentales para valorar el desempeño docente y la calidad del proceso formativo.'),
    salto(),
    parrafo('Los resultados de esta encuesta representan un insumo valioso para la toma de decisiones de mejora continua por parte de las Direcciones y Coordinaciones de Escuela Profesional, permitiendo identificar fortalezas, áreas de mejora y oportunidades de desarrollo docente.'),
    salto(),
  );

  const doc = new Document({
    sections: [{ properties: {}, children }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_TuOpinionCuenta_${ciclo}.docx`);
}

// ── Función: Informe por facultad ─────────────────────────────────────────────

export async function generarInformeFacultadDocx(
  ciclo: string,
  cod: string,
  f: DatosFacultad,
): Promise<void> {
  const nombreFacultad = FACULTADES[cod]?.nombre ?? cod;
  const children: (Paragraph | Table)[] = [];
  const carreras = [...f.carreras.values()];
  const esSimple = carreras.length === 1;

  // ── Portada ──
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000 }, children: [new TextRun({ text: 'UNIVERSIDAD PRIVADA DE TACNA', bold: true, size: 36 })] }),
    salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: nombreFacultad.toUpperCase(), bold: true, size: 28, color: AZUL_HEADER })] }),
    salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Informe de Resultados de Encuesta Académica', bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `TU OPINIÓN CUENTA ${ciclo}`, bold: true, size: 28, color: AZUL_HEADER })] }),
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tacna, ${new Date().getFullYear()}`, size: 22 })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── Participación ──
  children.push(
    titulo(`Reporte del N° y % de estudiantes encuestados`, HeadingLevel.HEADING_1),
    titulo(nombreFacultad, HeadingLevel.HEADING_2),
    salto(),
    tablaParticipacionFacultad(cod, f),
    salto(),
    parrafo(interpretarParticipacion(f.totalEncuestados, f.totalMatriculados, nombreFacultad)),
    salto(),
  );

  // ── Criterios y escala ──
  children.push(
    titulo('Reporte de notas y % de docentes evaluados por criterios de evaluación y juicio de valor', HeadingLevel.HEADING_1),
    salto(),
    negrita('Criterios de evaluación'),
    salto(),
    tablaCriteriosEvaluacion(),
    salto(),
    negrita('Escala de calificación'),
    salto(),
    tablaEscalaCalificacion(),
    salto(),
  );

  // ── Resultados por carrera ──
  children.push(titulo(nombreFacultad, HeadingLevel.HEADING_2), salto());

  if (esSimple) {
    const c = carreras[0];
    children.push(...bloquesCarrera(c, true));
  } else {
    // Tabla AE cruzada por carrera
    children.push(tablaAEPorCarrera(cod, f), salto());

    for (const c of carreras) {
      children.push(
        titulo(c.carrera, HeadingLevel.HEADING_3),
        salto(),
        tablaAECarreraSimple(c),
        salto(),
        parrafo(interpretarTablaAE(c)),
        salto(),
        parrafo(`N° de secciones calificadas: ${c.seccionesCalificadas}`),
        tablaDistribucion(c),
        salto(),
        parrafo(interpretarDistribucion(c)),
        salto(),
      );
    }
  }

  // ── Indicador de la facultad ──
  children.push(
    titulo('Indicador del Plan Estratégico', HeadingLevel.HEADING_1),
    salto(),
  );

  const rowsInd: TableRow[] = [
    new TableRow({ children: [celdaH('Carrera Profesional'), celdaH('% BUENO'), celdaH('% DESTACADO'), celdaH('TOTAL')] }),
  ];
  let totalB = 0, totalD = 0, countC = 0;
  for (const c of carreras) {
    const pB = c.distribucion.BUENO.porcentaje;
    const pD = c.distribucion.DESTACADO.porcentaje;
    rowsInd.push(new TableRow({ children: [
      celda(c.carrera),
      celda(pB.toFixed(2) + '%', true),
      celda(pD.toFixed(2) + '%', true),
      celda((pB + pD).toFixed(2) + '%', true, true),
    ]}));
    totalB += pB; totalD += pD; countC++;
  }
  rowsInd.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(countC > 0 ? (totalB/countC).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(countC > 0 ? (totalD/countC).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(f.indicadorPlanEstrategico.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsInd }), salto());

  // ── Conclusiones y recomendaciones ──
  const mejorAE = (['promedioAE01','promedioAE02','promedioAE03','promedioAE04'] as const)
    .reduce((best, k) => f[k] > f[best] ? k : best, 'promedioAE01' as const);
  const peorAE = (['promedioAE01','promedioAE02','promedioAE03','promedioAE04'] as const)
    .reduce((worst, k) => f[k] < f[worst] ? k : worst, 'promedioAE01' as const);
  const mapAE: Record<string, string> = { promedioAE01: 'AE-01', promedioAE02: 'AE-02', promedioAE03: 'AE-03', promedioAE04: 'AE-04' };

  children.push(
    titulo('Conclusiones', HeadingLevel.HEADING_1), salto(),
    parrafo(`Del total de ${f.totalMatriculados.toLocaleString()} estudiantes matriculados del semestre académico ${ciclo} en la ${nombreFacultad}, ${f.totalEncuestados.toLocaleString()} estudiantes han aplicado la encuesta académica, equivalente al ${f.porcentajeEncuestados.toFixed(2)}%.`),
    salto(),
    parrafo(`El criterio con mayor calificación es ${mapAE[mejorAE]}: ${ASPECTOS_EVALUADOS[mapAE[mejorAE]]} (${f[mejorAE].toFixed(2)}), mientras que el criterio con menor calificación es ${mapAE[peorAE]}: ${ASPECTOS_EVALUADOS[mapAE[peorAE]]} (${f[peorAE].toFixed(2)}).`),
    salto(),
    titulo('Recomendaciones', HeadingLevel.HEADING_1), salto(),
    parrafo(`Dado que el indicador con menor porcentaje fue "${ASPECTOS_EVALUADOS[mapAE[peorAE]]}", se recomienda implementar estrategias orientadas al fortalecimiento de las competencias correspondientes en la plana docente de la ${nombreFacultad}.`),
    salto(),
    parrafo('Se recomienda incentivar y motivar la participación activa de los estudiantes en la aplicación de la encuesta académica en el siguiente semestre.'),
    salto(),
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_${cod}_TuOpinionCuenta_${ciclo}.docx`);
}
