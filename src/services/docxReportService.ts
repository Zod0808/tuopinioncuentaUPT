import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, AlignmentType, TextRun, HeadingLevel, ImageRun,
  PageBreak, ShadingType,
} from 'docx';
import { saveAs } from 'file-saver';
import { ResumenInstitucional, DatosCarrera, interpretarTablaAE, interpretarDistribucion, interpretarParticipacion } from './reportCalculations';
import { FACULTADES, ORDEN_FACULTADES, ASPECTOS_EVALUADOS, ESCALA_CALIFICACION } from '../config/universityStructure';

// ── Helpers de celdas ─────────────────────────────────────────────────────────

const AZUL_HEADER = '2E5C8A';
const GRIS_ROW = 'F2F2F2';

function celdaH(text: string, colspan = 1): TableCell {
  return new TableCell({
    columnSpan: colspan,
    shading: { type: ShadingType.CLEAR, fill: AZUL_HEADER },
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

function salto(): Paragraph {
  return new Paragraph({ children: [new TextRun('')] });
}

// ── Sección 3.1: Tabla institucional de participación ─────────────────────────

function tablaParticipacionInstitucional(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Facultad'), celdaH('N° de estudiantes matriculados'), celdaH('N° estudiantes encuestados'), celdaH('% de estudiantes encuestados')] }),
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
    celda('TOTAL', false, true, GRIS_ROW),
    celda(resumen.totalMatriculados.toString(), true, true, GRIS_ROW),
    celda(resumen.totalEncuestados.toString(), true, true, GRIS_ROW),
    celda(resumen.porcentajeEncuestados.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 3.2: Participación por facultad ───────────────────────────────────

function tablaParticipacionFacultad(cod: string, f: ResumenInstitucional['facultades'] extends Map<string, infer V> ? V : never): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH(FACULTADES[cod]?.nombre ?? cod, 4)] }),
    new TableRow({ children: [celdaH('Carrera Profesional'), celdaH('N° matriculados'), celdaH('N° encuestados'), celdaH('% encuestados')] }),
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
    new TableRow({ children: [celdaH('Facultad'), celdaH('AE-01'), celdaH('AE-02'), celdaH('AE-03'), celdaH('AE-04'), celdaH('PROMEDIO')] }),
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

// ── Sección 3.3.2: AE por carrera dentro de facultad ─────────────────────────

function tablaAEPorCarrera(cod: string, f: ResumenInstitucional['facultades'] extends Map<string, infer V> ? V : never): Table {
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
    new TableRow({ children: [celdaH(FACULTADES[cod]?.nombre ?? cod, 2 + carreras.length)] }),
    new TableRow({ children: [celdaH('Código'), celdaH('Aspecto evaluado'), ...carreraNames.map(n => celdaH(n))] }),
  ];

  aeKeys.forEach((ae, i) => {
    rows.push(new TableRow({ children: [
      celda(ae, true), celda(ASPECTOS_EVALUADOS[ae] ?? ''),
      ...aeValues[i].map(v => celdaN(v)),
    ]}));
  });

  // Fila promedio
  rows.push(new TableRow({ children: [
    celda('PROMEDIO', true, true, GRIS_ROW), celda('', false, false, GRIS_ROW),
    ...carreras.map(c => celdaN(c.promedioGeneral, 2, true)),
  ]}));

  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Tabla distribución calificaciones por carrera ─────────────────────────────

function tablaDistribucion(c: DatosCarrera): Table {
  const califs: (keyof typeof ESCALA_CALIFICACION)[] = ['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'];
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Calificación'), celdaH('N° secciones'), celdaH('%')] }),
  ];
  for (const cal of califs) {
    const d = c.distribucion[cal];
    rows.push(new TableRow({ children: [celda(cal), celda(d.cantidad.toString(), true), celda(d.porcentaje.toFixed(2) + '%', true)] }));
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(c.seccionesCalificadas.toString(), true, true, GRIS_ROW),
    celda('100%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows });
}

// ── Sección 4: Indicador del plan estratégico ─────────────────────────────────

function tablaIndicador(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Facultad'), celdaH('% BUENO'), celdaH('% DESTACADO'), celdaH('INDICADOR (BUENO + DESTACADO)')] }),
  ];
  let totalBueno = 0, totalDestacado = 0;
  let count = 0;
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    rows.push(new TableRow({ children: [
      celda(FACULTADES[cod]?.nombre ?? cod),
      celda(f.porcBueno.toFixed(2) + '%', true),
      celda(f.porcDestacado.toFixed(2) + '%', true),
      celda(f.indicadorPlanEstrategico.toFixed(2) + '%', true, true),
    ]}));
    totalBueno += f.porcBueno; totalDestacado += f.porcDestacado; count++;
  }
  rows.push(new TableRow({ children: [
    celda('PROMEDIO', false, true, GRIS_ROW),
    celda(count > 0 ? (totalBueno/count).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(count > 0 ? (totalDestacado/count).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(resumen.indicadorPlanEstrategico.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Función principal ─────────────────────────────────────────────────────────

export async function generarInformeFinalDocx(
  ciclo: string,
  resumen: ResumenInstitucional,
  graficosMap: Map<string, string> = new Map()
): Promise<void> {
  const children: (Paragraph | Table)[] = [];

  // ── Portada ──
  children.push(
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 2000 }, children: [new TextRun({ text: 'UNIVERSIDAD PRIVADA DE TACNA', bold: true, size: 32 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'Dirección de Gestión de la Calidad Académica', size: 26 })] }),
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `INFORME DE RESULTADOS`, bold: true, size: 36 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `ENCUESTA "TU OPINIÓN CUENTA"`, bold: true, size: 28 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `CICLO ACADÉMICO ${ciclo}`, bold: true, size: 26, color: AZUL_HEADER })] }),
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tacna, ${new Date().getFullYear()}`, size: 22 })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── 3.1 Participación institucional ──
  children.push(
    titulo('3. RESULTADOS', HeadingLevel.HEADING_1), salto(),
    titulo('3.1. Participación Estudiantil Institucional'),
    salto(),
    tablaParticipacionInstitucional(resumen),
    salto(),
    parrafo(interpretarParticipacion(resumen.totalEncuestados, resumen.totalMatriculados, 'la Universidad Privada de Tacna')),
    salto(),
  );

  // ── 3.2 Participación por facultad ──
  children.push(titulo('3.2. Participación Estudiantil por Facultad'), salto());
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    children.push(tablaParticipacionFacultad(cod, f), salto());
    children.push(parrafo(interpretarParticipacion(f.totalEncuestados, f.totalMatriculados, FACULTADES[cod]?.nombre ?? cod)), salto());
  }

  // ── 3.3.1 AE institucional ──
  children.push(
    titulo('3.3. Resultados de Aspectos Evaluados'),
    titulo('3.3.1. Resultados Institucionales por Facultad', HeadingLevel.HEADING_3),
    salto(),
    tablaAEInstitucional(resumen),
    salto(),
  );

  // ── 3.3.2 AE por facultad y carrera ──
  children.push(titulo('3.3.2. Resultados por Facultad y Carrera', HeadingLevel.HEADING_3), salto());
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    children.push(
      titulo(FACULTADES[cod]?.nombre ?? cod, HeadingLevel.HEADING_4),
      salto(),
      tablaAEPorCarrera(cod, f),
      salto(),
    );

    for (const [, c] of f.carreras) {
      children.push(
        new Paragraph({ children: [new TextRun({ text: c.carrera, bold: true, size: 22, italics: true })] }),
        tablaDistribucion(c),
        salto(),
        parrafo(interpretarTablaAE(c)),
        parrafo(interpretarDistribucion(c)),
        salto(),
      );

      // Insertar gráfico si existe
      const imgData = graficosMap.get(c.carrera);
      if (imgData) {
        try {
          const b64 = imgData.split(',')[1];
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: Buffer.from(b64, 'base64'), transformation: { width: 350, height: 250 }, type: 'png' })],
          }));
        } catch { /* imagen no disponible */ }
      }
      children.push(salto());
    }
  }

  // ── Sección 4: Indicador plan estratégico ──
  children.push(
    new Paragraph({ children: [new PageBreak()] }),
    titulo('4. INDICADOR DEL PLAN ESTRATÉGICO INSTITUCIONAL', HeadingLevel.HEADING_1),
    salto(),
    parrafo(`El indicador del Plan Estratégico Institucional mide el porcentaje de docentes con calificación BUENO o DESTACADO. Para el ciclo ${ciclo}, el resultado institucional es ${resumen.indicadorPlanEstrategico.toFixed(2)}%.`),
    salto(),
    tablaIndicador(resumen),
    salto(),
  );

  // ── Conclusiones ──
  children.push(
    titulo('5. CONCLUSIONES', HeadingLevel.HEADING_1), salto(),
    parrafo(`De los ${resumen.totalMatriculados.toLocaleString()} estudiantes matriculados, ${resumen.totalEncuestados.toLocaleString()} participaron en la encuesta (${resumen.porcentajeEncuestados.toFixed(2)}% de participación).`),
    salto(),
    parrafo(`El promedio general institucional de los aspectos evaluados fue de ${resumen.promedioGeneral.toFixed(2)}, correspondiente a la categoría ${resumen.promedioGeneral >= 18 ? 'DESTACADO' : resumen.promedioGeneral >= 15 ? 'BUENO' : resumen.promedioGeneral >= 12 ? 'ACEPTABLE' : 'INSATISFACTORIO'}.`),
    salto(),
    parrafo(`El indicador del Plan Estratégico Institucional alcanzó un ${resumen.indicadorPlanEstrategico.toFixed(2)}% de docentes con calificación BUENO o DESTACADO.`),
    salto(),
  );

  // ── Recomendaciones ──
  children.push(
    titulo('6. RECOMENDACIONES', HeadingLevel.HEADING_1), salto(),
    parrafo('Fortalecer las acciones de mejora en el criterio AE-04 (Formación actitudinal y relaciones interpersonales), que históricamente presenta el promedio más bajo a nivel institucional.'),
    salto(),
    parrafo('Incentivar la participación estudiantil en la encuesta, especialmente en carreras con menos del 70% de encuestados respecto al total matriculado.'),
    salto(),
    parrafo('Comunicar los resultados de la evaluación a los docentes y unidades académicas para su uso en la mejora continua de la calidad educativa.'),
    salto(),
  );

  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_TuOpinionCuenta_${ciclo}.docx`);
}
