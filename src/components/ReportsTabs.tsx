import { useState } from 'react';
import { EvaluacionData } from '../types';
import { Building2, GraduationCap, BookOpen, Users } from 'lucide-react';
import ReporteGeneralUniversidad from './ReporteGeneralUniversidad';
import ReportePorFacultad from './ReportePorFacultad';
import ReportePorCarrera from './ReportePorCarrera';
import ResumenDocentePorCarrera from './ResumenDocentePorCarrera';

interface ReportsTabsProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

type TabType = 'general' | 'facultad' | 'carrera' | 'docente';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

export default function ReportsTabs({ datos, onGraficoReady }: ReportsTabsProps) {
  const [tabActiva, setTabActiva] = useState<TabType>('general');

  const tabs: Tab[] = [
    {
      id: 'general',
      label: 'General Universidad',
      icon: <Building2 size={20} />
    },
    {
      id: 'facultad',
      label: 'Por Facultad',
      icon: <GraduationCap size={20} />
    },
    {
      id: 'carrera',
      label: 'Por Carrera',
      icon: <BookOpen size={20} />
    },
    {
      id: 'docente',
      label: 'Resumen Docente',
      icon: <Users size={20} />
    }
  ];

  const renderTabContent = () => {
    switch (tabActiva) {
      case 'general':
        return <ReporteGeneralUniversidad datos={datos} onGraficoReady={onGraficoReady} />;
      case 'facultad':
        return <ReportePorFacultad datos={datos} onGraficoReady={onGraficoReady} />;
      case 'carrera':
        return <ReportePorCarrera datos={datos} onGraficoReady={onGraficoReady} />;
      case 'docente':
        return <ResumenDocentePorCarrera datos={datos} />;
      default:
        return null;
    }
  };

  return (
    <div className="reports-tabs">
      <div className="tabs-header">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${tabActiva === tab.id ? 'active' : ''}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {renderTabContent()}
      </div>
    </div>
  );
}

