import { useState, useRef } from 'react';
import { FileSpreadsheet, CheckCircle, AlertCircle, X } from 'lucide-react';
// @ts-ignore - read-excel-file no tiene tipos oficiales pero funciona correctamente
import readXlsxFile from 'read-excel-file';
import { EvaluacionData } from '../types';

interface ExcelImporterProps {
  onDataImport: (data: EvaluacionData[]) => void;
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}

export default function ExcelImporter({ onDataImport }: ExcelImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setImportResult({
        success: false,
        message: 'Por favor, selecciona un archivo Excel (.xlsx o .xls)',
        imported: 0,
        errors: ['Formato de archivo no válido']
      });
      return;
    }

    setIsProcessing(true);
    setImportResult(null);

    try {
      // Leer el archivo Excel
      const rows = await readXlsxFile(file);

      if (rows.length < 2) {
        throw new Error('El archivo Excel está vacío o no tiene datos. Debe tener al menos una fila de encabezados y una fila de datos.');
      }

      // Primera fila (índice 0) contiene los encabezados/indicadores de columna - NO se procesa como dato
      const headers = (rows[0] as any[]).map((h: any) => 
        String(h || '').trim().toUpperCase()
      );

      // Mapeo de columnas esperadas (orden según el Excel)
      const columnMap: Record<string, string> = {
        'FACULTAD': 'facultad',
        'CARRERA PROFESIONAL': 'carreraProfesional',
        'DOCENTE': 'docente',
        'CURSO': 'curso',
        'SECCIÓN': 'seccion',
        'SECCION': 'seccion', // Variante sin tilde
        'CALIFICACIÓN': 'calificacion',
        'CALIFICACION': 'calificacion', // Variante sin tilde
        'AE-01': 'ae01',
        'AE-02': 'ae02',
        'AE-03': 'ae03',
        'AE-04': 'ae04',
        'NOTA': 'nota',
        'ENCUESTADOS': 'encuestados',
        'NO ENCUESTADOS': 'noEncuestados',
        'VALIDEZ': 'validez'
      };

      // Encontrar índices de columnas con búsqueda más precisa
      const columnIndices: Record<string, number> = {};
      
      Object.keys(columnMap).forEach(key => {
        // Buscar coincidencia exacta primero
        let index = headers.findIndex(h => {
          const headerUpper = String(h || '').trim().toUpperCase();
          return headerUpper === key;
        });
        
        // Si no hay coincidencia exacta, buscar parcial
        if (index === -1) {
          index = headers.findIndex(h => {
            const headerUpper = String(h || '').trim().toUpperCase();
            // Para columnas específicas, ser más estricto
            if (key === 'NO ENCUESTADOS') {
              return headerUpper.includes('NO') && headerUpper.includes('ENCUESTADOS');
            }
            if (key === 'ENCUESTADOS') {
              return headerUpper === 'ENCUESTADOS' || (headerUpper.includes('ENCUESTADOS') && !headerUpper.includes('NO'));
            }
            return headerUpper.includes(key) || key.includes(headerUpper);
          });
        }
        
        if (index !== -1) {
          columnIndices[columnMap[key]] = index;
        }
      });

      // Debug: mostrar mapeo de columnas encontradas
      console.log('Headers encontrados:', headers);
      console.log('Índices de columnas mapeadas:', columnIndices);
      
      // Verificar específicamente las columnas problemáticas
      if (columnIndices.encuestados !== undefined) {
        console.log('Columna ENCUESTADOS encontrada en índice:', columnIndices.encuestados, 'Header:', headers[columnIndices.encuestados]);
      } else {
        console.warn('⚠️ Columna ENCUESTADOS NO encontrada');
      }
      
      if (columnIndices.noEncuestados !== undefined) {
        console.log('Columna NO ENCUESTADOS encontrada en índice:', columnIndices.noEncuestados, 'Header:', headers[columnIndices.noEncuestados]);
      } else {
        console.warn('⚠️ Columna NO ENCUESTADOS NO encontrada');
      }

      // Validar que todas las columnas requeridas estén presentes
      const requiredColumns = ['facultad', 'docente', 'curso', 'seccion', 'nota', 
                               'ae01', 'ae02', 'ae03', 'ae04', 'encuestados', 'noEncuestados'];
      const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
      
      if (missingColumns.length > 0) {
        throw new Error(`Faltan columnas requeridas: ${missingColumns.join(', ')}`);
      }

      // Procesar datos - comenzar desde la segunda fila (índice 1)
      // La primera fila (índice 0) son los encabezados y NO se procesa
      const importedData: EvaluacionData[] = [];
      const errors: string[] = [];

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        // Saltar filas vacías
        if (!row || row.length === 0 || row.every(cell => cell === null || cell === undefined || cell === '')) {
          continue;
        }

        try {
          const facultad = String(row[columnIndices.facultad] || '').trim();
          const carreraProfesional = String(row[columnIndices.carreraProfesional] || '').trim();
          const docente = String(row[columnIndices.docente] || '').trim();
          const curso = String(row[columnIndices.curso] || '').trim();
          const seccion = String(row[columnIndices.seccion] || '').trim();
          
          // Validar campos requeridos
          if (!facultad || !docente || !curso || !seccion) {
            errors.push(`Fila ${i + 1}: Faltan campos requeridos`);
            continue;
          }

          // Función helper para convertir números (maneja comas, espacios, etc.)
          const parseNumber = (value: any): number => {
            if (value === null || value === undefined || value === '') return 0;
            // Si ya es un número, retornarlo
            if (typeof value === 'number') return value;
            // Convertir a string y limpiar
            const str = String(value).trim().replace(/,/g, '.');
            const num = parseFloat(str);
            return isNaN(num) ? 0 : num;
          };

          const parseInteger = (value: any): number => {
            if (value === null || value === undefined || value === '') return 0;
            // Si ya es un número, retornarlo
            if (typeof value === 'number') return Math.round(value);
            // Convertir a string y limpiar
            const str = String(value).trim().replace(/,/g, '');
            const num = parseInt(str, 10);
            return isNaN(num) ? 0 : num;
          };

          // Convertir valores numéricos
          const nota = parseNumber(row[columnIndices.nota]);
          const ae01 = parseNumber(row[columnIndices.ae01]);
          const ae02 = parseNumber(row[columnIndices.ae02]);
          const ae03 = parseNumber(row[columnIndices.ae03]);
          const ae04 = parseNumber(row[columnIndices.ae04]);
          
          // Para encuestados y no encuestados, usar parseInteger
          const encuestadosValue = row[columnIndices.encuestados];
          const noEncuestadosValue = row[columnIndices.noEncuestados];
          
          const encuestados = parseInteger(encuestadosValue);
          const noEncuestados = parseInteger(noEncuestadosValue);

          // Debug para la primera fila
          if (i === 1) {
            console.log('Primera fila de datos:');
            console.log('  Row completa:', row);
            console.log('  Índice encuestados:', columnIndices.encuestados, 'Valor:', encuestadosValue, 'Parseado:', encuestados);
            console.log('  Índice noEncuestados:', columnIndices.noEncuestados, 'Valor:', noEncuestadosValue, 'Parseado:', noEncuestados);
          }

          // Calificación
          const calificacionRaw = String(row[columnIndices.calificacion] || '').trim().toUpperCase();
          const calificacion = ['DESTACADO', 'BUENO', 'ACEPTABLE', 'REGULAR', 'DEFICIENTE'].includes(calificacionRaw)
            ? calificacionRaw as EvaluacionData['calificacion']
            : 'BUENO';

          // Validez
          const validezRaw = String(row[columnIndices.validez] || '').trim();
          const validez = validezRaw.toUpperCase().includes('VÁLIDO') || validezRaw.toUpperCase().includes('VALIDO')
            ? 'Válido' as const
            : 'Inválido' as const;

          // Calcular nota si no está presente o es 0
          const notaCalculada = nota > 0 ? nota : (ae01 + ae02 + ae03 + ae04) / 4;

          const dataItem: EvaluacionData = {
            id: `${Date.now()}-${i}`,
            facultad,
            carreraProfesional: carreraProfesional || 'No especificada',
            docente,
            curso,
            seccion,
            calificacion,
            ae01,
            ae02,
            ae03,
            ae04,
            nota: notaCalculada,
            encuestados,
            noEncuestados,
            validez
          };

          importedData.push(dataItem);
        } catch (error) {
          errors.push(`Fila ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
        }
      }

      if (importedData.length === 0) {
        throw new Error('No se pudieron importar datos válidos del archivo');
      }

      // Importar datos
      onDataImport(importedData);

      setImportResult({
        success: true,
        message: `Se importaron ${importedData.length} registros exitosamente`,
        imported: importedData.length,
        errors: errors.slice(0, 10) // Mostrar solo los primeros 10 errores
      });
    } catch (error) {
      setImportResult({
        success: false,
        message: error instanceof Error ? error.message : 'Error al procesar el archivo',
        imported: 0,
        errors: [error instanceof Error ? error.message : 'Error desconocido']
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="excel-importer">
      <h2>Importar Datos desde Excel</h2>
      
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {isProcessing ? (
          <div className="drop-zone-content">
            <div className="spinner"></div>
            <p>Procesando archivo...</p>
          </div>
        ) : (
          <div className="drop-zone-content">
            <FileSpreadsheet size={48} />
            <p>
              <strong>Arrastra un archivo Excel aquí</strong>
              <br />
              o haz clic para seleccionar
            </p>
            <p className="hint">
              Formatos soportados: .xlsx, .xls
            </p>
          </div>
        )}
      </div>

      {importResult && (
        <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
          <div className="result-header">
            {importResult.success ? (
              <CheckCircle size={24} />
            ) : (
              <AlertCircle size={24} />
            )}
            <h3>{importResult.success ? 'Importación Exitosa' : 'Error en la Importación'}</h3>
            <button
              className="btn-close-small"
              onClick={() => setImportResult(null)}
            >
              <X size={18} />
            </button>
          </div>
          <p>{importResult.message}</p>
          {importResult.success && (
            <p className="import-count">
              <strong>{importResult.imported}</strong> registros importados
            </p>
          )}
          {importResult.errors.length > 0 && (
            <div className="errors-list">
              <strong>Errores encontrados ({importResult.errors.length}):</strong>
              <ul>
                {importResult.errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
              {importResult.errors.length >= 10 && (
                <p className="more-errors">... y más errores (revisa la consola para más detalles)</p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="import-instructions">
        <h3>Instrucciones:</h3>
        <p>El archivo Excel debe contener las siguientes columnas en este orden:</p>
        <ol>
          <li><strong>Facultad</strong> - Nombre de la facultad</li>
          <li><strong>Carrera Profesional</strong> - Nombre de la carrera</li>
          <li><strong>Docente</strong> - Nombre del docente</li>
          <li><strong>Curso</strong> - Nombre del curso</li>
          <li><strong>Sección</strong> - Sección del curso</li>
          <li><strong>Calificación</strong> - DESTACADO, BUENO, ACEPTABLE, REGULAR, DEFICIENTE</li>
          <li><strong>AE-01</strong> - Calidad de presentación y contenido sílabico (0-20)</li>
          <li><strong>AE-02</strong> - Ejecución del proceso enseñanza-aprendizaje (0-20)</li>
          <li><strong>AE-03</strong> - Aplicación de la evaluación (0-20)</li>
          <li><strong>AE-04</strong> - Formación actitudinal e interpersonales (0-20)</li>
          <li><strong>Nota</strong> - Nota promedio (numérico)</li>
          <li><strong>ENCUESTADOS</strong> - Número de estudiantes encuestados</li>
          <li><strong>NO ENCUESTADOS</strong> - Número de estudiantes no encuestados</li>
          <li><strong>VALIDEZ</strong> - Válido o Inválido</li>
        </ol>
        <p className="note">
          <strong>Nota:</strong> La primera fila debe contener los encabezados de las columnas.
          Si la columna "Nota" está vacía, se calculará automáticamente como el promedio de los 4 aspectos académicos.
        </p>
      </div>
    </div>
  );
}

