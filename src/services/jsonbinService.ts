import { EvaluacionData } from '../types';

// JSONBin.io es un servicio gratuito para almacenar JSON
// No requiere autenticación para lectura pública
const JSONBIN_BIN_ID = import.meta.env.VITE_JSONBIN_BIN_ID || 'default-bin-id';
const JSONBIN_API_KEY = import.meta.env.VITE_JSONBIN_API_KEY || '';
const JSONBIN_BASE_URL = 'https://api.jsonbin.io/v3/b';

/**
 * Guarda los datos en JSONBin.io
 */
export async function saveDataToJSONBin(datos: EvaluacionData[]): Promise<boolean> {
  if (!JSONBIN_API_KEY) {
    console.warn('JSONBin API Key no configurada. Los datos se guardarán solo localmente.');
    return false;
  }

  try {
    const payload = {
      datos,
      lastUpdated: new Date().toISOString(),
      totalRecords: datos.length
    };

    // Si el Bin ID es el default o parece inválido, crear uno nuevo
    if (JSONBIN_BIN_ID === 'default-bin-id' || !JSONBIN_BIN_ID) {
      console.log('Creando nuevo Bin en JSONBin...');
      const response = await fetch(`${JSONBIN_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Name': 'evaluacion-datos-2025-II',
          'X-Bin-Private': 'false'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error al crear Bin JSONBin (${response.status}):`, errorText);
        return false;
      }

      const result = await response.json();
      const newBinId = result.metadata?.id;
      if (newBinId) {
        console.log(`✅ Nuevo Bin creado en JSONBin. ID: ${newBinId}`);
        console.log(`📋 Copia este Bin ID y actualiza tu archivo .env:`);
        console.log(`   VITE_JSONBIN_BIN_ID=${newBinId}`);
        console.log(`Datos guardados en JSONBin: ${datos.length} registros`);
        // Mostrar alerta visual también
        alert(`✅ Nuevo Bin creado!\n\nBin ID: ${newBinId}\n\nCopia este ID y actualiza tu archivo .env con:\nVITE_JSONBIN_BIN_ID=${newBinId}`);
      } else {
        console.warn('⚠️ Bin creado pero no se pudo obtener el ID. Revisa la respuesta:', result);
      }
      return true;
    }

    // Intentar actualizar el Bin existente (PUT)
    let response = await fetch(`${JSONBIN_BASE_URL}/${JSONBIN_BIN_ID}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Master-Key': JSONBIN_API_KEY,
        'X-Bin-Versioning': 'false'
      },
      body: JSON.stringify(payload)
    });

    // Si el Bin no existe (404 o 400), crear uno nuevo
    if (response.status === 404 || response.status === 400) {
      console.log('Bin ID no válido o no existe. Creando nuevo Bin...');
      response = await fetch(`${JSONBIN_BASE_URL}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Name': 'evaluacion-datos-2025-II',
          'X-Bin-Private': 'false'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const newBinId = result.metadata?.id;
        if (newBinId) {
          console.log(`✅ Nuevo Bin creado en JSONBin. ID: ${newBinId}`);
          console.log(`📋 Copia este Bin ID y actualiza tu archivo .env:`);
          console.log(`   VITE_JSONBIN_BIN_ID=${newBinId}`);
          // Mostrar alerta visual también
          alert(`✅ Nuevo Bin creado!\n\nBin ID: ${newBinId}\n\nCopia este ID y actualiza tu archivo .env con:\nVITE_JSONBIN_BIN_ID=${newBinId}`);
        } else {
          console.warn('⚠️ Bin creado pero no se pudo obtener el ID. Revisa la respuesta:', result);
        }
      }
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Error JSONBin (${response.status}): ${errorText}`;
      
      // Si es error 401, el Bin no pertenece a esta cuenta o la API Key es inválida
      if (response.status === 401) {
        console.error('❌ Error 401: La API Key no es válida o el Bin no pertenece a tu cuenta.');
        console.log('💡 Solución: Creando un nuevo Bin con tu API Key...');
        
        // Intentar crear un nuevo Bin
        const createResponse = await fetch(`${JSONBIN_BASE_URL}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Master-Key': JSONBIN_API_KEY,
            'X-Bin-Name': 'evaluacion-datos-2025-II',
            'X-Bin-Private': 'false'
          },
          body: JSON.stringify(payload)
        });

        if (createResponse.ok) {
          const result = await createResponse.json();
          const newBinId = result.metadata?.id;
          if (newBinId) {
            console.log(`✅ Nuevo Bin creado en JSONBin. ID: ${newBinId}`);
            console.log(`📋 IMPORTANTE: Actualiza tu archivo .env con:`);
            console.log(`   VITE_JSONBIN_BIN_ID=${newBinId}`);
            alert(`⚠️ El Bin ID anterior no funcionó.\n\n✅ Se creó un nuevo Bin.\n\nBin ID: ${newBinId}\n\n📋 Actualiza tu archivo .env con:\nVITE_JSONBIN_BIN_ID=${newBinId}`);
            return true;
          }
        } else {
          const createErrorText = await createResponse.text();
          console.error(`❌ Error al crear nuevo Bin (${createResponse.status}):`, createErrorText);
          console.error('💡 Verifica que tu API Key sea correcta en JSONBin.io');
        }
      }
      
      console.error(errorMessage);
      return false;
    }

    await response.json();
    console.log(`Datos guardados en JSONBin: ${datos.length} registros`);
    return true;
  } catch (error) {
    console.error('Error al guardar en JSONBin:', error);
    return false;
  }
}

