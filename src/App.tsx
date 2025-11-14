import { useState, useEffect } from 'react';
import { EvaluacionData } from './types';
import Navigation from './components/Navigation';
import DataEntryView from './components/DataEntryView';
import ReportsView from './components/ReportsView';
import './App.css';

function App() {
  const [vistaActual, setVistaActual] = useState<'datos' | 'reportes'>('datos');
  const [datos, setDatos] = useState<EvaluacionData[]>([]);
  const [graficosElements, setGraficosElements] = useState<HTMLElement[]>([]);

  // Cargar datos del localStorage al iniciar
  useEffect(() => {
    const datosGuardados = localStorage.getItem('evaluacionDatos');
    if (datosGuardados) {
      try {
        setDatos(JSON.parse(datosGuardados));
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    }
  }, []);

  // Guardar datos en localStorage cuando cambien
  useEffect(() => {
    if (datos.length > 0) {
      localStorage.setItem('evaluacionDatos', JSON.stringify(datos));
    }
  }, [datos]);

  const handleDataAdd = (newData: EvaluacionData) => {
    setDatos(prev => [...prev, newData]);
  };

  const handleDataImport = (newData: EvaluacionData[]) => {
    setDatos(prev => [...prev, ...newData]);
  };

  const handleDataDelete = (id: string) => {
    setDatos(prev => prev.filter(item => item.id !== id));
  };

  const handleDataDeleteAll = () => {
    if (confirm('¿Está seguro de eliminar TODOS los datos? Esta acción no se puede deshacer.')) {
      setDatos([]);
      localStorage.removeItem('evaluacionDatos');
    }
  };

  const handleGraficoReady = (element: HTMLElement, index: number) => {
    setGraficosElements(prev => {
      const nuevos = [...prev];
      nuevos[index] = element;
      return nuevos;
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Tu Opinión Cuenta</h1>
        <p>Sistema de Evaluación de la Calidad Educativa - Ciclo 2025-II</p>
      </header>

      <Navigation vistaActual={vistaActual} onCambiarVista={setVistaActual} />

      <main className="app-main">
        <div className="container">
          {vistaActual === 'datos' ? (
            <DataEntryView
              datos={datos}
              graficosElements={graficosElements}
              onDataAdd={handleDataAdd}
              onDataImport={handleDataImport}
              onDataDelete={handleDataDelete}
              onDataDeleteAll={handleDataDeleteAll}
              onGraficoReady={handleGraficoReady}
            />
          ) : (
            <ReportsView datos={datos} onGraficoReady={handleGraficoReady} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>&copy; 2025 Sistema de Evaluación Académica - Tu Opinión Cuenta</p>
      </footer>
    </div>
  );
}

export default App;

