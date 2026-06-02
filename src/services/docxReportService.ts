import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  WidthType, AlignmentType, TextRun, HeadingLevel, ImageRun,
  PageBreak, ShadingType, TableOfContents, convertInchesToTwip,
  LevelFormat,
} from 'docx';
import { saveAs } from 'file-saver';
import {
  ResumenInstitucional, DatosCarrera, DatosFacultad,
  interpretarTablaAE, interpretarDistribucion, interpretarParticipacion,
  interpretarInstitucionAE, generarConclusion1, generarRecomendacion1,
} from './reportCalculations';
import { FACULTADES, ORDEN_FACULTADES, ASPECTOS_EVALUADOS, ESCALA_CALIFICACION } from '../config/universityStructure';

// ── Configuración del informe (provista por el usuario) ───────────────────────

export interface ConfigInforme {
  numeroInforme?: string;      // p.ej. "008-2025-GPAD-UPT"
  nombreResponsable?: string;  // nombre del responsable de la encuesta
  cargoResponsable?: string;   // cargo del responsable
  textoDifusion?: string;      // texto para sección 2 de difusión
  nombreFirmante?: string;     // nombre para el cierre
  cargoFirmante?: string;      // cargo para el cierre
}

// ── Colores corporativos ──────────────────────────────────────────────────────

const AZUL_HEADER = '2E5C8A';
const AZUL_OSCURO = '1a365d';
const GRIS_ROW    = 'F2F2F2';

// ── Generación de gráficos de torta con Canvas ────────────────────────────────

interface PieChartCfg {
  title?: string | string[];   // una o varias líneas de título
  subtitle?: string;           // subtítulo debajo del título
  width?: number;              // ancho en px (default 800)
  height?: number;             // alto en px (default 580)
}

