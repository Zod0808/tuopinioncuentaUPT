import { useState } from 'react';
import { EvaluacionData } from '../types';
import { MatriculadosEntry } from '../services/reportCalculations';
import { Building2, GraduationCap, BookOpen, Users, Award, Download } from 'lucide-react';
import ReporteGeneralUniversidad from './ReporteGeneralUniversidad';
import ReportePorFacultad from './ReportePorFacultad';
import ReportePorCarrera from './ReportePorCarrera';
import ResumenDocentePorCarrera from './ResumenDocentePorCarrera';
import ResumenDocentePorFacultad from './ResumenDocentePorFacultad';
import ResumenDocenteInstitucional from './ResumenDocenteInstitucional';
import ReporteCalificacionPorCarrera from './ReporteCalificacionPorCarrera';
import ReporteCalificacionPorFacultad from './ReporteCalificacionPorFacultad';
import ReporteCalificacionInstitucional from './ReporteCalificacionInstitucional';
import ExportacionReportes from './ExportacionFAEDCOH';

interface ReportsTabsProps {
  datos: EvaluacionData[];
  onGraficoReady?: (element: HTMLElement, index: number) => void;
  esPublico?: boolean;
  matriculados?: MatriculadosEntry[];
}

type TabType = 'general' | 'facultad' | 'carrera' | 'docente-carrera' | 'docente-facultad' | 'docente-institucional' | 'calificacion-carrera' | 'calificacion-facultad' | 'calificacion-institucional' | 'exportacion';

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const TABS_PUBLICAS: TabType[] = ['general', 'facultad'];

export default function ReportsTabs({ datos, onGraficoReady, esPublico = false, matriculados = [] }: ReportsTabsProps) {
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
    },
    {
      id: 'exportacion',
      label: 'Exportación por Facultad',
      icon: <Download size={20} />
    }
  ];

  const tabsVisibles = esPublico ? tabs.filter(t => TABS_PUBLICAS.includes(t.id)) : tabs;
  const tabActivaFinal = esPublico && !TABS_PUBLICAS.includes(tabActiva) ? 'general' : tabActiva;

  return (
    <div className="reports-tabs">
      <div className="tabs-header">
        {tabsVisibles.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${tabActivaFinal === tab.id ? 'active' : ''}`}
            onClick={() => setTabActiva(tab.id)}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
      <div className="tabs-content">
        {(() => {
          switch (tabActivaFinal) {
            case 'general': return <ReporteGeneralUniversidad datos={datos} onGraficoReady={onGraficoReady} matriculados={matriculados} />;
            case 'facultad': return <ReportePorFacultad datos={datos} onGraficoReady={onGraficoReady} matriculados={matriculados} />;
            case 'carrera': return <ReportePorCarrera datos={datos} onGraficoReady={onGraficoReady} matriculados={matriculados} />;
            case 'docente-carrera': return <ResumenDocentePorCarrera datos={datos} />;
            case 'docente-facultad': return <ResumenDocentePorFacultad datos={datos} />;
            case 'docente-institucional': return <ResumenDocenteInstitucional datos={datos} />;
            case 'calificacion-carrera': return <ReporteCalificacionPorCarrera datos={datos} />;
            case 'calificacion-facultad': return <ReporteCalificacionPorFacultad datos={datos} />;
            case 'calificacion-institucional': return <ReporteCalificacionInstitucional datos={datos} />;
            case 'exportacion': return <ExportacionReportes datos={datos} />;
            default: return null;
          }
        })()}
      </div>
    </div>
  );
}

