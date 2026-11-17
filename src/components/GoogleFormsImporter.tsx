import { useState, useRef } from 'react';
import { FileSpreadsheet, CheckCircle, AlertCircle, X, Calendar, Upload } from 'lucide-react';
// @ts-ignore
import readXlsxFile from 'read-excel-file';
import { EvaluacionData } from '../types';
import { procesarGoogleForms, esFormatoGoogleForms } from '../services/googleFormsService';

const TODOS_LOS_CICLOS = [
  '2018-I','2018-II','2019-I','2019-II',
  '2020-I','2020-II','2021-I','2021-II',
  '2022-I','2022-II','2023-I','2023-II',
  '2024-I','2024-II','2025-I','2025-II',
  '2026-I','2026-II',
];

interface GoogleFormsImporterProps {
  onDataImport: (data: EvaluacionData[], ciclo: string) => void;
  cicloActual: string;
  ciclosDisponibles: string[];
  datosExistentes?: EvaluacionData[];
}

interface PendingImport {
  data: EvaluacionData[];
  filename: string;
  stats: { totalRespuestas: number; totalDocentes: number; validos: number; noValidos: number; reemplazados: number; nuevos: number };
  errors: string[];
}

export default function GoogleFormsImporter({ onDataImport, cicloActual, ciclosDisponibles, datosExistentes = [] }: GoogleFormsImporterProps) {
  const [isDragging, setIsDragging]       = useState(false);
  const [isProcessing, setIsProcessing]   = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [cicloSel, setCicloSel]           = useState(cicloActual);
  const [result, setResult]               = useState<{ ok: boolean; msg: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const ciclosEnSelector = Array.from(new Set([...TODOS_LOS_CICLOS, ...ciclosDisponibles])).sort((a, b) => {
    const [ya, sa] = a.split('-'); const [yb, sb] = b.split('-');
    return ya !== yb ? ya.localeCompare(yb) : sa.localeCompare(sb);
  });

  const handleFile = async (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setResult({ ok: false, msg: 'Solo se aceptan archivos .xlsx o .xls' });
      return;
    }
    setIsProcessing(true);
    try {
      const rows: unknown[][] = await readXlsxFile(file);

      if (!esFormatoGoogleForms(rows)) {
        setResult({ ok: false, msg: 'Este archivo no parece ser una exportación de Google Forms. Usa "Importar Excel" para archivos de formato normal.' });
        return;
      }

      const { data, stats } = procesarGoogleForms(rows, cicloSel);

      if (data.length === 0) {
        setResult({ ok: false, msg: `No se encontraron datos válidos. ${stats.errors.join(' ')}` });
        return;
      }

      // Calcular cuántos registros existentes serán reemplazados
      const key = (d: EvaluacionData) => `${d.docente}||${d.curso}`.toLowerCase().trim();
      const incomingKeys = new Set(data.map(key));
      const reemplazados = datosExistentes.filter(d => incomingKeys.has(key(d))).length;
      const nuevos = data.length - reemplazados;

      setPendingImport({ data, filename: file.name, stats: { ...stats, reemplazados, nuevos }, errors: stats.errors });
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Error al leer el archivo.' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const confirmar = () => {
    if (!pendingImport) return;
    // Recalcular con el ciclo seleccionado en el momento de confirmar
    onDataImport(pendingImport.data.map(d => ({ ...d, ciclo: cicloSel })), cicloSel);
    setResult({ ok: true, msg: `${pendingImport.data.length} registros importados correctamente para ${cicloSel}.` });
    setPendingImport(null);
  };

  const cancelar = () => { setPendingImport(null); setResult(null); };

  return (
    <div className="excel-importer">
      <h2>Importar desde Google Forms</h2>

      {!pendingImport && !result && (
        <div
          className={`drop-zone ${isDragging ? 'dragging' : ''} ${isProcessing ? 'processing' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={e => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          {isProcessing ? (
            <div className="drop-zone-content"><div className="spinner" /><p>Procesando respuestas...</p></div>
          ) : (
            <div className="drop-zone-content">
              <FileSpreadsheet size={48} />
              <p><strong>Arrastra el archivo de respuestas aquí</strong><br />o haz clic para seleccionar</p>
              <p className="hint">Archivo .xlsx descargado desde Google Sheets (respuestas del formulario)</p>
            </div>
          )}
        </div>
      )}

      {pendingImport && (
        <div className="import-confirm-box">
          <div className="import-confirm-header">
            <FileSpreadsheet size={22} color="#003087" />
            <h3>Confirmar importación</h3>
          </div>

          <div className="import-confirm-stats">
            <span className="confirm-stat"><strong>{pendingImport.stats.totalRespuestas}</strong> respuestas procesadas</span>
            <span className="confirm-stat"><strong>{pendingImport.stats.totalDocentes}</strong> docentes encontrados</span>
            <span className="confirm-stat" style={{ color: '#1a7f37' }}><strong>{pendingImport.stats.validos}</strong> válidos (n≥3)</span>
            {pendingImport.stats.noValidos > 0 && (
              <span className="confirm-stat" style={{ color: '#c0392b' }}><strong>{pendingImport.stats.noValidos}</strong> no válidos</span>
            )}
            <span className="confirm-stat-file">📄 {pendingImport.filename}</span>
          </div>
          <div className="import-confirm-stats" style={{ marginTop: 4, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
            <span className="confirm-stat" style={{ color: '#1a7f37' }}>
              <strong>{pendingImport.stats.nuevos}</strong> registros nuevos a agregar
            </span>
            {pendingImport.stats.reemplazados > 0 && (
              <span className="confirm-stat" style={{ color: '#b45309' }}>
                <strong>{pendingImport.stats.reemplazados}</strong> registros existentes serán reemplazados
              </span>
            )}
          </div>

          <div className="import-confirm-ciclo">
            <label htmlFor="gf-ciclo-select"><Calendar size={16} /> ¿A qué ciclo pertenecen estos datos?</label>
            <select id="gf-ciclo-select" value={cicloSel} onChange={e => setCicloSel(e.target.value)} className="ciclo-import-select">
              {ciclosEnSelector.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {pendingImport.errors.length > 0 && (
            <div className="import-confirm-warnings">
              <strong>{pendingImport.errors.length} advertencia(s):</strong>
              <ul>{pendingImport.errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}

          <div className="import-confirm-actions">
            <button className="btn-cancel" onClick={cancelar}><X size={16} /> Cancelar</button>
            <button className="btn-primary" onClick={confirmar}><Upload size={16} /> Importar {pendingImport.data.length} registros</button>
          </div>
        </div>
      )}

      {result && (
        <div className={`import-result ${result.ok ? 'success' : 'error'}`}>
          <div className="result-header">
            {result.ok ? <CheckCircle size={24} /> : <AlertCircle size={24} />}
            <h3>{result.ok ? 'Importación exitosa' : 'Error'}</h3>
            <button className="btn-close-small" onClick={() => setResult(null)}><X size={18} /></button>
          </div>
          <p>{result.msg}</p>
          {result.ok && (
            <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => setResult(null)}>
              Importar otro archivo
            </button>
          )}
        </div>
      )}

      <div className="import-instructions">
        <h3>Cómo obtener este archivo:</h3>
        <ol>
          <li>Abre el formulario en <strong>Google Forms</strong></li>
          <li>Ve a la pestaña <strong>Respuestas</strong></li>
          <li>Haz clic en el ícono de Google Sheets para abrir la hoja de cálculo</li>
          <li>En Sheets: <strong>Archivo → Descargar → Microsoft Excel (.xlsx)</strong></li>
          <li>Sube ese archivo aquí</li>
        </ol>
      </div>
    </div>
  );
}
