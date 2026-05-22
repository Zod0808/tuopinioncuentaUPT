import { useState, useEffect, useRef, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { EvaluacionData } from './types';
import Navigation from './components/Navigation';
import DataEntryView from './components/DataEntryView';
import ReportsView from './components/ReportsView';
import InformeFinalView from './components/InformeFinalView';
import AuthModal from './components/AuthModal';
import { MatriculadosEntry } from './services/reportCalculations';
import { loadMatriculados } from './services/matriculadosService';
import {
  isSupabaseConfigured,
  onAuthStateChange,
  getCurrentUser,
  signOut,
  saveEvaluacionData,
  loadEvaluacionData,
  getCiclosDisponibles,
} from './services/supabaseService';
import './App.css';

const CICLO_DEFAULT = '2025-II';
const LS_KEY = (ciclo: string) => `evaluacionDatos_${ciclo}`;

function App() {
  const [vistaActual, setVistaActual] = useState<'datos' | 'reportes' | 'informe'>('datos');
  const [datos, setDatos] = useState<EvaluacionData[]>([]);
  const [graficosElements, setGraficosElements] = useState<HTMLElement[]>([]);
  const [matriculados, setMatriculados] = useState<MatriculadosEntry[]>([]);

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [cicloActual, setCicloActual] = useState(CICLO_DEFAULT);
  const [ciclosDisponibles, setCiclosDisponibles] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loadingData, setLoadingData] = useState(false);

  // ── Auth state ──────────────────────────────────────────────────────────
  useEffect(() => {
    // Verificar sesión existente al montar
    getCurrentUser().then(user => {
      setCurrentUser(user);
      if (user) loadUserData(user, cicloActual);
    });

    if (!isSupabaseConfigured()) return;

    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        const ciclos = await getCiclosDisponibles();
        setCiclosDisponibles(ciclos);
        // Si el ciclo actual ya tiene datos en la nube, cargarlo; si no, mantener estado
        await loadUserData(user, cicloActual);
      } else {
        // Al cerrar sesión: limpiar datos y volver a localStorage
        setCiclosDisponibles([]);
        const local = localStorage.getItem(LS_KEY(cicloActual));
        setDatos(local ? JSON.parse(local) : []);
      }
    });

    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadUserData(_user: User, ciclo: string) {
    setLoadingData(true);
    try {
      if (isSupabaseConfigured()) {
        const ciclos = await getCiclosDisponibles();
        setCiclosDisponibles(ciclos);

        const [datosCiclo, matr] = await Promise.all([
          loadEvaluacionData(ciclo),
          loadMatriculados(ciclo),
        ]);
        setMatriculados(matr);

        if (datosCiclo !== null) {
          setDatos(datosCiclo);
          localStorage.setItem(LS_KEY(ciclo), JSON.stringify(datosCiclo));
          return;
        }
      }
      const local = localStorage.getItem(LS_KEY(ciclo));
      if (local) {
        const parsed = JSON.parse(local);
        setDatos(Array.isArray(parsed) ? parsed : []);
      } else {
        setDatos([]);
      }
    } catch (err) {
      console.error('Error cargando datos:', err);
    } finally {
      setLoadingData(false);
    }
  }

  // ── Cambio de ciclo ─────────────────────────────────────────────────────
  const handleCicloChange = async (nuevoCiclo: string) => {
    if (datos.length > 0 && currentUser) {
      await saveEvaluacionData(cicloActual, datos);
    }
    setCicloActual(nuevoCiclo);
    setMatriculados([]);
    if (currentUser) {
      await loadUserData(currentUser, nuevoCiclo);
    } else {
      const local = localStorage.getItem(LS_KEY(nuevoCiclo));
      setDatos(local ? JSON.parse(local) : []);
    }
  };

  // ── Persistencia de datos ───────────────────────────────────────────────
  const savingRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // localStorage siempre como backup
    try {
      if (datos.length > 0) {
        localStorage.setItem(LS_KEY(cicloActual), JSON.stringify(datos));
      }
    } catch (err) {
      console.error('Error guardando en localStorage:', err);
    }

    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

    saveTimeoutRef.current = setTimeout(() => {
      if (savingRef.current) return;
      savingRef.current = true;

      const save = async () => {
        try {
          if (isSupabaseConfigured() && currentUser && datos.length > 0) {
            await saveEvaluacionData(cicloActual, datos);
            // Actualizar lista de ciclos disponibles
            const ciclos = await getCiclosDisponibles();
            setCiclosDisponibles(ciclos);
          }
        } catch (err) {
          console.error('Error al guardar en Supabase:', err);
        } finally {
          savingRef.current = false;
        }
      };

      save();
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [datos, cicloActual, currentUser]);

  // ── Handlers de datos ───────────────────────────────────────────────────
  const handleDataAdd = (newData: EvaluacionData) => {
    setDatos(prev => [...prev, newData]);
  };

  const handleDataImport = async (newData: EvaluacionData[], ciclo: string) => {
    if (ciclo !== cicloActual) {
      // Guardar ciclo actual y cambiar al ciclo destino antes de importar
      if (datos.length > 0 && currentUser) {
        await saveEvaluacionData(cicloActual, datos);
      }
      const existingData = currentUser ? (await loadEvaluacionData(ciclo) || []) : [];
      const merged = [...existingData, ...newData];
      setCicloActual(ciclo);
      setDatos(merged);
      localStorage.setItem(LS_KEY(ciclo), JSON.stringify(merged));
    } else {
      setDatos(prev => [...prev, ...newData]);
    }
  };

  const handleDataDelete = (id: string) => {
    setDatos(prev => prev.filter(item => item.id !== id));
  };

  const handleDataDeleteAll = () => {
    if (confirm('¿Está seguro de eliminar TODOS los datos de este ciclo? Esta acción no se puede deshacer.')) {
      setDatos([]);
      localStorage.removeItem(LS_KEY(cicloActual));
      if (isSupabaseConfigured() && currentUser) {
        saveEvaluacionData(cicloActual, []).catch(console.error);
      }
    }
  };

  const handleGraficoReady = useCallback((element: HTMLElement, index: number) => {
    setGraficosElements(prev => {
      if (prev[index] === element) return prev;
      const nuevos = [...prev];
      nuevos[index] = element;
      return nuevos;
    });
  }, []);

  const handleLogout = async () => {
    await signOut();
    setCurrentUser(null);
    setCiclosDisponibles([]);
    setDatos([]);
  };

  const handleAuthSuccess = async () => {
    const user = await getCurrentUser();
    if (user) {
      setCurrentUser(user);
      await loadUserData(user, cicloActual);
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header-content">
          <div>
            <h1>Tu Opinión Cuenta</h1>
            <p>Sistema de Evaluación de la Calidad Educativa</p>
          </div>
          {!currentUser && !isSupabaseConfigured() && (
            <div className="supabase-warning">
              ⚠️ Configura Supabase para guardar datos en la nube
            </div>
          )}
        </div>
      </header>

      <Navigation
        vistaActual={vistaActual}
        onCambiarVista={setVistaActual}
        currentUser={currentUser}
        onLogin={() => setShowAuthModal(true)}
        onLogout={handleLogout}
        cicloActual={cicloActual}
        ciclosDisponibles={ciclosDisponibles}
        onCicloChange={handleCicloChange}
      />

      <main className="app-main">
        <div className="container">
          {loadingData ? (
            <div className="loading-container">
              <div className="spinner" />
              <p>Cargando datos del ciclo {cicloActual}...</p>
            </div>
          ) : vistaActual === 'datos' ? (
            <DataEntryView
              datos={datos}
              graficosElements={graficosElements}
              onDataAdd={handleDataAdd}
              onDataImport={handleDataImport}
              onDataDelete={handleDataDelete}
              onDataDeleteAll={handleDataDeleteAll}
              cicloActual={cicloActual}
              ciclosDisponibles={ciclosDisponibles}
              onGraficoReady={handleGraficoReady}
              matriculados={matriculados}
              onMatriculadosChange={setMatriculados}
            />
          ) : vistaActual === 'informe' ? (
            <InformeFinalView datos={datos} matriculados={matriculados} cicloActual={cicloActual} />
          ) : (
            <ReportsView datos={datos} cicloActual={cicloActual} onGraficoReady={handleGraficoReady} />
          )}
        </div>
      </main>

      <footer className="app-footer">
        <p>
          &copy; 2026 Sistema de Evaluación Académica - Tu Opinión Cuenta
          {currentUser && (
            <span className="footer-ciclo"> · Ciclo {cicloActual}</span>
          )} - By Cesar Chavez.
        </p>
      </footer>

      {showAuthModal && (
        <AuthModal
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      )}
    </div>
  );
}

export default App;
