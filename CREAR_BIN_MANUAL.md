# Cómo Crear un Bin en JSONBin.io Manualmente

## Pasos Rápidos

1. **Ve a JSONBin.io**
   - Abre [https://jsonbin.io/](https://jsonbin.io/)
   - Inicia sesión con tu cuenta

2. **Crear un nuevo Bin**
   - Haz clic en "Create Bin" o "New Bin"
   - En el contenido, pega esto:
     ```json
     {
       "datos": [],
       "lastUpdated": "",
       "totalRecords": 0
     }
     ```
   - O simplemente deja `{}` (objeto vacío)
   - Haz clic en "Create" o "Save"

3. **Obtener el Bin ID**
   - Después de crear el Bin, verás el Bin ID en la URL o en la información del Bin
   - El Bin ID es una cadena de caracteres alfanuméricos (ejemplo: `65a1b2c3d4e5f6g7h8i9j0k`)
   - **NO es el Account ID** - el Account ID es diferente

4. **Actualizar el archivo .env**
   - Abre el archivo `.env` en la raíz del proyecto
   - Actualiza la línea:
     ```env
     VITE_JSONBIN_BIN_ID=tu_bin_id_aqui
     ```
   - Reemplaza `tu_bin_id_aqui` con el Bin ID que copiaste

5. **Reiniciar el servidor**
   ```bash
   npm run dev
   ```

## Diferencia entre Account ID y Bin ID

- **Account ID**: Identifica tu cuenta (ej: `69174971683a4a9e0657bd`)
- **Bin ID**: Identifica un contenedor específico de datos (ej: `65a1b2c3d4e5f6g7h8i9j0k`)

Necesitas el **Bin ID**, no el Account ID.

## Alternativa: Creación Automática

Si prefieres, el sistema puede crear el Bin automáticamente:
1. Deja el Bin ID vacío o con un valor inválido en el `.env`
2. El sistema creará un nuevo Bin cuando guardes datos
3. Revisa la consola del navegador para ver el nuevo Bin ID
4. Actualiza el `.env` con el nuevo Bin ID

