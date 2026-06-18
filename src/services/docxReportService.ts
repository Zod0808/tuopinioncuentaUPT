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
  esValidoParaReporte,
} from './reportCalculations';
import { FACULTADES, ORDEN_FACULTADES, ASPECTOS_EVALUADOS, ESCALA_CALIFICACION, calcularCalificacion, QUORUM_MINIMO_ENCUESTADOS } from '../config/universityStructure';
import { EvaluacionData } from '../types';

// ── Configuración del informe (provista por el usuario) ───────────────────────

export interface ConfigInforme {
  numeroInforme?: string;            // p.ej. "008-2025-GPAD-UPT"
  nombreResponsable?: string;        // nombre del responsable de la encuesta
  cargoResponsable?: string;         // cargo del responsable
  textoDifusion?: string;            // texto para sección 2 de difusión
  nombreFirmante?: string;           // nombre para el cierre
  cargoFirmante?: string;            // cargo para el cierre
  semesterAnterior?: string;         // etiqueta del ciclo anterior, p.ej. "2025-II"
  participacionAnteriorPct?: number; // % de participación del ciclo anterior, p.ej. 84.99
  cronograma?: string;               // p.ej. "Del 11 al 25 de mayo del 2026"
}

// ── Colores corporativos ──────────────────────────────────────────────────────

const AZUL_HEADER = '2E5C8A';
const AZUL_OSCURO = '1a365d';
const GRIS_ROW    = 'F2F2F2';

// Fuente corporativa por defecto — Arial 12 pt (24 half-points)
const DOCX_STYLES = {
  default: {
    document: { run: { font: 'Arial', size: 24 } },
  },
} as const;

// Semaforización: fondos de celda por calificación (paleta institucional sobria)
const COLOR_DESTACADO       = '1F3864'; // azul marino
const COLOR_BUENO           = '9DC3E6'; // celeste
const COLOR_ACEPTABLE       = 'FFD966'; // oro
const COLOR_INSATISFACTORIO = 'FFFFFF'; // blanco
const COLOR_SUBQUORUM       = 'FFF3CD';

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

// ── Generación de gráfico de barras horizontales con Canvas ──────────────────

interface BarChartCfg {
  title?: string;
  maxValue?: number;   // eje X máximo (20 para notas, 100 para porcentajes)
  unit?: string;       // sufijo del valor, p.ej. '' o '%'
  width?: number;
}

