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
  doc.setTextColor(102, 126, 234);
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
    headStyles: { fillColor: [102, 126, 234] },
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

