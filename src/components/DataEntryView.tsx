import { EvaluacionData } from '../types';
import DataInput from './DataInput';
import ExcelImporter from './ExcelImporter';
import DataExporter from './DataExporter';
import DataTable from './DataTable';
import Charts from './Charts';
import InstitutionalReports from './InstitutionalReports';
import FacultyReports from './FacultyReports';
import ReportGenerator from './ReportGenerator';

interface DataEntryViewProps {
  datos: EvaluacionData[];
  graficosElements: HTMLElement[];
  cicloActual: string;
  ciclosDisponibles: string[];
  onDataAdd: (data: EvaluacionData) => void;
  onDataImport: (data: EvaluacionData[], ciclo: string) => void;
  onDataDelete: (id: string) => void;
  onDataDeleteAll?: () => void;
  onGraficoReady: (element: HTMLElement, index: number) => void;
}

export default function DataEntryView({
  datos,
  graficosElements,
  cicloActual,
  ciclosDisponibles,
  onDataAdd,
  onDataImport,
  onDataDelete,
  onDataDeleteAll,
  onGraficoReady,
}: DataEntryViewProps) {
  return (
    <div className="data-entry-view">
      <ExcelImporter
        onDataImport={onDataImport}
        cicloActual={cicloActual}
        ciclosDisponibles={ciclosDisponibles}
      />
      <DataExporter datos={datos} onDataImport={(data) => onDataImport(data, cicloActual)} />
      <DataInput onDataAdd={onDataAdd} datosExistentes={datos} />

      {datos.length > 0 && (
        <>
          <DataTable datos={datos} onDelete={onDataDelete} onDeleteAll={onDataDeleteAll} />
          <InstitutionalReports datos={datos} onGraficoReady={onGraficoReady} />
          <FacultyReports datos={datos} />
          <Charts datos={datos} onGraficoReady={onGraficoReady} />
          <ReportGenerator datos={datos} graficosElements={graficosElements} />
        </>
      )}
    </div>
  );
}