async function canvasBarToUint8(
  labels: string[],
  values: number[],
  cfg: BarChartCfg = {},
): Promise<Uint8Array | null> {
  if (labels.length === 0) return null;
  try {
    const maxVal = cfg.maxValue ?? 20;
    const unit   = cfg.unit ?? '';
    const W      = cfg.width ?? 800;
    const barH   = 46;
    const gap    = 10;
    const leftPad  = 230;
    const rightPad = 70;
    const topPad   = 48;
    const botPad   = 36;
    const chartW = W - leftPad - rightPad;
    const H = topPad + labels.length * (barH + gap) + gap + botPad;

    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);

    if (cfg.title) {
      ctx.fillStyle = '#1a365d';
      ctx.font = 'bold 15px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(cfg.title, W / 2, 10);
    }

    const chartTop = topPad;
    const chartBot = H - botPad;

    // Líneas de cuadrícula verticales y etiquetas de eje X
    const isNota = maxVal <= 20;
    const gridSteps = isNota ? [0, 5, 10, 15, 20] : [0, 25, 50, 75, 100];
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for (const s of gridSteps) {
      const x = leftPad + (s / maxVal) * chartW;
      ctx.beginPath(); ctx.moveTo(x, chartTop); ctx.lineTo(x, chartBot); ctx.stroke();
      ctx.fillStyle = '#718096';
      ctx.font = '11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${s}${unit}`, x, chartBot + 4);
    }

    // Líneas de umbral de calificación (punteadas) para escala de nota
    if (isNota) {
      const thresholds = [
        { v: 11.0, c: '#fc8181' }, { v: 15.1, c: '#ecc94b' }, { v: 17.1, c: '#48bb78' },
      ];
      for (const th of thresholds) {
        const x = leftPad + (th.v / maxVal) * chartW;
        ctx.strokeStyle = th.c;
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(x, chartTop); ctx.lineTo(x, chartBot); ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Barras
    const wrapLabel = (text: string, maxW: number, fontSize: number): string[] => {
      ctx.font = `bold ${fontSize}px Arial`;
      const words = text.split(' ');
      const lines: string[] = [];
      let cur = '';
      for (const w of words) {
        const test = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(test).width <= maxW) { cur = test; }
        else { if (cur) lines.push(cur); cur = w; }
      }
      if (cur) lines.push(cur);
      return lines;
    };

    for (let i = 0; i < labels.length; i++) {
      const v  = values[i] ?? 0;
      const y  = chartTop + gap / 2 + i * (barH + gap);
      const bw = Math.max(0, Math.min((v / maxVal) * chartW, chartW));

      // Color sólido azul marino
      ctx.fillStyle = '#1F3864';
      ctx.fillRect(leftPad, y, bw, barH);

      // Etiqueta con word-wrap
      const labelLines = wrapLabel(labels[i], leftPad - 14, 10);
      const lineH = 13;
      const totalTextH = labelLines.length * lineH;
      const textStartY = y + (barH - totalTextH) / 2;
      ctx.fillStyle = '#1a365d';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      for (let li = 0; li < labelLines.length; li++) {
        ctx.fillText(labelLines[li], leftPad - 8, textStartY + li * lineH);
      }

      // Valor al final de la barra
      ctx.fillStyle = '#2d3748';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${v.toFixed(2)}${unit}`, leftPad + bw + 6, y + barH / 2);
    }

    // Línea base eje X
    ctx.strokeStyle = '#a0aec0';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(leftPad, chartBot); ctx.lineTo(leftPad + chartW, chartBot); ctx.stroke();

    return await new Promise<Uint8Array | null>((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) { resolve(null); return; }
        blob.arrayBuffer().then((buf) => resolve(new Uint8Array(buf)));
      }, 'image/png');
    });
  } catch { return null; }
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

function isLightFill(hex: string): boolean {
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 0.299 + g * 0.587 + b * 0.114) > 128;
}

function celda(text: string, center = false, bold = false, fill?: string): TableCell {
  const textColor = fill ? (isLightFill(fill) ? '000000' : 'FFFFFF') : '000000';
  return new TableCell({
    shading: fill ? { type: ShadingType.CLEAR, fill } : undefined,
    children: [new Paragraph({
      alignment: center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text: String(text), bold, size: 18, color: textColor })],
    })],
  });
}

function celdaN(value: number, decimals = 2, bold = false): TableCell {
  return celda(value.toFixed(decimals), true, bold);
}

/** Devuelve el color de fondo para una calificación (para semaforización). */
function colorCalif(calif: string): string | undefined {
  const map: Record<string, string> = {
    DESTACADO: COLOR_DESTACADO, BUENO: COLOR_BUENO,
    ACEPTABLE: COLOR_ACEPTABLE, INSATISFACTORIO: COLOR_INSATISFACTORIO,
  };
  return map[calif];
}

// ── Helpers de párrafo ────────────────────────────────────────────────────────

function titulo(text: string, level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2): Paragraph {
  return new Paragraph({ heading: level, children: [new TextRun({ text, bold: true })] });
}

function parrafo(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    spacing: { after: 120 },
    children: [new TextRun({ text, size: 24 })],
  });
}

function negrita(text: string): Paragraph {
  return new Paragraph({ children: [new TextRun({ text, size: 24, bold: true })] });
}

function salto(): Paragraph {
  return new Paragraph({ children: [new TextRun('')] });
}

function viñeta(text: string): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.BOTH,
    indent: { left: convertInchesToTwip(0.3) },
    spacing: { after: 80 },
    children: [new TextRun({ text: `– ${text}`, size: 24 })],
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
    const fill = d.porcentaje > 0 ? colorCalif(cal) : undefined;
    rows.push(new TableRow({ children: [
      celda(cal, true, true, fill),
      celda(d.cantidad.toString(), true, false, fill),
      celda(d.porcentaje.toFixed(2) + '%', true, false, fill),
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
  for (const cod of ORDEN_FACULTADES) {
    const f = resumen.facultades.get(cod);
    if (!f) continue;
    rows.push(new TableRow({ children: [
      celda(FACULTADES[cod]?.nombre ?? cod, false, true),
      celda(f.porcBueno.toFixed(2) + '%', true),
      celda(f.porcDestacado.toFixed(2) + '%', true),
      celda(f.indicadorPlanEstrategico.toFixed(2) + '%', true, true),
    ]}));
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(resumen.porcBueno.toFixed(2) + '%', true, true, GRIS_ROW),
    celda(resumen.porcDestacado.toFixed(2) + '%', true, true, GRIS_ROW),
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

  items.push(parrafo(`N° de secciones calificadas: ${c.seccionesCalificadas}`));

  // Gráfico de torta primero, después tabla, después interpretación
  if (pieCalif) {
    items.push(imagenCentrada(pieCalif, 400, 290));
  }

  items.push(
    tablaDistribucion(c),
    salto(),
    parrafo(interpretarDistribucion(c)),
    salto(),
  );
  return items;
}

// ── Tabla indicador plan estratégico (cabecera sección 4) ────────────────────

function tablaPlanEstrategico(ciclo: string): Table {
  const fila = (label: string, value: string): TableRow =>
    new TableRow({ children: [
      new TableCell({
        width: { size: 30, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: 'BDD7EE' },
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 18, color: '1F3864' })] })],
      }),
      new TableCell({
        width: { size: 70, type: WidthType.PERCENTAGE },
        children: [new Paragraph({ alignment: AlignmentType.BOTH, children: [new TextRun({ text: value, size: 18 })] })],
      }),
    ]});

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      fila('Indicador', 'Porcentaje de estudiantes que considera como bueno y muy bueno el proceso de enseñanza aprendizaje.'),
      fila('Periodicidad de la medición', `Semestral\n(${ciclo})`),
      fila('Fórmula', '% promedio de las facultades.'),
      fila('Frecuencia de reporte', 'Único'),
      fila('Resultado a obtener', 'Estudiantes encuestados que consideran como bueno o muy bueno el proceso de enseñanza aprendizaje'),
    ],
  });
}

// ── Sección 1: Introducción ───────────────────────────────────────────────────

function espacioImagen(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 300, after: 300 },
    children: [new TextRun({ text: '[Imagen del manual]', color: 'AAAAAA', italics: true, size: 24 })],
  });
}

function seccion1(ciclo: string, config: ConfigInforme): (Paragraph | Table)[] {
  const responsable = config.nombreResponsable ?? '[Nombre del Responsable]';
  const cargo       = config.cargoResponsable  ?? '[Cargo]';
  const cronograma  = config.cronograma        ?? 'Del 11 al 25 de mayo del 2026';

  return [
    titulo('1. INTRODUCCIÓN', HeadingLevel.HEADING_1), salto(),
    parrafo(`El presente informe evidencia las actividades ejecutadas de la encuesta académica Tu Opinión Cuenta ${ciclo} en el marco de lo programado en el Plan Anual de Trabajo de la oficina de GPAD 2025. A través de los resultados de la aplicación de la encuesta se fortalecerá el desarrollo pedagógico y la mejora continua del desempeño docente.`),
    salto(),

    titulo('1.1. Antecedentes Normativos', HeadingLevel.HEADING_2), salto(),
    viñeta('Con Resolución N°200-2019-UPT-CU se aprueba el Reglamento de evaluación de desempeño docente de la Universidad Privada de Tacna.'),
    viñeta(`Con Resolución N°190-2025-UPT-CU se aprueba la Directiva N°006-2025-UPT-VRAC Distribución de carga horaria semestre académico ${ciclo}.`),
    viñeta('Con Resolución Rectoral N°562-2025-UPT-R se aprueba el Plan de trabajo de la oficina de gestión de procesos académicos y docencia para el año 2025.'),
    salto(),

    titulo('1.2. Generalidades', HeadingLevel.HEADING_2), salto(),
    parrafo('Implementar el mecanismo de la aplicación de las encuestas académicas virtuales en la universidad es fundamental para evaluar el desempeño del docente universitario, con la finalidad de potenciar sus competencias en el cumplimiento de sus funciones y conocer la percepción de los estudiantes respecto a su desempeño, lo que resulta esencial para identificar fortalezas y debilidades en el proceso educativo y promover su mejora continua.'),
    parrafo('Además, la recopilación de información del desempeño docente según criterios de evaluación permitirá tomar decisiones respecto a políticas y medidas que permitan mejorar la calidad de la formación profesional de los estudiantes como lo establece el Reglamento de Evaluación del Desempeño docente de la UPT en su Art°21. Evaluación a cargo de los estudiantes.'),
    parrafo(`La aplicación de la encuesta académica TU OPINIÓN CUENTA en el semestre académico ${ciclo} tienen por objeto promover la mejora de la calidad del servicio educativo que ofrece nuestra universidad, en el ámbito de la enseñanza aprendizaje:`),
    viñeta('Identificar las fortalezas y debilidades de los docentes en su desempeño durante el desarrollo del proceso académico.'),
    viñeta('Lograr la participación activa y responsable de los estudiantes en la verificación de la calidad de la formación profesional que reciben.'),
    viñeta('Recopilar y analizar datos de evaluación para medir la eficacia de las mejoras educativas.'),
    parrafo('En relación a los criterios a evaluar:'),
    negrita('Calidad de la presentación y contenido silábico de la asignatura'),
    parrafo('Evaluar la pertinencia, coherencia y actualización del contenido silábico, asegurando su alineación con los resultados de aprendizaje y los objetivos curriculares establecidos.'),
    negrita('Ejecución del proceso de enseñanza-aprendizaje'),
    parrafo('Analizar la efectividad de las estrategias metodológicas y didácticas implementadas por el docente para promover un aprendizaje significativo y participativo en los estudiantes.'),
    negrita('Aplicación de la evaluación de la asignatura'),
    parrafo('Examinar la adecuación, transparencia y consistencia de los mecanismos e instrumentos de evaluación empleados, verificando su correspondencia con las competencias y resultados de aprendizaje previstos.'),
    negrita('Formación actitudinal y relaciones interpersonales con los estudiantes'),
    parrafo('Valorar el desarrollo de actitudes éticas, comunicativas y colaborativas del docente, así como la calidad de las relaciones interpersonales que establece con los estudiantes en el proceso formativo.'),
    salto(),

    titulo('1.3. Responsabilidades', HeadingLevel.HEADING_2), salto(),
    viñeta(`${responsable} — ${cargo}`),
    viñeta('Mag. Ivette Eneida Atencio Iturry — Encargada del área de desarrollo académico'),
    salto(),

    titulo('1.4. Cronograma de ejecución', HeadingLevel.HEADING_2), salto(),
    parrafo('De acuerdo al cronograma se ejecutó en la siguiente fecha:'),
    parrafo(cronograma),
    salto(),

    titulo('1.5. Ejecución presupuestal', HeadingLevel.HEADING_2), salto(),
    parrafo('La aplicación de la encuesta académica se realizó mediante plataforma virtual institucional (INTRANET), sin demanda de recursos presupuestales adicionales, utilizando la infraestructura tecnológica disponible en la Universidad Privada de Tacna.'),
    salto(),

    titulo('1.6. Publicidad y difusión', HeadingLevel.HEADING_2), salto(),
    parrafo('La convocatoria para la participación en la encuesta académica se realizó a través de los canales oficiales de comunicación de la universidad, plataformas institucionales y publicidad física.'),
    salto(),

    titulo('1.7. Acciones promovidas', HeadingLevel.HEADING_2), salto(),

    titulo('1.7.1. Publicidad física', HeadingLevel.HEADING_3),
    parrafo('Se realizó las instalaciones de Banners en las puertas de ingreso de las Facultades de: FACEM, FACSA, FAEDCOH y FAING.'),
    salto(),

    titulo('1.7.2. Manual didáctico de pasos de aplicación de la encuesta académica – estudiantes.', HeadingLevel.HEADING_3),
    parrafo('A través del oficio Nro. 00576-2025-UPT-GPAD se remite a las diferentes Facultades el manual didáctico que establece los pasos para la ejecución de la encuesta académica a cargo de los estudiantes.'),
    espacioImagen(),
    salto(),

    titulo('1.7.3. Manual para la visualización de resultados de la aplicación de la encuesta académica – docentes.', HeadingLevel.HEADING_3),
    parrafo('A través del oficio Nro. 00576-2025-UPT-GPAD se remite a las diferentes Facultades el manual didáctico que establece los pasos para la visualización de los resultados de la aplicación de la encuesta académica de las asignaturas evaluadas de la plana docente.'),
    espacioImagen(),
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
  const coloresDistrib = ['#D9D9D9', '#FFD966', '#9DC3E6', '#1F3864'];

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

  // Barras de desempeño por facultad (3.3.1 y sección 4)
  const activeFacs = ORDEN_FACULTADES.filter(cod => resumen.facultades.has(cod));
  const barPromedioPromise = canvasBarToUint8(
    activeFacs.map(cod => FACULTADES[cod]?.nombre ?? cod),
    activeFacs.map(cod => resumen.facultades.get(cod)!.promedioGeneral),
    { title: 'PROMEDIO GENERAL DE DESEMPEÑO DOCENTE POR FACULTAD', maxValue: 20, unit: '' },
  );
  const barIndicadorPromise = canvasBarToUint8(
    activeFacs.map(cod => FACULTADES[cod]?.nombre ?? cod),
    activeFacs.map(cod => resumen.facultades.get(cod)!.indicadorPlanEstrategico),
    { title: '% EVALUADOS CON CALIFICACIÓN BUENO Y DESTACADO POR FACULTAD', maxValue: 100, unit: '%' },
  );

  // Esperar todas en paralelo
  const [pieInstitucional, barPromedioImg, barIndicadorImg, ...restResults] = await Promise.all([
    pieInstitucionalPromise,
    barPromedioPromise,
    barIndicadorPromise,
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
      children: [new TextRun({ text: 'Oficina de Gestión de Procesos Académicos y Docente', size: 24, color: '555555' })],
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
    children.push(imagenCentrada(pieInstitucional, 400, 290));
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
      children.push(imagenCentrada(pieFac, 400, 290));
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
  );
  if (barPromedioImg) children.push(imagenCentrada(barPromedioImg, 500, Math.round(500 * (94 + activeFacs.length * 56) / 800)), salto());
  children.push(
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
          new Paragraph({ children: [new TextRun({ text: c.carrera, bold: true, size: 24, italics: true })] }),
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
    tablaPlanEstrategico(ciclo),
    salto(),
    titulo('4.1 Reporte del porcentaje de estudiantes que consideran como "BUENO Y DESTACADO" (Indicador del Plan Estratégico institucional) por Facultad.', HeadingLevel.HEADING_2),
    salto(),
    tablaIndicador(resumen),
    salto(),
  );
  if (barIndicadorImg) children.push(imagenCentrada(barIndicadorImg, 500, Math.round(500 * (94 + activeFacs.length * 56) / 800)), salto());
  children.push(
    parrafo(`El indicador del Plan Estratégico Institucional para el ciclo ${ciclo} es del ${resumen.indicadorPlanEstrategico.toFixed(2)}%, representando la proporción de secciones evaluadas con calificación BUENO o DESTACADO.`),
    salto(),
  );

  // ── 5. Conclusiones ──
  const porcPartAct = resumen.totalMatriculados > 0
    ? (resumen.totalEncuestados / resumen.totalMatriculados) * 100
    : 0;
  const comparativoParticipacion = (() => {
    const prev = config.participacionAnteriorPct;
    const cicloP = config.semesterAnterior;
    if (prev == null || !cicloP) return null;
    const diff = porcPartAct - prev;
    const cambio = Math.abs(diff).toFixed(2);
    const tendencia = diff > 0
      ? `un incremento de ${cambio} puntos porcentuales`
      : diff < 0
        ? `una disminución de ${cambio} puntos porcentuales`
        : 'sin variación';
    return `Respecto al ciclo ${cicloP}, en el que se registró un porcentaje de participación del ${prev.toFixed(2)}%, el ciclo ${ciclo} presenta ${tendencia} (${porcPartAct.toFixed(2)}% vs. ${prev.toFixed(2)}%), lo que evidencia ${diff >= 0 ? 'una mejora en la respuesta estudiantil hacia la encuesta académica' : 'la necesidad de reforzar las estrategias de sensibilización para incrementar la participación estudiantil'}.`;
  })();
  children.push(
    titulo('5. CONCLUSIONES', HeadingLevel.HEADING_1), salto(),
    viñeta('Los resultados de la encuesta académica empleadas por las Carreras Profesionales permitieron identificar fortalezas y oportunidades de mejora en el proceso de enseñanza aprendizaje, constituyendo un insumo clave para el cumplimiento de los objetivos institucionales respecto a la evaluación del desempeño docente como lo establece la normatividad vigente.'),
    viñeta(generarConclusion1(resumen, ciclo)),
    viñeta(`El promedio general institucional del desempeño docente para el ciclo ${ciclo} es de ${resumen.promedioGeneral.toFixed(2)}, que corresponde a la categoría ${categoriaPromedio(resumen.promedioGeneral)} según la escala de calificación institucional.`),
    ...(comparativoParticipacion ? [viñeta(comparativoParticipacion)] : []),
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
      children: [new TextRun({ text: 'Sin otro en particular. Atentamente,', size: 24 })],
    }),
    salto(), salto(), salto(),
    new Paragraph({
      children: [new TextRun({ text: '_'.repeat(50), size: 24 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: firmante, bold: true, size: 24 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: cargoFirmante, size: 24 })],
    }),
    new Paragraph({
      children: [new TextRun({ text: 'Universidad Privada de Tacna', size: 24 })],
    }),
  );

  const doc = new Document({
    styles: DOCX_STYLES,
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
  const coloresDistribFac = ['#D9D9D9', '#FFD966', '#9DC3E6', '#1F3864'];

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
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: numInforme, size: 24, color: AZUL_HEADER })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 120 }, children: [new TextRun({ text: 'Informe de Resultados de Encuesta Académica', bold: true, size: 26 })] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 300 }, children: [new TextRun({ text: `"TU OPINIÓN CUENTA ${ciclo}"`, bold: true, size: 30, color: AZUL_HEADER })] }),
    salto(), salto(),
    new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: `Tacna, ${new Date().getFullYear()}`, size: 24 })] }),
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
  if (pieFac) children.push(imagenCentrada(pieFac, 400, 290));
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
  for (const c of carreras) {
    const pB = c.distribucion.BUENO.porcentaje;
    const pD = c.distribucion.DESTACADO.porcentaje;
    rowsInd.push(new TableRow({ children: [
      celda(c.carrera), celda(pB.toFixed(2) + '%', true), celda(pD.toFixed(2) + '%', true),
      celda((pB + pD).toFixed(2) + '%', true, true),
    ]}));
  }
  rowsInd.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(f.porcBueno.toFixed(2) + '%', true, true, GRIS_ROW),
    celda(f.porcDestacado.toFixed(2) + '%', true, true, GRIS_ROW),
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
    new Paragraph({ children: [new TextRun({ text: 'Sin otro en particular. Atentamente,', size: 24 })] }),
    salto(), salto(), salto(),
    new Paragraph({ children: [new TextRun({ text: '_'.repeat(50), size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: firmante, bold: true, size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: cargoFirmante, size: 24 })] }),
    new Paragraph({ children: [new TextRun({ text: 'Universidad Privada de Tacna', size: 24 })] }),
  );

  const doc = new Document({ styles: DOCX_STYLES, sections: [{ properties: {}, children }] });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_${cod}_TuOpinionCuenta_${ciclo}.docx`);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6 REPORTES INDIVIDUALES POR FACULTAD
// ═════════════════════════════════════════════════════════════════════════════

/** Calificación efectiva de un registro (prioriza el campo calificacion del Excel) */
function getCalifReg(r: EvaluacionData): 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO' {
  if (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'].includes(r.calificacion)) {
    return r.calificacion as 'DESTACADO' | 'BUENO' | 'ACEPTABLE' | 'INSATISFACTORIO';
  }
  return calcularCalificacion(r.nota);
}

/** Encabezado estándar para los 5 reportes de facultad */
function cabeceraReporte(tipo: string, nombreFac: string, ciclo: string): (Paragraph | Table)[] {
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: 'UNIVERSIDAD PRIVADA DE TACNA', bold: true, size: 28, color: AZUL_OSCURO })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: nombreFac, bold: true, size: 24, color: AZUL_HEADER })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: tipo.toUpperCase(), bold: true, size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: `TU OPINIÓN CUENTA — ${ciclo}`, bold: true, size: 24, color: AZUL_HEADER })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({
        text: new Date().toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        size: 24, color: '666666',
      })],
    }),
    salto(),
  ];
}


