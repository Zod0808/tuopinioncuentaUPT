import { useState } from 'react';
import { EvaluacionData } from '../types';
import { Trash2, AlertTriangle } from 'lucide-react';

interface DataTableProps {
  datos: EvaluacionData[];
  onDelete: (id: string) => void;
  onDeleteAll?: () => void;
}

export default function DataTable({ datos, onDelete, onDeleteAll }: DataTableProps) {
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const MAX_ROWS_TO_DISPLAY = 100;

  if (datos.length === 0) {
    return (
      <div className="data-table-container">
        <p className="no-data">No hay datos registrados</p>
      </div>
    );
  }

  const datosAMostrar = datos.slice(0, MAX_ROWS_TO_DISPLAY);
  const hayMasDatos = datos.length > MAX_ROWS_TO_DISPLAY;

  const handleDeleteAll = () => {
    if (onDeleteAll) {
      onDeleteAll();
      setShowDeleteAllConfirm(false);
    }
  };

  return (
    <div className="data-table-container">
      <div className="data-table-header">
        <h2>Datos Registrados</h2>
        <div className="table-actions">
          <div className="data-count">
            Mostrando {datosAMostrar.length} de {datos.length} registros
            {hayMasDatos && <span className="more-data-indicator"> (primeros 100)</span>}
          </div>
          {onDeleteAll && (
            <button
              className="btn-delete-all"
              onClick={() => setShowDeleteAllConfirm(true)}
              title="Eliminar todos los datos"
            >
              <Trash2 size={18} />
              Eliminar Todos
            </button>
          )}
        </div>
      </div>

      {showDeleteAllConfirm && (
        <div className="delete-all-confirm">
          <div className="confirm-content">
            <AlertTriangle size={32} />
            <div>
              <h3>¿Eliminar todos los datos?</h3>
              <p>Esta acción eliminará todos los {datos.length} registros. Esta acción no se puede deshacer.</p>
            </div>
          </div>
          <div className="confirm-actions">
            <button
              className="btn-cancel"
              onClick={() => setShowDeleteAllConfirm(false)}
            >
              Cancelar
            </button>
            <button
              className="btn-confirm-delete"
              onClick={handleDeleteAll}
            >
              <Trash2 size={18} />
              Eliminar Todos
            </button>
          </div>
        </div>
      )}

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Docente</th>
              <th>Curso</th>
              <th>Sección</th>
              <th>Calificación</th>
              <th>AE-01: Sílabo</th>
              <th>AE-02: Enseñanza</th>
              <th>AE-03: Evaluación</th>
              <th>AE-04: Actitudinal</th>
              <th>Nota</th>
              <th>Encuestados</th>
              <th>No Encuestados</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {datosAMostrar.map((item) => (
              <tr key={item.id}>
                <td>{item.docente}</td>
                <td>{item.curso}</td>
                <td>{item.seccion}</td>
                <td>
                  <span className={`badge badge-${item.calificacion.toLowerCase()}`}>
                    {item.calificacion}
                  </span>
                </td>
                <td>{item.ae01.toFixed(2)}</td>
                <td>{item.ae02.toFixed(2)}</td>
                <td>{item.ae03.toFixed(2)}</td>
                <td>{item.ae04.toFixed(2)}</td>
                <td><strong>{item.nota.toFixed(2)}</strong></td>
                <td>{item.encuestados}</td>
                <td>{item.noEncuestados}</td>
                <td>
                  <button
                    className="btn-delete"
                    onClick={() => item.id && onDelete(item.id)}
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hayMasDatos && (
        <div className="table-footer-note">
          <p>
            <strong>Nota:</strong> Se están mostrando solo los primeros {MAX_ROWS_TO_DISPLAY} registros de {datos.length} totales.
            Todos los datos están disponibles para los reportes y análisis.
          </p>
        </div>
      )}
    </div>
  );
}

