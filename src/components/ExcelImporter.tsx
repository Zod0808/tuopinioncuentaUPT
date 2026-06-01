import { useState, useRef } from 'react';
import { FileSpreadsheet, CheckCircle, AlertCircle, X, Calendar, Upload } from 'lucide-react';
// @ts-ignore
import readXlsxFile from 'read-excel-file';
import { EvaluacionData } from '../types';

const TODOS_LOS_CICLOS = [
  '2018-I','2018-II','2019-I','2019-II',
  '2020-I','2020-II','2021-I','2021-II',
  '2022-I','2022-II','2023-I','2023-II',
  '2024-I','2024-II','2025-I','2025-II',
  '2026-I','2026-II',
];

interface ExcelImporterProps {
  onDataImport: (data: EvaluacionData[], ciclo: string) => void;
  cicloActual: string;
  ciclosDisponibles: string[];
}

interface ImportResult {
  success: boolean;
  message: string;
  imported: number;
  errors: string[];
}

interface PendingImport {
  data: EvaluacionData[];
  filename: string;
  errors: string[];
}

export default function ExcelImporter({ onDataImport, cicloActual, ciclosDisponibles }: ExcelImporterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [cicloSeleccionado, setCicloSeleccionado] = useState(cicloActual);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ciclos disponibles en el selector: predefinidos + los que ya tiene el usuario
  const ciclosEnSelector = Array.from(new Set([...TODOS_LOS_CICLOS, ...ciclosDisponibles])).sort((a, b) => {
    const [ya, sa] = a.split('-'); const [yb, sb] = b.split('-');
    return ya !== yb ? parseInt(ya) - parseInt(yb) : sa.localeCompare(sb);
  });

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setImportResult({ success: false, message: 'Selecciona un archivo Excel (.xlsx o .xls)', imported: 0, errors: ['Formato inválido'] });
      return;
    }

    setIsProcessing(true);
    setImportResult(null);
    setPendingImport(null);
    setCicloSeleccionado(cicloActual);

    try {
      const rows = await readXlsxFile(file);
      if (rows.length < 2) throw new Error('El archivo está vacío o no tiene datos.');

      const headers = (rows[0] as any[]).map((h: any) => String(h || '').trim().toUpperCase());

      const columnMap: Record<string, string> = {
        'FACULTAD': 'facultad', 'CARRERA PROFESIONAL': 'carreraProfesional',
        'DOCENTE': 'docente', 'CURSO': 'curso', 'SECCIÓN': 'seccion', 'SECCION': 'seccion',
        'CALIFICACIÓN': 'calificacion', 'CALIFICACION': 'calificacion',
        'AE-01': 'ae01', 'AE-02': 'ae02', 'AE-03': 'ae03', 'AE-04': 'ae04',
        'NOTA': 'nota', 'ENCUESTADOS': 'encuestados', 'NO ENCUESTADOS': 'noEncuestados', 'VALIDEZ': 'validez'
      };

      const columnIndices: Record<string, number> = {};
      Object.keys(columnMap).forEach(key => {
        let index = headers.findIndex(h => String(h || '').trim().toUpperCase() === key);
        if (index === -1) {
          index = headers.findIndex(h => {
            const hu = String(h || '').trim().toUpperCase();
            if (key === 'NO ENCUESTADOS') return hu.includes('NO') && hu.includes('ENCUESTADOS');
            if (key === 'ENCUESTADOS') return hu === 'ENCUESTADOS' || (hu.includes('ENCUESTADOS') && !hu.includes('NO'));
            return hu.includes(key) || key.includes(hu);
          });
        }
        if (index !== -1) columnIndices[columnMap[key]] = index;
      });

      const requiredColumns = ['facultad', 'docente', 'curso', 'seccion', 'nota', 'ae01', 'ae02', 'ae03', 'ae04', 'encuestados', 'noEncuestados'];
      const missingColumns = requiredColumns.filter(col => columnIndices[col] === undefined);
      if (missingColumns.length > 0) throw new Error(`Faltan columnas: ${missingColumns.join(', ')}`);

      const importedData: EvaluacionData[] = [];
      const errors: string[] = [];

      const parseNumber = (v: any): number => {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return v;
        const n = parseFloat(String(v).trim().replace(/,/g, '.'));
        return isNaN(n) ? 0 : n;
      };
      const parseInteger = (v: any): number => {
        if (v === null || v === undefined || v === '') return 0;
        if (typeof v === 'number') return Math.round(v);
        const n = parseInt(String(v).trim().replace(/,/g, ''), 10);
        return isNaN(n) ? 0 : n;
      };

      for (let i = 1; i < rows.length; i++) {
        const row = rows[i] as any[];
        if (!row || row.every((c: any) => c === null || c === undefined || c === '')) continue;
        try {
          const facultad = String(row[columnIndices.facultad] || '').trim();
          const docente = String(row[columnIndices.docente] || '').trim();
          const curso = String(row[columnIndices.curso] || '').trim();
          const seccion = String(row[columnIndices.seccion] || '').trim();
          if (!facultad || !docente || !curso || !seccion) { errors.push(`Fila ${i + 1}: faltan campos requeridos`); continue; }

          const ae01 = parseNumber(row[columnIndices.ae01]);
          const ae02 = parseNumber(row[columnIndices.ae02]);
          const ae03 = parseNumber(row[columnIndices.ae03]);
          const ae04 = parseNumber(row[columnIndices.ae04]);
          const nota = parseNumber(row[columnIndices.nota]) || (ae01 + ae02 + ae03 + ae04) / 4;
          const calificacionRaw = String(row[columnIndices.calificacion] || '').trim().toUpperCase();
          const calificacion = (['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO'] as const).includes(calificacionRaw as any)
            ? calificacionRaw as EvaluacionData['calificacion'] : 'BUENO';
          const validezRaw = String(row[columnIndices.validez] || '').trim();
          const validezUpper = validezRaw.toUpperCase();
          const validez = (validezUpper === 'VÁLIDO' || validezUpper === 'VALIDO')
            ? 'Válido' as const : 'No válido' as const;

          importedData.push({
            id: `${Date.now()}-${i}`,
            facultad,
            carreraProfesional: String(row[columnIndices.carreraProfesional] || '').trim() || 'No especificada',
            docente, curso, seccion, calificacion, ae01, ae02, ae03, ae04, nota,
            encuestados: parseInteger(row[columnIndices.encuestados]),
            noEncuestados: parseInteger(row[columnIndices.noEncuestados]),
            validez,
          });
        } catch (err) {
          errors.push(`Fila ${i + 1}: ${err instanceof Error ? err.message : 'error desconocido'}`);
        }
      }

      if (importedData.length === 0) throw new Error('No se pudieron importar datos válidos del archivo');

      // Mostrar confirmación en lugar de importar directamente
      setPendingImport({ data: importedData, filename: file.name, errors: errors.slice(0, 10) });

    } catch (error) {
      setImportResult({ success: false, message: error instanceof Error ? error.message : 'Error al procesar el archivo', imported: 0, errors: [] });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!pendingImport) return;
    onDataImport(pendingImport.data, cicloSeleccionado);
    setImportResult({
      success: true,
      message: `Se importaron ${pendingImport.data.length} registros al ciclo ${cicloSeleccionado}.`,
      imported: pendingImport.data.length,
      errors: pendingImport.errors,
    });
    setPendingImport(null);
  };

  const handleCancelImport = () => {
    setPendingImport(null);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="excel-importer">
      <h2>Importar Datos desde Excel</h2>

      {/* Zona de arrastre — ocultar si hay una importación pendiente */}
      {!pendingImport && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" onChange={handleFileSelect} style={{ display: 'none' }} />
          {isProcessing ? (
            <div className="drop-zone-content"><div className="spinner" /><p>Procesando archivo...</p></div>
          ) : (
            <div className="drop-zone-content">
              <FileSpreadsheet size={48} />
              <p><strong>Arrastra un archivo Excel aquí</strong><br />o haz clic para seleccionar</p>
              <p className="hint">Formatos soportados: .xlsx, .xls</p>
            </div>
          )}
        </div>
      )}

      {/* Confirmación de ciclo */}
      {pendingImport && (
        <div className="import-confirm-box">
          <div className="import-confirm-header">
            <FileSpreadsheet size={22} color="#003087" />
            <h3>Confirmar importación</h3>
          </div>

          <div className="import-confirm-stats">
            <span className="confirm-stat"><strong>{pendingImport.data.length}</strong> registros encontrados</span>
            <span className="confirm-stat-file">📄 {pendingImport.filename}</span>
          </div>

          <div className="import-confirm-ciclo">
            <label htmlFor="ciclo-import-select">
              <Calendar size={16} />
              ¿A qué ciclo pertenecen estos datos?
            </label>
            <select
              id="ciclo-import-select"
              value={cicloSeleccionado}
              onChange={e => setCicloSeleccionado(e.target.value)}
              className="ciclo-import-select"
            >
              {ciclosEnSelector.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {pendingImport.errors.length > 0 && (
            <div className="import-confirm-warnings">
              <strong>⚠️ {pendingImport.errors.length} filas con problemas (se ignorarán):</strong>
              <ul>{pendingImport.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="import-confirm-actions">
            <button className="btn-cancel" onClick={handleCancelImport}>
              <X size={16} /> Cancelar
            </button>
            <button className="btn-primary" onClick={handleConfirmImport}>
              <Upload size={16} /> Importar al ciclo {cicloSeleccionado}
            </button>
          </div>
        </div>
      )}

      {/* Resultado */}
      {importResult && (
        <div className={`import-result ${importResult.success ? 'success' : 'error'}`}>
          <div className="result-header">
            {importResult.success ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <h3>{importResult.success ? 'Importación Exitosa' : 'Error en la Importación'}</h3>
            <button className="btn-close-small" onClick={() => setImportResult(null)}><X size={18} /></button>
          </div>
          <p>{importResult.message}</p>
          {importResult.success && <p className="import-count"><strong>{importResult.imported}</strong> registros importados</p>}
          {importResult.errors.length > 0 && (
            <div className="errors-list">
              <strong>Errores encontrados ({importResult.errors.length}):</strong>
              <ul>{importResult.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      <div className="import-instructions">
        <h3>Instrucciones:</h3>
        <p>El archivo Excel debe contener las siguientes columnas:</p>
        <ol>
          <li><strong>Facultad</strong></li>
          <li><strong>Carrera Profesional</strong></li>
          <li><strong>Docente</strong></li>
          <li><strong>Curso</strong></li>
          <li><strong>Sección</strong></li>
          <li><strong>Calificación</strong> — DESTACADO, BUENO, ACEPTABLE, INSATISFACTORIO</li>
          <li><strong>AE-01 al AE-04</strong> — aspectos evaluados (0-20)</li>
          <li><strong>Nota</strong> — promedio (se calcula automáticamente si está vacío)</li>
          <li><strong>Encuestados / No Encuestados</strong></li>
          <li><strong>Validez</strong> — Válido o No válido</li>
        </ol>
      </div>
    </div>
  );
}
