import { Database, FileText } from 'lucide-react';

interface NavigationProps {
  vistaActual: 'datos' | 'reportes';
  onCambiarVista: (vista: 'datos' | 'reportes') => void;
}

export default function Navigation({ vistaActual, onCambiarVista }: NavigationProps) {
  return (
    <nav className="navigation">
      <button
        className={`nav-button ${vistaActual === 'datos' ? 'active' : ''}`}
        onClick={() => onCambiarVista('datos')}
      >
        <Database size={20} />
        Ingreso de Datos
      </button>
      <button
        className={`nav-button ${vistaActual === 'reportes' ? 'active' : ''}`}
        onClick={() => onCambiarVista('reportes')}
      >
        <FileText size={20} />
        Ver Reportes
      </button>
    </nav>
  );
}

