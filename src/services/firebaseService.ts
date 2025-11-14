import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, onSnapshot, Firestore } from 'firebase/firestore';
import { EvaluacionData } from '../types';

// Configuración de Firebase
// Nota: En producción, estas credenciales deben estar en variables de entorno
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKeyReplaceWithYourOwn",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "your-project.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "your-project-id",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "your-project.appspot.com",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef"
};

// Inicializar Firebase
let app: ReturnType<typeof initializeApp> | null = null;
let db: Firestore | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase no está configurado. Los datos se guardarán solo localmente:', error);
}

// ID del documento donde se guardan los datos (puede ser fijo o dinámico)
const DATA_DOC_ID = 'evaluacion-datos-2025-II';

/**
 * Guarda los datos en Firestore
 */
export async function saveDataToFirestore(datos: EvaluacionData[]): Promise<boolean> {
  if (!db) {
    console.warn('Firestore no está disponible');
    return false;
  }

  try {
    const docRef = doc(db, 'evaluaciones', DATA_DOC_ID);
    await setDoc(docRef, {
      datos,
      lastUpdated: new Date().toISOString(),
      totalRecords: datos.length
    }, { merge: true });
    
    console.log(`Datos guardados en Firestore: ${datos.length} registros`);
    return true;
  } catch (error) {
    console.error('Error al guardar en Firestore:', error);
    return false;
  }
}

/**
 * Carga los datos desde Firestore
 */
export async function loadDataFromFirestore(): Promise<EvaluacionData[] | null> {
  if (!db) {
    console.warn('Firestore no está disponible');
    return null;
  }

  try {
    const docRef = doc(db, 'evaluaciones', DATA_DOC_ID);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      if (data.datos && Array.isArray(data.datos)) {
        console.log(`Datos cargados desde Firestore: ${data.datos.length} registros`);
        return data.datos as EvaluacionData[];
      }
    }
    
    console.log('No hay datos en Firestore');
    return null;
  } catch (error) {
    console.error('Error al cargar desde Firestore:', error);
    return null;
  }
}

/**
 * Suscribe a cambios en tiempo real en Firestore
 */
export function subscribeToFirestore(
  callback: (datos: EvaluacionData[]) => void
): (() => void) | null {
  if (!db) {
    console.warn('Firestore no está disponible');
    return null;
  }

  try {
    const docRef = doc(db, 'evaluaciones', DATA_DOC_ID);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.datos && Array.isArray(data.datos)) {
          callback(data.datos as EvaluacionData[]);
        }
      }
    }, (error) => {
      console.error('Error en suscripción a Firestore:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('Error al suscribirse a Firestore:', error);
    return null;
  }
}

/**
 * Verifica si Firebase está configurado correctamente
 */
export function isFirebaseConfigured(): boolean {
  return db !== null && app !== null;
}