async function canvasPieToUint8(
  valores: number[],
  colores: string[],
  etiquetas: string[],
  cfg: PieChartCfg = {},
): Promise<Uint8Array | null> {
  const total = valores.reduce((a, b) => a + b, 0);
  if (total === 0) return null;
  try {
    const W = cfg.width ?? 800;
    const H = cfg.height ?? 580;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    // ── Título (multi-línea) ──
    const titleLines = Array.isArray(cfg.title) ? cfg.title
      : cfg.title ? [cfg.title] : [];
    let topY = 16;
    if (titleLines.length > 0) {
      ctx.fillStyle = '#1a365d';
      ctx.font = 'bold 18px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const line of titleLines) {
        ctx.fillText(line, W / 2, topY);
        topY += 24;
      }
      topY += 4;
    }
    if (cfg.subtitle) {
      ctx.fillStyle = '#555555';
      ctx.font = '15px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(cfg.subtitle, W / 2, topY);
      topY += 22;
    }
    topY += 8;

    // ── Zona leyenda (abajo) ──
    const legCols = etiquetas.length <= 2 ? etiquetas.length : 2;
    const legRows = Math.ceil(etiquetas.length / legCols);
    const legItemH = 26;
    const legH = legRows * legItemH + 6;
    const pieBottom = H - legH - 12;

    // ── Pastel centrado ──
    const pieAvailH = pieBottom - topY;
    const cx = W / 2;
    const cy = topY + pieAvailH / 2;
    const r = Math.min(pieAvailH / 2, W * 0.30) - 8;

    let ang = -Math.PI / 2;
    for (let i = 0; i < valores.length; i++) {
      if (valores[i] === 0) continue;
      const slice = (valores[i] / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, ang, ang + slice);
      ctx.fillStyle = colores[i];
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Solo porcentaje dentro del sector (>= 3% para que quepa)
      const pct = (valores[i] / total) * 100;
      if (pct >= 3) {
        const mid = ang + slice / 2;
        const tx = cx + r * 0.64 * Math.cos(mid);
        const ty = cy + r * 0.64 * Math.sin(mid);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${pct.toFixed(2)}%`, tx, ty);
      }
      ang += slice;
    }

    // ── Leyenda en la parte inferior centrada ──
    const colW = W / legCols;
    const legStartY = H - legH + 4;
    ctx.font = '13px Arial';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < etiquetas.length; i++) {
      const col = i % legCols;
      const row = Math.floor(i / legCols);
      // Centrar cada columna
      const colCenter = colW * col + colW / 2;
      const boxW = 14, gap = 6;
      const textW = ctx.measureText(etiquetas[i]).width;
      const totalW = boxW + gap + textW;
      const lx = colCenter - totalW / 2;
      const ly = legStartY + row * legItemH + legItemH / 2;

      ctx.fillStyle = colores[i];
      ctx.fillRect(lx, ly - 7, boxW, 14);
      ctx.fillStyle = '#222222';
      ctx.textAlign = 'left';
      ctx.fillText(etiquetas[i], lx + boxW + gap, ly);
    }

    return await new Promise<Uint8Array | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/png');
    });
  } catch {
    return null;
  }
}

// Categoría a partir de la nota según la escala visible en el DOCX (18-20=DESTACADO, 15-17=BUENO)
function categoriaPromedio(nota: number): string {
  if (nota >= 18) return 'DESTACADO';
  if (nota >= 15) return 'BUENO';
  if (nota >= 12) return 'ACEPTABLE';
  return 'INSATISFACTORIO';
}

// ── Helpers de celda ──────────────────────────────────────────────────────────

function celdaH(text: string, colspan = 1, rowspan = 1): TableCell {
  return new TableCell({
    columnSpan: colspan, rowSpan: rowspan,
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

// ── Helpers de párrafo ────────────────────────────────────────────────────────

function titulo(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function parrafo(text: string): Paragraph {
  return new Paragraph({
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 22 })],
  });
}

function negrita(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 22, bold: true })] });
}

function salto(): Paragraph {
  return new Paragraph({ children: [new TextRun('')] });
}

function viñeta(text: string): Paragraph {
  return new Paragraph({
    indent: { left: convertInchesToTwip(0.3) },
    spacing: { after: 80 },
    children: [new TextRun({ text: `– ${text}`, size: 22 })],
  });
}

function imagenCentrada(data: Uint8Array, w = 350, h = 270): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [new ImageRun({ data, transformation: { width: w, height: h }, type: 'png' })],
  });
}

// ── Tablas ────────────────────────────────────────────────────────────────────

function tablaCriteriosEvaluacion(): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: [celdaH('N° de preguntas'), celdaH('Código'), celdaH('Aspecto evaluado')] }),
    new TableRow({ children: [celda('2, 3, 4', true), celda('AE-01', true, true), celda(ASPECTOS_EVALUADOS['AE-01'])] }),
    new TableRow({ children: [celda('5, 6, 7, 8', true), celda('AE-02', true, true), celda(ASPECTOS_EVALUADOS['AE-02'])] }),
    new TableRow({ children: [celda('9, 10, 11', true), celda('AE-03', true, true), celda(ASPECTOS_EVALUADOS['AE-03'])] }),
    new TableRow({ children: [celda('12, 13, 14, 15', true), celda('AE-04', true, true), celda(ASPECTOS_EVALUADOS['AE-04'])] }),
  ]});
}

function tablaEscalaCalificacion(): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: [celdaH('Escala de calificación'), celdaH('Juicio de valor'), celdaH('Interpretación')] }),
    new TableRow({ children: [celda('11 puntos a menos', true, true), celda('INSATISFACTORIO', true, true), celda(ESCALA_CALIFICACION.INSATISFACTORIO.interpretacion)] }),
    new TableRow({ children: [celda('De 12 a 14 puntos', true, true), celda('ACEPTABLE', true, true), celda(ESCALA_CALIFICACION.ACEPTABLE.interpretacion)] }),
    new TableRow({ children: [celda('De 15 a 17 puntos', true, true), celda('BUENO', true, true), celda(ESCALA_CALIFICACION.BUENO.interpretacion)] }),
    new TableRow({ children: [celda('De 18 a 20 puntos', true, true), celda('DESTACADO', true, true), celda(ESCALA_CALIFICACION.DESTACADO.interpretacion)] }),
  ]});
}

function tablaParticipacionInstitucional(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Facultad'), celdaH('N° de estudiantes'), celdaH('N° estudiantes encuestados'), celdaH('% de estudiantes encuestados')] }),
  ];
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    rows.push(new TableRow({ children: [
      celda(FACULTADES[cod]?.nombre ?? cod),
      celda(f.totalMatriculados.toLocaleString('es-PE'), true),
      celda(f.totalEncuestados.toLocaleString('es-PE'), true),
      celda(f.porcentajeEncuestados.toFixed(2) + '%', true, true),
    ]}));
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(resumen.totalMatriculados.toLocaleString('es-PE'), true, true, GRIS_ROW),
    celda(resumen.totalEncuestados.toLocaleString('es-PE'), true, true, GRIS_ROW),
    celda(resumen.porcentajeEncuestados.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function tablaParticipacionFacultad(cod: string, f: DatosFacultad): Table {
  const carreras = [...f.carreras.values()];
  const esSimple = carreras.length === 1;
  const rows: TableRow[] = [];

  if (esSimple) {
    rows.push(new TableRow({ children: [celdaHOscura(FACULTADES[cod]?.nombre ?? cod, 3)] }));
    rows.push(new TableRow({ children: [
      celdaH('N° de estudiantes matriculados'), celdaH('N° de estudiantes encuestados'), celdaH('% de estudiantes encuestados'),
    ]}));
    rows.push(new TableRow({ children: [
      celda(f.totalMatriculados.toLocaleString('es-PE'), true, true),
      celda(f.totalEncuestados.toLocaleString('es-PE'), true, true),
      celda(f.porcentajeEncuestados.toFixed(2) + '%', true, true),
    ]}));
  } else {
    rows.push(new TableRow({ children: [celdaHOscura(FACULTADES[cod]?.nombre ?? cod, 4)] }));
    rows.push(new TableRow({ children: [
      celdaH('Carrera Profesional'), celdaH('N° de estudiantes'), celdaH('N° de estudiantes encuestados'), celdaH('% de estudiantes encuestados'),
    ]}));
    for (const [, c] of f.carreras) {
      rows.push(new TableRow({ children: [
        celda(c.carrera),
        celda(c.totalMatriculados.toLocaleString('es-PE'), true),
        celda(c.totalEncuestados.toLocaleString('es-PE'), true),
        celda(c.porcentajeEncuestados.toFixed(2) + '%', true, true),
      ]}));
    }
    rows.push(new TableRow({ children: [
      celda('TOTAL', false, true, GRIS_ROW),
      celda(f.totalMatriculados.toLocaleString('es-PE'), true, true, GRIS_ROW),
      celda(f.totalEncuestados.toLocaleString('es-PE'), true, true, GRIS_ROW),
      celda(f.porcentajeEncuestados.toFixed(2) + '%', true, true, GRIS_ROW),
    ]}));
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

function tablaAEInstitucional(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [
      celdaH('Facultad'),
      celdaH('AE-01\nCalidad presentación y contenido silábico'),
      celdaH('AE-02\nEjecución del proceso enseñanza aprendizaje'),
      celdaH('AE-03\nAplicación de la evaluación'),
      celdaH('AE-04\nFormación actitudinal y relaciones interpersonales'),
      celdaH('PROMEDIO POR FACULTAD'),
    ]}),
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

function tablaAECarreraSimple(c: DatosCarrera): Table {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [
    new TableRow({ children: [celdaH('Código'), celdaH('Aspecto evaluado'), celdaH('Calificación promedio')] }),
    new TableRow({ children: [celda('AE-01', true, true), celda(ASPECTOS_EVALUADOS['AE-01']), celdaN(c.promedioAE01, 2, true)] }),
    new TableRow({ children: [celda('AE-02', true, true), celda(ASPECTOS_EVALUADOS['AE-02']), celdaN(c.promedioAE02, 2, true)] }),
    new TableRow({ children: [celda('AE-03', true, true), celda(ASPECTOS_EVALUADOS['AE-03']), celdaN(c.promedioAE03, 2, true)] }),
    new TableRow({ children: [celda('AE-04', true, true), celda(ASPECTOS_EVALUADOS['AE-04']), celdaN(c.promedioAE04, 2, true)] }),
    new TableRow({ children: [celda('', true, false, GRIS_ROW), celda('PROMEDIO', false, true, GRIS_ROW), celdaN(c.promedioGeneral, 2, true)] }),
  ]});
}

function tablaAEPorCarrera(cod: string, f: DatosFacultad): Table {
  const carreras = [...f.carreras.values()];
  const carreraNames = carreras.map(c => c.carrera);
  const aeKeys = ['AE-01','AE-02','AE-03','AE-04'];
  const aeValues = [
    carreras.map(c => c.promedioAE01), carreras.map(c => c.promedioAE02),
    carreras.map(c => c.promedioAE03), carreras.map(c => c.promedioAE04),
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

function tablaDistribucion(c: DatosCarrera): Table {
  const califs = ['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const;
  const rows: TableRow[] = [
    new TableRow({ children: [celdaH('Juicio de valor'), celdaH('N° secciones calificadas'), celdaH('%')] }),
  ];
  for (const cal of califs) {
    const d = c.distribucion[cal];
    rows.push(new TableRow({ children: [
      celda(cal, true, true),
      celda(d.cantidad.toString(), true),
      celda(d.porcentaje.toFixed(2) + '%', true),
    ]}));
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', true, true, GRIS_ROW),
    celda(c.seccionesCalificadas.toString(), true, true, GRIS_ROW),
    celda('100%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 70, type: WidthType.PERCENTAGE }, rows });
}

function tablaIndicador(resumen: ResumenInstitucional): Table {
  const rows: TableRow[] = [
    new TableRow({ children: [celdaHOscura('UNIVERSIDAD PRIVADA DE TACNA', 4)] }),
    new TableRow({ children: [celdaH('FACULTAD'), celdaH('% BUENO'), celdaH('% DESTACADO'), celdaH('TOTAL')] }),
  ];
  let totalBueno = 0, totalDestacado = 0, count = 0;
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    rows.push(new TableRow({ children: [
      celda(cod, true, true),
      celda(f.porcBueno.toFixed(2) + '%', true),
      celda(f.porcDestacado.toFixed(2) + '%', true),
      celda(f.indicadorPlanEstrategico.toFixed(2) + '%', true, true),
    ]}));
    totalBueno += f.porcBueno; totalDestacado += f.porcDestacado; count++;
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(count > 0 ? (totalBueno / count).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(count > 0 ? (totalDestacado / count).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(resumen.indicadorPlanEstrategico.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

// ── Bloques de carrera (AE + distribución + gráfico) ─────────────────────────

async function bloquesCarrera(
  c: DatosCarrera,
  simple: boolean,
  pieCalif: Uint8Array | null,
): Promise<(Paragraph | Table)[]> {
  const items: (Paragraph | Table)[] = [];
  if (simple) {
    items.push(tablaAECarreraSimple(c), salto());
    items.push(parrafo(interpretarTablaAE(c)), salto());
  }

  items.push(
    parrafo(`N° de secciones calificadas: ${c.seccionesCalificadas}`),
    tablaDistribucion(c),
    salto(),
  );

  // Gráfico de torta de calificación por carrera
  if (pieCalif) {
    items.push(imagenCentrada(pieCalif, 340, 280));
  }

  items.push(
    parrafo(interpretarDistribucion(c)),
    salto(),
  );
  return items;
}

// ── Sección 1: Introducción ───────────────────────────────────────────────────

function seccion1(ciclo: string, config: ConfigInforme): (Paragraph | Table)[] {
  const año = new Date().getFullYear();
  const responsable = config.nombreResponsable ?? '[Nombre del Responsable]';
  const cargo = config.cargoResponsable ?? '[Cargo]';

  return [
    titulo('1. INFORMACIÓN GENERAL', HeadingLevel.HEADING_1), salto(),

    titulo('1.1. Antecedentes normativos', HeadingLevel.HEADING_2), salto(),
    parrafo('La evaluación del desempeño docente en la Universidad Privada de Tacna (UPT) se sustenta en la normatividad institucional vigente que establece la aplicación periódica de encuestas académicas como mecanismo de mejora continua de la calidad educativa.'),
    parrafo('Este proceso se enmarca en el Estatuto de la Universidad Privada de Tacna, el Reglamento de Evaluación del Desempeño Docente, así como en los lineamientos del Modelo de Licenciamiento Institucional y los estándares del proceso de acreditación de las carreras profesionales.'),
    salto(),

    titulo('1.2. Generalidades', HeadingLevel.HEADING_2), salto(),
    parrafo(`La encuesta académica "Tu Opinión Cuenta" del semestre ${ciclo} tiene como objetivo recoger la percepción de los estudiantes sobre el desempeño docente en cuatro aspectos evaluados: calidad de la presentación y contenido silábico (AE-01), ejecución del proceso enseñanza-aprendizaje (AE-02), aplicación de la evaluación (AE-03) y formación actitudinal y relaciones interpersonales con los estudiantes (AE-04).`),
    parrafo('Los resultados obtenidos permiten identificar fortalezas y oportunidades de mejora en la práctica docente, constituyendo un insumo clave para la toma de decisiones académicas y la formulación de planes de mejora.'),
    salto(),

    titulo('1.3. Responsabilidades', HeadingLevel.HEADING_2), salto(),
    parrafo(`La aplicación, procesamiento y presentación de los resultados de la encuesta académica "${ciclo}" estuvo a cargo de la Gerencia de Planificación y Desarrollo Académico, bajo la responsabilidad de:`),
    viñeta(`${responsable} — ${cargo}`),
    salto(),

    titulo('1.4. Cronograma de ejecución', HeadingLevel.HEADING_2), salto(),
    parrafo(`La encuesta académica "Tu Opinión Cuenta" del semestre ${ciclo} se ejecutó durante el período de evaluación parcial y final del semestre académico, conforme al cronograma establecido por la Dirección Académica. El procesamiento y análisis de resultados se realizó durante el mes de ${new Date().toLocaleString('es-PE', { month: 'long' })} del año ${año}.`),
    salto(),

    titulo('1.5. Ejecución presupuestal', HeadingLevel.HEADING_2), salto(),
    parrafo('La aplicación de la encuesta académica se realizó mediante plataforma virtual institucional, sin demanda de recursos presupuestales adicionales, utilizando la infraestructura tecnológica disponible en la Universidad Privada de Tacna.'),
    salto(),

    titulo('1.6. Publicidad y difusión', HeadingLevel.HEADING_2), salto(),
    parrafo('La convocatoria para la participación en la encuesta académica se realizó a través de los canales oficiales de comunicación de la universidad, incluyendo el portal web institucional, correos electrónicos institucionales, y comunicación directa a través de los directores de escuela y docentes.'),
    salto(),

    titulo('1.7. Acciones promovidas', HeadingLevel.HEADING_2), salto(),
    parrafo('Con la finalidad de incrementar la tasa de participación estudiantil, se llevaron a cabo las siguientes acciones:'),
    viñeta('Distribución de manuales de instrucción para el acceso a la plataforma de encuestas.'),
    viñeta('Comunicación mediante banners y material informativo en las instalaciones de la universidad.'),
    viñeta('Sensibilización a los estudiantes a través de los directores de escuela y coordinadores académicos.'),
    viñeta('Monitoreo continuo de la participación durante el período de aplicación.'),
    salto(),
  ];
}

// ── Sección 2: Difusión de resultados ────────────────────────────────────────

function seccion2(config: ConfigInforme): (Paragraph | Table)[] {
  const texto = config.textoDifusion
    ?? 'Los resultados de la encuesta académica "Tu Opinión Cuenta" fueron comunicados a las Facultades y Escuelas Profesionales mediante oficio circular, con la finalidad de que las autoridades académicas correspondientes tomen conocimiento y adopten las medidas de mejora pertinentes.';
  return [
    titulo('2. DIFUSIÓN DE RESULTADOS', HeadingLevel.HEADING_1), salto(),
    parrafo(texto),
    salto(),
  ];
}

// ── Informe institucional completo ────────────────────────────────────────────

export async function generarInformeFinalDocx(
  ciclo: string,
  resumen: ResumenInstitucional,
  config: ConfigInforme = {},
  graficosMap: Map<string, string> = new Map(),
): Promise<void> {

  // Pre-generar todos los gráficos de torta en paralelo
  // Colores participación: navy + dorado (coincide con el original)
  const coloresParticipacion = ['#2B3A67', '#C4A35A'];
  const etiqParticipacion    = ['Encuestados', 'No Encuestados'];
  // Colores calificación: igual al original PDF (INSATISFACTORIO primero → DESTACADO último)
  const etiqDistrib   = ['INSATISFACTORIO', 'ACEPTABLE', 'BUENO', 'DESTACADO'] as const;
  const coloresDistrib = ['#FF0000', '#A5A5A5', '#FFC000', '#4472C4'];

  // Pie institucional (3.1)
  const pieInstitucionalPromise = canvasPieToUint8(
    [resumen.totalEncuestados, Math.max(0, resumen.totalMatriculados - resumen.totalEncuestados)],
    coloresParticipacion, etiqParticipacion,
    {
      title: ['ESTUDIANTES ENCUESTADOS Y', 'ESTUDIANTES NO ENCUESTADOS'],
      subtitle: 'A NIVEL INSTITUCIONAL',
    },
  );

  // Pies por facultad (3.2)
  const pieFacultadesPromises = ORDEN_FACULTADES.map(cod => {
    const f = resumen.facultades.get(cod);
    if (!f) return Promise.resolve(null);
    return canvasPieToUint8(
      [f.totalEncuestados, Math.max(0, f.totalMatriculados - f.totalEncuestados)],
      coloresParticipacion, etiqParticipacion,
      {
        title: ['ESTUDIANTES ENCUESTADOS Y', 'ESTUDIANTES NO ENCUESTADOS'],
        subtitle: `DE ${cod}`,
      },
    );
  });

  // Pies de calificación por carrera (3.3.2) — orden: INSATISFACTORIO→ACEPTABLE→BUENO→DESTACADO
  const todasLasCarreras: { cod: string; carrera: DatosCarrera }[] = [];
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    for (const c of f.carreras.values()) {
      todasLasCarreras.push({ cod, carrera: c });
    }
  }
  const pieCarrerasPromises = todasLasCarreras.map(({ carrera: c }) =>
    canvasPieToUint8(
      etiqDistrib.map(cal => c.distribucion[cal]?.cantidad ?? 0),
      coloresDistrib, [...etiqDistrib],
      { title: c.carrera },
    )
  );

  // Esperar todas en paralelo
  const [pieInstitucional, ...restResults] = await Promise.all([
    pieInstitucionalPromise,
    ...pieFacultadesPromises,
    ...pieCarrerasPromises,
  ]);
  const pieFacultades = restResults.slice(0, ORDEN_FACULTADES.length) as (Uint8Array | null)[];
  const pieCarreras = restResults.slice(ORDEN_FACULTADES.length) as (Uint8Array | null)[];

  // Mapa carrera → pie index
  const pieCarreraMap = new Map<string, Uint8Array | null>();
  todasLasCarreras.forEach(({ carrera: c }, i) => pieCarreraMap.set(c.carrera, pieCarreras[i]));

  // ── Construir documento ──────────────────────────────────────────────────────
  const children: (Paragraph | Table | TableOfContents)[] = [];

  // ── Portada ──
  const numInforme = config.numeroInforme ? `Informe N° ${config.numeroInforme}` : '';
  children.push(
    salto(), salto(), salto(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 1200, after: 400 },
      children: [new TextRun({ text: 'UNIVERSIDAD PRIVADA DE TACNA', bold: true, size: 40, color: AZUL_OSCURO })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Gerencia de Planificación y Desarrollo Académico', size: 24, color: '555555' })],
    }),
    salto(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 160 },
      children: [new TextRun({ text: numInforme || '', bold: true, size: 24, color: AZUL_HEADER })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'Informe Final de la Aplicación de', bold: true, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: 'Encuesta Académica', bold: true, size: 28 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: `"TU OPINIÓN CUENTA ${ciclo}"`, bold: true, size: 36, color: AZUL_HEADER })],
    }),
    salto(), salto(),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: `Tacna, ${new Date().getFullYear()}`, size: 24 })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── Tabla de contenidos ──
  children.push(
    titulo('ÍNDICE', HeadingLevel.HEADING_1),
    salto(),
    new TableOfContents('Tabla de Contenidos', {
      hyperlink: true,
      headingStyleRange: '1-4',
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // ── Sección 1: Introducción ──
  for (const item of seccion1(ciclo, config)) {
    children.push(item as Paragraph | Table);
  }

  // ── Sección 2: Difusión ──
  for (const item of seccion2(config)) {
    children.push(item as Paragraph | Table);
  }

  // ── Sección 3: Procesamiento ──
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
  );
  if (pieInstitucional) {
    children.push(imagenCentrada(pieInstitucional, 360, 300));
  }
  children.push(
    parrafo(interpretarParticipacion(resumen.totalEncuestados, resumen.totalMatriculados, 'la Universidad Privada de Tacna')),
    salto(),
  );

  // ── 3.2 Participación por facultad ──
  children.push(titulo('3.2. Reporte del N° y % de estudiantes encuestados por Facultades', HeadingLevel.HEADING_2), salto());
  let subfac = 1;
  for (const [idx, cod] of ORDEN_FACULTADES.entries()) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    children.push(
      titulo(`3.2.${subfac}. ${FACULTADES[cod]?.nombre ?? cod}`, HeadingLevel.HEADING_3),
      salto(),
      tablaParticipacionFacultad(cod, f),
      salto(),
    );
    const pieFac = pieFacultades[idx];
    if (pieFac) {
      children.push(imagenCentrada(pieFac, 360, 290));
    }
    children.push(
      parrafo(interpretarParticipacion(f.totalEncuestados, f.totalMatriculados, FACULTADES[cod]?.nombre ?? cod)),
      salto(),
    );
    subfac++;
  }

  // ── 3.3 Notas y criterios ──
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
    parrafo(`Interpretación: ${interpretarInstitucionAE(resumen)}`),
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
      const c = carreras[0];
      const pieCalif = pieCarreraMap.get(c.carrera) ?? null;
      const bloques = await bloquesCarrera(c, true, pieCalif);
      for (const b of bloques) children.push(b);

      // Imagen de gráfico pasado desde la vista web (si existe)
      const imgData = graficosMap.get(c.carrera);
      if (imgData && !pieCalif) {
        try {
          const b64 = imgData.split(',')[1];
          children.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new ImageRun({ data: Buffer.from(b64, 'base64'), transformation: { width: 300, height: 220 }, type: 'png' })],
          }));
        } catch { /* imagen no disponible */ }
      }
    } else {
      children.push(tablaAEPorCarrera(cod, f), salto());

      for (const c of carreras) {
        children.push(
          new Paragraph({ children: [new TextRun({ text: c.carrera, bold: true, size: 22, italics: true })] }),
          salto(),
        );
        const pieCalif = pieCarreraMap.get(c.carrera) ?? null;
        const bloques = await bloquesCarrera(c, false, pieCalif);
        for (const b of bloques) children.push(b);

        const imgData = graficosMap.get(c.carrera);
        if (imgData && !pieCalif) {
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
    parrafo(`El indicador del Plan Estratégico Institucional para el ciclo ${ciclo} es del ${resumen.indicadorPlanEstrategico.toFixed(2)}%, representando la proporción de secciones evaluadas con calificación BUENO o DESTACADO.`),
    salto(),
  );

  // ── 5. Conclusiones ──
  children.push(
    titulo('5. CONCLUSIONES', HeadingLevel.HEADING_1), salto(),
    viñeta('Los resultados de la encuesta académica empleadas por las Carreras Profesionales permitieron identificar fortalezas y oportunidades de mejora en el proceso de enseñanza aprendizaje, constituyendo un insumo clave para el cumplimiento de los objetivos institucionales respecto a la evaluación del desempeño docente como lo establece la normatividad vigente.'),
    viñeta(generarConclusion1(resumen, ciclo)),
    viñeta(`El promedio general institucional del desempeño docente para el ciclo ${ciclo} es de ${resumen.promedioGeneral.toFixed(2)}, que corresponde a la categoría ${categoriaPromedio(resumen.promedioGeneral)} según la escala de calificación institucional.`),
    salto(),
  );

  // ── 6. Recomendaciones ──
  children.push(
    titulo('6. RECOMENDACIONES', HeadingLevel.HEADING_1), salto(),
    viñeta(generarRecomendacion1(resumen)),
    viñeta('Se recomienda incentivar y motivar la participación activa de los estudiantes en la aplicación de la encuesta académica, considerando que los criterios evaluados constituyen aspectos fundamentales para valorar el desempeño docente y la calidad del proceso formativo.'),
    viñeta('Los resultados de esta encuesta representan un insumo valioso para la toma de decisiones de mejora continua por parte de las Direcciones y Coordinaciones de Escuela Profesional, permitiendo identificar fortalezas, áreas de mejora y oportunidades de desarrollo docente.'),
    salto(),
  );

  // ── Firma ──
  const firmante = config.nombreFirmante ?? '[Nombre del responsable]';
  const cargoFirmante = config.cargoFirmante ?? '[Cargo]';
  children.push(
    salto(), salto(),
    new Paragraph({
      children: [new TextRun({ text: 'Sin otro en particular. Atentamente,', size: 22 })],
    }),
    salto(), salto(), salto(),
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(50), size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: firmante, bold: true, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: cargoFirmante, size: 22 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Universidad Privada de Tacna', size: 22 })],
    }),
  );

  const doc = new Document({
    numbering: {
      config: [{
        reference: 'bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '–',
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: convertInchesToTwip(0.3), hanging: convertInchesToTwip(0.18) } } },
        }],
      }],
    },
    sections: [{ properties: {}, children: children as (Paragraph | Table)[] }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_TuOpinionCuenta_${ciclo}.docx`);
}

// ── Informe por facultad ──────────────────────────────────────────────────────

export async function generarInformeFacultadDocx(
  ciclo: string,
  cod: string,
  f: DatosFacultad,
  config: ConfigInforme = {},
): Promise<void> {
  const nombreFacultad = FACULTADES[cod]?.nombre ?? cod;
  const children: (Paragraph | Table)[] = [];
  const carreras = [...f.carreras.values()];
  const esSimple = carreras.length === 1;

  const etiqDistribFac   = ['INSATISFACTORIO', 'ACEPTABLE', 'BUENO', 'DESTACADO'] as const;
  const coloresDistribFac = ['#FF0000', '#A5A5A5', '#FFC000', '#4472C4'];

  // Generar gráficos
  const pieFac = await canvasPieToUint8(
    [f.totalEncuestados, Math.max(0, f.totalMatriculados - f.totalEncuestados)],
    ['#2B3A67', '#C4A35A'],
    ['Encuestados', 'No Encuestados'],
    {
      title: ['ESTUDIANTES ENCUESTADOS Y', 'ESTUDIANTES NO ENCUESTADOS'],
      subtitle: `DE ${cod}`,
    },
  );
  const pieCarreras = await Promise.all(carreras.map(c =>
    canvasPieToUint8(
      etiqDistribFac.map(cal => c.distribucion[cal]?.cantidad ?? 0),
      coloresDistribFac, [...etiqDistribFac],
      { title: c.carrera },
    )
  ));

  // Portada
  const numInforme = config.numeroInforme ? `Informe N° ${config.numeroInforme}` : '';
  children.push(
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1000, after: 300 }, children: [new TextRun({ text: 'UNIVERSIDAD PRIVADA DE TACNA', bold: true, size: 36, color: AZUL_OSCURO })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: [new TextRun({ text: nombreFacultad.toUpperCase(), bold: true, size: 26, color: AZUL_HEADER })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: numInforme, size: 22, color: AZUL_HEADER })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Informe de Resultados de Encuesta Académica', bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `"TU OPINIÓN CUENTA ${ciclo}"`, bold: true, size: 30, color: AZUL_HEADER })] }),
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tacna, ${new Date().getFullYear()}`, size: 22 })] }),
    new Paragraph({ children: [new PageBreak()] }),
  );

  // Participación
  children.push(
    titulo('Reporte del N° y % de estudiantes encuestados', HeadingLevel.HEADING_1),
    titulo(nombreFacultad, HeadingLevel.HEADING_2),
    salto(),
    tablaParticipacionFacultad(cod, f),
    salto(),
  );
  if (pieFac) children.push(imagenCentrada(pieFac, 360, 290));
  children.push(parrafo(interpretarParticipacion(f.totalEncuestados, f.totalMatriculados, nombreFacultad)), salto());

  // Criterios y escala
  children.push(
    titulo('Reporte de notas y % de docentes evaluados por criterios de evaluación y juicio de valor', HeadingLevel.HEADING_1),
    salto(), negrita('Criterios de evaluación'), salto(),
    tablaCriteriosEvaluacion(), salto(),
    negrita('Escala de calificación'), salto(),
    tablaEscalaCalificacion(), salto(),
  );

  // Resultados por carrera
  children.push(titulo(nombreFacultad, HeadingLevel.HEADING_2), salto());

  if (esSimple) {
    const c = carreras[0];
    const bloques = await bloquesCarrera(c, true, pieCarreras[0] ?? null);
    for (const b of bloques) children.push(b);
  } else {
    children.push(tablaAEPorCarrera(cod, f), salto());
    for (const [i, c] of carreras.entries()) {
      children.push(titulo(c.carrera, HeadingLevel.HEADING_3), salto());
      children.push(tablaAECarreraSimple(c), salto());
      children.push(parrafo(interpretarTablaAE(c)), salto());
      const bloques = await bloquesCarrera(c, false, pieCarreras[i] ?? null);
      for (const b of bloques) children.push(b);
    }
  }

  // Indicador
  children.push(titulo('Indicador del Plan Estratégico', HeadingLevel.HEADING_1), salto());
  const rowsInd: TableRow[] = [
    new TableRow({ children: [celdaH('Carrera Profesional'), celdaH('% BUENO'), celdaH('% DESTACADO'), celdaH('TOTAL')] }),
  ];
  let totalB = 0, totalD = 0, countC = 0;
  for (const c of carreras) {
    const pB = c.distribucion.BUENO.porcentaje;
    const pD = c.distribucion.DESTACADO.porcentaje;
    rowsInd.push(new TableRow({ children: [
      celda(c.carrera), celda(pB.toFixed(2) + '%', true), celda(pD.toFixed(2) + '%', true),
      celda((pB + pD).toFixed(2) + '%', true, true),
    ]}));
    totalB += pB; totalD += pD; countC++;
  }
  rowsInd.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(countC > 0 ? (totalB / countC).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(countC > 0 ? (totalD / countC).toFixed(2) + '%' : '—', true, true, GRIS_ROW),
    celda(f.indicadorPlanEstrategico.toFixed(2) + '%', true, true, GRIS_ROW),
  ]}));
  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: rowsInd }), salto());

  // Conclusiones y recomendaciones
  const mejorK = (['promedioAE01','promedioAE02','promedioAE03','promedioAE04'] as const)
    .reduce((best, k) => f[k] > f[best] ? k : best, 'promedioAE01' as const);
  const peorK = (['promedioAE01','promedioAE02','promedioAE03','promedioAE04'] as const)
    .reduce((worst, k) => f[k] < f[worst] ? k : worst, 'promedioAE01' as const);
  const mapAE: Record<string, string> = { promedioAE01: 'AE-01', promedioAE02: 'AE-02', promedioAE03: 'AE-03', promedioAE04: 'AE-04' };

  children.push(
    titulo('Conclusiones', HeadingLevel.HEADING_1), salto(),
    viñeta(`Del total de ${f.totalMatriculados.toLocaleString()} estudiantes matriculados en el semestre académico ${ciclo} en la ${nombreFacultad}, ${f.totalEncuestados.toLocaleString()} estudiantes han aplicado la encuesta académica, equivalente al ${f.porcentajeEncuestados.toFixed(2)}%.`),
    viñeta(`El criterio con mayor calificación es ${mapAE[mejorK]}: ${ASPECTOS_EVALUADOS[mapAE[mejorK]]} (${f[mejorK].toFixed(2)}), mientras que el criterio con menor calificación es ${mapAE[peorK]}: ${ASPECTOS_EVALUADOS[mapAE[peorK]]} (${f[peorK].toFixed(2)}).`),
    salto(),
    titulo('Recomendaciones', HeadingLevel.HEADING_1), salto(),
    viñeta(`Dado que el indicador con menor porcentaje fue "${ASPECTOS_EVALUADOS[mapAE[peorK]]}", se recomienda implementar estrategias orientadas al fortalecimiento de las competencias correspondientes en la plana docente de la ${nombreFacultad}.`),
    viñeta('Se recomienda incentivar y motivar la participación activa de los estudiantes en la aplicación de la encuesta académica en el siguiente semestre.'),
    salto(),
  );

  // Firma
  const firmante = config.nombreFirmante ?? '[Nombre del responsable]';
  const cargoFirmante = config.cargoFirmante ?? '[Cargo]';
  children.push(
    salto(), salto(),
    new Paragraph({ children: [new TextRun({ text: 'Sin otro en particular. Atentamente,', size: 22 })] }),
    salto(), salto(), salto(),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(50), size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: firmante, bold: true, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: cargoFirmante, size: 22 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Universidad Privada de Tacna', size: 22 })] }),
  );

  const doc = new Document({ sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_${cod}_TuOpinionCuenta_${ciclo}.docx`);
}
