# Tu Opinión Cuenta — Sistema de Evaluación de la Calidad Educativa UPT

Aplicación web institucional para la **Oficina de Gestión de Procesos Académicos y Docente (GPAD)** de la **Universidad Privada de Tacna**. Automatiza la totalidad del ciclo de evaluación docente: importación de encuestas desde Excel, validación por reglas de negocio, generación de reportes interactivos, publicación pública, informe final institucional en DOCX y los reportes por facultad exigidos por FAEDCOH.

> **Versión actual:** `2.5.4.2` — **Período por defecto:** `2025-II` — **Stack:** React 18 · TypeScript 5 · Vite 7 · Supabase.

---

## 1. Descripción funcional

El sistema reemplaza el proceso manual de tabulación y redacción del informe *Tu Opinión Cuenta* consolidando en una sola herramienta:

- Ingesta de datos (Excel oficial y matriculados) con sanitización y validación en origen.
- Reglas de calidad de datos verificables y auditables (quórum, exclusiones, participación mínima).
- 9 reportes interactivos por ciclo + comparativa histórica entre todos los ciclos cargados.
- **Informe Final Institucional** completo en formato DOCX oficial (portada, secciones 1–5, tablas, gráficos e interpretaciones automáticas).
- **Módulo FAEDCOH**: los 6 reportes normativos por facultad y carrera en PDF y XLSX con formato condicional.
- **Alertas automáticas** de docentes insatisfactorios y muestras insuficientes.
- **Recomendaciones asistidas por IA** (OpenAI) sobre los resultados del ciclo.
- **Publicación pública** de reportes por ciclo para consulta institucional sin autenticación.

---

## 2. Stack técnico

| Capa | Tecnología |
|------|-----------|
| UI | React 18 · TypeScript 5 · Vite 7 |
| Estado | Hooks nativos + estado elevado en `App.tsx` |
| Autenticación / BD | Supabase (PostgreSQL + Row Level Security) |
| Gráficos | Chart.js 4 · react-chartjs-2 |
| Exportación PDF | jsPDF · jspdf-autotable · html2canvas |
| Exportación DOCX | docx 9 · file-saver |
| Exportación XLSX | SheetJS (`xlsx`) con formato condicional |
| Lectura de Excel | `read-excel-file` |
| IA (opcional) | OpenAI SDK 4 (`gpt-4o-mini`) — endpoints serverless `api/recommend.ts` y `api/interpret.ts` |
| Despliegue | Vercel (`vercel.json`) |

---

## 3. Arquitectura y estructura del proyecto

