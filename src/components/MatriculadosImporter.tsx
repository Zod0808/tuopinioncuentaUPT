import { useState, useEffect } from 'react';
import { Save, RefreshCw, Users } from 'lucide-react';
import { FACULTADES, ORDEN_FACULTADES } from '../config/universityStructure';
import { MatriculadosEntry } from '../services/reportCalculations';
import { saveMatriculados, loadMatriculados } from '../services/matriculadosService';

interface MatriculadosImporterProps {
  cicloActual: string;
  matriculados: MatriculadosEntry[];
  onMatriculadosChange: (entries: MatriculadosEntry[]) => void;
}

export default function MatriculadosImporter({
  cicloActual, matriculados, onMatriculadosChange,
}: MatriculadosImporterProps) {
  const [valores, setValores] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    const map: Record<string, number> = {};
    for (const fac of ORDEN_FACULTADES) {
      for (const carrera of FACULTADES[fac].carreras) {
        const entry = matriculados.find(m => m.facultad === fac && m.carrera === carrera);
        map[`${fac}||${carrera}`] = entry?.totalMatriculados ?? 0;
      }
    }
    setValores(map);
  }, [matriculados, cicloActual]);

  const flash = (msg: string) => {
    setMensaje(msg);
    setTimeout(() => setMensaje(''), 3500);
  };

  const handleGuardar = async () => {
    setGuardando(true);
    const entries: MatriculadosEntry[] = Object.entries(valores)
      .filter(([, v]) => v > 0)
      .map(([key, v]) => {
        const [facultad, carrera] = key.split('||');
        return { facultad, carrera, totalMatriculados: v };
      });
    const ok = await saveMatriculados(cicloActual, entries);
    onMatriculadosChange(entries);
    setGuardando(false);
    flash(ok ? '✓ Guardado en la base de datos' : '✓ Guardado en caché local');
  };

  const handleCargar = async () => {
    setCargando(true);
    const data = await loadMatriculados(cicloActual);
    if (data.length > 0) {
      onMatriculadosChange(data);
      flash('✓ Datos cargados desde la base de datos');
    } else {
      flash('Sin datos en la BD para este ciclo');
    }
    setCargando(false);
  };

  const totalGeneral = Object.values(valores).reduce((a, b) => a + b, 0);

  return (
    <div className="matriculados-importer">
      <div className="matriculados-header">
        <div className="matriculados-title-group">
          <Users size={22} />
          <div>
            <h3>Matriculados por Carrera</h3>
            <div className="matriculados-meta">
              <span className="matriculados-ciclo-tag">Ciclo: {cicloActual}</span>
              {totalGeneral > 0 && (
                <span className="matriculados-total-tag">
                  Total: {totalGeneral.toLocaleString()} estudiantes
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="matriculados-actions">
          {mensaje && <span className="matriculados-msg">{mensaje}</span>}
          <button
            className="btn-secondary btn-sm"
            onClick={handleCargar}
            disabled={cargando}
            title="Cargar desde la base de datos"
          >
            <RefreshCw size={14} />
            {cargando ? 'Cargando...' : 'Cargar BD'}
          </button>
          <button
            className="btn-primary btn-sm"
            onClick={handleGuardar}
            disabled={guardando}
          >
            <Save size={14} />
            {guardando ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>

      <div className="matriculados-grid-nuevo">
        {ORDEN_FACULTADES.map(fac => {
          const totalFac = FACULTADES[fac].carreras.reduce(
            (sum, c) => sum + (valores[`${fac}||${c}`] ?? 0), 0
          );
          return (
            <div key={fac} className="matriculados-fac-card">
              <div className="matriculados-fac-card-header">
                <h4>{FACULTADES[fac].nombre}</h4>
                <span className="matriculados-fac-subtotal">
                  {totalFac > 0 ? totalFac.toLocaleString() : '—'}
                </span>
              </div>
              <div className="matriculados-carreras-lista">
                {FACULTADES[fac].carreras.map(carrera => {
                  const key = `${fac}||${carrera}`;
                  return (
                    <div key={key} className="matriculados-row">
                      <label className="matriculados-row-label">{carrera}</label>
                      <input
                        type="number"
                        min={0}
                        value={valores[key] ?? 0}
                        onChange={e =>
                          setValores(prev => ({
                            ...prev,
                            [key]: parseInt(e.target.value) || 0,
                          }))
                        }
                        className="matriculados-row-input"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
