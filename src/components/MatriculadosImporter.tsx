import { useState, useEffect } from 'react';
import { FACULTADES, ORDEN_FACULTADES } from '../config/universityStructure';
import { MatriculadosEntry } from '../services/reportCalculations';
import { saveMatriculados, loadMatriculados } from '../services/matriculadosService';

interface MatriculadosImporterProps {
  cicloActual: string;
  matriculados: MatriculadosEntry[];
  onMatriculadosChange: (entries: MatriculadosEntry[]) => void;
}

export default function MatriculadosImporter({ cicloActual, matriculados, onMatriculadosChange }: MatriculadosImporterProps) {
  const [editando, setEditando] = useState(false);
  const [valores, setValores] = useState<Record<string, number>>({});
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');

  // Construir mapa inicial desde matriculados prop
  useEffect(() => {
    const map: Record<string, number> = {};
    for (const fac of ORDEN_FACULTADES) {
      const { carreras } = FACULTADES[fac];
      for (const carrera of carreras) {
        const entry = matriculados.find(m => m.facultad === fac && m.carrera === carrera);
        map[`${fac}||${carrera}`] = entry?.totalMatriculados ?? 0;
      }
    }
    setValores(map);
  }, [matriculados]);

  const handleGuardar = async () => {
    setGuardando(true);
    const entries: MatriculadosEntry[] = [];
    for (const [key, total] of Object.entries(valores)) {
      const [facultad, carrera] = key.split('||');
      if (total > 0) entries.push({ facultad, carrera, totalMatriculados: total });
    }
    const ok = await saveMatriculados(cicloActual, entries);
    onMatriculadosChange(entries);
    setGuardando(false);
    setMensaje(ok ? '✓ Guardado correctamente' : '⚠ Guardado solo localmente');
    setEditando(false);
    setTimeout(() => setMensaje(''), 3000);
  };

  const handleCargar = async () => {
    const data = await loadMatriculados(cicloActual);
    if (data.length > 0) {
      onMatriculadosChange(data);
      setMensaje('✓ Datos cargados desde la nube');
      setTimeout(() => setMensaje(''), 3000);
    }
  };

  const totalMatr = Object.values(valores).reduce((a, b) => a + b, 0);

  return (
    <div className="matriculados-importer">
      <div className="matriculados-header">
        <div>
          <h3>Total de Matriculados por Carrera</h3>
          <span className="matriculados-ciclo">Ciclo: {cicloActual}</span>
          {totalMatr > 0 && (
            <span className="matriculados-total"> · Total: {totalMatr.toLocaleString()} estudiantes</span>
          )}
        </div>
        <div className="matriculados-actions">
          {mensaje && <span className="matriculados-msg">{mensaje}</span>}
          <button className="btn-secondary btn-sm" onClick={handleCargar}>
            Cargar de la nube
          </button>
          <button className="btn-primary btn-sm" onClick={() => setEditando(v => !v)}>
            {editando ? 'Cancelar' : 'Editar matriculados'}
          </button>
          {editando && (
            <button className="btn-success btn-sm" onClick={handleGuardar} disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          )}
        </div>
      </div>

      {editando && (
        <div className="matriculados-grid">
          {ORDEN_FACULTADES.map(fac => (
            <div key={fac} className="matriculados-facultad">
              <h4 className="matriculados-fac-nombre">{FACULTADES[fac].nombre}</h4>
              <div className="matriculados-carreras">
                {FACULTADES[fac].carreras.map(carrera => {
                  const key = `${fac}||${carrera}`;
                  return (
                    <div key={key} className="matriculados-carrera-row">
                      <label className="matriculados-carrera-label">{carrera}</label>
                      <input
                        type="number"
                        min={0}
                        value={valores[key] ?? 0}
                        onChange={e => setValores(prev => ({ ...prev, [key]: parseInt(e.target.value) || 0 }))}
                        className="matriculados-input"
                        placeholder="0"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {!editando && matriculados.length > 0 && (
        <div className="matriculados-resumen">
          <table className="matriculados-table">
            <thead>
              <tr>
                <th>Facultad</th>
                <th>Carrera</th>
                <th>Matriculados</th>
              </tr>
            </thead>
            <tbody>
              {ORDEN_FACULTADES.flatMap(fac =>
                FACULTADES[fac].carreras.map(carrera => {
                  const entry = matriculados.find(m => m.facultad === fac && m.carrera === carrera);
                  if (!entry || entry.totalMatriculados === 0) return null;
                  return (
                    <tr key={`${fac}-${carrera}`}>
                      <td>{FACULTADES[fac].nombre}</td>
                      <td>{carrera}</td>
                      <td className="text-right">{entry.totalMatriculados.toLocaleString()}</td>
                    </tr>
                  );
                }).filter(Boolean)
              )}
            </tbody>
          </table>
        </div>
      )}

      {!editando && matriculados.length === 0 && (
        <p className="matriculados-empty">
          No hay datos de matriculados para el ciclo {cicloActual}. Haz clic en "Editar matriculados" para ingresar los totales.
        </p>
      )}
    </div>
  );
}
