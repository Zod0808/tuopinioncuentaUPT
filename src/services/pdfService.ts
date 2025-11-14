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
  titulo: string
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

    const detalleTableData = resumen.datosDetalle.map((dato) => {
      const promedioDocente = resumen.promediosPorDocente.get(dato.docente) || dato.nota;
      return [
        dato.docente,
        dato.curso,
        dato.seccion,
        dato.calificacion,
        dato.ae01.toFixed(2),
        dato.ae02.toFixed(2),
        dato.ae03.toFixed(2),
        dato.ae04.toFixed(2),
        dato.nota.toFixed(2),
        promedioDocente.toFixed(2),
        dato.encuestados.toString(),
        dato.noEncuestados.toString()
      ];
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

    yPosition = (doc as any).lastAutoTable.finalY + 20;
  }

  // Guardar PDF
  const fechaArchivo = new Date().toISOString().split('T')[0];
  const nombreArchivo = tipo === 'carrera'
    ? `resumen-docente-carrera-${fechaArchivo}.pdf`
    : `resumen-docente-facultad-${fechaArchivo}.pdf`;
  doc.save(nombreArchivo);
}

