import { useState } from 'react';
import { EvaluacionData } from '../types';
import { Plus, X } from 'lucide-react';

interface DataInputProps {
  onDataAdd: (data: EvaluacionData) => void;
  datosExistentes: EvaluacionData[];
}

// Mapeo de facultades con sus carreras profesionales
const carrerasPorFacultad: Record<string, string[]> = {
  FAING: [
    'Carrera Profesional de Ingeniería Civil',
    'Carrera Profesional de Ingeniería de Sistemas',
    'Carrera Profesional Ingeniería Electrónica',
    'Carrera Profesional de Ingeniería Agroindustrial',
    'Carrera Profesional de Ingeniería Ambiental',
    'Carrera Profesional de Ingeniería Industrial'
  ],
  FAEDCOH: [
    'Carrera Profesional Educación Inicial',
    'Carrera Profesional Educación Primaria',
    'Carrera Profesional Educación Física y Deportes',
    'Carrera Profesional de Ciencias de la Comunicación',
    'Carrera Profesional de Psicología'
  ],
  FADE: [
    'Carrera Profesional de Derecho'
  ],
  FACEM: [
    'Ingeniería Comercial',
    'Escuela Profesional de Ciencias Contables y Financieras',
    'Escuela Profesional de Economía',
    'Administración de Negocios Internacionales',
    'Administración Turístico Hotelera',
    'Administración de Empresas'
  ],
  FAU: [
    'Escuela Profesional de Arquitectura'
  ],
  FACSA: [
    'Escuela Profesional de Medicina Humana',
    'Escuela Profesional de Odontología',
    'Laboratorio Clínico y Anatomía Patológica',
    'Terapia Física y Rehabilitación'
  ]
};

export default function DataInput({ onDataAdd, datosExistentes }: DataInputProps) {
  const [formData, setFormData] = useState<EvaluacionData>({
    facultad: 'FAING',
    carreraProfesional: carrerasPorFacultad['FAING'][0],
    docente: '',
    curso: '',
    seccion: '',
    calificacion: 'BUENO',
    ae01: 0,
    ae02: 0,
    ae03: 0,
    ae04: 0,
    nota: 0,
    encuestados: 0,
    noEncuestados: 0,
    validez: 'Válido'
  });

  const [showForm, setShowForm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // Si cambia la facultad, actualizar la carrera a la primera de la nueva facultad
    if (name === 'facultad') {
      const carreras = carrerasPorFacultad[value] || [];
      setFormData(prev => ({
        ...prev,
        facultad: value,
        carreraProfesional: carreras[0] || ''
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name.includes('ae') || name === 'nota' || name === 'encuestados' || name === 'noEncuestados'
          ? parseFloat(value) || 0
          : value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const notaCalculada = (formData.ae01 + formData.ae02 + formData.ae03 + formData.ae04) / 4;
    const dataWithId = {
      ...formData,
      id: Date.now().toString(),
      nota: notaCalculada || formData.nota
    };
    onDataAdd(dataWithId);
    setFormData({
      facultad: 'FAING',
      carreraProfesional: carrerasPorFacultad['FAING'][0],
      docente: '',
      curso: '',
      seccion: '',
      calificacion: 'BUENO',
      ae01: 0,
      ae02: 0,
      ae03: 0,
      ae04: 0,
      nota: 0,
      encuestados: 0,
      noEncuestados: 0,
      validez: 'Válido'
    });
    setShowForm(false);
  };

  return (
    <div className="data-input-container">
      <div className="data-input-header">
        <h2>Ingreso de Datos</h2>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X size={20} /> : <Plus size={20} />}
          {showForm ? 'Cancelar' : 'Nuevo Registro'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="data-form">
          <div className="form-row">
            <div className="form-group">
              <label>Facultad</label>
              <select
                name="facultad"
                value={formData.facultad}
                onChange={handleChange}
                required
              >
                <option value="FAING">FAING</option>
                <option value="FAU">FAU</option>
                <option value="FACSA">FACSA</option>
                <option value="FAEDCOH">FAEDCOH</option>
                <option value="FACEM">FACEM</option>
                <option value="FADE">FADE</option>
              </select>
            </div>
            <div className="form-group">
              <label>Carrera Profesional</label>
              <select
                name="carreraProfesional"
                value={formData.carreraProfesional}
                onChange={handleChange}
                required
              >
                {carrerasPorFacultad[formData.facultad]?.map((carrera) => (
                  <option key={carrera} value={carrera}>
                    {carrera}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Docente</label>
              <input
                type="text"
                name="docente"
                value={formData.docente}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Curso</label>
              <input
                type="text"
                name="curso"
                value={formData.curso}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label>Sección</label>
              <input
                type="text"
                name="seccion"
                value={formData.seccion}
                onChange={handleChange}
                required
                maxLength={1}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Calificación</label>
              <select
                name="calificacion"
                value={formData.calificacion}
                onChange={handleChange}
                required
              >
                <option value="DESTACADO">DESTACADO</option>
                <option value="BUENO">BUENO</option>
                <option value="ACEPTABLE">ACEPTABLE</option>
                <option value="REGULAR">REGULAR</option>
                <option value="DEFICIENTE">DEFICIENTE</option>
              </select>
            </div>
            <div className="form-group">
              <label>AE-01: Calidad de presentación y contenido sílabico</label>
              <input
                type="number"
                name="ae01"
                value={formData.ae01}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="20"
                required
                title="Calidad de la presentación y contenido sílabico de la asignatura"
              />
            </div>
            <div className="form-group">
              <label>AE-02: Ejecución del proceso enseñanza-aprendizaje</label>
              <input
                type="number"
                name="ae02"
                value={formData.ae02}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="20"
                required
                title="Ejecución del proceso de enseñanza-aprendizaje"
              />
            </div>
            <div className="form-group">
              <label>AE-03: Aplicación de la evaluación</label>
              <input
                type="number"
                name="ae03"
                value={formData.ae03}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="20"
                required
                title="Aplicación de la evaluación de la asignatura"
              />
            </div>
            <div className="form-group">
              <label>AE-04: Formación actitudinal e interpersonales</label>
              <input
                type="number"
                name="ae04"
                value={formData.ae04}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="20"
                required
                title="Formación actitudinal y relaciones interpersonales"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Encuestados</label>
              <input
                type="number"
                name="encuestados"
                value={formData.encuestados}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
            <div className="form-group">
              <label>No Encuestados</label>
              <input
                type="number"
                name="noEncuestados"
                value={formData.noEncuestados}
                onChange={handleChange}
                min="0"
                required
              />
            </div>
          </div>

          <button type="submit" className="btn-primary btn-submit">
            Agregar Registro
          </button>
        </form>
      )}

      {datosExistentes.length > 0 && (
        <div className="data-summary">
          <p>Total de registros: <strong>{datosExistentes.length}</strong></p>
        </div>
      )}
    </div>
  );
}

