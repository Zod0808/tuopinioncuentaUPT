import { useState } from 'react';
import { EvaluacionData } from '../types';
import { Building2, GraduationCap, BookOpen, Users, Award } from 'lucide-react';
import ReporteGeneralUniversidad from './ReporteGeneralUniversidad';
import ReportePorFacultad from './ReportePorFacultad';
import ReportePorCarrera from './ReportePorCarrera';
import ResumenDocentePorCarrera from './ResumenDocentePorCarrera';
import ResumenDocentePorFacultad from './ResumenDocentePorFacultad';
import ResumenDocenteInstitucional from './ResumenDocenteInstitucional';
import ReporteCalificacionPorCarrera from './ReporteCalificacionPorCarrera';
import ReporteCalificacionPorFacultad from './ReporteCalificacionPorFacultad';
import ReporteCalificacionInstitucional from './ReporteCalificacionInstitucional';

interface ReportsTabsProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
}

type TabType = 'general' | 'facultad' | 'carrera' | 'docente-carrera' | 'docente-facultad' | 'docente-institucional' | 'calificacion-carrera' | 'calificacion-facultad' | 'calificacion-institucional';

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
      id: 'docente-carrera',
      label: 'Resumen Docente por Carrera',
      icon: <Users size={20} />
    },
    {
      id: 'docente-facultad',
      label: 'Resumen Docente por Facultad',
      icon: <Building2 size={20} />
    },
    {
      id: 'docente-institucional',
      label: 'Resumen Docente Institucional',
      icon: <Building2 size={20} />
    },
    {
      id: 'calificacion-carrera',
      label: 'Calificación por Carrera',
      icon: <Award size={20} />
    },
    {
      id: 'calificacion-facultad',
      label: 'Calificación por Facultad',
      icon: <Award size={20} />
    },
    {
      id: 'calificacion-institucional',
      label: 'Calificación Institucional',
      icon: <Building2 size={20} />
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
      case 'docente-carrera':
        return <ResumenDocentePorCarrera datos={datos} />;
      case 'docente-facultad':
        return <ResumenDocentePorFacultad datos={datos} />;
      case 'docente-institucional':
        return <ResumenDocenteInstitucional datos={datos} />;
      case 'calificacion-carrera':
        return <ReporteCalificacionPorCarrera datos={datos} />;
      case 'calificacion-facultad':
        return <ReporteCalificacionPorFacultad datos={datos} />;
      case 'calificacion-institucional':
        return <ReporteCalificacionInstitucional datos={datos} />;
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

