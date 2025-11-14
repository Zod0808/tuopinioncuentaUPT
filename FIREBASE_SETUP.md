# Configuración de Firebase para Compartir Datos

Para que los datos sean accesibles desde cualquier computadora que acceda al enlace, necesitas configurar Firebase Firestore.

## Pasos para Configurar Firebase

### 1. Crear un Proyecto en Firebase

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Haz clic en "Agregar proyecto" o selecciona un proyecto existente
3. Sigue las instrucciones para crear el proyecto

### 2. Habilitar Firestore

1. En el panel de Firebase, ve a "Firestore Database"
2. Haz clic en "Crear base de datos"
3. Selecciona "Comenzar en modo de prueba" (para desarrollo)
4. Elige una ubicación para tu base de datos
5. Haz clic en "Habilitar"

### 3. Configurar Reglas de Seguridad

Para que cualquiera pueda leer y escribir (modo público):

1. Ve a "Firestore Database" > "Reglas"
2. Reemplaza las reglas con:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /evaluaciones/{document=**} {
      allow read, write: if true;
    }
  }
}
```

⚠️ **Nota de Seguridad**: Estas reglas permiten que cualquiera pueda leer y escribir. Para producción, deberías implementar autenticación.

### 4. Obtener las Credenciales

1. Ve a "Configuración del proyecto" (ícono de engranaje)
2. Desplázate hasta "Tus aplicaciones"
3. Haz clic en el ícono de web (</>)
4. Registra tu app con un nombre (ej: "Sistema Evaluación")
5. Copia las credenciales que aparecen

### 5. Configurar Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto (si no existe)
2. Agrega las siguientes variables con tus credenciales:

```env
VITE_FIREBASE_API_KEY=tu_api_key_aqui
VITE_FIREBASE_AUTH_DOMAIN=tu-proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu-proyecto-id
VITE_FIREBASE_STORAGE_BUCKET=tu-proyecto.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abcdef
```

### 6. Reiniciar el Servidor

Después de agregar las variables de entorno:

```bash
npm run dev
```

## Funcionamiento

Una vez configurado:

- ✅ Los datos se guardan automáticamente en Firestore
- ✅ Cualquiera que acceda al enlace verá los mismos datos
- ✅ Los cambios se sincronizan en tiempo real
- ✅ localStorage se usa como backup local

## Sin Firebase

Si no configuras Firebase, el sistema seguirá funcionando pero:
- Los datos solo se guardarán localmente (localStorage)
- No se compartirán entre computadoras
- Cada usuario verá solo sus propios datos

## Plan Gratuito de Firebase

Firebase ofrece un plan gratuito generoso que incluye:
- 1 GB de almacenamiento
- 10 GB de transferencia al mes
- 50,000 lecturas diarias
- 20,000 escrituras diarias

Esto es más que suficiente para la mayoría de casos de uso.