```
tuopinioncuentaUPT/
├── api/
│   └── recommend.ts                    # Endpoint serverless para IA (Vercel Functions)
├── bd/
│   └── supabase_setup.sql              # Esquema, RLS y políticas de Supabase
├── data/
│   └── tu_opinion_cuenta_2025-II.xlsx  # Dataset de referencia
├── docs/                               # Especificaciones e informe final oficial (PDF)
├── manual/                             # Manuales de instalación
├── public/, images/                    # Assets institucionales UPT
├── src/
│   ├── App.tsx                         # Composición raíz, estado global, ruteo de vistas
│   ├── main.tsx                        # Punto de entrada
│   ├── config/
│   │   └── universityStructure.ts      # Fuente única de verdad: facultades, carreras,
│   │                                   #   escala de calificación, AE, QUÓRUM_MÍNIMO,
│   │                                   #   PERIODO_ACADÉMICO
│   ├── types/
│   │   └── index.ts                    # EvaluacionData, tipos compartidos
│   ├── components/                     # 27 componentes React
│   │   ├── AuthModal.tsx               # Login / registro Supabase
│   │   ├── Navigation.tsx              # Barra superior, selector de ciclo
│   │   ├── DataEntryView.tsx           # Vista de ingreso (Excel + manual + tabla)
│   │   ├── ExcelImporter.tsx           # Parseo + sanitización + confirmación de ciclo
│   │   ├── MatriculadosImporter.tsx    # Carga de padrón de matriculados por sección
│   │   ├── DataInput.tsx               # Formulario manual
│   │   ├── DataTable.tsx               # Tabla editable con badges de calificación
│   │   ├── DataExporter.tsx            # Backup JSON
│   │   ├── GestionDatosPanel.tsx       # Borrado por ciclo, publicación pública
│   │   ├── ReportsView.tsx             # Contenedor de reportes del ciclo
│   │   ├── ReportsTabs.tsx             # Tabs de los 9 reportes + FAEDCOH
│   │   ├── ComparativaCiclos.tsx       # Comparativa histórica multi-ciclo
│   │   ├── Charts.tsx                  # Wrappers de Chart.js
│   │   ├── ReporteGeneralUniversidad.tsx
│   │   ├── ReportePorFacultad.tsx
│   │   ├── ReportePorCarrera.tsx
│   │   ├── ResumenDocenteInstitucional.tsx
│   │   ├── ResumenDocentePorFacultad.tsx
│   │   ├── ResumenDocentePorCarrera.tsx
│   │   ├── ReporteCalificacionInstitucional.tsx
│   │   ├── ReporteCalificacionPorFacultad.tsx
│   │   ├── ReporteCalificacionPorCarrera.tsx
│   │   ├── InstitutionalReports.tsx
│   │   ├── FacultyReports.tsx
│   │   ├── ReportGenerator.tsx
│   │   ├── AlertasAutomaticas.tsx      # Detección de docentes insatisfactorios (n≥3)
│   │   ├── InformeFinalView.tsx        # Vista del Informe Final Institucional
│   │   ├── ExportacionFAEDCOH.tsx      # Panel FAEDCOH (6 reportes PDF/Excel)
│   │   └── RecomendacionesIAView.tsx   # Análisis con OpenAI
│   ├── services/
│   │   ├── supabaseService.ts          # Auth + CRUD por (user_id, ciclo) + publicación
│   │   ├── reportCalculations.ts       # Núcleo de cálculo: KPIs, exclusiones, quórum
│   │   ├── excelService.ts             # XLSX con formato condicional (6 reportes FAEDCOH)
│   │   ├── pdfService.ts               # PDFs reporte I–VI + reportes del ciclo
│   │   ├── docxReportService.ts        # Informe Final DOCX + 4 reportes por facultad
│   │   ├── matriculadosService.ts      # Padrón de matriculados por sección
│   │   └── openaiService.ts            # Cliente del endpoint /api/interpret
│   └── ai/
│       ├── recommendations.ts          # Prompts y llamadas al endpoint /api/recommend
│       └── types.ts
├── vercel.json                         # Configuración de despliegue
├── vite.config.ts
├── tsconfig.json
├── package.json
└── .env.local                          # Variables de entorno (no commitear)
```

---

## 4. Reglas de negocio implementadas

### 4.1 Escala de calificación (spec oficial jun-2026)

| Categoría | Rango de nota | Color |
|-----------|--------------|-------|
| DESTACADO | 17.1 – 20.0 | `#276749` (verde) |
| BUENO | 15.1 – 17.0 | `#2b6cb0` (azul) |
| ACEPTABLE | 11.0 – 15.0 | `#c05621` (naranja) |
| INSATISFACTORIO | ≤ 10.9 | `#c53030` (rojo) |

La función canónica es `calcularCalificacion(nota)` en `src/config/universityStructure.ts`. Ningún componente calcula la calificación por su cuenta — se eliminaron las 5 funciones duplicadas históricas.

### 4.2 Quórum mínimo de encuestados (Brecha B)

- Constante `QUORUM_MINIMO_ENCUESTADOS = 3` (`universityStructure.ts`).
- Docentes con `n < 3` **no** generan alertas de riesgo; se reportan como *informativos* en `AlertasAutomaticas.tsx`.
- `excelService.exportarReporteII` y `pdfService.generarPDFReporteII` separan las secciones con quórum y sub-quórum en hojas/secciones distintas.

### 4.3 Exclusiones auditables (Brecha A)

- `reportCalculations.DatosCarrera` expone `seccionesTotales`, `seccionesExcluidas`, `exclusionDetalle: { sinDatos, bajaParticipacion }`.
- `getExclusionReason(r)` excluye cualquier registro con `encuestados === 0` (antes solo si ambos eran 0), evitando falsos positivos como `nota=0 → BUENO`.
- `InformeFinalView.tsx` sección 3.3.2 y `ExportacionFAEDCOH.tsx` reporte IV imprimen un **banner de auditoría** con el universo real vs. válido.

### 4.4 Desambiguación terminológica (Brecha C)

