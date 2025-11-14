import { useState } from 'react';
import { FileDown, Loader } from 'lucide-react';
import { EvaluacionData, ReporteData } from '../types';
import { generarPDF } from '../services/pdfService';
import { generarInterpretacion } from '../services/openaiService';

interface ReportGeneratorProps {
  datos: EvaluacionData[];
  graficosElements: HTMLElement[];
}

export default function ReportGenerator({ datos, graficosElements }: ReportGeneratorProps) {
  const [generando, setGenerando] = useState(false);
  const [interpretaciones, setInterpretaciones] = useState<string[]>([]);

  const generarInterpretaciones = async () => {
    const nuevasInterpretaciones: string[] = [];
    
    // Interpretación para gráfico 1: Notas por curso
    if (datos.length > 0) {
      const cursos = [...new Set(datos.map(d => d.curso))];
      const notasPorCurso = cursos.map(curso => {
        const cursoDatos = datos.filter(d => d.curso === curso);
        return cursoDatos.reduce((sum, d) => sum + d.nota, 0) / cursoDatos.length;
      });
      
      const interp1 = await generarInterpretacion({
        tipoGrafico: 'bar',
        titulo: 'Nota Promedio por Curso',
        datos: { cursos, notas: notasPorCurso }
      });
      nuevasInterpretaciones.push(interp1);
    }

    // Interpretación para gráfico 2: Distribución de calificaciones
    if (datos.length > 0) {
      const calificaciones = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'REGULAR', 'DEFICIENTE'];
      const distribucion = calificaciones.map(cal => 
        datos.filter(d => d.calificacion === cal).length
      );
      
      const interp2 = await generarInterpretacion({
        tipoGrafico: 'pie',
        titulo: 'Distribución de Calificaciones',
        datos: { calificaciones, distribucion }
      });
      nuevasInterpretaciones.push(interp2);
    }

    // Interpretación para gráfico 3: Promedio por Aspectos Académicos
    if (datos.length > 0) {
      const promedioAspectos = [
        datos.reduce((sum, d) => sum + d.ae01, 0) / datos.length,
        datos.reduce((sum, d) => sum + d.ae02, 0) / datos.length,
        datos.reduce((sum, d) => sum + d.ae03, 0) / datos.length,
        datos.reduce((sum, d) => sum + d.ae04, 0) / datos.length
      ];
      
      const interp3 = await generarInterpretacion({
        tipoGrafico: 'bar',
        titulo: 'Promedio por Aspectos Académicos Evaluados',
        datos: {
          aspectos: [
            'Calidad de presentación y contenido sílabico',
            'Ejecución del proceso enseñanza-aprendizaje',
            'Aplicación de la evaluación',
            'Formación actitudinal e interpersonales'
          ],
          promedios: promedioAspectos
        }
      });
      nuevasInterpretaciones.push(interp3);
    }

    // Interpretación para gráfico 4: Encuestados vs No Encuestados
    if (datos.length > 0) {
      const totalEncuestados = datos.reduce((sum, d) => sum + d.encuestados, 0);
      const totalNoEncuestados = datos.reduce((sum, d) => sum + d.noEncuestados, 0);
      
      const interp4 = await generarInterpretacion({
        tipoGrafico: 'doughnut',
        titulo: 'Encuestados vs No Encuestados',
        datos: { encuestados: totalEncuestados, noEncuestados: totalNoEncuestados }
      });
      nuevasInterpretaciones.push(interp4);
    }

    setInterpretaciones(nuevasInterpretaciones);
    return nuevasInterpretaciones;
  };

  const handleGenerarReporte = async () => {
    if (datos.length === 0) {
      alert('No hay datos para generar el reporte');
      return;
    }

    setGenerando(true);
    try {
      // Generar interpretaciones
      const interps = await generarInterpretaciones();

      // Crear objeto de reporte
      const reporte: ReporteData = {
        titulo: 'Tu Opinión Cuenta 2025-II',
        fecha: new Date().toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        datos: datos,
        graficos: [],
        interpretaciones: interps
      };

      // Generar PDF
      await generarPDF(reporte, graficosElements);

      // Emitir evento para guardar el reporte
      const eventoReporte = new CustomEvent('reporteGenerado', {
        detail: reporte
      });
      window.dispatchEvent(eventoReporte);
    } catch (error) {
      console.error('Error al generar reporte:', error);
      alert('Error al generar el reporte. Por favor, intente nuevamente.');
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="report-generator">
      <h2>Generador de Reportes</h2>
      <div className="report-actions">
        <button
          className="btn-primary btn-generate"
          onClick={handleGenerarReporte}
          disabled={generando || datos.length === 0}
        >
          {generando ? (
            <>
              <Loader className="spinner" size={20} />
              Generando...
            </>
          ) : (
            <>
              <FileDown size={20} />
              Generar Reporte PDF
            </>
          )}
        </button>
      </div>

      {interpretaciones.length > 0 && (
        <div className="interpretaciones-container">
          <h3>Interpretaciones Generadas</h3>
          {interpretaciones.map((interp, index) => (
            <div key={index} className="interpretacion-card">
              <h4>Gráfico {index + 1}</h4>
              <p>{interp}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

