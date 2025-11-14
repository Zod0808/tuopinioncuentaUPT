import { EvaluacionData } from '../types';
import { Download, Upload, Database } from 'lucide-react';

interface DataExporterProps {
  datos: EvaluacionData[];
  onDataImport: (data: EvaluacionData[]) => void;
}

export default function DataExporter({ datos, onDataImport }: DataExporterProps) {
  const handleExportJSON = () => {
    try {
      const dataStr = JSON.stringify(datos, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `datos-evaluacion-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error al exportar datos:', error);
      alert('Error al exportar los datos. Por favor, intente nuevamente.');
    }
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.match(/\.(json)$/i)) {
      alert('Por favor, selecciona un archivo JSON válido');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const datosImportados = JSON.parse(content) as EvaluacionData[];
        
        if (!Array.isArray(datosImportados)) {
          throw new Error('El archivo JSON no contiene un array válido');
        }

        // Validar estructura básica
        const datosValidos = datosImportados.filter((item: any) => {
          return item && 
                 typeof item.facultad === 'string' &&
                 typeof item.carreraProfesional === 'string' &&
                 typeof item.docente === 'string';
        });

        if (datosValidos.length === 0) {
          throw new Error('No se encontraron datos válidos en el archivo');
        }

        // Importar datos
        onDataImport(datosValidos);
        
        // Guardar en localStorage
        try {
          const datosExistentes = localStorage.getItem('evaluacionDatos');
          let datosCompletos: EvaluacionData[] = [];
          if (datosExistentes) {
            datosCompletos = JSON.parse(datosExistentes);
          }
          datosCompletos = [...datosCompletos, ...datosValidos];
          localStorage.setItem('evaluacionDatos', JSON.stringify(datosCompletos));
          console.log(`Datos importados desde JSON: ${datosValidos.length} registros, total: ${datosCompletos.length}`);
        } catch (error) {
          console.error('Error al guardar datos importados:', error);
        }

        alert(`Se importaron ${datosValidos.length} registros exitosamente desde el archivo JSON.`);
      } catch (error) {
        console.error('Error al importar datos:', error);
        alert(`Error al importar el archivo JSON: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    };

    reader.onerror = () => {
      alert('Error al leer el archivo');
    };

    reader.readAsText(file);
    
    // Limpiar el input para permitir importar el mismo archivo nuevamente
    e.target.value = '';
  };

  return (
    <div className="data-exporter">
      <div className="exporter-header">
        <Database size={20} />
        <h3>Exportar / Importar Datos</h3>
      </div>
      <div className="exporter-actions">
        <div className="exporter-action">
          <button
            onClick={handleExportJSON}
            className="btn-export-json"
            disabled={datos.length === 0}
            title="Exportar datos a JSON para compartir"
          >
            <Download size={18} />
            <span>Exportar JSON</span>
          </button>
          <p className="action-hint">Exporta todos los datos a un archivo JSON que puedes compartir entre computadoras</p>
        </div>
        <div className="exporter-action">
          <label htmlFor="json-import" className="btn-import-json">
            <Upload size={18} />
            <span>Importar JSON</span>
          </label>
          <input
            id="json-import"
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            style={{ display: 'none' }}
          />
          <p className="action-hint">Importa datos desde un archivo JSON exportado previamente</p>
        </div>
      </div>
      {datos.length > 0 && (
        <div className="exporter-info">
          <p><strong>Total de registros:</strong> {datos.length}</p>
        </div>
      )}
    </div>
  );
}

