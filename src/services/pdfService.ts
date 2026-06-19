import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { ReporteData, EvaluacionData } from '../types';

export async function generarPDF(reporte: ReporteData, graficosElements: HTMLElement[]): Promise<void> {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Título del reporte
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 40, 92); // Azul marino Universidad Privada de Tacna
  doc.text(reporte.titulo, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Subtítulo
  doc.setFontSize(12);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text('Reporte de Evaluación de la Calidad Educativa', pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 8;

  // Fecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`Fecha de generación: ${reporte.fecha}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12;

  // Resumen Ejecutivo
  const totalRegistros = reporte.datos.length;
  const totalEncuestados = reporte.datos.reduce((sum, d) => sum + d.encuestados, 0);
  const totalNoEncuestados = reporte.datos.reduce((sum, d) => sum + d.noEncuestados, 0);
  const porcentajeParticipacion = totalEncuestados + totalNoEncuestados > 0
    ? ((totalEncuestados / (totalEncuestados + totalNoEncuestados)) * 100).toFixed(2)
    : '0.00';
  const notaPromedio = reporte.datos.length > 0
    ? (reporte.datos.reduce((sum, d) => sum + d.nota, 0) / reporte.datos.length).toFixed(2)
    : '0.00';

  // Promedios por aspectos académicos
  const promedioAE01 = reporte.datos.length > 0
    ? (reporte.datos.reduce((sum, d) => sum + d.ae01, 0) / reporte.datos.length).toFixed(2)
    : '0.00';
  const promedioAE02 = reporte.datos.length > 0
    ? (reporte.datos.reduce((sum, d) => sum + d.ae02, 0) / reporte.datos.length).toFixed(2)
    : '0.00';
  const promedioAE03 = reporte.datos.length > 0
    ? (reporte.datos.reduce((sum, d) => sum + d.ae03, 0) / reporte.datos.length).toFixed(2)
    : '0.00';
  const promedioAE04 = reporte.datos.length > 0
    ? (reporte.datos.reduce((sum, d) => sum + d.ae04, 0) / reporte.datos.length).toFixed(2)
    : '0.00';

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Resumen Ejecutivo', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  const resumenText = [
    `Total de registros evaluados: ${totalRegistros}`,
    `Total de estudiantes encuestados: ${totalEncuestados}`,
    `Total de estudiantes no encuestados: ${totalNoEncuestados}`,
    `Porcentaje de participación: ${porcentajeParticipacion}%`,
    `Nota promedio general: ${notaPromedio}/20`,
    '',
    'Promedios por Aspectos Académicos:',
    `• Calidad de presentación y contenido sílabico: ${promedioAE01}/20`,
    `• Ejecución del proceso enseñanza-aprendizaje: ${promedioAE02}/20`,
    `• Aplicación de la evaluación: ${promedioAE03}/20`,
    `• Formación actitudinal e interpersonales: ${promedioAE04}/20`
  ];

  resumenText.forEach((line) => {
    if (yPosition > pageHeight - 20) {
      doc.addPage();
      yPosition = margin;
    }
    doc.text(line, margin, yPosition);
    yPosition += 5;
  });

  yPosition += 5;

  // Tabla de datos
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos de Evaluación', margin, yPosition);
  yPosition += 5;

  const tableData = reporte.datos.map((item: EvaluacionData) => [
    item.docente,
    item.curso,
    item.seccion,
    item.calificacion,
    item.nota.toFixed(2),
    item.encuestados.toString(),
    item.noEncuestados.toString()
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Docente', 'Curso', 'Sección', 'Calificación', 'Nota', 'Encuestados', 'No Encuestados']],
    body: tableData,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [22, 40, 92] }, // Azul marino Universidad Privada de Tacna
    margin: { left: margin, right: margin }
  });

  yPosition = (doc as any).lastAutoTable.finalY + 10;

  // Gráficos
  for (let i = 0; i < graficosElements.length; i++) {
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    try {
      const canvas = await html2canvas(graficosElements[i], {
        scale: 2,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      if (yPosition + imgHeight > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }

      doc.addImage(imgData, 'PNG', margin, yPosition, imgWidth, imgHeight);
      yPosition += imgHeight + 10;

      // Interpretación del gráfico
      if (reporte.interpretaciones[i]) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        const interpretacionLines = doc.splitTextToSize(
          reporte.interpretaciones[i],
          pageWidth - (margin * 2)
        );
        
        if (yPosition + (interpretacionLines.length * 5) > pageHeight - margin) {
          doc.addPage();
          yPosition = margin;
        }

        doc.text(interpretacionLines, margin, yPosition);
        yPosition += interpretacionLines.length * 5 + 10;
      }
    } catch (error) {
      console.error('Error al capturar gráfico:', error);
    }
  }

  // Guardar PDF
  doc.save(`reporte-evaluacion-${new Date().toISOString().split('T')[0]}.pdf`);
}

interface DocenteResumen {
  docente: string;
  promedioNota: number;
  cantidadCursos: number;
  calificacion: string;
}

interface ResumenData {
  nombre: string; // carrera o facultad
  docentes: DocenteResumen[];
  totalDocentes: number;
  totalCursos: number;
  promedioGeneral: number;
  datosDetalle: EvaluacionData[];
  promediosPorDocente: Map<string, number>;
  cursosNoValidos?: EvaluacionData[];
  docentesExcluidos?: { docente: string; cantidadCursos: number; motivo: string }[];
}