/** Tabla de leyenda AE-01→AE-04 para insertar al pie de cada reporte. */
function leyendaAEFooter(): (Paragraph | Table)[] {
  return [
    salto(),
    negrita('Leyenda — Aspectos Evaluados'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [celdaH('Código'), celdaH('Aspecto evaluado'), celdaH('Preguntas')] }),
        new TableRow({ children: [celda('AE-01', true, true), celda(ASPECTOS_EVALUADOS['AE-01']), celda('2, 3, 4', true)] }),
        new TableRow({ children: [celda('AE-02', true, true), celda(ASPECTOS_EVALUADOS['AE-02']), celda('5, 6, 7, 8', true)] }),
        new TableRow({ children: [celda('AE-03', true, true), celda(ASPECTOS_EVALUADOS['AE-03']), celda('9, 10, 11', true)] }),
        new TableRow({ children: [celda('AE-04', true, true), celda(ASPECTOS_EVALUADOS['AE-04']), celda('12, 13, 14, 15', true)] }),
      ],
    }),
    salto(),
  ];
}

/** Pie de tabla con fuente de datos. */
function fuenteTabla(): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 40, after: 80 },
    children: [new TextRun({ text: 'Fuente: INTRANET UPT', italics: true, size: 16, color: '666666' })],
  });
}