/**
 * Carga los datos desde JSONBin.io
 */
export async function loadDataFromJSONBin(): Promise<EvaluacionData[] | null> {
  try {
    // Intentar cargar con API key primero (más confiable)
    let response: Response;
    
    if (JSONBIN_API_KEY) {
      response = await fetch(`${JSONBIN_BASE_URL}/${JSONBIN_BIN_ID}/latest`, {
        method: 'GET',
        headers: {
          'X-Master-Key': JSONBIN_API_KEY,
          'X-Bin-Meta': 'false'
        }
      });
    } else {
      // Si no hay API key, intentar lectura pública
      response = await fetch(`${JSONBIN_BASE_URL}/${JSONBIN_BIN_ID}/latest`, {
        method: 'GET',
        headers: {
          'X-Bin-Meta': 'false'
        }
      });
    }

    if (!response.ok) {
      if (response.status === 404) {
        console.log('No hay datos en JSONBin (Bin no existe aún)');
        return null;
      }
      if (response.status === 400) {
        console.log('Bin ID inválido o no existe. Se creará automáticamente al guardar.');
        return null;
      }
      if (response.status === 401) {
        console.warn('⚠️ Error 401: La API Key no es válida o el Bin no pertenece a tu cuenta.');
        console.warn('💡 El sistema intentará crear un nuevo Bin cuando guardes datos.');
        return null;
      }
      const errorText = await response.text();
      console.error(`Error JSONBin (${response.status}):`, errorText);
      return null;
    }

    const data = await response.json();
    
    // JSONBin v3 devuelve los datos en data.record
    if (data.record) {
      const record = data.record;
      if (record.datos && Array.isArray(record.datos)) {
        console.log(`Datos cargados desde JSONBin: ${record.datos.length} registros`);
        return record.datos as EvaluacionData[];
      }
      // Si record es directamente un array
      if (Array.isArray(record)) {
        console.log(`Datos cargados desde JSONBin: ${record.length} registros`);
        return record as EvaluacionData[];
      }
    }
    
    // Fallback: si data.datos existe directamente
    if (data.datos && Array.isArray(data.datos)) {
      console.log(`Datos cargados desde JSONBin: ${data.datos.length} registros`);
      return data.datos as EvaluacionData[];
    }

    // Si la respuesta es directamente un array
    if (Array.isArray(data)) {
      console.log(`Datos cargados desde JSONBin: ${data.length} registros`);
      return data as EvaluacionData[];
    }

    console.log('Formato de datos no reconocido en JSONBin:', data);
    return null;
  } catch (error) {
    console.error('Error al cargar desde JSONBin:', error);
    return null;
  }
}

/**
 * Verifica si JSONBin está configurado
 */
export function isJSONBinConfigured(): boolean {
  return !!JSONBIN_BIN_ID && JSONBIN_BIN_ID !== 'default-bin-id';
}

