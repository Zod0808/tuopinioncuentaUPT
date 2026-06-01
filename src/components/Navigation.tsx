import { Database, FileText, LogIn, LogOut, User, ChevronDown, Plus, BookOpen, Lightbulb, Globe, Upload } from 'lucide-react';
import { useState } from 'react';

const CICLOS_PREDEFINIDOS = [
  '2025-II', '2025-I',
  '2024-II', '2024-I',
  '2023-II', '2023-I',
];

interface NavigationProps {
  vistaActual: 'datos' | 'reportes' | 'informe' | 'recomendaciones';
  onCambiarVista: (vista: 'datos' | 'reportes' | 'informe' | 'recomendaciones') => void;
  currentUser: { email?: string | null } | null;
  onLogin: () => void;
  onLogout: () => void;
  cicloActual: string;
  ciclosDisponibles: string[];
  ciclosPublicos: string[];
  onCicloChange: (ciclo: string) => void;
  onPublicar?: () => void;
  publishMsg?: string;
}

export default function Navigation({
  vistaActual,
  onCambiarVista,
  currentUser,
  onLogin,
  onLogout,
  cicloActual,
  ciclosDisponibles,
  ciclosPublicos,
  onCicloChange,
  onPublicar,
  publishMsg,
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
        {currentUser ? (
          <>
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
            <button
              className={`nav-button ${vistaActual === 'informe' ? 'active' : ''}`}
              onClick={() => onCambiarVista('informe')}
            >
              <BookOpen size={20} />
              Informe Final
            </button>
            <button
              className={`nav-button ${vistaActual === 'recomendaciones' ? 'active' : ''}`}
              onClick={() => onCambiarVista('recomendaciones')}
            >
              <Lightbulb size={20} />
              Recomendaciones IA
            </button>
          </>
        ) : (
          <div className="nav-public-badge">
            <Globe size={16} />
            Vista Pública
          </div>
        )}
      </div>

      <div className="nav-center">
        {currentUser ? (
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
        ) : ciclosPublicos.length > 0 ? (
          <div className="ciclo-selector-nav">
            <span className="ciclo-label">Ciclo:</span>
            <select
              value={cicloActual}
              onChange={e => onCicloChange(e.target.value)}
              className="ciclo-select"
            >
              {ciclosPublicos.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        ) : null}
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
                  {onPublicar && (
                    <button
                      className="user-menu-item user-menu-publish"
                      onClick={() => { setShowUserMenu(false); onPublicar(); }}
                    >
                      <Upload size={16} />
                      Publicar ciclo actual
                    </button>
                  )}
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
            {publishMsg && (
              <span className="publish-msg">{publishMsg}</span>
            )}
          </div>
        ) : (
          <button className="btn-login-nav" onClick={onLogin}>
            <LogIn size={18} />
            Acceso Administrativo
          </button>
        )}
      </div>
    </nav>
  );
}