/** Cuadro de KPIs horizontales para insertar al inicio de cada reporte. */
function tablaKPI(kpis: { label: string; value: string; color?: string }[]): Table {
  const FONDO_LABEL = 'FAFAFA';
  const FONDO_VALOR = 'EBF3FB';
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ children: kpis.map(k => new TableCell({
        shading: { type: ShadingType.CLEAR, fill: FONDO_LABEL },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 60, after: 20 },
          children: [new TextRun({ text: k.label, bold: true, size: 20, color: '555555' })],
        })],
      })) }),
      new TableRow({ children: kpis.map(k => new TableCell({
        shading: { type: ShadingType.CLEAR, fill: k.color ?? FONDO_VALOR },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 80, after: 80 },
          children: [new TextRun({ text: k.value, bold: true, size: 28, color: AZUL_OSCURO })],
        })],
      })) }),
    ],
  });
}

async function saveDocx(doc: Document, filename: string): Promise<void> {
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

// ── Reporte 1: Docentes Insatisfactorios ─────────────────────────────────────
async function rpt1Insatisfactorios(ciclo: string, cod: string, f: DatosFacultad): Promise<void> {
  const nombreFac = FACULTADES[cod]?.nombre ?? cod;
  const todosReg  = [...f.carreras.values()].flatMap(c => c.registros);
  const malos     = todosReg.filter(r => esValidoParaReporte(r) && getCalifReg(r) === 'INSATISFACTORIO');

  const seccionesValidas1 = [...f.carreras.values()].reduce((s, c) => s + c.seccionesCalificadas, 0);
  const children: (Paragraph | Table)[] = [
    ...cabeceraReporte('Reporte de Docentes Insatisfactorios por Secciones', nombreFac, ciclo),
  ];
  const ROJO = 'FFB3B3'; // rojo claro para filas INSATISFACTORIO

  children.push(tablaKPI([
    { label: 'Secciones INSATISFACTORIO', value: malos.length.toString(), color: ROJO },
    { label: 'Secciones Válidas (total)', value: seccionesValidas1.toString() },
    { label: 'Promedio Facultad', value: f.promedioGeneral.toFixed(2) },
    { label: '% Insatisfactorio', value: seccionesValidas1 > 0 ? (malos.length / seccionesValidas1 * 100).toFixed(2) + '%' : '—', color: ROJO },
  ]), salto());

  if (malos.length === 0) {
    children.push(parrafo('No se registran secciones con calificación INSATISFACTORIO para esta facultad en el ciclo indicado.'));
  } else {
    const rows: TableRow[] = [
      new TableRow({ children: [
        celdaH('Carrera Profesional'), celdaH('Docente'),
        celdaH('Curso / Asignatura'), celdaH('Sección'),
        celdaH('Nota'), celdaH('N° Encuestados'), celdaH('N° No Encuestados'),
      ]}),
    ];
    const subQuorumMalos: EvaluacionData[] = [];
    for (const r of malos) {
      const esSubQ = r.encuestados > 0 && r.encuestados < QUORUM_MINIMO_ENCUESTADOS;
      if (esSubQ) subQuorumMalos.push(r);
      const fill = esSubQ ? COLOR_SUBQUORUM : ROJO;
      rows.push(new TableRow({ children: [
        celda(r.carreraProfesional, false, false, fill),
        celda(r.docente,            false, false, fill),
        celda(r.curso,              false, false, fill),
        celda(r.seccion,            true,  false, fill),
        celdaN(r.nota, 2, true),
        celda(esSubQ ? `${r.encuestados} [!]` : r.encuestados.toString(), true, false, fill),
        celda(r.noEncuestados.toString(), true, false, fill),
      ]}));
    }
    children.push(
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
      fuenteTabla(),
      parrafo(`Total de secciones insatisfactorias: ${malos.length}`),
    );
    if (subQuorumMalos.length > 0) {
      children.push(parrafo(`[!] ${subQuorumMalos.length} sección(es) con muestra insuficiente (menos de ${QUORUM_MINIMO_ENCUESTADOS} encuestados) — resultado no estadísticamente representativo.`));
    }
  }

  children.push(...leyendaAEFooter());
  await saveDocx(new Document({ styles: DOCX_STYLES, sections: [{ properties: {}, children }] }),
    `3. Reporte_Docentes_Insatisfactorios_${ciclo}_${cod}.docx`);
}

// rpt2NotasPorCarrera eliminado — fusionado en rpt6GeneralDocente (ver abajo).

// ── Reporte 3: Nro. Estudiantes Encuestados por Carrera ──────────────────────
async function rpt3EstudiantesCarrera(ciclo: string, cod: string, f: DatosFacultad): Promise<void> {
  const nombreFac    = FACULTADES[cod]?.nombre ?? cod;
  const totalSec     = [...f.carreras.values()].reduce((s, c) => s + c.registros.length, 0);
  const totalEnc     = f.totalEncuestados;
  const totalNoEnc   = [...f.carreras.values()].reduce((s, c) => s + c.totalNoEncuestados, 0);

  // Gráfico de participación
  const pieData = await canvasPieToUint8(
    [totalEnc, totalNoEnc],
    ['#2B3A67', '#C4A35A'],
    ['Encuestados', 'No Encuestados'],
    { title: ['ESTUDIANTES ENCUESTADOS Y', 'ESTUDIANTES NO ENCUESTADOS'], subtitle: `DE ${cod}` },
  );

  const children: (Paragraph | Table)[] = [
    ...cabeceraReporte('Reporte del Nro. de Encuestados por Carrera Profesional', nombreFac, ciclo),
  ];
  children.push(tablaKPI([
    { label: 'Total Secciones',     value: totalSec.toLocaleString('es-PE') },
    { label: 'Total Encuestados',   value: totalEnc.toLocaleString('es-PE') },
    { label: 'Total No Encuestados', value: totalNoEnc.toLocaleString('es-PE') },
  ]), salto());

  const rows: TableRow[] = [
    new TableRow({ children: [
      celdaH('Carrera Profesional'),
      celdaH('N° Secciones Evaluadas'), celdaH('N° Encuestados'), celdaH('N° No Encuestados'),
    ]}),
  ];
  let sumSec = 0, sumEnc = 0, sumNoEnc = 0;
  for (const [carreraName, c] of f.carreras) {
    const nSec   = c.registros.length;
    const nEnc   = c.totalEncuestados;
    const nNoEnc = c.totalNoEncuestados;
    rows.push(new TableRow({ children: [
      celda(carreraName),
      celda(nSec.toLocaleString('es-PE'), true),
      celda(nEnc.toLocaleString('es-PE'), true),
      celda(nNoEnc.toLocaleString('es-PE'), true),
    ]}));
    sumSec += nSec; sumEnc += nEnc; sumNoEnc += nNoEnc;
  }
  rows.push(new TableRow({ children: [
    celda('TOTAL', false, true, GRIS_ROW),
    celda(sumSec.toLocaleString('es-PE'), true, true, GRIS_ROW),
    celda(sumEnc.toLocaleString('es-PE'), true, true, GRIS_ROW),
    celda(sumNoEnc.toLocaleString('es-PE'), true, true, GRIS_ROW),
  ]}));

  children.push(
    new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }),
    fuenteTabla(),
    salto(),
  );
  if (pieData) children.push(imagenCentrada(pieData, 400, 290), salto());
  children.push(
    parrafo(interpretarParticipacion(totalEnc, f.totalMatriculados, nombreFac)),
  );
  await saveDocx(new Document({ styles: DOCX_STYLES, sections: [{ properties: {}, children }] }),
    `1. Reporte_Nro_Encuestados_por_Carrera_Profesional_${ciclo}_${cod}.docx`);
}

