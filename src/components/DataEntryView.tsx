import { useState } from 'react';
import { Upload, Users, TableProperties, Settings2 } from 'lucide-react';
import { EvaluacionData } from '../types';
import { MatriculadosEntry } from '../services/reportCalculations';
import DataInput from './DataInput';
import ExcelImporter from './ExcelImporter';
import DataExporter from './DataExporter';
import DataTable from './DataTable';
import MatriculadosImporter from './MatriculadosImporter';
import GestionDatosPanel from './GestionDatosPanel';

type TabId = 'importar' | 'matriculados' | 'registros' | 'gestion';

interface DataEntryViewProps {
  datos: EvaluacionData[];
  graficosElements: HTMLElement[];
  cicloActual: string;
  ciclosDisponibles: string[];
  matriculados: MatriculadosEntry[];
  currentUser: { email?: string | null } | null;
  onDataAdd: (data: EvaluacionData) => void;
  onDataImport: (data: EvaluacionData[], ciclo: string) => void;
  onDataDelete: (id: string) => void;
  onDataDeleteAll?: () => void;
  onGraficoReady: (element: HTMLElement, index: number) => void;
  onMatriculadosChange: (entries: MatriculadosEntry[]) => void;
  onCicloChange: (ciclo: string) => void;
  onDeleteCicloCache: (ciclo: string) => void;
  onDeleteCicloDb: (ciclo: string) => Promise<void>;
  onRefreshCiclos: () => Promise<void>;
}

export default function DataEntryView({
  datos,
  cicloActual,
  ciclosDisponibles,
  matriculados,
  currentUser,
  onDataAdd,
  onDataImport,
  onDataDelete,
  onDataDeleteAll,
  onMatriculadosChange,
  onCicloChange,
  onDeleteCicloCache,
  onDeleteCicloDb,
  onRefreshCiclos,
}: DataEntryViewProps) {
  const [tab, setTab] = useState<TabId>('importar');

  const tabs: { id: TabId; label: string; icon: React.ReactNode; badge?: number }[] = [
    { id: 'importar',     label: 'Importar Excel',    icon: <Upload size={16} /> },
    { id: 'matriculados', label: 'Matriculados',       icon: <Users size={16} />,
      badge: matriculados.length > 0 ? matriculados.length : undefined },
    { id: 'registros',    label: 'Registros',          icon: <TableProperties size={16} />,
      badge: datos.length > 0 ? datos.length : undefined },
    { id: 'gestion',      label: 'Gestión de Ciclos',  icon: <Settings2 size={16} /> },
  ];

  return (
    <div className="data-entry-view">
      {/* ── Banner ciclo activo ── */}
      <div className="dev-ciclo-banner">
        <span className="dev-ciclo-label">Ciclo activo:</span>
        <strong className="dev-ciclo-valor">{cicloActual}</strong>
        {datos.length > 0 && (
          <span className="dev-ciclo-records">{datos.length} registros cargados</span>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="dev-tabs">
        {tabs.map(t => (
          <button
            key={t.id}
            className={`dev-tab-btn ${tab === t.id ? 'active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.badge !== undefined && (
              <span className="dev-tab-badge">{t.badge}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Contenido ── */}
      <div className="dev-tab-content">

        {tab === 'importar' && (
          <div className="dev-tab-importar">
            <ExcelImporter
              onDataImport={onDataImport}
              cicloActual={cicloActual}
              ciclosDisponibles={ciclosDisponibles}
            />
            <details className="dev-manual-toggle">
              <summary>Agregar registro manualmente</summary>
              <div className="dev-manual-body">
                <DataInput onDataAdd={onDataAdd} datosExistentes={datos} />
              </div>
            </details>
          </div>
        )}

        {tab === 'matriculados' && (
          <MatriculadosImporter
            cicloActual={cicloActual}
            matriculados={matriculados}
            onMatriculadosChange={onMatriculadosChange}
          />
        )}

        {tab === 'registros' && (
          <div className="dev-tab-registros">
            {datos.length === 0 ? (
              <div className="dev-tab-empty">
                <Upload size={40} className="dev-empty-icon" />
                <p>No hay registros para el ciclo <strong>{cicloActual}</strong>.</p>
                <p className="dev-empty-hint">Ve a "Importar Excel" para cargar datos.</p>
                <button className="btn-primary" onClick={() => setTab('importar')}>
                  Ir a Importar
                </button>
              </div>
            ) : (
              <>
                <DataExporter
                  datos={datos}
                  onDataImport={(data) => onDataImport(data, cicloActual)}
                />
                <DataTable
                  datos={datos}
                  onDelete={onDataDelete}
                  onDeleteAll={onDataDeleteAll}
                />
              </>
            )}
          </div>
        )}

        {tab === 'gestion' && (
          <GestionDatosPanel
            cicloActual={cicloActual}
            ciclosDisponibles={ciclosDisponibles}
            currentUser={currentUser}
            onCicloChange={onCicloChange}
            onDeleteCache={onDeleteCicloCache}
            onDeleteDB={onDeleteCicloDb}
            onRefresh={onRefreshCiclos}
          />
        )}
      </div>
    </div>
  );
}
