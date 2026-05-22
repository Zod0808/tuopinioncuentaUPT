# Tu Opinión Cuenta — Sistema de Evaluación Académica UPT

Sistema web para la gestión, análisis y reporte de evaluaciones docentes de la **Universidad Privada de Tacna**. Permite importar datos desde Excel, generar reportes interactivos por ciclo académico y comparar el desempeño histórico entre semestres.

---

## Características principales

| Módulo | Descripción |
|--------|-------------|
| **Autenticación** | Login y registro por correo/contraseña vía Supabase. Cada usuario gestiona sus propios datos. |
| **Importación Excel** | Carga archivos `.xlsx`/`.xls` con confirmación de ciclo antes de importar. |
| **Ingreso manual** | Formulario completo para agregar registros individuales. |
| **Gestión de ciclos** | Soporte para todos los ciclos desde 2018-I hasta 2026-II con cambio en tiempo real. |
| **Reportes del ciclo** | 9 tipos de reporte interactivos: general, por facultad, por carrera, resumen docente y calificación. |
| **Comparativa histórica** | Gráficos y tabla comparativa entre todos los ciclos ingresados (tendencia, distribución, AE01-04). |
| **Exportación PDF** | Generación de reportes completos en PDF con tablas y gráficos. |
| **Análisis IA** | Interpretación automática de gráficos usando OpenAI (opcional). |
| **Persistencia en la nube** | Datos guardados en Supabase, accesibles desde cualquier computadora de la oficina. |

---

## Tecnologías

- **React 18** + **TypeScript** — UI
- **Vite** — bundler y servidor de desarrollo
- **Supabase** — autenticación y base de datos PostgreSQL
- **Chart.js** + **react-chartjs-2** — gráficos interactivos
- **jsPDF** + **jspdf-autotable** + **html2canvas** — exportación a PDF
- **OpenAI API** — análisis e interpretación con IA (opcional)
- **read-excel-file** — importación de archivos Excel
- **Lucide React** — iconografía

---

## Instalación y configuración

### 1. Clonar e instalar dependencias

```bash
git clone <url-del-repositorio>
cd tuopinioncuentaUPT
npm install
```

### 2. Configurar Supabase (obligatorio para persistencia)

#### 2.1 Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea un proyecto gratuito.
2. En **SQL Editor → New Query**, ejecuta el contenido de `supabase_setup.sql`:

```sql
create table if not exists evaluaciones_data (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users(id) on delete cascade not null,
  ciclo       text        not null,
  datos       jsonb       default '[]'::jsonb not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  unique(user_id, ciclo)
);

alter table evaluaciones_data enable row level security;

create policy "ver_propios_datos"    on evaluaciones_data for select using (auth.uid() = user_id);
create policy "insertar_propios_datos" on evaluaciones_data for insert with check (auth.uid() = user_id);
create policy "actualizar_propios_datos" on evaluaciones_data for update using (auth.uid() = user_id);
create policy "eliminar_propios_datos"   on evaluaciones_data for delete using (auth.uid() = user_id);

create index if not exists idx_evaluaciones_user_ciclo on evaluaciones_data(user_id, ciclo);
```

#### 2.2 Obtener credenciales

En Supabase → **Project Settings → API**:
- `Project URL` → `VITE_SUPABASE_URL`
- `anon public` key → `VITE_SUPABASE_ANON_KEY`

Las credenciales ya están configuradas en `src/services/supabaseService.ts`. Para usar las tuyas propias, edita el archivo `.env.local`:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

> La clave `anon` es pública por diseño; la seguridad la garantizan las políticas RLS de la tabla.

#### 2.3 Confirmación de email (opcional)

Para que los usuarios accedan sin confirmar correo (útil en entornos de oficina):
Supabase → **Authentication → Settings** → desactivar *"Enable email confirmations"*.

### 3. Configurar OpenAI (opcional)

Solo necesario para interpretaciones automáticas de gráficos con IA:

```env
VITE_OPENAI_API_KEY=sk-...
```

Sin esta clave el sistema funciona completo; los reportes mostrarán interpretaciones genéricas.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