// ── Reporte 4: % Juicio de Valor por Carrera ─────────────────────────────────
async function rpt4PorcentajeJuicio(ciclo: string, cod: string, f: DatosFacultad): Promise<void> {
  const nombreFac = FACULTADES[cod]?.nombre ?? cod;
  const seccionesValidas4 = [...f.carreras.values()].reduce((s, c) => s + c.seccionesCalificadas, 0);
  const children: (Paragraph | Table)[] = [
    ...cabeceraReporte('Reporte del % de Evaluación a la Plana Docente (Juicio de Valor) por Carrera Profesional', nombreFac, ciclo),
  ];
  children.push(tablaKPI([
    { label: 'Secciones Válidas', value: seccionesValidas4.toString() },
    { label: '% BUENO + DESTACADO', value: f.indicadorPlanEstrategico.toFixed(2) + '%', color: COLOR_DESTACADO },
    { label: 'Promedio General', value: f.promedioGeneral.toFixed(2) },
  ]), salto());

  const rows: TableRow[] = [
    new TableRow({ children: [
      celdaH('Carrera Profesional'),
      celdaH('% INSATISFACTORIO'), celdaH('% ACEPTABLE'),
      celdaH('% BUENO'), celdaH('% DESTACADO'),
      celdaH('Total Secc.'),
    ]}),
  ];
  for (const [carreraName, c] of f.carreras) {
    rows.push(new TableRow({ children: [
      celda(carreraName),
      celda(c.distribucion.INSATISFACTORIO.porcentaje.toFixed(2) + '%', true, false, COLOR_INSATISFACTORIO),
      celda(c.distribucion.ACEPTABLE.porcentaje.toFixed(2) + '%',       true, false, COLOR_ACEPTABLE),
      celda(c.distribucion.BUENO.porcentaje.toFixed(2) + '%',           true, false, COLOR_BUENO),
      celda(c.distribucion.DESTACADO.porcentaje.toFixed(2) + '%',       true, true,  COLOR_DESTACADO),
      celda(c.seccionesCalificadas.toString(), true, true),
    ]}));
  }

  children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }), fuenteTabla(), salto());
  children.push(
    negrita('Escala de calificación'),
    salto(),
    tablaEscalaCalificacion(),
    salto(),
    ...leyendaAEFooter(),
  );
  await saveDocx(new Document({ styles: DOCX_STYLES, sections: [{ properties: {}, children }] }),
    `2. Reporte_Porcentaje_Juicio_Valor_${ciclo}_${cod}.docx`);
}