- `EvaluacionData.encuestados` = **interacciones por sección** (JSDoc documentado).
- `MatriculadosEntry.totalEncuestados` = alumnos únicos.
- En UI: "Resp. Enc." (DataTable), "Alumnos Encuestados" (Informe Final), "Resp. de Encuesta (Interacciones)" (FAEDCOH V y VI).

### 4.5 Reglas de display

`resolverCalDisplay(r)` es la función canónica para el badge de calificación en UI y DOCX. Prioridad:

1. `encuestados === 0` → **Sin Datos** (gris).
2. `nota === 0` → **Sin Evaluar** (gris).
3. Baja participación (< 50 %) → **Baja Part.** (morado).
4. Calificación calculada por `calcularCalificacion(nota)`.

### 4.6 Umbrales operativos

- **Participación mínima válida:** 50 % (actualizado desde 30 % en jun-2026).
- **Muestra insuficiente:** `encuestados < 15 %` del total de la sección → marca `[!]` en el Reporte II y semáforo amarillo.
- **Semáforo de participación (reportes V y VI):** rojo `< 70 %`, amarillo `70–85 %`, verde `> 85 %`.

---

## 5. Módulos funcionales

### 5.1 Autenticación (`AuthModal.tsx` + `supabaseService.ts`)

Registro y login por correo/contraseña vía Supabase Auth. Cada usuario tiene su propia partición de datos por `(user_id, ciclo)` gobernada por Row Level Security.

### 5.2 Ingreso de datos (`DataEntryView.tsx`)

- **Importación Excel** — `ExcelImporter.tsx` parsea `.xlsx/.xls`, sanitiza nombres de docente con `limpiarTexto` (elimina prefijos sucios como `"ERCILLA -, VICTOR"`), calcula la calificación con `calcularCalificacion(nota)` (sin fallback duro a `"BUENO"`), y muestra un panel de confirmación con selector de ciclo antes de persistir.
- **Ingreso manual** — `DataInput.tsx`.
- **Importación de matriculados** — `MatriculadosImporter.tsx` + `matriculadosService.ts`: carga el padrón oficial por sección para calcular participación real.
- **Tabla editable** — `DataTable.tsx` con badges por `resolverCalDisplay`.
- **Backup / restore** — `DataExporter.tsx` (JSON), `GestionDatosPanel.tsx` (borrado por ciclo).

### 5.3 Reportes del ciclo (`ReportsTabs.tsx`)

| # | Reporte | Componente |
|---|---------|------------|
| 1 | General Universidad | `ReporteGeneralUniversidad.tsx` |
| 2 | Por Facultad | `ReportePorFacultad.tsx` |
| 3 | Por Carrera | `ReportePorCarrera.tsx` |
| 4 | Resumen Docente Institucional | `ResumenDocenteInstitucional.tsx` |
| 5 | Resumen Docente por Facultad | `ResumenDocentePorFacultad.tsx` |
| 6 | Resumen Docente por Carrera | `ResumenDocentePorCarrera.tsx` |
| 7 | Calificación Institucional | `ReporteCalificacionInstitucional.tsx` |
| 8 | Calificación por Facultad | `ReporteCalificacionPorFacultad.tsx` |
| 9 | Calificación por Carrera | `ReporteCalificacionPorCarrera.tsx` |

Cada reporte expone exportación PDF con `pdfService.ts` (jsPDF + autotable) y nombre de archivo dinámico por ciclo/facultad/carrera.

### 5.4 Comparativa histórica (`ComparativaCiclos.tsx`)

Carga todos los ciclos del usuario y muestra:

- 4 tarjetas KPI (ciclos con datos, docentes evaluados, nota promedio histórica, total encuestados).
- Tendencia de nota promedio (línea).
- Nota promedio y docentes evaluados por ciclo (barras).
- Distribución de calificaciones (barras apiladas por ciclo).
- Promedios AE-01 a AE-04 por ciclo (barras agrupadas).
- Tabla comparativa completa con el ciclo actual resaltado.

### 5.5 Informe Final Institucional (`InformeFinalView.tsx` + `docxReportService.ts`)

Genera el DOCX oficial con:

- **Portada** con logotipo UPT y unidad "Oficina de Gestión de Procesos Académicos y Docente".
- **Sección 1 — Introducción** (1.1 a 1.7).
- **Sección 3.1** Participación institucional (tabla + pie `#1a365d`/`#c5a059` + interpretación).
- **Sección 3.2** Participación por facultad (tabla + pie + interpretación).
- **Sección 3.3.1** Aspectos evaluados institucional (tabla + interpretación automática mejor/peor aspecto).
- **Sección 3.3.2** Aspectos evaluados por carrera con **banner de auditoría** de secciones excluidas.
- **Sección 4** Indicador del Plan Estratégico (fila institucional = promedios reales).
- **Sección 5** Conclusiones y recomendaciones auto-generadas según umbrales.

