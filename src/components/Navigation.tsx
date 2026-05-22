import { Database, FileText, LogIn, LogOut, User, ChevronDown, Plus } from 'lucide-react';
import { useState } from 'react';

const CICLOS_PREDEFINIDOS = [
  '2025-II', '2025-I',
  '2024-II', '2024-I',
  '2023-II', '2023-I',
];

interface NavigationProps {
  vistaActual: 'datos' | 'reportes';
  onCambiarVista: (vista: 'datos' | 'reportes') => void;
  currentUser: { email?: string | null } | null;
  onLogin: () => void;
  onLogout: () => void;
  cicloActual: string;
  ciclosDisponibles: string[];
  onCicloChange: (ciclo: string) => void;
}

export default function Navigation({
  vistaActual,
  onCambiarVista,
  currentUser,
  onLogin,
  onLogout,
  cicloActual,
  ciclosDisponibles,
  onCicloChange,
}: NavigationProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNuevoCiclo, setShowNuevoCiclo] = useState(false);
  const [nuevoCiclo, setNuevoCiclo] = useState('');

  const todosLosCiclos = Array.from(new Set([...ciclosDisponibles, ...CICLOS_PREDEFINIDOS]));

  const handleNuevoCiclo = (e: React.FormEvent) => {
    e.preventDefault();
    if (nuevoCiclo.trim()) {
      onCicloChange(nuevoCiclo.trim());
      setNuevoCiclo('');
      setShowNuevoCiclo(false);
    }
  };

  return (
    <nav className="navigation">
      <div className="nav-left">
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
      </div>

      <div className="nav-center">
        {currentUser && (
          <div className="ciclo-selector-nav">
            <span className="ciclo-label">Ciclo:</span>
            <select
              value={cicloActual}
              onChange={e => {
                if (e.target.value === '__nuevo__') {
                  setShowNuevoCiclo(true);
                } else {
                  onCicloChange(e.target.value);
                }
              }}
              className="ciclo-select"
            >
              {todosLosCiclos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
              <option value="__nuevo__">+ Otro ciclo...</option>
            </select>

            {showNuevoCiclo && (
              <form className="nuevo-ciclo-form" onSubmit={handleNuevoCiclo}>
                <input
                  type="text"
                  value={nuevoCiclo}
                  onChange={e => setNuevoCiclo(e.target.value)}
                  placeholder="ej: 2026-I"
                  autoFocus
                />
                <button type="submit" className="btn-nuevo-ciclo-ok">
                  <Plus size={14} />
                </button>
                <button type="button" className="btn-nuevo-ciclo-cancel" onClick={() => setShowNuevoCiclo(false)}>
                  ✕
                </button>
              </form>
            )}
          </div>
        )}
      </div>

      <div className="nav-right">
        {currentUser ? (
          <div className="user-menu-wrapper">
            <button
              className="user-menu-btn"
              onClick={() => setShowUserMenu(v => !v)}
            >
              <User size={18} />
              <span className="user-email">{currentUser.email}</span>
              <ChevronDown size={16} />
            </button>
            {showUserMenu && (
              <>
                <div className="user-menu-backdrop" onClick={() => setShowUserMenu(false)} />
                <div className="user-menu-dropdown">
                  <div className="user-menu-info">
                    <User size={16} />
                    <span>{currentUser.email}</span>
                  </div>
                  <hr className="user-menu-divider" />
                  <button
                    className="user-menu-item user-menu-logout"
                    onClick={() => { setShowUserMenu(false); onLogout(); }}
                  >
                    <LogOut size={16} />
                    Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <button className="btn-login-nav" onClick={onLogin}>
            <LogIn size={18} />
            Iniciar Sesión
          </button>
        )}
      </div>
    </nav>
  );
}
