import * as XLSX from 'xlsx';
import { EvaluacionData } from '../types';
import { calcularCalificacion, FACULTADES } from '../config/universityStructure';

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

/** Devuelve la etiqueta de calificación. Si el registro no es válido o no tiene encuestados, retorna 'N/A'. */
function resolverCalificacion(d: EvaluacionData): string {
  if (d.validez !== 'Válido' || d.encuestados === 0) return 'N/A';
  const cal = (['DESTACADO', 'BUENO', 'ACEPTABLE', 'INSATISFACTORIO'] as const).includes(
    d.calificacion as any
  )
    ? d.calificacion
    : calcularCalificacion(d.nota);
  return CALIFICACION_LABELS[cal] ?? cal;
}

function aplicarEstiloCalificacion(ws: XLSX.WorkSheet, rowIndex: number, colIndex: number, calificacion: string) {
  const cell = XLSX.utils.encode_cell({ r: rowIndex, c: colIndex });
  if (!ws[cell]) return;
  if (calificacion === 'N/A') {
    ws[cell].s = {
      font: { bold: true, color: { rgb: '718096' } },
      fill: { patternType: 'solid', fgColor: { rgb: 'E2E8F0' } },
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

// ── Reporte I: General de Evaluación por Docente ────────────────────────────

export function exportarReporteI(datos: EvaluacionData[], facultad: string, carrera: string, docente: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, docente).sort((a, b) =>
    a.carreraProfesional.localeCompare(b.carreraProfesional) || a.docente.localeCompare(b.docente)
  );

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

  const ws = crearHoja(encabezados, filas, [35, 35, 30, 10, 8, 16, 8, 8, 8, 8, 12, 14, 10]);
  filas.forEach((fila, ri) => {
    const cal = fila[5] as string;
    aplicarEstiloCalificacion(ws, ri + 1, 5, cal);
    if (cal !== 'N/A') {
      const notaCell = XLSX.utils.encode_cell({ r: ri + 1, c: 4 });
      const calNivel = calcularCalificacion(fila[4] as number);
      const bgMap: Record<string, string> = {
        DESTACADO: 'C6EFCE', BUENO: 'BDD7EE', ACEPTABLE: 'FFEB9C', INSATISFACTORIO: 'FFC7CE',
      };
      if (ws[notaCell]) ws[notaCell].s = {
        fill: { patternType: 'solid', fgColor: { rgb: bgMap[calNivel] } },
        alignment: { horizontal: 'right' },
      };
    }
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Reporte I');
  XLSX.writeFile(wb, `ReporteI_EvaluacionDocente_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte II: Docentes Insatisfactorios ────────────────────────────────────

export function exportarReporteII(datos: EvaluacionData[], facultad: string, carrera: string, docente: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, docente)
    .filter(d => d.nota <= 10.9 && d.validez === 'Válido' && d.encuestados > 0)
    .sort((a, b) => a.carreraProfesional.localeCompare(b.carreraProfesional) || a.nota - b.nota);

  const encabezados = [
    'Programa Académico', 'Docente', 'Curso', 'Sección',
    'Nota', 'Calificación', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Encuestados',
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
  ]);

  const ws = crearHoja(encabezados, filas, [35, 35, 30, 10, 8, 16, 8, 8, 8, 8, 12]);
  filas.forEach((_, ri) => aplicarEstiloCalificacion(ws, ri + 1, 5, 'Insatisfactorio'));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Insatisfactorios');
  XLSX.writeFile(wb, `ReporteII_Insatisfactorios_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte III: Notas de Criterios AE por Carrera ──────────────────────────

export function exportarReporteIII(datos: EvaluacionData[], facultad: string, carrera: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, '')
    .filter(d => d.validez === 'Válido' && d.encuestados > 0);
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
  XLSX.utils.book_append_sheet(wb, ws, 'Criterios AE');
  XLSX.writeFile(wb, `ReporteIII_CriteriosAE_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}

// ── Reporte IV: % Juicio de Valor por Carrera ────────────────────────────────

export function exportarReporteIV(datos: EvaluacionData[], facultad: string, carrera: string): void {
  const filtrados = filtrarPorAmbito(datos, facultad, carrera, '')
    .filter(d => d.validez === 'Válido' && d.encuestados > 0);
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();

  const encabezados = [
    'Programa Académico', 'Secciones Válidas',
    'N° Destacado', '% Destacado', 'N° Bueno', '% Bueno',
    'N° Aceptable', '% Aceptable', 'N° Insatisfactorio', '% Insatisfactorio',
  ];
  const filas: (string | number)[][] = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const total = regs.length;
    const n = (cal: string) => regs.filter(d => (d.calificacion || calcularCalificacion(d.nota)) === cal).length;
    const p = (x: number) => total > 0 ? +(x / total * 100).toFixed(2) : 0;
    const dest = n('DESTACADO'); const buen = n('BUENO');
    const acep = n('ACEPTABLE'); const insa = n('INSATISFACTORIO');
    return [c, total, dest, p(dest), buen, p(buen), acep, p(acep), insa, p(insa)];
  });

  const ws = crearHoja(encabezados, filas, [40, 18, 14, 14, 12, 12, 14, 14, 18, 18]);
  const wb = XLSX.utils.book_new();
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
  const wb = XLSX.utils.book_new();
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
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Encuestas Totales');
  XLSX.writeFile(wb, `ReporteVI_EncuestasTotales_${slugFacultad(facultad)}_${hoy()}.xlsx`);
}
