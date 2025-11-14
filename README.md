# Sistema de Evaluación Académica

Sistema completo para la gestión de datos de evaluación académica, generación de gráficos, análisis con IA y exportación de reportes en PDF.

## Características

- ✅ **Ingreso de Datos**: Formulario completo para registrar evaluaciones académicas
- ✅ **Visualización de Datos**: Tabla interactiva con todos los registros
- ✅ **Gráficos Dinámicos**: 4 tipos de gráficos (Barras, Líneas, Pie, Doughnut)
- ✅ **Análisis con IA**: Interpretación automática de gráficos usando OpenAI
- ✅ **Exportación a PDF**: Generación de reportes completos en formato PDF
- ✅ **Almacenamiento Local**: Los datos se guardan automáticamente en el navegador

## Tecnologías Utilizadas

- **React 18** + **TypeScript**
- **Vite** - Build tool
- **Chart.js** + **react-chartjs-2** - Gráficos
- **jsPDF** + **jspdf-autotable** + **html2canvas** - Generación de PDF
- **OpenAI API** - Análisis e interpretación con IA
- **Lucide React** - Iconos

## Instalación

1. Clona o descarga el proyecto
2. Instala las dependencias:

```bash
npm install
```

3. Configura la API key de OpenAI (opcional):

Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_OPENAI_API_KEY=tu_api_key_aqui
```

> **Nota**: Si no configuras la API key, el sistema funcionará pero usará interpretaciones genéricas en lugar de análisis con IA.

4. Inicia el servidor de desarrollo:

```bash
npm run dev
```

5. Abre tu navegador en `http://localhost:5173`

## Uso

### 1. Ingresar Datos

- Haz clic en "Nuevo Registro"
- Completa el formulario con los datos de evaluación
- La nota se calcula automáticamente como promedio de los 4 AE
- Haz clic en "Agregar Registro"

### 2. Visualizar Datos

- Los datos aparecen automáticamente en la tabla
- Puedes eliminar registros haciendo clic en el icono de basura

### 3. Ver Gráficos

- Los gráficos se generan automáticamente cuando hay datos
- 4 tipos de gráficos:
  - **Nota Promedio por Curso** (Barras)
  - **Distribución de Calificaciones** (Pie)
  - **Promedio AE por Docente** (Líneas)
  - **Encuestados vs No Encuestados** (Doughnut)

### 4. Generar Reporte PDF

- Haz clic en "Generar Reporte PDF"
- El sistema generará interpretaciones automáticas de los gráficos (si tienes API key configurada)
- Se descargará un PDF completo con:
  - Tabla de datos
  - Todos los gráficos
  - Interpretaciones de cada gráfico

## Estructura del Proyecto

```
src/
├── components/
│   ├── DataInput.tsx      # Formulario de ingreso de datos
│   ├── DataTable.tsx      # Tabla de datos
│   ├── Charts.tsx         # Componentes de gráficos
│   └── ReportGenerator.tsx # Generador de reportes PDF
├── services/
│   ├── openaiService.ts   # Servicio de OpenAI para interpretaciones
│   └── pdfService.ts      # Servicio de generación de PDF
├── types/
│   └── index.ts           # Tipos TypeScript
├── App.tsx                # Componente principal
├── App.css                # Estilos principales
├── main.tsx               # Punto de entrada
└── index.css              # Estilos globales
```

## Configuración de OpenAI

Para obtener una API key de OpenAI:

1. Ve a [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Crea una cuenta o inicia sesión
3. Genera una nueva API key
4. Cópiala y pégala en el archivo `.env`

**Importante**: La API key tiene costos asociados. El sistema usa el modelo `gpt-4o-mini` que es económico, pero revisa los precios en la página de OpenAI.

## Scripts Disponibles

- `npm run dev` - Inicia el servidor de desarrollo
- `npm run build` - Construye la aplicación para producción
- `npm run preview` - Previsualiza la build de producción
- `npm run lint` - Ejecuta el linter

## Características Avanzadas

### Interpretación Automática con IA

El sistema analiza cada gráfico y genera interpretaciones concisas que incluyen:
- Descripción de lo que muestra el gráfico
- Hallazgos principales
- Conclusiones relevantes

### Exportación a PDF

El PDF generado incluye:
- Encabezado con título y fecha
- Tabla completa de datos
- Todos los gráficos en alta calidad
- Interpretaciones de cada gráfico

## Notas Importantes

- Los datos se guardan automáticamente en el `localStorage` del navegador
- Si no configuras la API key de OpenAI, el sistema funcionará con interpretaciones genéricas
- Los gráficos se capturan como imágenes para incluirlos en el PDF
- El sistema es completamente responsive y funciona en dispositivos móviles

## Licencia

Este proyecto es de uso educativo.

## Soporte

Para problemas o preguntas, revisa la documentación de las librerías utilizadas o crea un issue en el repositorio.