**Reportes por facultad (4 documentos DOCX × 6 facultades = 24 archivos):**

1. `Reporte_Nro_Encuestados_por_Carrera_Profesional`.
2. `Reporte_Porcentaje_Juicio_Valor` (colores solo en BUENO y DESTACADO, columna `% BUENO + DESTACADO`, fila PROMEDIO ponderado).
3. `Reporte_Docentes_Insatisfactorios` (filas rojo claro `#FFB3B3`, filtro `nota ≤ 10.9 ∧ validez = Válido ∧ encuestados > 0`).
4. `Reporte_General_Evaluacion` (KPI de 3 columnas, tabla AE y escala de calificación al pie).

Todas las tablas usan 9 pt, aspect ratio circular en pies, y lógica automática de contraste texto blanco/negro por luminosidad de fondo.

**Botón "Exportar Base de Datos Plana (.xlsx)"** — llama a `exportarBaseDatos(datos)` para descargar el dataset completo con columna Carrera en cada fila.

### 5.6 Módulo FAEDCOH (`ExportacionFAEDCOH.tsx`)

Panel dedicado con filtros en cascada **Facultad → Carrera → Docente**, toggle **PDF ⇄ Excel**, y los 6 reportes normativos (`generarPDFReporteI`–`VI` y `exportarReporteI`–`VI`):

| # | Reporte | Filtros específicos |
|---|---------|---------------------|
| I | Cuadro resumen por carrera | — |
| II | Docentes insatisfactorios | `nota ≤ 10.9 ∧ validez = Válido ∧ encuestados > 0`, separa por quórum |
| III | Aspectos evaluados por carrera | Leyenda AE dinámica al pie |
| IV | Distribución de calificaciones | Banner de auditoría (universo real vs. válido) |
| V | Participación por carrera | Semáforo rojo/amarillo/verde |
| VI | Participación por docente | Semáforo + gráfico `html2canvas` |

Cada `.xlsx` incluye una **hoja "Info"** con `ID_Facultad`, `Nombre_Facultad`, `Carrera`, `Período`, `Fecha` y leyenda AE-01..AE-04 para permitir loops automatizados.

### 5.7 Alertas automáticas (`AlertasAutomaticas.tsx`)

Detecta docentes con calificación INSATISFACTORIO **con** quórum (`n ≥ 3`) y flag `esValidoParaReporte()`. Los casos sub-quórum se emiten como informativos (`tipo: 'info'`), no como alertas de riesgo.

### 5.8 Recomendaciones IA (`RecomendacionesIAView.tsx` + `api/recommend.ts`)

Dos endpoints serverless en `api/` (Vercel Functions) consumen OpenAI con la variable **server-side** `OPENAI_API_KEY` (nunca `VITE_*`, para que no se empaquete en el bundle del navegador):

- `api/recommend.ts` — resumen ejecutivo y recomendaciones institucionales del ciclo activo.
- `api/interpret.ts` — interpretaciones automáticas de gráficos individuales.

Módulo opcional — el sistema funciona sin la clave (usa interpretaciones genéricas de respaldo).

### 5.9 Publicación pública

`supabaseService.publishReport` / `loadPublicReport` / `getPublicCiclos` permiten publicar el ciclo para consulta anónima, sin exponer el resto de la partición del usuario.

---

## 6. Modelo de datos

### 6.1 Tabla `evaluaciones_data` (Supabase)

```sql
create table if not exists evaluaciones_data (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  ciclo text not null,
  datos jsonb default '[]'::jsonb not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, ciclo)
);

alter table evaluaciones_data enable row level security;

create policy "ver_propios_datos"       on evaluaciones_data for select using (auth.uid() = user_id);
create policy "insertar_propios_datos"  on evaluaciones_data for insert with check (auth.uid() = user_id);
create policy "actualizar_propios_datos" on evaluaciones_data for update using (auth.uid() = user_id);
create policy "eliminar_propios_datos"  on evaluaciones_data for delete using (auth.uid() = user_id);

create index if not exists idx_evaluaciones_user_ciclo on evaluaciones_data(user_id, ciclo);
```

