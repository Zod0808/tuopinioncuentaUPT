import { useState, useEffect } from 'react';
import { Trash2, ArrowRight, RefreshCw, Database, HardDrive, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface CicloInfo {
  ciclo: string;
  enCache: boolean;
  enDB: boolean;
  registros: number;
}

interface GestionDatosPanelProps {
  cicloActual: string;
  ciclosDisponibles: string[];
  currentUser: { email?: string | null } | null;
  onCicloChange: (ciclo: string) => void;
  onDeleteCache: (ciclo: string) => void;
  onDeleteDB: (ciclo: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

function leerCiclosCache(): Record<string, number> {
  const result: Record<string, number> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('evaluacionDatos_')) {
      const ciclo = key.replace('evaluacionDatos_', '');
      try {
        const d = JSON.parse(localStorage.getItem(key) || '[]');
        result[ciclo] = Array.isArray(d) ? d.length : 0;
      } catch {
        result[ciclo] = 0;
      }
    }
  }
  return result;
}

export default function GestionDatosPanel({
  cicloActual, ciclosDisponibles, currentUser,
  onCicloChange, onDeleteCache, onDeleteDB, onRefresh,
}: GestionDatosPanelProps) {
  const [ciclos, setCiclos] = useState<CicloInfo[]>([]);
  const [confirmando, setConfirmando] = useState<string | null>(null);
  const [borrando, setBorrando] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const reconstruir = () => {
    const cached = leerCiclosCache();
    const todos = new Set([...Object.keys(cached), ...ciclosDisponibles]);
    const info: CicloInfo[] = Array.from(todos)
      .sort((a, b) => b.localeCompare(a))
      .map(ciclo => ({
        ciclo,
        enCache: ciclo in cached,
        enDB: ciclosDisponibles.includes(ciclo),
        registros: cached[ciclo] ?? 0,
      }));
    setCiclos(info);
  };

  useEffect(() => { reconstruir(); }, [ciclosDisponibles]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    reconstruir();
    setRefreshing(false);
  };

  const doDeleteCache = (ciclo: string) => {
    onDeleteCache(ciclo);
    setCiclos(prev =>
      prev.map(c => c.ciclo === ciclo ? { ...c, enCache: false, registros: 0 } : c)
          .filter(c => c.enCache || c.enDB)
    );
    setConfirmando(null);
  };

  const doDeleteDB = async (ciclo: string) => {
    setBorrando(ciclo);
    await onDeleteDB(ciclo);
    setCiclos(prev =>
      prev.map(c => c.ciclo === ciclo ? { ...c, enDB: false } : c)
          .filter(c => c.enCache || c.enDB)
    );
    setBorrando(null);
    setConfirmando(null);
  };

  const doDeleteBoth = async (ciclo: string) => {
    setBorrando(ciclo);
    onDeleteCache(ciclo);
    await onDeleteDB(ciclo);
    setCiclos(prev => prev.filter(c => c.ciclo !== ciclo));
    setBorrando(null);
    setConfirmando(null);
  };

  return (
    <div className="gestion-panel">
      <div className="gestion-panel-header">
        <div>
          <h3>Gestión de Ciclos y Datos</h3>
          <p className="gestion-panel-sub">
            Administra los datos almacenados localmente (caché) y en la base de datos por ciclo académico.
          </p>
        </div>
        <button className="btn-secondary btn-sm" onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={14} className={refreshing ? 'spinning' : ''} />
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {!currentUser && (
        <div className="gestion-alert">
          <AlertTriangle size={16} />
          <span>Inicia sesión para gestionar datos en la nube. Solo puedes limpiar el caché local.</span>
        </div>
      )}

      <div className="gestion-leyenda">
        <span className="gestion-badge gestion-badge-cache">
          <HardDrive size={12} /> Caché local
        </span>
        <span className="gestion-badge gestion-badge-db">
          <Database size={12} /> Base de datos
        </span>
        <span className="gestion-badge gestion-badge-activo">
          <CheckCircle2 size={12} /> Ciclo activo
        </span>
      </div>

      {ciclos.length === 0 ? (
        <div className="gestion-empty">
          <p>No hay datos en caché ni en la base de datos.</p>
          <p className="gestion-empty-hint">Importa un archivo Excel en la pestaña "Importar Excel" para comenzar.</p>
        </div>
      ) : (
        <div className="gestion-ciclos-lista">
          {ciclos.map(c => (
            <div
              key={c.ciclo}
              className={`gestion-ciclo-card ${c.ciclo === cicloActual ? 'activo' : ''}`}
            >
              <div className="gestion-ciclo-izq">
                <span className="gestion-ciclo-nombre">{c.ciclo}</span>
                <div className="gestion-ciclo-badges">
                  {c.ciclo === cicloActual && (
                    <span className="gestion-badge gestion-badge-activo">
                      <CheckCircle2 size={11} /> activo
                    </span>
                  )}
                  {c.enCache && (
                    <span className="gestion-badge gestion-badge-cache">
                      <HardDrive size={11} /> {c.registros} reg.
                    </span>
                  )}
                  {c.enDB && (
                    <span className="gestion-badge gestion-badge-db">
                      <Database size={11} /> BD
                    </span>
                  )}
                </div>
              </div>

              {confirmando === c.ciclo ? (
                <div className="gestion-confirm-inline">
                  <span className="gestion-confirm-label">¿Qué deseas eliminar?</span>
                  <div className="gestion-confirm-btns">
                    {c.enCache && (
                      <button
                        className="btn-warn btn-xs"
                        onClick={() => doDeleteCache(c.ciclo)}
                        disabled={!!borrando}
                        title="Borrar solo el caché local"
                      >
                        <HardDrive size={12} /> Solo caché
                      </button>
                    )}
                    {c.enDB && currentUser && (
                      <button
                        className="btn-warn btn-xs"
                        onClick={() => doDeleteDB(c.ciclo)}
                        disabled={!!borrando}
                        title="Borrar solo de la base de datos"
                      >
                        <Database size={12} />
                        {borrando === c.ciclo ? 'Borrando...' : 'Solo BD'}
                      </button>
                    )}
                    {c.enCache && c.enDB && currentUser && (
                      <button
                        className="btn-danger btn-xs"
                        onClick={() => doDeleteBoth(c.ciclo)}
                        disabled={!!borrando}
                        title="Borrar de caché y base de datos"
                      >
                        <Trash2 size={12} />
                        {borrando === c.ciclo ? 'Eliminando...' : 'Todo'}
                      </button>
                    )}
                    <button
                      className="btn-secondary btn-xs"
                      onClick={() => setConfirmando(null)}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="gestion-ciclo-acciones">
                  {c.ciclo !== cicloActual && (
                    <button
                      className="btn-secondary btn-xs"
                      onClick={() => onCicloChange(c.ciclo)}
                      title="Cambiar a este ciclo"
                    >
                      <ArrowRight size={13} /> Ir al ciclo
                    </button>
                  )}
                  <button
                    className="btn-danger btn-xs"
                    onClick={() => setConfirmando(c.ciclo)}
                    title="Eliminar datos de este ciclo"
                  >
                    <Trash2 size={13} /> Limpiar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