// ── Reporte 5 (ex-6): General de Evaluación por Docente ──────────────────────
// Unifica el anterior Reporte 2 (Notas Plana Docente) y el anterior Reporte 6
// (General de Evaluación). Ahora incluye las columnas de control Enc./No Enc./Validez
// Y la fila de PROMEDIO por carrera, eliminando la duplicidad documental.
async function rpt6GeneralDocente(ciclo: string, cod: string, f: DatosFacultad): Promise<void> {
  const nombreFac = FACULTADES[cod]?.nombre ?? cod;
  const todosRegKPI    = [...f.carreras.values()].flatMap(c => c.registros);
  const docentesUnicos = new Set(todosRegKPI.map(r => r.docente)).size;
  const seccionesValidas6 = [...f.carreras.values()].reduce((s, c) => s + c.seccionesCalificadas, 0);
  const children: (Paragraph | Table)[] = [
    ...cabeceraReporte('REPORTE GENERAL DE EVALUACIÓN DOCENTE POR SECCION', nombreFac, ciclo),
  ];
  children.push(tablaKPI([
    { label: 'Docentes Únicos', value: docentesUnicos.toString() },
    { label: 'Secciones Evaluadas', value: seccionesValidas6.toString() },
    { label: 'Promedio General', value: f.promedioGeneral.toFixed(2) },
    { label: '% Bueno + Destacado', value: f.indicadorPlanEstrategico.toFixed(2) + '%', color: COLOR_DESTACADO },
  ]), salto());

  for (const [carreraName, c] of f.carreras) {
    children.push(negrita(carreraName), salto());
    const rows: TableRow[] = [
      new TableRow({ children: [
        celdaH('Docente'), celdaH('Curso'), celdaH('Sec.'),
        celdaH('AE-01'), celdaH('AE-02'), celdaH('AE-03'), celdaH('AE-04'),
        celdaH('Nota'), celdaH('Calif.'),
        celdaH('Enc.'), celdaH('No Enc.'), celdaH('Validez'),
      ]}),
    ];
    const subQuorumRegs: EvaluacionData[] = [];
    for (const r of c.registros) {
      const calif = r.encuestados === 0 ? 'Sin Datos' : getCalifReg(r);
      const califFill = colorCalif(calif);
      const esSubQ = r.encuestados > 0 && r.encuestados < QUORUM_MINIMO_ENCUESTADOS;
      if (esSubQ) subQuorumRegs.push(r);
      rows.push(new TableRow({ children: [
        celda(r.docente), celda(r.curso), celda(r.seccion, true),
        celdaN(r.ae01), celdaN(r.ae02), celdaN(r.ae03), celdaN(r.ae04),
        celdaN(r.nota, 2, true),
        celda(calif, true, true, califFill),
        celda(esSubQ ? `${r.encuestados} [!]` : r.encuestados.toString(), true, false, esSubQ ? COLOR_SUBQUORUM : undefined),
        celda(r.noEncuestados.toString(), true),
        celda(r.validez, true),
      ]}));
    }
    // Fila de promedio consolidado por carrera
    const promCalif = categoriaPromedio(c.promedioGeneral);
    rows.push(new TableRow({ children: [
      celda('PROMEDIO', false, true, GRIS_ROW),
      celda('', false, false, GRIS_ROW), celda('', false, false, GRIS_ROW),
      celdaN(c.promedioAE01), celdaN(c.promedioAE02), celdaN(c.promedioAE03), celdaN(c.promedioAE04),
      celdaN(c.promedioGeneral, 2, true),
      celda(promCalif, true, true, colorCalif(promCalif) ?? GRIS_ROW),
      celda('', false, false, GRIS_ROW), celda('', false, false, GRIS_ROW), celda('', false, false, GRIS_ROW),
    ]}));
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows }), fuenteTabla(), salto());
    if (subQuorumRegs.length > 0) {
      children.push(parrafo(`[!] ${subQuorumRegs.length} sección(es) con muestra insuficiente (menos de ${QUORUM_MINIMO_ENCUESTADOS} encuestados) — resultado no estadísticamente representativo.`));
      children.push(salto());
    }
  }

  children.push(
    ...leyendaAEFooter(),
    salto(),
    negrita('Escala de calificación'),
    salto(),
    tablaEscalaCalificacion(),
  );
  await saveDocx(new Document({ styles: DOCX_STYLES, sections: [{ properties: {}, children }] }),
    `4. Reporte_General_Evaluacion_${ciclo}_${cod}.docx`);
}

// ── Función pública: genera los 5 reportes de la facultad ────────────────────

export async function generarInformesFacultadDocx(
  ciclo: string,
  cod: string,
  f: DatosFacultad,
): Promise<void> {
  const pausa = () => new Promise(r => setTimeout(r, 350));
  await rpt3EstudiantesCarrera(ciclo, cod, f); await pausa();
  await rpt4PorcentajeJuicio(ciclo, cod, f);   await pausa();
  await rpt1Insatisfactorios(ciclo, cod, f);   await pausa();
  await rpt6GeneralDocente(ciclo, cod, f);
}
