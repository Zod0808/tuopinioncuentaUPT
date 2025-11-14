import { useState, useEffect, useRef, useCallback } from 'react';
import { EvaluacionData } from './types';
import Navigation from './components/Navigation';
import DataEntryView from './components/DataEntryView';
import ReportsView from './components/ReportsView';
import { saveDataToFirestore, loadDataFromFirestore, subscribeToFirestore, isFirebaseConfigured } from './services/firebaseService';
import { saveDataToJSONBin, loadDataFromJSONBin, isJSONBinConfigured } from './services/jsonbinService';
import './App.css';

function App() {
  const [vistaActual, setVistaActual] = useState<'datos' | 'reportes'>('datos');
  const [datos, setDatos] = useState<EvaluacionData[]>([]);
  const [graficosElements, setGraficosElements] = useState<HTMLElement[]>([]);

  // Cargar datos al iniciar (primero desde servicios en la nube, luego localStorage como backup)
  useEffect(() => {
    const loadData = async () => {
      let datosCargados: EvaluacionData[] | null = null;

      // Intentar cargar desde JSONBin primero (más simple)
      if (isJSONBinConfigured()) {
        try {
          datosCargados = await loadDataFromJSONBin();
          if (datosCargados && datosCargados.length > 0) {
            setDatos(datosCargados);
            localStorage.setItem('evaluacionDatos', JSON.stringify(datosCargados));
            console.log(`Datos cargados desde JSONBin: ${datosCargados.length} registros`);
            return;
          }
        } catch (error) {
          console.error('Error al cargar desde JSONBin:', error);
        }
      }

      // Intentar cargar desde Firestore si JSONBin no está disponible
      if (isFirebaseConfigured()) {
        try {
          datosCargados = await loadDataFromFirestore();
          if (datosCargados && datosCargados.length > 0) {
            setDatos(datosCargados);
            localStorage.setItem('evaluacionDatos', JSON.stringify(datosCargados));
            console.log(`Datos cargados desde Firestore: ${datosCargados.length} registros`);
            return;
          }
        } catch (error) {
          console.error('Error al cargar desde Firestore:', error);
        }
      }

      // Si no hay datos en Firestore, intentar desde localStorage
      try {
        const datosGuardados = localStorage.getItem('evaluacionDatos');
        if (datosGuardados) {
          const datosParseados = JSON.parse(datosGuardados);
          if (Array.isArray(datosParseados) && datosParseados.length > 0) {
            setDatos(datosParseados);
            console.log(`Datos cargados desde localStorage: ${datosParseados.length} registros`);
            
            // Sincronizar con servicios en la nube si están configurados
            if (isJSONBinConfigured()) {
              saveDataToJSONBin(datosParseados).catch(err => {
                console.error('Error al sincronizar con JSONBin:', err);
              });
            } else if (isFirebaseConfigured()) {
              saveDataToFirestore(datosParseados).catch(err => {
                console.error('Error al sincronizar con Firestore:', err);
              });
            }
            return;
          } else {
            console.warn('Los datos en localStorage no son válidos o están vacíos');
            localStorage.removeItem('evaluacionDatos');
          }
        } else {
          console.log('No hay datos guardados');
        }
      } catch (error) {
        console.error('Error al cargar datos desde localStorage:', error);
        localStorage.removeItem('evaluacionDatos');
      }
    };

    loadData();

    // Suscribirse a cambios en tiempo real si Firebase está configurado
    // (JSONBin no soporta tiempo real, solo Firebase)
    if (isFirebaseConfigured()) {
      const unsubscribe = subscribeToFirestore((nuevosDatos) => {
        setDatos(nuevosDatos);
        localStorage.setItem('evaluacionDatos', JSON.stringify(nuevosDatos));
        console.log('Datos actualizados desde Firestore en tiempo real');
      });

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    }
  }, []);

  // Ref para evitar guardados múltiples simultáneos
  const savingRef = useRef(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Guardar datos cuando cambien (con debouncing para evitar loops infinitos)
  useEffect(() => {
    // Guardar en localStorage siempre (como backup) - sin debouncing
    try {
      if (datos.length > 0) {
        localStorage.setItem('evaluacionDatos', JSON.stringify(datos));
      } else {
        localStorage.removeItem('evaluacionDatos');
      }
    } catch (error) {
      console.error('Error al guardar datos en localStorage:', error);
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        alert('El almacenamiento local está lleno. Por favor, elimine algunos datos antiguos.');
      }
    }

    // Limpiar timeout anterior
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Guardar en servicios en la nube con debouncing (esperar 2 segundos después del último cambio)
    saveTimeoutRef.current = setTimeout(() => {
      if (savingRef.current) {
        return; // Ya hay un guardado en progreso
      }

      savingRef.current = true;

      const saveToCloud = async () => {
        try {
          if (isJSONBinConfigured() && datos.length > 0) {
            await saveDataToJSONBin(datos);
          } else if (isFirebaseConfigured() && datos.length > 0) {
            await saveDataToFirestore(datos);
          }
        } catch (error) {
          console.error('Error al guardar en la nube:', error);
        } finally {
          savingRef.current = false;
        }
      };

      saveToCloud();
    }, 2000); // Esperar 2 segundos después del último cambio

    // Cleanup
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
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
      // También eliminar de servicios en la nube si están configurados
      if (isJSONBinConfigured()) {
        saveDataToJSONBin([]).catch(error => {
          console.error('Error al eliminar datos de JSONBin:', error);
        });
      } else if (isFirebaseConfigured()) {
        saveDataToFirestore([]).catch(error => {
          console.error('Error al eliminar datos de Firestore:', error);
        });
      }
    }
  };

  // Usar useCallback para evitar recrear la función en cada render
  const handleGraficoReady = useCallback((element: HTMLElement, index: number) => {
    setGraficosElements(prev => {
      // Solo actualizar si el elemento realmente cambió
      if (prev[index] === element) {
        return prev;
      }
      const nuevos = [...prev];
      nuevos[index] = element;
      return nuevos;
    });
  }, []);

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