Script completo en [`bd/supabase_setup.sql`](bd/supabase_setup.sql).

### 6.2 Formato del Excel de entrada

| Columna | Tipo / dominio |
|---------|---------------|
| Facultad | Texto |
| Carrera Profesional | Texto |
| Docente | Texto (se sanitiza en la importación) |
| Curso | Texto |
| Sección | Texto |
| Calificación | Se recalcula desde `nota` |
| AE-01 … AE-04 | Número 0–20 |
| Nota | Número 0–20 (se promedia desde AE si viene vacío) |
| Encuestados | Entero — respuestas de encuesta (interacciones) |
| No Encuestados | Entero |
| Validez | `Válido` / `Inválido` |

---

## 7. Instalación y ejecución

### 7.1 Requisitos

- Node.js ≥ 18
- Cuenta Supabase (gratuita) + proyecto propio
- (Opcional) API key de OpenAI

### 7.2 Clonar e instalar

```bash
git clone <url-del-repositorio>
cd tuopinioncuentaUPT
npm install
```

### 7.3 Provisionar Supabase

1. Crear proyecto en [supabase.com](https://supabase.com).
2. En **SQL Editor → New Query**, ejecutar `bd/supabase_setup.sql`.
3. En **Project Settings → API**, copiar `Project URL` y `anon public key`.

### 7.4 Variables de entorno (`.env.local`)

```env
VITE_SUPABASE_URL=https://<proyecto>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon_key>
# NOTA: OPENAI_API_KEY (sin prefijo VITE_) se configura solo en Vercel para las funciones serverless.
# NUNCA se define como VITE_OPENAI_API_KEY porque cualquier variable VITE_ termina embebida en el bundle público.
OPENAI_API_KEY=sk-...   # opcional, solo backend/Vercel
```

Las credenciales por defecto embebidas en `supabaseService.ts` permiten arrancar el sistema sin `.env.local`; sobrescríbelas para apuntar a tu propia instancia.

### 7.5 Scripts disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo Vite en `http://localhost:5173` |
| `npm run build` | `tsc` + `vite build` — genera `dist/` listo para producción |
| `npm run preview` | Sirve el bundle de producción localmente |
| `npm run lint` | ESLint sobre `.ts`/`.tsx` (0 warnings permitidos) |

### 7.6 Despliegue en Vercel

El proyecto incluye `vercel.json` y el endpoint serverless `api/recommend.ts`. Basta con conectar el repositorio a Vercel y configurar las variables de entorno del panel.

---

## 8. Historial de versiones (destacadas)

| Versión | Hito |
|---------|------|
| **2.5.4.2** | Ajustes finales del ciclo 2025-II |
| **2.5.x** | Publicación pública, endurecimiento de reglas de exclusión y semáforos |
| **2.3.x – 2.4.x** | Sanitización de nombres en importación, exportar BD plana desde Informe Final, `resolverCalDisplay` como única fuente de badge |
| **2.2.1.0** | Cierre de brechas de auditoría: quórum mínimo `n ≥ 3`, secciones excluidas declaradas, desambiguación "N° Encuestados" |
| **2.2.0.0** | Módulo Exportación FAEDCOH con 6 reportes PDF/Excel + formato condicional |
| **2.1.x** | Alertas automáticas, matriculados por sección, calificación centralizada en `universityStructure.ts` |
| **1.1.0 – 1.0.12** | Informe Final Institucional en DOCX, 4 reportes por facultad, tablas 9 pt, contraste automático de texto |
| **1.0.11** | Selección de ciclo al importar + comparativa histórica |
| **1.0.10** | Autenticación y persistencia en Supabase |
| **1.0.5 – 1.0.9** | Cálculo manual de AE, mejora de reportes, distribución por calificación |
| **1.0.0 – 1.0.4** | Versión inicial, reporte por docente, exportación PDF, resúmenes por facultad y carrera |

---

## 9. Créditos y licencia

- **Cliente:** Oficina de Gestión de Procesos Académicos y Docente (GPAD) — Universidad Privada de Tacna.
- **Desarrollo:** César Fabián Chávez Linares.
- **Período de servicio inicial documentado:** 22-05-2026 al 22-06-2026 (Informe N° 001-2026-GPAD-UPT).

Proyecto de **uso interno institucional**. Todos los derechos reservados © 2026 — Universidad Privada de Tacna.
