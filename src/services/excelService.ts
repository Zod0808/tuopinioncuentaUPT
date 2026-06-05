import * as XLSX from 'xlsx';
import { EvaluacionData } from '../types';
import { calcularCalificacion, FACULTADES, ASPECTOS_EVALUADOS, PERIODO_ACADEMICO, ORDEN_FACULTADES, UMBRAL_PARTICIPACION_MINIMA } from '../config/universityStructure';

const CALIFICACION_LABELS: Record<string, string> = {
  DESTACADO: 'Destacado',
  BUENO: 'Bueno',
  ACEPTABLE: 'Aceptable',
  INSATISFACTORIO: 'Insatisfactorio',
};

function normalizar(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Elimina guiones sueltos por campos vacíos en nombres (ej. "ERCILLA -, VICTOR" → "ERCILLA, VICTOR") */
function limpiarTexto(s: string): string {
  if (!s) return '';
  return s
    .replace(/\s*-\s*,/g, ',')
    .replace(/,\s*-\s+/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function matchesFacultad(recordFacultad: string, codigoSeleccionado: string): boolean {
  if (!codigoSeleccionado) return true;
  const rn = normalizar(recordFacultad);
  const facData = FACULTADES[codigoSeleccionado];
  if (!facData) return false;
  return rn.includes(normalizar(codigoSeleccionado)) || rn.includes(normalizar(facData.nombre));
}

function filtrarPorAmbito(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string,
  docente: string
): EvaluacionData[] {
  let r = datos.filter(d => matchesFacultad(d.facultad, facultad));
  if (carrera) r = r.filter(d => d.carreraProfesional === carrera);
  if (docente) r = r.filter(d => d.docente === docente);
  return r;
}

/** Devuelve la etiqueta de calificación canónica, calculada siempre desde la nota (nunca del campo almacenado). */
function resolverCalificacion(d: EvaluacionData): string {
  if (d.validez !== 'Válido') return 'N/A';
  if (d.encuestados === 0) return 'No Aplica';
  if (d.nota === 0) return 'Sin Evaluar';
  const total = d.encuestados + d.noEncuestados;
  if (total > 0 && d.encuestados / total < UMBRAL_PARTICIPACION_MINIMA) return 'Baja Participación';
  return CALIFICACION_LABELS[calcularCalificacion(d.nota)];
}

/** Devuelve true si el registro puede incluirse en promedios y distribuciones. */
function esValidoParaCalculo(d: EvaluacionData): boolean {
  if (d.validez !== 'Válido' || d.encuestados === 0 || d.nota === 0) return false;
  const total = d.encuestados + d.noEncuestados;
  return total === 0 || d.encuestados / total >= UMBRAL_PARTICIPACION_MINIMA;
}

function aplicarEstiloCalificacion(ws: XLSX.WorkSheet, rowIndex: number, colIndex: number, calificacion: string) {
  const cell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  if (!ws[cell]) return;
  if (calificacion === 'N/A' || calificacion === 'No Aplica' || calificacion === 'Sin Evaluar') {
    ws[cell].s = {
      font: { bold: true, color: { rgb: '718096' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
      alignment: { horizontal: 'center' },
    };
    return;
  }
  if (calificacion === 'Baja Participación') {
    ws[cell].s = {
      font: { bold: true, color: { rgb: '6B21A8' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'EDE9FE' } },
      alignment: { horizontal: 'center' },
    };
    return;
  }
  const colorMap: Record<string, string> = {
    Destacado: '276749', Bueno: '2b6cb0', Aceptable: 'c05621', Insatisfactorio: 'c53030',
  };
  const bgMap: Record<string, string> = {
    Destacado: 'C6EFCE', Bueno: 'BDD7EE', Aceptable: 'FFEB9C', Insatisfactorio: 'FFC7CE',
  };
  ws[cell].s = {
    font: { bold: true, color: { rgb: colorMap[calificacion] ?? '000000' } },
    fill: { patternType: 'solid', fgColor: { rgb: bgMap[calificacion] ?? 'FFFFFF' } },
    alignment: { horizontal: 'center' },
  };
}

function crearHoja(
  encabezados: string[],
  filas: (string | number)[][],
  colWidths: number[]
): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet([encabezados, ...filas]);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));
  encabezados.forEach((_, ci) => {
    const cell = XLSX.utils.encode_cell({ r: 0, c: ci });
    if (ws[cell]) {
      ws[cell].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' } },
        fill: { patternType: 'solid', fgColor: { rgb: '16285C' } },
        alignment: { horizontal: 'center', wrapText: true },
      };
    }
  });
  return ws;
}

function etiquetaFacultad(facultad: string): string {
  return facultad ? (FACULTADES[facultad]?.nombre ?? facultad) : 'Todas las Facultades';
}

function hoy(): string {
  return new Date().toISOString().split('T')[0];
}

function slugFacultad(facultad: string): string {
  return (FACULTADES[facultad] ? facultad : 'GENERAL').toUpperCase();
}

// ── KPI block helpers ────────────────────────────────────────────────────────

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

const KPI_OFFSET = 3;

const BG_ROW_LIGHT: Record<string, string> = {
  Insatisfactorio: 'FFF2F2', Destacado: 'F0FFF4', Bueno: 'EBF8FF', Aceptable: 'FFFDE7',
};

interface KpiItem { label: string; valor: string | number; bgRGB: string }

function kpiPromedioColor(nota: number): string {
  if (nota <= 0) return '718096';
  if (nota >= 17.1) return '276749';
  if (nota >= 15.1) return '2b6cb0';
  if (nota >= 11.0) return 'c05621';
  return 'c53030';
}

/**
 * Crea una hoja Excel con un bloque de KPI (3 filas) encima del encabezado de datos.
 * Layout: fila 0 = etiquetas KPI, fila 1 = valores KPI, fila 2 = separador,
 *         fila KPI_OFFSET(3) = encabezados de tabla, fila KPI_OFFSET+1 en adelante = datos.
 */
function crearHojaKPI(
  encabezados: string[],
  filas: (string | number)[][],
  colWidths: number[],
  kpis: KpiItem[]
): XLSX.WorkSheet {
  const totalCols = encabezados.length;
  const baseW = Math.floor(totalCols / kpis.length);

  const kpiRow0 = new Array(totalCols).fill('');
  const kpiRow1 = new Array(totalCols).fill('');
  kpis.forEach((k, i) => { kpiRow0[i * baseW] = k.label; kpiRow1[i * baseW] = k.valor; });

  const aoa = [kpiRow0, kpiRow1, new Array(totalCols).fill(''), encabezados, ...filas];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Header row (row KPI_OFFSET)
  encabezados.forEach((_, ci) => {
    const cell = XLSX.utils.encode_cell({ r: KPI_OFFSET, c: ci });
    if (ws[cell]) ws[cell].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '16285C' } },
      alignment: { horizontal: 'center', wrapText: true },
    };
  });

  // KPI card styling + merges
  const merges: XLSX.Range[] = [];
  kpis.forEach((kpi, i) => {
    const startC = i * baseW;
    const endC = i === kpis.length - 1 ? totalCols - 1 : (i + 1) * baseW - 1;
    const lAddr = XLSX.utils.encode_cell({ r: 0, c: startC });
    const vAddr = XLSX.utils.encode_cell({ r: 1, c: startC });
    if (ws[lAddr]) ws[lAddr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 9 },
      fill: { patternType: 'solid', fgColor: { rgb: kpi.bgRGB } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    };
    if (ws[vAddr]) {
      ws[vAddr].t = typeof kpi.valor === 'number' ? 'n' : 's';
      ws[vAddr].s = {
        font: { bold: true, sz: 20, color: { rgb: kpi.bgRGB } },
        fill: { patternType: 'solid', fgColor: { rgb: 'F7F9FC' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
    }
    merges.push({ s: { r: 0, c: startC }, e: { r: 0, c: endC } });
    merges.push({ s: { r: 1, c: startC }, e: { r: 1, c: endC } });
  });

  // Separator row (row 2) spans full width
  const sepAddr = XLSX.utils.encode_cell({ r: 2, c: 0 });
  if (ws[sepAddr]) ws[sepAddr].s = { fill: { patternType: 'solid', fgColor: { rgb: 'DDE4F0' } } };
  merges.push({ s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } });

  ws['!merges'] = merges;
  return ws;
}

/** Aplica un fondo de color muy suave a toda la fila, basado en la calificación. */
function aplicarColorFila(ws: XLSX.WorkSheet, row: number, colCount: number, calLabel: string): void {
  const bg = BG_ROW_LIGHT[calLabel];
  if (!bg) return;
  for (let c = 0; c < colCount; c++) {
    const addr = XLSX.utils.encode_cell({ r: row, c });
    if (!ws[addr]) ws[addr] = { t: 's', v: '' };
    ws[addr].s = { ...(ws[addr].s ?? {}), fill: { patternType: 'solid', fgColor: { rgb: bg } } };
  }
}

// ── Hoja de metadatos + leyenda AE ──────────────────────────────────────────

function hojaInfo(wb: XLSX.WorkBook, facultad: string, carrera: string): void {
  const hdrStyle = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '16285C' } } };
  const keyStyle = { font: { bold: true } };
  const filas: (string | number)[][] = [
    ['Campo', 'Valor'],
    ['ID Facultad', facultad || 'TODAS'],
    ['Nombre Facultad', etiquetaFacultad(facultad)],
    ['Carrera Profesional', carrera || 'Todas las carreras'],
    ['Período Académico', PERIODO_ACADEMICO],
    ['Fecha de generación', hoy()],
    [],
    ['Código AE', 'Descripción del Aspecto Evaluado'],
    ...Object.entries(ASPECTOS_EVALUADOS).map(([k, v]) => [k, v] as [string, string]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(filas);
  ws['!cols'] = [{ wch: 22 }, { wch: 72 }];
  ['A1', 'B1', 'A8', 'B8'].forEach(a => { if (ws[a]) ws[a].s = hdrStyle; });
  ['A2', 'A3', 'A4', 'A5', 'A6'].forEach(a => { if (ws[a]) ws[a].s = keyStyle; });
  XLSX.utils.book_append_sheet(wb, ws, 'Info');
}

// ── Semáforo de participación / completitud ──────────────────────────────────

function bgSemaforo(porc: number): string {
  if (porc < 70) return 'FFC7CE';
  if (porc <= 85) return 'FFEB9C';
  return 'C6EFCE';
}

function fgSemaforo(porc: number): string {
  if (porc < 70) return 'C53030';
  if (porc <= 85) return 'C05621';
  return '276749';
}

function aplicarSemaforoCell(ws: XLSX.WorkSheet, row: number, col: number, porc: number): void {
  const cell = XLSX.utils.encode_cell({ r: row, c: col });
  if (!ws[cell]) return;
  ws[cell].s = {
    font: { bold: true, color: { rgb: fgSemaforo(porc) } },
    fill: { patternType: 'solid', fgColor: { rgb: bgSemaforo(porc) } },
    alignment: { horizontal: 'right' },
  };
}

// ── Alerta de muestra insuficiente ───────────────────────────────────────────

function alertaMuestra(d: EvaluacionData): string {
  const total = d.encuestados + d.noEncuestados;
  return total > 0 && d.encuestados / total < 0.15
    ? 'Muestra Insuficiente - Pendiente de Validación'
    : '';
}

// ── Reporte I: General de Evaluación por Docente ────────────────────────────

export function exportarReporteI(datos: EvaluacionData[], facultad: string, carrera: string, docente: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, docente).sort((a, b) =>
    a.carreraProfesional.localeCompare(b.carreraProfesional) || a.docente.localeCompare(b.docente)
  );

  // KPIs
  const validosKpi = filtrados.filter(esValidoParaCalculo);
  const nDocentes = new Set(filtrados.map(d => d.docente)).size;
  const promedioGen = avg(validosKpi.map(d => d.nota));
  const nInsatisf = validosKpi.filter(d => d.nota <= 10.9).length;
  const kpis: KpiItem[] = [
    { label: 'Total Docentes Evaluados', valor: nDocentes, bgRGB: '16285C' },
    { label: 'Promedio General de la Facultad', valor: validosKpi.length > 0 ? promedioGen.toFixed(2) : '—', bgRGB: kpiPromedioColor(promedioGen) },
    { label: 'Secciones Insatisfactorias', valor: nInsatisf, bgRGB: nInsatisf > 0 ? 'c53030' : '276749' },
  ];

  const encabezados = [
    'Programa Académico', 'Docente', 'Curso', 'Sección',
    'Nota', 'Calificación', 'AE-01', 'AE-02', 'AE-03', 'AE-04',
    'Encuestados', 'No Encuestados', 'Validez',
  ];
  const filas: (string | number)[][] = filtrados.map(d => [
    d.carreraProfesional,
    limpiarTexto(d.docente),
    d.curso,
    d.seccion,
    +d.nota.toFixed(2),
    resolverCalificacion(d),
    +d.ae01.toFixed(2),
    +d.ae02.toFixed(2),
    +d.ae03.toFixed(2),
    +d.ae04.toFixed(2),
    d.encuestados,
    d.noEncuestados,
    d.validez,
  ]);

  const colWidths = [35, 35, 30, 10, 8, 16, 8, 8, 8, 8, 12, 14, 10];
  const ws = crearHojaKPI(encabezados, filas, colWidths, kpis);

  filas.forEach((fila, ri) => {
    const row = ri + KPI_OFFSET + 1;
    const cal = fila[5] as string;
    const sinDatos = ['N/A', 'No Aplica', 'Sin Evaluar', 'Baja Participación'].includes(cal);
    // Light row tint first, then per-cell overrides
    if (!sinDatos) aplicarColorFila(ws, row, encabezados.length, cal);
    aplicarEstiloCalificacion(ws, row, 5, cal);
    if (!sinDatos) {
      const notaCell = XLSX.utils.encode_cell({ r: row, c: 4 });
      const bgMap: Record<string, string> = {
        DESTACADO: 'C6EFCE', BUENO: 'BDD7EE', ACEPTABLE: 'FFEB9C', INSATISFACTORIO: 'FFC7CE',
      };
      if (ws[notaCell]) ws[notaCell].s = {
        fill: { patternType: 'solid', fgColor: { rgb: bgMap[calcularCalificacion(fila[4] as number)] } },
        alignment: { horizontal: 'right' },
      };
    }
  });

  ws['!freeze'] = { xSplit: 0, ySplit: KPI_OFFSET + 1 } as any;
  const lastColI = XLSX.utils.encode_col(encabezados.length - 1);
  ws['!autofilter'] = { ref: `A${KPI_OFFSET + 1}:${lastColI}${KPI_OFFSET + 1}` };

  const wb = XLSX.utils.book_new();
  hojaInfo(wb, facultad, carrera);
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte I');
  XLSX.writeFile(wb, `ReporteI_EvaluacionDocente_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte II: Docentes Insatisfactorios ────────────────────────────────────

export function exportarReporteII(datos: EvaluacionData[], facultad: string, carrera: string, docente: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, docente)
    .filter(d => esValidoParaCalculo(d) && d.nota <= 10.9)
    .sort((a, b) => a.carreraProfesional.localeCompare(b.carreraProfesional) || a.nota - b.nota);

  // KPIs
  const promedioInsatisf = avg(filtrados.map(d => d.nota));
  const nMuestrasInsuf = filtrados.filter(d => {
    const t = d.encuestados + d.noEncuestados;
    return t > 0 && d.encuestados / t < 0.15;
  }).length;
  const kpis: KpiItem[] = [
    { label: 'Secciones Insatisfactorias', valor: filtrados.length, bgRGB: filtrados.length > 0 ? 'c53030' : '276749' },
    { label: 'Promedio (Insatisfactorios)', valor: filtrados.length > 0 ? promedioInsatisf.toFixed(2) : '—', bgRGB: 'c53030' },
    { label: 'Muestra Insuficiente (<15%)', valor: nMuestrasInsuf, bgRGB: nMuestrasInsuf > 0 ? 'c05621' : '276749' },
  ];

  const encabezados = [
    'Programa Académico', 'Docente', 'Curso', 'Sección',
    'Nota', 'Calificación', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Encuestados', 'Alerta Muestra',
  ];
  const filas: (string | number)[][] = filtrados.map(d => [
    d.carreraProfesional,
    limpiarTexto(d.docente),
    d.curso,
    d.seccion,
    +d.nota.toFixed(2),
    'Insatisfactorio',
    +d.ae01.toFixed(2),
    +d.ae02.toFixed(2),
    +d.ae03.toFixed(2),
    +d.ae04.toFixed(2),
    d.encuestados,
    alertaMuestra(d),
  ]);

  const colWidths = [35, 35, 30, 10, 8, 16, 8, 8, 8, 8, 12, 36];
  const ws = crearHojaKPI(encabezados, filas, colWidths, kpis);

  filas.forEach((fila, ri) => {
    const row = ri + KPI_OFFSET + 1;
    aplicarColorFila(ws, row, encabezados.length, 'Insatisfactorio');
    aplicarEstiloCalificacion(ws, row, 5, 'Insatisfactorio');
    if (fila[11]) {
      const alertaCell = XLSX.utils.encode_cell({ r: row, c: 11 });
      if (ws[alertaCell]) {
        ws[alertaCell].s = {
          font: { bold: true, color: { rgb: 'C05621' } },
          fill: { patternType: 'solid', fgColor: { rgb: 'FFEB9C' } },
          alignment: { horizontal: 'center', wrapText: true },
        };
      }
    }
  });

  ws['!freeze'] = { xSplit: 0, ySplit: KPI_OFFSET + 1 } as any;
  const lastColII = XLSX.utils.encode_col(encabezados.length - 1);
  ws['!autofilter'] = { ref: `A${KPI_OFFSET + 1}:${lastColII}${KPI_OFFSET + 1}` };

  const wb = XLSX.utils.book_new();
  hojaInfo(wb, facultad, carrera);
  XLSX.utils.book_append_sheet(wb, ws, 'Insatisfactorios');
  XLSX.writeFile(wb, `ReporteII_Insatisfactorios_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte III: Notas de Criterios AE por Carrera ──────────────────────────

export function exportarReporteIII(datos: EvaluacionData[], facultad: string, carrera: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, '').filter(esValidoParaCalculo);
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();

  const encabezados = ['Programa Académico', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Promedio General'];
  const avgArr = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  const filas: (string | number)[][] = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const ae01 = avgArr(regs.map(d => d.ae01));
    const ae02 = avgArr(regs.map(d => d.ae02));
    const ae03 = avgArr(regs.map(d => d.ae03));
    const ae04 = avgArr(regs.map(d => d.ae04));
    return [c, +ae01.toFixed(2), +ae02.toFixed(2), +ae03.toFixed(2), +ae04.toFixed(2), +avgArr([ae01, ae02, ae03, ae04]).toFixed(2)];
  });

  const ws = crearHoja(encabezados, filas, [40, 10, 10, 10, 10, 16]);
  const wb = XLSX.utils.book_new();
  hojaInfo(wb, facultad, carrera);
  XLSX.utils.book_append_sheet(wb, ws, 'Criterios AE');
  XLSX.writeFile(wb, `ReporteIII_CriteriosAE_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte IV: % Juicio de Valor por Carrera ────────────────────────────────

export function exportarReporteIV(datos: EvaluacionData[], facultad: string, carrera: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, '').filter(esValidoParaCalculo);
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();

  const encabezados = [
    'Programa Académico', 'Secciones Válidas',
    'N° Destacado', '% Destacado', 'N° Bueno', '% Bueno',
    'N° Aceptable', '% Aceptable', 'N° Insatisfactorio', '% Insatisfactorio',
  ];
  const filas: (string | number)[][] = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const total = regs.length;
    const n = (cal: string) => regs.filter(d => calcularCalificacion(d.nota) === cal).length;
    const p = (x: number) => total > 0 ? +(x / total * 100).toFixed(2) : 0;
    const dest = n('DESTACADO'); const buen = n('BUENO');
    const acep = n('ACEPTABLE'); const insa = n('INSATISFACTORIO');
    return [c, total, dest, p(dest), buen, p(buen), acep, p(acep), insa, p(insa)];
  });

  const ws = crearHoja(encabezados, filas, [40, 18, 14, 14, 12, 12, 14, 14, 18, 18]);
  const wb = XLSX.utils.book_new();
  hojaInfo(wb, facultad, carrera);
  XLSX.utils.book_append_sheet(wb, ws, '% Calificación');
  XLSX.writeFile(wb, `ReporteIV_JuicioValor_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte V: Estudiantes Encuestados por Carrera ───────────────────────────

export function exportarReporteV(datos: EvaluacionData[], facultad: string, carrera: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, '');
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  const label = etiquetaFacultad(facultad);

  const encabezados = ['Programa Académico', 'Total Matriculados', 'Encuestados', 'No Encuestados', '% Participación'];
  const filas: (string | number)[][] = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const enc = regs.reduce((s, d) => s + d.encuestados, 0);
    const noEnc = regs.reduce((s, d) => s + d.noEncuestados, 0);
    const total = enc + noEnc;
    return [c, total, enc, noEnc, total > 0 ? +(enc / total * 100).toFixed(2) : 0];
  });

  const totEnc = filas.reduce((s, f) => s + (f[2] as number), 0);
  const totNoEnc = filas.reduce((s, f) => s + (f[3] as number), 0);
  const totTotal = totEnc + totNoEnc;
  filas.push([`TOTAL — ${label}`, totTotal, totEnc, totNoEnc, totTotal > 0 ? +(totEnc / totTotal * 100).toFixed(2) : 0]);

  const ws = crearHoja(encabezados, filas, [40, 18, 14, 16, 16]);
  filas.forEach((fila, ri) => {
    const porc = fila[4] as number;
    if (typeof porc === 'number') aplicarSemaforoCell(ws, ri + 1, 4, porc);
  });
  const wb = XLSX.utils.book_new();
  hojaInfo(wb, facultad, carrera);
  XLSX.utils.book_append_sheet(wb, ws, 'Est. Encuestados');
  XLSX.writeFile(wb, `ReporteV_EstudiantesEncuestados_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte VI: Encuestas Totales por Carrera ────────────────────────────────

export function exportarReporteVI(datos: EvaluacionData[], facultad: string, carrera: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, '');
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  const label = etiquetaFacultad(facultad);

  const encabezados = ['Programa Académico', 'Encuestas Proyectadas', 'Realizadas', 'No Realizadas', '% Completitud'];
  const filas: (string | number)[][] = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const realizadas = regs.reduce((s, d) => s + d.encuestados, 0);
    const noRealizadas = regs.reduce((s, d) => s + d.noEncuestados, 0);
    const proyectadas = realizadas + noRealizadas;
    return [c, proyectadas, realizadas, noRealizadas, proyectadas > 0 ? +(realizadas / proyectadas * 100).toFixed(2) : 0];
  });

  const totP = filas.reduce((s, f) => s + (f[1] as number), 0);
  const totR = filas.reduce((s, f) => s + (f[2] as number), 0);
  const totNR = filas.reduce((s, f) => s + (f[3] as number), 0);
  filas.push([`TOTAL — ${label}`, totP, totR, totNR, totP > 0 ? +(totR / totP * 100).toFixed(2) : 0]);

  const ws = crearHoja(encabezados, filas, [40, 20, 18, 18, 14]);
  filas.forEach((fila, ri) => {
    const porc = fila[4] as number;
    if (typeof porc === 'number') aplicarSemaforoCell(ws, ri + 1, 4, porc);
  });
  const wb = XLSX.utils.book_new();
  hojaInfo(wb, facultad, carrera);
  XLSX.utils.book_append_sheet(wb, ws, 'Encuestas Totales');
  XLSX.writeFile(wb, `ReporteVI_EncuestasTotales_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Base de Datos Maestra ─────────────────────────────────────────────────────
// Tabla plana con TODOS los registros + TODOS los campos, lista para automatización
// por facultad (filtrar columna ID_Facultad en Excel o cualquier script).

function resolverIdFacultad(recordFacultad: string): string {
  return Object.keys(FACULTADES).find(cod => matchesFacultad(recordFacultad, cod)) ?? recordFacultad;
}

export function exportarBaseDatos(datos: EvaluacionData[]): void {
  const prioridadFac = (fac: string): number => {
    const idx = ORDEN_FACULTADES.indexOf(resolverIdFacultad(fac));
    return idx === -1 ? 999 : idx;
  };

  const sorted = [...datos].sort((a, b) => {
    const dp = prioridadFac(a.facultad) - prioridadFac(b.facultad);
    if (dp !== 0) return dp;
    const dc = a.carreraProfesional.localeCompare(b.carreraProfesional);
    if (dc !== 0) return dc;
    const dd = a.docente.localeCompare(b.docente);
    if (dd !== 0) return dd;
    return a.curso.localeCompare(b.curso);
  });

  // ── Columnas (% Part. Sección insertada entre No Encuestados y Validez) ──
  const encabezados = [
    'ID_Facultad', 'Facultad', 'Carrera', 'Docente', 'Curso', 'Sección',
    'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Nota', 'Calificación',
    'Encuestados', 'No Encuestados', '% Part. Sección', 'Validez', 'Período_Académico',
    //   0           1        2        3       4       5
    //   6     7     8     9      10       11
    //       12          13             14          15        16
  ];

  const filas: (string | number)[][] = sorted.map(d => {
    const idFac = resolverIdFacultad(d.facultad);
    const total = d.encuestados + d.noEncuestados;
    const porcPartic = total > 0 ? +(d.encuestados / total * 100).toFixed(1) : 0;
    return [
      idFac,
      FACULTADES[idFac]?.nombre ?? d.facultad,
      d.carreraProfesional,
      limpiarTexto(d.docente),
      d.curso,
      d.seccion,
      +d.ae01.toFixed(2),
      +d.ae02.toFixed(2),
      +d.ae03.toFixed(2),
      +d.ae04.toFixed(2),
      +d.nota.toFixed(2),
      resolverCalificacion(d),  // col 11
      d.encuestados,
      d.noEncuestados,
      porcPartic,               // col 14
      d.validez,
      PERIODO_ACADEMICO,
    ];
  });

  const colWidths = [14, 52, 42, 36, 36, 8, 8, 8, 8, 8, 10, 18, 12, 14, 14, 10, 14];
  const ws = crearHoja(encabezados, filas, colWidths);

  ws['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  const lastCol = XLSX.utils.encode_col(encabezados.length - 1);
  ws['!autofilter'] = { ref: `A1:${lastCol}1` };

  // Semáforo columna Calificación (11) y % Part. Sección (14)
  filas.forEach((fila, ri) => {
    aplicarEstiloCalificacion(ws, ri + 1, 11, fila[11] as string);
    const porc = fila[14] as number;
    if (typeof porc === 'number') {
      const umbralPorc = UMBRAL_PARTICIPACION_MINIMA * 100;
      const bg = porc < umbralPorc ? 'FFC7CE' : porc < 70 ? 'FFEB9C' : 'C6EFCE';
      const fg = porc < umbralPorc ? 'C53030' : porc < 70 ? 'C05621' : '276749';
      const cell = XLSX.utils.encode_cell({ r: ri + 1, c: 14 });
      if (ws[cell]) ws[cell].s = {
        font: { bold: porc < umbralPorc, color: { rgb: fg } },
        fill: { patternType: 'solid', fgColor: { rgb: bg } },
        alignment: { horizontal: 'right' },
      };
    }
  });

  // ── Hoja "Insatisfactorios" — filtro automático de Calificación = Insatisfactorio ──
  const filasInsuf = filas.filter(f => f[11] === 'Insatisfactorio');
  const wsInsuf = crearHoja(encabezados, filasInsuf, colWidths);
  wsInsuf['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  wsInsuf['!autofilter'] = { ref: `A1:${lastCol}1` };
  filasInsuf.forEach((_f, ri) => {
    aplicarEstiloCalificacion(wsInsuf, ri + 1, 11, 'Insatisfactorio');
  });

  // ── Hoja "Resumen por Carrera" ──────────────────────────────────────────────
  interface ResumenRec {
    idFac: string; facNombre: string; carrera: string;
    totalSec: number; secValidas: number; secBajaPartic: number;
    notasV: number[]; ae01V: number[]; ae02V: number[]; ae03V: number[]; ae04V: number[];
    dist: Record<string, number>;
    totalEnc: number; totalNoEnc: number;
  }
  const resumenMap = new Map<string, ResumenRec>();
  for (const d of sorted) {
    const idFac = resolverIdFacultad(d.facultad);
    const key = `${idFac}||${d.carreraProfesional}`;
    if (!resumenMap.has(key)) {
      resumenMap.set(key, {
        idFac, facNombre: FACULTADES[idFac]?.nombre ?? d.facultad,
        carrera: d.carreraProfesional,
        totalSec: 0, secValidas: 0, secBajaPartic: 0,
        notasV: [], ae01V: [], ae02V: [], ae03V: [], ae04V: [],
        dist: { Destacado: 0, Bueno: 0, Aceptable: 0, Insatisfactorio: 0 },
        totalEnc: 0, totalNoEnc: 0,
      });
    }
    const r = resumenMap.get(key)!;
    r.totalSec++;
    r.totalEnc += d.encuestados;
    r.totalNoEnc += d.noEncuestados;
    const total = d.encuestados + d.noEncuestados;
    const esBP = total > 0 && d.encuestados / total < UMBRAL_PARTICIPACION_MINIMA;
    if (esBP) {
      r.secBajaPartic++;
    } else if (d.encuestados > 0 && d.nota > 0 && d.validez === 'Válido') {
      r.secValidas++;
      r.notasV.push(d.nota);
      r.ae01V.push(d.ae01); r.ae02V.push(d.ae02); r.ae03V.push(d.ae03); r.ae04V.push(d.ae04);
      const label = CALIFICACION_LABELS[calcularCalificacion(d.nota)];
      if (label in r.dist) r.dist[label]++;
    }
  }
  const avgArr = (a: number[]) => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : 0;
  const pct = (n: number, tot: number) => tot > 0 ? +(n / tot * 100).toFixed(1) : 0;

  const resHdrs = [
    'ID_Facultad', 'Facultad', 'Carrera',
    'Total Secc.', 'Secc. Válidas', 'Baja Part.',
    'Prom. General', 'AE-01', 'AE-02', 'AE-03', 'AE-04',
    '% Destacado', '% Bueno', '% Aceptable', '% Insatisfactorio',
    'Enc. Total', 'No Enc. Total', '% Participación',
  ];
  const resFilas: (string | number)[][] = [];
  // Orden por facultad
  const ordenResumen = [...resumenMap.values()].sort((a, b) => {
    const da = ORDEN_FACULTADES.indexOf(a.idFac) - ORDEN_FACULTADES.indexOf(b.idFac);
    return da !== 0 ? da : a.carrera.localeCompare(b.carrera);
  });
  for (const r of ordenResumen) {
    const sv = r.secValidas;
    const totEncNoEnc = r.totalEnc + r.totalNoEnc;
    resFilas.push([
      r.idFac, r.facNombre, r.carrera,
      r.totalSec, sv, r.secBajaPartic,
      avgArr(r.notasV), avgArr(r.ae01V), avgArr(r.ae02V), avgArr(r.ae03V), avgArr(r.ae04V),
      pct(r.dist.Destacado, sv), pct(r.dist.Bueno, sv), pct(r.dist.Aceptable, sv), pct(r.dist.Insatisfactorio, sv),
      r.totalEnc, r.totalNoEnc, pct(r.totalEnc, totEncNoEnc),
    ]);
  }
  const wsRes = crearHoja(resHdrs, resFilas, [12, 42, 40, 10, 12, 10, 12, 8, 8, 8, 8, 12, 10, 12, 16, 10, 12, 14]);
  wsRes['!freeze'] = { xSplit: 0, ySplit: 1 } as any;
  wsRes['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(resHdrs.length - 1)}1` };
  // Semáforo en % Participación (col 17)
  resFilas.forEach((fila, ri) => {
    const porc = fila[17] as number;
    if (typeof porc === 'number') aplicarSemaforoCell(wsRes, ri + 1, 17, porc);
  });

  // ── Workbook: Info → Base de Datos → Insatisfactorios → Resumen por Carrera ──
  const wb = XLSX.utils.book_new();
  const wsInfo = XLSX.utils.aoa_to_sheet([
    ['Campo', 'Valor'],
    ['Registros totales', filas.length],
    ['Facultades incluidas', [...new Set(filas.map(f => f[0] as string))].join(', ')],
    ['Período Académico', PERIODO_ACADEMICO],
    ['Fecha de generación', hoy()],
    [],
    ['Código AE', 'Descripción del Aspecto Evaluado'],
    ...Object.entries(ASPECTOS_EVALUADOS).map(([k, v]) => [k, v] as [string, string]),
    [],
    ['Regla de participación', `Umbral mínimo = ${UMBRAL_PARTICIPACION_MINIMA * 100}% (Enc / (Enc + No Enc))`],
    ['', `Secciones por debajo del umbral → "Baja Participación" — excluidas de promedios`],
    [],
    ['Reglas de Calificación (columna "Calificación")', ''],
    ['Sin Evaluar', 'Nota = 0.00 — sin datos de evaluación (no distorsiona promedios)'],
    ['No Aplica', 'Encuestados = 0 — sección sin participación'],
    ['N/A', 'Validez ≠ Válido'],
    ['Baja Participación', `Enc/(Enc+NoEnc) < ${UMBRAL_PARTICIPACION_MINIMA * 100}% — excluida de promedios`],
    ['Insatisfactorio', 'Nota 0.01–10.9'],
    ['Aceptable', 'Nota 11.0–15.0'],
    ['Bueno', 'Nota 15.1–17.0'],
    ['Destacado', 'Nota 17.1–20.0'],
  ]);
  wsInfo['!cols'] = [{ wch: 36 }, { wch: 72 }];
  const hdrS = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: '16285C' } } };
  ['A1', 'B1', 'A7', 'B7'].forEach(a => { if (wsInfo[a]) wsInfo[a].s = hdrS; });
  ['A2', 'A3', 'A4', 'A5'].forEach(a => { if (wsInfo[a]) wsInfo[a].s = { font: { bold: true } }; });
  XLSX.utils.book_append_sheet(wb, wsInfo, 'Info');
  XLSX.utils.book_append_sheet(wb, ws, 'Base de Datos');
  XLSX.utils.book_append_sheet(wb, wsInsuf, 'Insatisfactorios');
  XLSX.utils.book_append_sheet(wb, wsRes, 'Resumen por Carrera');
  XLSX.writeFile(wb, `BaseDatos_TuOpinionCuenta_${PERIODO_ACADEMICO}_${hoy()}.xlsx`);
}