Abre `http://localhost:5173` en el navegador.

---

## Uso del sistema

### Primer acceso

1. Haz clic en **Iniciar Sesión** (barra de navegación, esquina derecha).
2. Selecciona la pestaña **Registrarse** e ingresa correo y contraseña (mín. 6 caracteres).
3. Si la confirmación de email está activa, revisa tu correo antes de ingresar.

### Importar datos desde Excel

1. Ve a **Ingreso de Datos** → sección *Importar Datos desde Excel*.
2. Arrastra el archivo o haz clic para seleccionarlo.
3. El sistema analiza el archivo y muestra el **panel de confirmación**:
   - Número de registros encontrados
   - Selector de ciclo (preseleccionado con el ciclo activo)
4. Elige el ciclo correcto y haz clic en **Importar**.
5. Los datos se guardan automáticamente en Supabase bajo tu usuario y ciclo.

#### Formato del Excel requerido

| Columna | Descripción |
|---------|-------------|
| Facultad | Nombre de la facultad |
| Carrera Profesional | Nombre de la carrera |
| Docente | Nombre completo del docente |
| Curso | Nombre del curso |
| Sección | Sección |
| Calificación | DESTACADO / BUENO / ACEPTABLE / REGULAR / DEFICIENTE |
| AE-01 | Calidad del sílabo (0–20) |
| AE-02 | Proceso enseñanza-aprendizaje (0–20) |
| AE-03 | Aplicación de la evaluación (0–20) |
| AE-04 | Formación actitudinal (0–20) |
| Nota | Promedio (se calcula automáticamente si está vacío) |
| Encuestados | Nº estudiantes encuestados |
| No Encuestados | Nº estudiantes no encuestados |
| Validez | Válido / Inválido |

### Cambiar de ciclo

El selector de ciclo aparece en la barra de navegación (solo cuando hay sesión activa). Al cambiar de ciclo:
- Los datos actuales se guardan en la nube.
- Se cargan los datos del ciclo destino desde Supabase.

Ciclos disponibles: `2018-I` al `2026-II`. También puedes escribir un ciclo personalizado con la opción *"+ Otro ciclo..."*.

### Ver reportes del ciclo

Ve a **Ver Reportes** → pestaña **Reportes del Ciclo**. Incluye 9 vistas:

| Reporte | Contenido |
|---------|-----------|
| General Universidad | Estadísticas globales, gráficos institucionales |
| Por Facultad | Desglose por facultad con tablas detalladas |
| Por Carrera | Análisis por carrera profesional |
| Resumen Docente por Carrera | Ranking y detalle por docente y carrera |
| Resumen Docente por Facultad | Ranking por facultad |
| Resumen Docente Institucional | Vista consolidada institucional |
| Calificación por Carrera | Distribución DESTACADO–DEFICIENTE por carrera |
| Calificación por Facultad | Distribución por facultad |
| Calificación Institucional | Distribución global |

### Comparativa entre ciclos

**Ver Reportes** → pestaña **Comparativa entre Ciclos**.

Carga automáticamente todos los ciclos del usuario desde Supabase y muestra:

- **4 tarjetas resumen**: ciclos con datos, docentes evaluados (total histórico), nota promedio histórica, total de encuestados.
- **Tendencia de nota promedio** (gráfico de línea con todos los ciclos).
- **Nota promedio por ciclo** (barras).
- **Docentes evaluados por ciclo** (barras).
- **Distribución de calificaciones** (barras apiladas por ciclo).
- **Promedios AE-01 al AE-04** por ciclo (barras agrupadas).
- **Tabla comparativa completa** con todas las métricas, ciclo actual resaltado.

### Exportar a PDF

Desde cualquier reporte del ciclo, busca el botón **Exportar PDF**. El PDF incluye tablas, gráficos e interpretaciones (con IA si está configurada).

---

## Estructura del proyecto

