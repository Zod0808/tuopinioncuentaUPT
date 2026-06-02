import { useState, useEffect, useRef } from 'react';
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
  const [encuestadosVals, setEncuestadosVals] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const userEditedRef = useRef(false);
  const initializedRef = useRef(false);

  // Cuando cambia el ciclo, reiniciar el seguimiento
  useEffect(() => {
    userEditedRef.current = false;
    initializedRef.current = false;
  }, [cicloActual]);

  // Propagar cambios al App en tiempo real para que los reportes se actualicen
  // sin necesidad de hacer clic en "Guardar" primero.
  useEffect(() => {
    if (!userEditedRef.current) return;
    const timer = setTimeout(() => {
      const entries: MatriculadosEntry[] = [];
      for (const fac of ORDEN_FACULTADES) {
        for (const carrera of FACULTADES[fac].carreras) {
          const key = `${fac}||${carrera}`;
          const v = valores[key] ?? 0;
          if (v > 0) {
            entries.push({ facultad: fac, carrera, totalMatriculados: v, totalEncuestados: encuestadosVals[key] ?? 0 });
          }
        }
      }
      onMatriculadosChange(entries);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valores, encuestadosVals]);

  // Sincronizar desde el prop solo si el usuario no ha empezado a editar
  useEffect(() => {
    if (userEditedRef.current) return;
    if (initializedRef.current && matriculados.length > 0) return;
    const mapMat: Record<string, number> = {};
    const mapEnc: Record<string, number> = {};
    for (const fac of ORDEN_FACULTADES) {
      for (const carrera of FACULTADES[fac].carreras) {
        const entry = matriculados.find(m => m.facultad === fac && m.carrera === carrera);
        mapMat[`${fac}||${carrera}`] = entry?.totalMatriculados ?? 0;
        mapEnc[`${fac}||${carrera}`] = entry?.totalEncuestados ?? 0;
      }
    }
    setValores(mapMat);
    setEncuestadosVals(mapEnc);
    if (matriculados.length > 0) initializedRef.current = true;
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
        return {
          facultad,
          carrera,
          totalMatriculados: v,
          totalEncuestados: encuestadosVals[key] ?? 0,
        };
      });
    const ok = await saveMatriculados(cicloActual, entries);
    userEditedRef.current = false;
    initializedRef.current = true;
    onMatriculadosChange(entries);
    setGuardando(false);
    flash(ok ? '✓ Guardado en la base de datos' : '✓ Guardado en caché local');
  };

  const handleCargar = async () => {
    setCargando(true);
    const data = await loadMatriculados(cicloActual);
    if (data.length > 0) {
      userEditedRef.current = false;
      initializedRef.current = false;
      onMatriculadosChange(data);
      flash('✓ Datos cargados desde la base de datos');
    } else {
      flash('Sin datos en la BD para este ciclo');
    }
    setCargando(false);
  };

  const totalGeneral = Object.values(valores).reduce((a, b) => a + b, 0);
  const totalEncGeneral = Object.values(encuestadosVals).reduce((a, b) => a + b, 0);

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
                  Matr: {totalGeneral.toLocaleString()}
                </span>
              )}
              {totalEncGeneral > 0 && (
                <span className="matriculados-enc-tag">
                  Enc: {totalEncGeneral.toLocaleString()}
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
                <div className="matriculados-fac-subtotals">
                  <span className="matriculados-fac-subtotal" title="Matriculados">
                    {totalFac > 0 ? totalFac.toLocaleString() : '—'}
                  </span>
                  {(() => {
                    const totalEncFac = FACULTADES[fac].carreras.reduce(
                      (s, c) => s + (encuestadosVals[`${fac}||${c}`] ?? 0), 0
                    );
                    return totalEncFac > 0 ? (
                      <span className="matriculados-fac-subtotal-enc" title="Encuestados">
                        {totalEncFac.toLocaleString()}
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>
              <div className="matriculados-col-headers">
                <span />
                <span>Matr.</span>
                <span>Enc.</span>
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
                        value={valores[key] || ''}
                        onChange={e => {
                          userEditedRef.current = true;
                          setValores(prev => ({
                            ...prev,
                            [key]: parseInt(e.target.value) || 0,
                          }));
                        }}
                        className="matriculados-row-input"
                        placeholder="0"
                      />
                      <input
                        type="number"
                        min={0}
                        value={encuestadosVals[key] || ''}
                        onChange={e => {
                          userEditedRef.current = true;
                          setEncuestadosVals(prev => ({
                            ...prev,
                            [key]: parseInt(e.target.value) || 0,
                          }));
                        }}
                        className="matriculados-row-input matriculados-row-input-enc"
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