// Mapeo de siglas de facultades a nombres completos
const nombresFacultades: Record<string, string> = {
  'FAU': 'Facultad de Arquitectura y Urbanismo',
  'FADE': 'Facultad de Derecho y Ciencias Políticas',
  'FAING': 'Facultad de Ingeniería',
  'FAEDCOH': 'Facultad de Educación, Ciencias de la Comunicación, Humanidades',
  'FACSA': 'Facultad de Ciencias de la Salud',
  'FACEM': 'Facultad de Ciencias Empresariales'
};

export async function generarPDFResumenDocente(
  resumenes: ResumenData[],
  tipo: 'carrera' | 'facultad' | 'institucional',
  titulo: string,
  nombreFiltro?: string
): Promise<void> {
  const doc = new jsPDF('l', 'mm', 'a4'); // 'l' para landscape (horizontal)
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  let yPosition = margin;

  // Título del reporte
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 40, 92); // Azul marino Universidad Privada de Tacna
  doc.text(titulo, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 12; // Aumentar espacio después del título

  // Fecha
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const fecha = new Date().toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  doc.text(`Fecha de generación: ${fecha}`, pageWidth / 2, yPosition, { align: 'center' });
  yPosition += 15;

  // Procesar cada resumen (carrera o facultad)
  for (const resumen of resumenes) {
    // Verificar si necesitamos nueva página
    if (yPosition > pageHeight - 100) {
      doc.addPage();
      yPosition = margin;
    }

    // Título de la carrera/facultad
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(22, 40, 92); // Azul marino Universidad Privada de Tacna
    // Si es tipo facultad, convertir sigla a nombre completo
    const nombreMostrar = tipo === 'facultad' && nombresFacultades[resumen.nombre]
      ? nombresFacultades[resumen.nombre]
      : resumen.nombre;
    doc.text(nombreMostrar, margin, yPosition);
    yPosition += 8;

    // Estadísticas
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const statsText = [
      `Total de Docentes: ${resumen.totalDocentes}`,
      `Total de Cursos: ${resumen.totalCursos}`,
      `Promedio General: ${resumen.promedioGeneral.toFixed(2)}/20`
    ];
    statsText.forEach((line) => {
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 8;

    // Tabla 1: Reporte de Notas de la Plana Docente
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Notas de la Plana Docente', margin, yPosition);
    yPosition += 8;

    const resumenTableData = resumen.docentes.map((docente, index) => [
      (index + 1).toString(),
      docente.docente,
      docente.promedioNota.toFixed(2),
      docente.cantidadCursos.toString(),
      docente.calificacion
    ]);

    // Agregar fila de promedio general
    resumenTableData.push([
      '',
      'PROMEDIO GENERAL',
      resumen.promedioGeneral.toFixed(2),
      resumen.totalCursos.toString(),
      ''
    ]);

    autoTable(doc, {
      startY: yPosition,
      head: [['N°', 'Docente', 'Promedio Nota', 'Cantidad Cursos', 'Calificación']],
      body: resumenTableData,
      styles: { 
        fontSize: 9,
        cellPadding: 3,
        lineWidth: 0.1
      },
      headStyles: { 
        fillColor: [22, 40, 92], // Azul marino Universidad Privada de Tacna
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 10
      },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 20, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { halign: 'right', cellWidth: 35 },
        3: { halign: 'center', cellWidth: 35 },
        4: { halign: 'center', cellWidth: 40 }
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Tabla 2: Detalle de Cursos
    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    // Si es tipo facultad, usar nombre completo en el detalle también
    const nombreDetalle = tipo === 'facultad' && nombresFacultades[resumen.nombre]
      ? nombresFacultades[resumen.nombre]
      : resumen.nombre;
    doc.text(`Detalle de Cursos - ${nombreDetalle}`, margin, yPosition);
    yPosition += 8;

    // Preparar datos de la tabla y calcular información para combinar celdas
    // IMPORTANTE: Esta lógica asume que los datos están ordenados alfabéticamente por docente,
    // de manera que todos los cursos del mismo docente aparecen consecutivamente
    // Calcular cuántas filas consecutivas tiene cada docente
    const rowSpansPorDocente: Map<number, number> = new Map();
    for (let i = 0; i < resumen.datosDetalle.length; i++) {
      const esPrimeraFilaDelDocente = i === 0 || resumen.datosDetalle[i].docente !== resumen.datosDetalle[i - 1].docente;
      if (esPrimeraFilaDelDocente) {
        // Contar cuántas filas consecutivas tiene este docente
        let contador = 1;
        for (let j = i + 1; j < resumen.datosDetalle.length; j++) {
          if (resumen.datosDetalle[j].docente === resumen.datosDetalle[i].docente) {
            contador++;
          } else {
            break;
          }
        }
        if (contador > 1) {
          rowSpansPorDocente.set(i, contador);
        }
      }
    }

    // Preparar datos de la tabla usando objetos especiales para combinar celdas
    const detalleTableData = resumen.datosDetalle.map((dato, index) => {
      const promedioDocente = resumen.promediosPorDocente.get(dato.docente) || dato.nota;
      const esPrimeraFilaDelDocente = index === 0 || resumen.datosDetalle[index - 1].docente !== dato.docente;
      
      // Buscar si hay un grupo que empiece antes de esta fila y que incluya esta fila
      let rowSpanPromedio: number | undefined;
      let indiceInicioGrupo = -1;
      for (const [inicio, rowSpan] of rowSpansPorDocente.entries()) {
        if (inicio <= index && index < inicio + rowSpan) {
          rowSpanPromedio = rowSpan;
          indiceInicioGrupo = inicio;
          break;
        }
      }

      const esFilaIntermedioGrupo = indiceInicioGrupo >= 0 && indiceInicioGrupo !== index;

      const base: (string | { content: string; rowSpan: number })[] = [
        dato.docente,
        dato.curso,
        dato.seccion,
        resolverCal(dato),
        dato.ae01.toFixed(2),
        dato.ae02.toFixed(2),
        dato.ae03.toFixed(2),
        dato.ae04.toFixed(2),
        dato.nota.toFixed(2),
      ];

      // Filas intermedias de un rowSpan: NO incluir celda Promedio (autoTable la salta
      // automáticamente porque ya está ocupada por el rowSpan de la primera fila).
      if (!esFilaIntermedioGrupo) {
        if (esPrimeraFilaDelDocente && rowSpanPromedio && rowSpanPromedio > 1 && indiceInicioGrupo === index) {
          base.push({ content: promedioDocente.toFixed(2), rowSpan: rowSpanPromedio });
        } else {
          base.push(promedioDocente.toFixed(2));
        }
      }

      base.push(dato.encuestados.toString(), dato.noEncuestados.toString());
      return base;
    });

    // Calcular ancho disponible y distribuir proporcionalmente
    const availableWidth = pageWidth - (margin * 2);
    
    // Anchos fijos para columnas numéricas y pequeñas
    const fixedWidths = {
      seccion: 18,
      calificacion: 28,
      ae: 20, // Para AE-01 a AE-04
      nota: 20, // Para Nota y Promedio
      encuestados: 22 // Para Encuestados y No Encuestados
    };
    
    // Calcular ancho total de columnas fijas
    const totalFixedWidth = fixedWidths.seccion + fixedWidths.calificacion + 
                           (fixedWidths.ae * 4) + (fixedWidths.nota * 2) + 
                           (fixedWidths.encuestados * 2);
    
    // Distribuir el espacio restante entre Docente y Curso (60% Docente, 40% Curso)
    const remainingWidth = availableWidth - totalFixedWidth;
    const docenteWidth = Math.floor(remainingWidth * 0.55);
    const cursoWidth = Math.floor(remainingWidth * 0.45);
    
    // Usar autoTable con distribución responsive
    autoTable(doc, {
      startY: yPosition,
      head: [['Docente', 'Curso', 'Sección', 'Calificación', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Nota', 'Promedio', 'Encuestados', 'No Encuestados']],
      body: detalleTableData,
      styles: { 
        fontSize: 7,
        cellPadding: 2,
        lineWidth: 0.1,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [22, 40, 92], // Azul marino Universidad Privada de Tacna
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { halign: 'left', cellWidth: docenteWidth }, // Docente - responsive
        1: { halign: 'left', cellWidth: cursoWidth }, // Curso - responsive
        2: { halign: 'center', cellWidth: fixedWidths.seccion }, // Sección
        3: { halign: 'center', cellWidth: fixedWidths.calificacion }, // Calificación
        4: { halign: 'right', cellWidth: fixedWidths.ae }, // AE-01
        5: { halign: 'right', cellWidth: fixedWidths.ae }, // AE-02
        6: { halign: 'right', cellWidth: fixedWidths.ae }, // AE-03
        7: { halign: 'right', cellWidth: fixedWidths.ae }, // AE-04
        8: { halign: 'right', cellWidth: fixedWidths.nota }, // Nota
        9: { halign: 'right', cellWidth: fixedWidths.nota }, // Promedio
        10: { halign: 'center', cellWidth: fixedWidths.encuestados }, // Encuestados
        11: { halign: 'center', cellWidth: fixedWidths.encuestados } // No Encuestados
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      tableWidth: availableWidth
    });

    yPosition = (doc as any).lastAutoTable.finalY + 15;

    // Tabla 3: Encuestas No Válidas
    const noValidos = resumen.cursosNoValidos ?? [];
    if (noValidos.length > 0) {
      if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 40, 92);
      doc.text('Encuestas No Válidas (Excluidas del Reporte)', margin, yPosition);
      yPosition += 7;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text('Evaluaciones excluidas por baja participación (<30% de la sección respondió la encuesta).', margin, yPosition);
      yPosition += 6;
      autoTable(doc, {
        startY: yPosition,
        head: [['N°', 'Docente', 'Curso', 'Sección', 'Encuestados', 'No Encuestados', 'Calificación', 'Nota']],
        body: noValidos.map((d, i) => [
          (i + 1).toString(), d.docente, d.curso, d.seccion,
          d.encuestados.toString(), d.noEncuestados.toString(),
          resolverCal(d), d.nota.toFixed(2),
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
        headStyles: { fillColor: [22, 40, 92], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          3: { cellWidth: 18, halign: 'center' },
          4: { cellWidth: 25, halign: 'center' },
          5: { cellWidth: 30, halign: 'center' },
          6: { cellWidth: 35, halign: 'center' },
          7: { cellWidth: 20, halign: 'right' },
        },
        tableWidth: pageWidth - margin * 2,
      });
      yPosition = (doc as any).lastAutoTable.finalY + 15;
    }

    // Tabla 4: Docentes sin promedio calculable
    const excluidos = resumen.docentesExcluidos ?? [];
    if (excluidos.length > 0) {
      if (yPosition > pageHeight - 60) { doc.addPage(); yPosition = margin; }
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.setTextColor(22, 40, 92);
      doc.text('Docentes sin promedio calculable', margin, yPosition);
      yPosition += 7;
      doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(80, 80, 80);
      doc.text('Docentes sin registros válidos para el cálculo de promedio, excluidos del reporte estadístico.', margin, yPosition);
      yPosition += 6;
      autoTable(doc, {
        startY: yPosition,
        head: [['N°', 'Docente', 'Cursos Registrados', 'Motivo de Exclusión']],
        body: excluidos.map((e, i) => [
          (i + 1).toString(), e.docente, e.cantidadCursos.toString(), e.motivo,
        ]),
        styles: { fontSize: 8, cellPadding: 2, lineWidth: 0.1 },
        headStyles: { fillColor: [22, 40, 92], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
        margin: { left: margin, right: margin },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' },
          2: { cellWidth: 35, halign: 'center' },
        },
        tableWidth: pageWidth - margin * 2,
      });
      yPosition = (doc as any).lastAutoTable.finalY + 20;
    }
  }

  // Guardar PDF
  const fechaArchivo = new Date().toISOString().split('T')[0];
  const sanitizar = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const sufijo = nombreFiltro ? sanitizar(nombreFiltro) : tipo === 'carrera' ? 'todas_las_carreras' : 'todas_las_facultades';
  const nombreArchivo = `Resumen_Docente_${sufijo}_${fechaArchivo}.pdf`;
  doc.save(nombreArchivo);
}

// ─────────────────────────────────────────────────────────────────────────────
// Módulo de Exportación por Facultad — Reportes I–VI (todas las facultades)
// ─────────────────────────────────────────────────────────────────────────────

import { calcularCalificacion, FACULTADES, ASPECTOS_EVALUADOS, PERIODO_ACADEMICO, UMBRAL_PARTICIPACION_MINIMA, QUORUM_MINIMO_ENCUESTADOS } from '../config/universityStructure';

const AZUL_UPT: [number, number, number] = [22, 40, 92];
const ROJO_INSATISFACTORIO: [number, number, number] = [197, 48, 48];
const VERDE_DESTACADO: [number, number, number] = [39, 103, 73];

function hoyStr(): string {
  return new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });
}

function normPdf(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function matchesFacultadPdf(recordFacultad: string, codigoSeleccionado: string): boolean {
  if (!codigoSeleccionado) return true;
  const rn = normPdf(recordFacultad);
  const facData = FACULTADES[codigoSeleccionado];
  if (!facData) return false;
  return rn.includes(normPdf(codigoSeleccionado)) || rn.includes(normPdf(facData.nombre));
}

function filtrarPorFacultad(datos: EvaluacionData[], facultad: string, carrera: string, docente: string): EvaluacionData[] {
  let r = datos.filter(d => matchesFacultadPdf(d.facultad, facultad));
  if (carrera) r = r.filter(d => d.carreraProfesional === carrera);
  if (docente) r = r.filter(d => d.docente === docente);
  return r;
}

function nombreFacultadPdf(codigo: string): string {
  return codigo ? (FACULTADES[codigo]?.nombre ?? codigo) : 'Todas las Facultades';
}

function limpiarNombrePdf(s: string): string {
  if (!s) return '';
  return s.replace(/\s*-\s*,/g, ',').replace(/,\s*-\s+/g, ', ').replace(/\s{2,}/g, ' ').trim();
}

function resolverCal(d: EvaluacionData): string {
  if (d.validez !== 'Válido') return 'N/A';
  if (d.encuestados === 0) return 'No Aplica';
  if (d.nota === 0) return 'Sin Evaluar';
  const total = d.encuestados + d.noEncuestados;
  if (total > 0 && d.encuestados / total < UMBRAL_PARTICIPACION_MINIMA) return 'Baja Participación';
  const map: Record<string, string> = { DESTACADO: 'Destacado', BUENO: 'Bueno', ACEPTABLE: 'Aceptable', INSATISFACTORIO: 'Insatisfactorio' };
  return map[calcularCalificacion(d.nota)];
}

function colorPorCalificacion(calStr: string): [number, number, number] {
  if (calStr === 'Insatisfactorio') return ROJO_INSATISFACTORIO;
  if (calStr === 'Destacado') return VERDE_DESTACADO;
  if (calStr === 'Bueno') return [43, 108, 176];
  if (calStr === 'Aceptable') return [192, 86, 33];
  if (calStr === 'Baja Participación') return [107, 33, 168]; // purple
  return [113, 128, 150]; // N/A, No Aplica, Sin Evaluar → gris
}

function cabeceraReporte(doc: jsPDF, facultad: string, titulo: string, subtitulo: string): number {
  const pw = doc.internal.pageSize.getWidth();
  let y = 12;
  doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(...AZUL_UPT);
  doc.text('Universidad Privada de Tacna', pw / 2, y, { align: 'center' });
  y += 6;
  doc.setFontSize(11).setFont('helvetica', 'normal').setTextColor(60, 60, 60);
  const nombreFac = nombreFacultadPdf(facultad);
  doc.text(nombreFac, pw / 2, y, { align: 'center' });
  y += 5;
  doc.text(`Proceso de Encuestas "Tu Opinión Cuenta ${PERIODO_ACADEMICO}"`, pw / 2, y, { align: 'center' });
  y += 8;
  doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...AZUL_UPT);
  doc.text(titulo, pw / 2, y, { align: 'center' });
  y += 6;
  if (subtitulo) {
    doc.setFontSize(10).setFont('helvetica', 'italic').setTextColor(80, 80, 80);
    doc.text(subtitulo, pw / 2, y, { align: 'center' });
    y += 5;
  }
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(100, 100, 100);
  doc.text(`Fecha de generación: ${hoyStr()}`, pw / 2, y, { align: 'center' });
  y += 8;
  return y;
}

function avg(arr: number[]): number {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
}

function kpiColorPromedio(nota: number): [number, number, number] {
  if (nota <= 0) return [113, 128, 150];
  if (nota >= 17.1) return VERDE_DESTACADO;
  if (nota >= 15.1) return [43, 108, 176];
  if (nota >= 11.0) return [192, 86, 33];
  return ROJO_INSATISFACTORIO;
}

/** Dibuja tarjetas de KPI horizontales y retorna la Y final. */
function dibujarKPIsPdf(
  doc: jsPDF,
  y: number,
  margin: number,
  kpis: { label: string; valor: string; rgb: [number, number, number] }[]
): number {
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const gap = 4;
  const cardW = (pw - margin * 2 - (kpis.length - 1) * gap) / kpis.length;
  const headerH = 6;
  const valueH = 13;
  const totalH = headerH + valueH;

  if (y + totalH > ph - margin) { doc.addPage(); y = 20; }

  kpis.forEach((kpi, i) => {
    const x = margin + i * (cardW + gap);
    const [r, g, b] = kpi.rgb;

    // Header bar
    doc.setFillColor(r, g, b);
    doc.rect(x, y, cardW, headerH, 'F');
    doc.setFontSize(7).setFont('helvetica', 'bold').setTextColor(255, 255, 255);
    doc.text(kpi.label, x + cardW / 2, y + 4.2, { align: 'center' });

    // Value area (light background)
    doc.setFillColor(247, 249, 252);
    doc.rect(x, y + headerH, cardW, valueH, 'F');

    // Card border
    doc.setDrawColor(r, g, b);
    doc.setLineWidth(0.3);
    doc.rect(x, y, cardW, totalH);

    // Value text (uses KPI accent color)
    doc.setFontSize(15).setFont('helvetica', 'bold').setTextColor(r, g, b);
    doc.text(kpi.valor, x + cardW / 2, y + headerH + valueH / 2 + 3.5, { align: 'center' });
  });

  return y + totalH + 6;
}

function agregarLeyendaAEPdf(doc: jsPDF, y: number): number {
  const margin = 12;
  const ph = doc.internal.pageSize.getHeight();
  if (y + 28 > ph - 8) { doc.addPage(); y = 20; }
  doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(22, 40, 92);
  doc.text('Leyenda — Aspectos Evaluados (AE):', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal').setTextColor(60, 60, 60);
  for (const [codigo, desc] of Object.entries(ASPECTOS_EVALUADOS)) {
    if (y + 4 > ph - 6) { doc.addPage(); y = 20; }
    doc.text(`${codigo}: ${desc}`, margin + 3, y);
    y += 4;
  }
  return y;
}

// Reporte I – General de Evaluación por Docente (landscape, cortes por carrera)
export async function generarPDFReporteI(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string,
  docente: string
): Promise<void> {
  const filtrados = filtrarPorFacultad(datos, facultad, carrera, docente).sort((a, b) =>
    a.carreraProfesional.localeCompare(b.carreraProfesional) || a.docente.localeCompare(b.docente)
  );
  if (filtrados.length === 0) { alert('No hay datos para los filtros seleccionados.'); return; }

  // KPI computation
  const validosKpiI = filtrados.filter(d => {
    if (d.validez !== 'Válido' || d.encuestados === 0 || d.nota === 0) return false;
    const t = d.encuestados + d.noEncuestados;
    return t === 0 || d.encuestados / t >= UMBRAL_PARTICIPACION_MINIMA;
  });
  const nDocentesI = new Set(filtrados.map(d => d.docente)).size;
  const promedioGenI = validosKpiI.length ? avg(validosKpiI.map(d => d.nota)) : 0;
  const nInsatisfI = validosKpiI.filter(d => d.nota <= 10.9).length;

  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 12;
  let y = cabeceraReporte(doc, facultad, 'Reporte I: Evaluación General por Docente', carrera || 'Todas las Carreras');

  // KPI cards
  y = dibujarKPIsPdf(doc, y, margin, [
    { label: 'Total Docentes Evaluados', valor: nDocentesI.toString(), rgb: AZUL_UPT },
    { label: 'Promedio General', valor: promedioGenI > 0 ? promedioGenI.toFixed(2) : '—', rgb: kpiColorPromedio(promedioGenI) },
    { label: 'Secc. Insatisfactorias', valor: nInsatisfI.toString(), rgb: nInsatisfI > 0 ? ROJO_INSATISFACTORIO : VERDE_DESTACADO },
  ]);

  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  for (const c of carreras) {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = 20; }
    doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...AZUL_UPT);
    doc.text(c, margin, y); y += 7;

    const body = regs.map(d => [
      limpiarNombrePdf(d.docente), d.curso, d.seccion, resolverCal(d),
      d.nota.toFixed(2), d.ae01.toFixed(2), d.ae02.toFixed(2), d.ae03.toFixed(2), d.ae04.toFixed(2),
      d.encuestados.toString(), d.noEncuestados.toString(), d.validez,
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Docente', 'Curso', 'Sección', 'Calificación', 'Nota', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Enc.', 'No Enc.', 'Validez']],
      body,
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: { fillColor: AZUL_UPT, textColor: [255, 255, 255], fontSize: 8 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 55 }, 1: { cellWidth: 45 }, 2: { halign: 'center', cellWidth: 14 },
        3: { halign: 'center', cellWidth: 22 }, 4: { halign: 'right', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 14 }, 6: { halign: 'right', cellWidth: 14 },
        7: { halign: 'right', cellWidth: 14 }, 8: { halign: 'right', cellWidth: 14 },
        9: { halign: 'center', cellWidth: 14 }, 10: { halign: 'center', cellWidth: 16 },
        11: { halign: 'center', cellWidth: 16 },
      },
      didParseCell(data) {
        if (data.column.index === 3 && data.section === 'body') {
          const color = colorPorCalificacion(data.cell.text[0]);
          data.cell.styles.textColor = color;
          data.cell.styles.fontStyle = 'bold';
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }
  agregarLeyendaAEPdf(doc, y + 4);
  const slug = facultad || 'GENERAL';
  doc.save(`ReporteI_EvaluacionDocente_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Reporte II – Docentes Insatisfactorios
export async function generarPDFReporteII(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string
): Promise<void> {
  const baseInsatisf = filtrarPorFacultad(datos, facultad, carrera, '')
    .filter(d => {
      if (d.nota <= 0 || d.nota > 10.9 || d.validez !== 'Válido' || d.encuestados === 0) return false;
      const total = d.encuestados + d.noEncuestados;
      return total === 0 || d.encuestados / total >= UMBRAL_PARTICIPACION_MINIMA;
    })
    .sort((a, b) => a.carreraProfesional.localeCompare(b.carreraProfesional) || a.nota - b.nota);

  // Separar con y sin quórum estadístico mínimo
  const filtrados  = baseInsatisf.filter(d => d.encuestados >= QUORUM_MINIMO_ENCUESTADOS);
  const sinQuorum  = baseInsatisf.filter(d => d.encuestados < QUORUM_MINIMO_ENCUESTADOS);

  if (filtrados.length === 0 && sinQuorum.length === 0) {
    alert('No hay docentes insatisfactorios con secciones válidas para los filtros seleccionados.');
    return;
  }

  const insuf = filtrados.map(d => {
    const total = d.encuestados + d.noEncuestados;
    return total > 0 && d.encuestados / total < 0.15;
  });
  const hayInsuf = insuf.some(Boolean);

  const promedioInsatisfII = filtrados.length ? avg(filtrados.map(d => d.nota)) : 0;
  const nInsufII = filtrados.filter(d => {
    const t = d.encuestados + d.noEncuestados;
    return t > 0 && d.encuestados / t < 0.15;
  }).length;

  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 12;
  let y = cabeceraReporte(doc, facultad, 'Reporte II: Docentes con Calificación Insatisfactoria', carrera || 'Todas las Carreras');

  // KPI cards
  y = dibujarKPIsPdf(doc, y, margin, [
    { label: `Secciones Insatisfactorias (n≥${QUORUM_MINIMO_ENCUESTADOS})`, valor: filtrados.length.toString(), rgb: filtrados.length > 0 ? ROJO_INSATISFACTORIO : VERDE_DESTACADO },
    { label: 'Promedio (Insatisfactorios)', valor: filtrados.length > 0 ? promedioInsatisfII.toFixed(2) : '—', rgb: ROJO_INSATISFACTORIO },
    { label: `Excluidas sub-quórum (<${QUORUM_MINIMO_ENCUESTADOS} enc.)`, valor: sinQuorum.length.toString(), rgb: sinQuorum.length > 0 ? [107, 33, 168] : VERDE_DESTACADO },
    { label: 'Muestra Insuficiente (<15%)', valor: nInsufII.toString(), rgb: nInsufII > 0 ? [192, 86, 33] : VERDE_DESTACADO },
  ]);

  if (filtrados.length > 0) {
    const body = filtrados.map((d, i) => [
      d.carreraProfesional, limpiarNombrePdf(d.docente), d.curso, d.seccion,
      d.nota.toFixed(2), d.ae01.toFixed(2), d.ae02.toFixed(2), d.ae03.toFixed(2), d.ae04.toFixed(2),
      insuf[i] ? `${d.encuestados} [!]` : d.encuestados.toString(),
    ]);
    autoTable(doc, {
      startY: y,
      head: [['Carrera', 'Docente', 'Curso', 'Sección', 'Nota', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Encuestados']],
      body,
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: ROJO_INSATISFACTORIO, textColor: [255, 255, 255], fontSize: 8 },
      margin: { left: margin, right: margin },
      columnStyles: {
        0: { cellWidth: 40 }, 1: { cellWidth: 55 }, 2: { cellWidth: 40 },
        3: { halign: 'center', cellWidth: 14 }, 4: { halign: 'right', cellWidth: 14 },
        5: { halign: 'right', cellWidth: 14 }, 6: { halign: 'right', cellWidth: 14 },
        7: { halign: 'right', cellWidth: 14 }, 8: { halign: 'right', cellWidth: 14 },
        9: { halign: 'center', cellWidth: 18 },
      },
      didParseCell(data) {
        if (data.section === 'body') {
          data.cell.styles.textColor = ROJO_INSATISFACTORIO;
          if (insuf[data.row.index]) data.cell.styles.fillColor = [255, 235, 156];
        }
      },
    });
  }

  let yFinal = filtrados.length > 0 ? (doc as any).lastAutoTable.finalY + 5 : y + 4;
  if (hayInsuf) {
    doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(150, 100, 0);
    doc.text('[!] Muestra Insuficiente — encuestados < 15% del total de la seccion. Pendiente de Validacion.', margin, yFinal);
    yFinal += 6;
  }

  // Sección informativa: sub-quórum (no generan alerta institucional)
  if (sinQuorum.length > 0) {
    if (yFinal > 175) { doc.addPage(); yFinal = 20; }
    doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(107, 33, 168);
    doc.text(`Secciones excluidas por Sub-Quórum (< ${QUORUM_MINIMO_ENCUESTADOS} encuestados) — informativo, sin valor estadístico`, margin, yFinal);
    yFinal += 5;
    doc.setFontSize(8).setFont('helvetica', 'italic').setTextColor(100, 100, 100);
    doc.text('Estas secciones obtuvieron INSATISFACTORIO pero con muestra insuficiente para ser representativas. No generan alerta institucional.', margin, yFinal);
    yFinal += 5;
    autoTable(doc, {
      startY: yFinal,
      head: [['Carrera', 'Docente', 'Curso', 'Sección', 'Nota', 'Enc.']],
      body: sinQuorum.map(d => [d.carreraProfesional, limpiarNombrePdf(d.docente), d.curso, d.seccion, d.nota.toFixed(2), d.encuestados.toString()]),
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [107, 33, 168], textColor: [255, 255, 255], fontSize: 7.5 },
      margin: { left: margin, right: margin },
      didParseCell(data) {
        if (data.section === 'body') data.cell.styles.textColor = [107, 33, 168];
      },
    });
    yFinal = (doc as any).lastAutoTable.finalY + 5;
  }

  agregarLeyendaAEPdf(doc, yFinal + 2);

  const slug = facultad || 'GENERAL';
  doc.save(`ReporteII_Insatisfactorios_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Reporte III – Notas de Criterios AE por Carrera (con gráfico de barras agrupadas)
export async function generarPDFReporteIII(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string,
  graficoEl: HTMLElement | null
): Promise<void> {
  const filtrados = filtrarPorFacultad(datos, facultad, carrera, '').filter(d => {
    if (d.validez !== 'Válido' || d.encuestados === 0 || d.nota === 0) return false;
    const total = d.encuestados + d.noEncuestados;
    return total === 0 || d.encuestados / total >= UMBRAL_PARTICIPACION_MINIMA;
  });
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  if (carreras.length === 0) { alert('No hay datos para los filtros seleccionados.'); return; }

  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 12;
  let y = cabeceraReporte(doc, facultad, 'Reporte III: Criterios de Evaluación por Carrera', '');
  const pw = doc.internal.pageSize.getWidth();

  const body = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const ae01 = avg(regs.map(d => d.ae01));
    const ae02 = avg(regs.map(d => d.ae02));
    const ae03 = avg(regs.map(d => d.ae03));
    const ae04 = avg(regs.map(d => d.ae04));
    return [c, ae01.toFixed(2), ae02.toFixed(2), ae03.toFixed(2), ae04.toFixed(2), avg([ae01, ae02, ae03, ae04]).toFixed(2)];
  });

  autoTable(doc, {
    startY: y,
    head: [['Carrera Profesional', 'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Promedio']],
    body,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: AZUL_UPT, textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right', fontStyle: 'bold' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (graficoEl) {
    try {
      const canvas = await html2canvas(graficoEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgW = pw - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (y + imgH > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = 20; }
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, imgW, imgH);
      y += imgH + 6;
    } catch { /* sin gráfico */ }
  }
  agregarLeyendaAEPdf(doc, y + 4);
  const slug = facultad || 'GENERAL';
  doc.save(`ReporteIII_CriteriosAE_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Reporte IV – % Juicio de Valor por Carrera (con gráfico de barras apiladas)
export async function generarPDFReporteIV(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string,
  graficoEl: HTMLElement | null
): Promise<void> {
  const filtrados = filtrarPorFacultad(datos, facultad, carrera, '').filter(d => {
    if (d.validez !== 'Válido' || d.encuestados === 0 || d.nota === 0) return false;
    const total = d.encuestados + d.noEncuestados;
    return total === 0 || d.encuestados / total >= UMBRAL_PARTICIPACION_MINIMA;
  });
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  if (carreras.length === 0) { alert('No hay datos para los filtros seleccionados.'); return; }

  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 12;
  let y = cabeceraReporte(doc, facultad, 'Reporte IV: Distribución Porcentual del Juicio de Valor', '');
  const pw = doc.internal.pageSize.getWidth();

  const body = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const total = regs.length;
    const p = (cal: string) => {
      const n = regs.filter(d => calcularCalificacion(d.nota) === cal).length;
      return total > 0 ? `${(n / total * 100).toFixed(1)}% (${n})` : '—';
    };
    return [c, total.toString(), p('DESTACADO'), p('BUENO'), p('ACEPTABLE'), p('INSATISFACTORIO')];
  });

  autoTable(doc, {
    startY: y,
    head: [['Carrera Profesional', 'Secc. Calificadas', 'Destacado', 'Bueno', 'Aceptable', 'Insatisfactorio']],
    body,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: AZUL_UPT, textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 80 }, 1: { halign: 'center' }, 2: { halign: 'center' }, 3: { halign: 'center' }, 4: { halign: 'center' }, 5: { halign: 'center' } },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (graficoEl) {
    try {
      const canvas = await html2canvas(graficoEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgW = pw - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (y + imgH > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = 20; }
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, imgW, imgH);
    } catch { /* sin gráfico */ }
  }
  const slug = facultad || 'GENERAL';
  doc.save(`ReporteIV_JuicioValor_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Reporte V – Estudiantes Encuestados por Carrera (con barras apiladas)
export async function generarPDFReporteV(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string,
  graficoEl: HTMLElement | null
): Promise<void> {
  const filtrados = filtrarPorFacultad(datos, facultad, carrera, '');
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  if (carreras.length === 0) { alert('No hay datos para los filtros seleccionados.'); return; }

  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 12;
  let y = cabeceraReporte(doc, facultad, 'Reporte V: Estudiantes Encuestados por Carrera', '');
  const pw = doc.internal.pageSize.getWidth();
  const labelTotal = `TOTAL — ${nombreFacultadPdf(facultad)}`;

  const filas = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const enc = regs.reduce((s, d) => s + d.encuestados, 0);
    const noEnc = regs.reduce((s, d) => s + d.noEncuestados, 0);
    const total = enc + noEnc;
    return { c, total, enc, noEnc, porc: total > 0 ? enc / total * 100 : 0 };
  });
  const totEnc = filas.reduce((s, f) => s + f.enc, 0);
  const totNoEnc = filas.reduce((s, f) => s + f.noEnc, 0);
  const totTotal = totEnc + totNoEnc;

  const body: (string | number)[][] = [
    ...filas.map(f => [f.c, f.total, f.enc, f.noEnc, f.porc.toFixed(2) + '%']),
    [labelTotal, totTotal, totEnc, totNoEnc, totTotal > 0 ? (totEnc / totTotal * 100).toFixed(2) + '%' : '—'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Carrera Profesional', 'Total Matriculados', 'Encuestados', 'No Encuestados', '% Participación']],
    body,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: AZUL_UPT, textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.section === 'body') {
        if (data.row.index === filas.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
        }
        if (data.column.index === 4) {
          const porcStr = data.cell.text[0]?.replace('%', '').replace('—', '').trim();
          const porc = parseFloat(porcStr);
          if (!isNaN(porc)) {
            data.cell.styles.fillColor = porc < 70 ? [255, 199, 206] : porc <= 85 ? [255, 235, 156] : [198, 239, 206];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (graficoEl) {
    try {
      const canvas = await html2canvas(graficoEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgW = pw - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (y + imgH > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = 20; }
      doc.addImage(canvas.toDataURL('image/png'), 'PNG', margin, y, imgW, imgH);
    } catch { /* sin gráfico */ }
  }
  const slug = facultad || 'GENERAL';
  doc.save(`ReporteV_EstudiantesEncuestados_${slug}_${new Date().toISOString().split('T')[0]}.pdf`);
}

// Reporte VI – Encuestas Totales por Carrera (con barras de deserción)
export async function generarPDFReporteVI(
  datos: EvaluacionData[],
  facultad: string,
  carrera: string,
  graficoEl: HTMLElement | null
): Promise<void> {
  const filtrados = filtrarPorFacultad(datos, facultad, carrera, '');
  const carreras = carrera ? [carrera] : [...new Set(filtrados.map(d => d.carreraProfesional))].sort();
  if (carreras.length === 0) { alert('No hay datos para los filtros seleccionados.'); return; }

  const doc = new jsPDF('l', 'mm', 'a4');
  const margin = 12;
  let y = cabeceraReporte(doc, facultad, 'Reporte VI: Encuestas Totales por Carrera', '');
  const pw = doc.internal.pageSize.getWidth();
  const labelTotal6 = `TOTAL — ${nombreFacultadPdf(facultad)}`;

  const filas = carreras.map(c => {
    const regs = filtrados.filter(d => d.carreraProfesional === c);
    const realizadas = regs.reduce((s, d) => s + d.encuestados, 0);
    const noRealizadas = regs.reduce((s, d) => s + d.noEncuestados, 0);
    const proyectadas = realizadas + noRealizadas;
    return { c, proyectadas, realizadas, noRealizadas, porc: proyectadas > 0 ? realizadas / proyectadas * 100 : 0 };
  });
  const totP = filas.reduce((s, f) => s + f.proyectadas, 0);
  const totR = filas.reduce((s, f) => s + f.realizadas, 0);
  const totNR = filas.reduce((s, f) => s + f.noRealizadas, 0);

  const body: (string | number)[][] = [
    ...filas.map(f => [f.c, f.proyectadas, f.realizadas, f.noRealizadas, f.porc.toFixed(2) + '%']),
    [labelTotal6, totP, totR, totNR, totP > 0 ? (totR / totP * 100).toFixed(2) + '%' : '—'],
  ];

  autoTable(doc, {
    startY: y,
    head: [['Carrera Profesional', 'Encuestas Proyectadas', 'Realizadas', 'No Realizadas', '% Completitud']],
    body,
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: AZUL_UPT, textColor: [255, 255, 255] },
    margin: { left: margin, right: margin },
    columnStyles: { 0: { cellWidth: 90 }, 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' } },
    didParseCell(data) {
      if (data.section === 'body') {
        if (data.row.index === filas.length) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [230, 230, 230];
        }
        if (data.column.index === 4) {
          const porcStr = data.cell.text[0]?.replace('%', '').replace('—', '').trim();
          const porc = parseFloat(porcStr);
          if (!isNaN(porc)) {
            data.cell.styles.fillColor = porc < 70 ? [255, 199, 206] : porc <= 85 ? [255, 235, 156] : [198, 239, 206];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  if (graficoEl) {
    try {
      const canvas = await html2canvas(graficoEl, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const imgW = pw - margin * 2;
      const imgH = (canvas.height * imgW) / canvas.width;
      if (y + imgH > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = 20; }
      doc.addImage(imgData, 'PNG', margin, y, imgW, imgH);
    } catch { /* sin gráfico */ }
  }
  const slugVI = facultad || 'GENERAL';
  doc.save(`ReporteVI_EncuestasTotales_${slugVI}_${new Date().toISOString().split('T')[0]}.pdf`);
}