```
tuopinioncuentaUPT/
├── public/
├── src/
│   ├── components/
│   │   ├── AuthModal.tsx              # Modal login/registro
│   │   ├── Navigation.tsx             # Barra de navegación con usuario y ciclo
│   │   ├── DataEntryView.tsx          # Vista principal de ingreso
│   │   ├── DataInput.tsx              # Formulario manual
│   │   ├── DataTable.tsx              # Tabla de registros
│   │   ├── ExcelImporter.tsx          # Importador Excel con confirmación de ciclo
│   │   ├── DataExporter.tsx           # Exportador JSON
│   │   ├── Charts.tsx                 # Gráficos básicos
│   │   ├── ReportsView.tsx            # Vista de reportes (ciclo + comparativa)
│   │   ├── ReportsTabs.tsx            # Tabs de los 9 reportes del ciclo
│   │   ├── ComparativaCiclos.tsx      # Comparativa histórica entre ciclos
│   │   ├── ReporteGeneralUniversidad.tsx
│   │   ├── ReportePorFacultad.tsx
│   │   ├── ReportePorCarrera.tsx
│   │   ├── ResumenDocentePorCarrera.tsx
│   │   ├── ResumenDocentePorFacultad.tsx
│   │   ├── ResumenDocenteInstitucional.tsx
│   │   ├── ReporteCalificacionPorCarrera.tsx
│   │   ├── ReporteCalificacionPorFacultad.tsx
│   │   ├── ReporteCalificacionInstitucional.tsx
│   │   ├── InstitutionalReports.tsx
│   │   ├── FacultyReports.tsx
│   │   └── ReportGenerator.tsx
│   ├── services/
│   │   ├── supabaseService.ts         # Auth + CRUD de datos por ciclo/usuario
│   │   ├── openaiService.ts           # Interpretaciones con IA (opcional)
│   │   ├── pdfService.ts              # Generación de PDF
│   │   ├── firebaseService.ts         # Legado (no activo)
│   │   └── jsonbinService.ts          # Legado (no activo)
│   ├── types/
│   │   └── index.ts                   # Tipos TypeScript (EvaluacionData, etc.)
│   ├── App.tsx                        # Componente raíz, estado global
│   ├── App.css                        # Estilos globales
│   ├── main.tsx                       # Punto de entrada
│   └── vite-env.d.ts
├── supabase_setup.sql                 # Script SQL para crear la tabla en Supabase
├── .env.local                         # Variables de entorno (no se sube a git)
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia el servidor de desarrollo en `localhost:5173` |
| `npm run build` | Compila TypeScript y genera el bundle de producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción localmente |
| `npm run lint` | Ejecuta ESLint sobre los archivos TS/TSX |

---

## Variables de entorno

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `VITE_SUPABASE_URL` | Sí* | URL del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Sí* | Clave pública anon de Supabase |
| `VITE_OPENAI_API_KEY` | No | API key de OpenAI para interpretaciones IA |

> *Las credenciales de Supabase ya están embebidas en `supabaseService.ts` como valores por defecto para que el sistema funcione sin archivo `.env.local`. Crea el archivo solo si quieres apuntar a tu propio proyecto Supabase.

---

## Historial de versiones

| Versión | Descripción |
|---------|-------------|
| 1.0.11 | Selección de ciclo al importar + comparativa histórica entre ciclos |
| 1.0.10 | Login, registro y persistencia en Supabase |
| 1.0.9 | Cálculo manual de aspectos evaluados |
| 1.0.8 | Mejora de reportes de docentes |
| 1.0.7 | Mejora de reportes generales |
| 1.0.6 | Optimización de gestión de tablas |
| 1.0.5 | Carga de datos en la nube (Firebase/JSONBin) |
| 1.0.4 | Distribución por calificación |
| 1.0.3 | Exportación de reportes PDF |
| 1.0.2 | Resumen docente por facultad y carrera |
| 1.0.1 | Mejoras para despliegue en Vercel |
| 1.0.0 | Versión inicial — reporte por docente |

---

## Licencia

Proyecto desarrollado para uso interno de la **Universidad Privada de Tacna**.  
&copy; 2026 — Sistema de Evaluación Académica *Tu Opinión Cuenta*.
