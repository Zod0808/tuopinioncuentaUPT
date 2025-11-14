# Configuración de JSONBin.io para Compartir Datos

JSONBin.io es una alternativa más simple que Firebase para almacenar y compartir datos JSON en la nube.

## ¿Por qué JSONBin.io?

✅ **Más simple**: Solo necesitas 2 valores (Bin ID y API Key)  
✅ **Gratuito**: Plan gratuito generoso  
✅ **Sin configuración compleja**: No necesitas configurar reglas de seguridad  
✅ **Lectura pública**: Cualquiera puede leer los datos sin autenticación  
✅ **Rápido**: API simple y directa  

## Pasos para Configurar

### 1. Crear una Cuenta

1. Ve a [JSONBin.io](https://jsonbin.io/)
2. Haz clic en "Sign Up" para crear una cuenta gratuita
3. Confirma tu email si es necesario

### 2. Crear un Bin

1. Una vez dentro, haz clic en "Create Bin"
2. Puedes dejar el contenido vacío o poner `{"datos": []}`
3. Haz clic en "Create"
4. **IMPORTANTE**: Copia el **Bin ID** que aparece (ej: `65a1b2c3d4e5f6g7h8i9j0k`)

### 3. Obtener tu API Key

1. Ve a tu perfil/configuración en JSONBin.io
2. Busca la sección "API Keys" o "Access Keys"
3. Copia tu **Master Key** o crea una nueva

### 4. Configurar Variables de Entorno

1. Crea un archivo `.env` en la raíz del proyecto (si no existe)
2. Agrega las siguientes variables:

```env
VITE_JSONBIN_BIN_ID=tu_bin_id_aqui
VITE_JSONBIN_API_KEY=tu_api_key_aqui
```

**Ejemplo:**
```env
VITE_JSONBIN_BIN_ID=65a1b2c3d4e5f6g7h8i9j0k
VITE_JSONBIN_API_KEY=$2b$10$abcdefghijklmnopqrstuvwxyz123456
```

### 5. Reiniciar el Servidor

```bash
npm run dev
```

## Funcionamiento

Una vez configurado:

- ✅ Los datos se guardan automáticamente en JSONBin
- ✅ Cualquiera que acceda al enlace verá los mismos datos
- ✅ Los cambios se sincronizan automáticamente
- ✅ localStorage se usa como backup local

## Plan Gratuito de JSONBin.io

El plan gratuito incluye:
- 10,000 requests por mes
- 1 GB de almacenamiento
- Lectura pública ilimitada
- API Key para escritura

## Seguridad

**Nota**: Con esta configuración, cualquiera puede **leer** los datos (no requiere autenticación), pero solo tú puedes **escribir** (con tu API Key).

Si necesitas más seguridad, considera usar Firebase con autenticación.

## Solución de Problemas

### Error 401 (Unauthorized)
- Verifica que tu API Key sea correcta
- Asegúrate de usar la "Master Key" o una key con permisos de escritura

### Error 404 (Not Found)
- Verifica que el Bin ID sea correcto
- Asegúrate de que el Bin existe en tu cuenta

### Los datos no se comparten
- Verifica que las variables de entorno estén correctamente configuradas
- Reinicia el servidor después de cambiar el `.env`
- Revisa la consola del navegador para ver errores

## Alternativa: Firebase

Si prefieres usar Firebase (más potente pero más complejo), consulta `FIREBASE_SETUP.md`.

