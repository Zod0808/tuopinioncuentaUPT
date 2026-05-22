# Guía de Mejora — Sistema "Tu Opinión Cuenta" UPT

## Diagnóstico del problema actual

El informe final (Informe N°008-2025-GPAD-UPT) tiene **31 páginas** con una estructura muy específica que actualmente se arma a mano en Word. Este proceso toma aproximadamente **1 semana** porque requiere:

- Calcular porcentajes de participación por facultad y carrera manualmente
- Construir tablas de promedios AE-01 a AE-04 por cada carrera de cada facultad
- Generar gráficos de torta con distribución de calificaciones (DESTACADO/BUENO/ACEPTABLE/INSATISFACTORIO) por carrera
- Redactar interpretaciones repetitivas para cada tabla y gráfico
- Calcular el indicador del plan estratégico (% BUENO + DESTACADO)
- Redactar conclusiones y recomendaciones

Tu web actual ya cubre importación de datos, reportes interactivos y exportación PDF. Lo que falta es **generar el informe DOCX con la estructura oficial exacta** de forma automática.

---

## Fase 1 — Completar la estructura de datos (3 días)

### 1.1 Nueva tabla: `matriculados_por_ciclo`

El informe necesita el **total de estudiantes matriculados** por carrera (no solo los encuestados), dato que tu Excel de importación no incluye actualmente. Necesitas una tabla en Supabase para registrar esto:

```sql
create table if not exists matriculados_por_ciclo (
  id          uuid default gen_random_uuid() primary key,
  user_id     uuid references auth.users(id) on delete cascade not null,
  ciclo       text not null,
  facultad    text not null,
  carrera     text not null,
  total_matriculados integer not null,
  created_at  timestamptz default now(),
  unique(user_id, ciclo, facultad, carrera)
);

alter table matriculados_por_ciclo enable row level security;
create policy "ver" on matriculados_por_ciclo for select using (auth.uid() = user_id);
create policy "insertar" on matriculados_por_ciclo for insert with check (auth.uid() = user_id);
create policy "actualizar" on matriculados_por_ciclo for update using (auth.uid() = user_id);
create policy "eliminar" on matriculados_por_ciclo for delete using (auth.uid() = user_id);
```

Luego crea un formulario simple en tu web (o una segunda pestaña en el importador Excel) para cargar estos datos. Puede ser un Excel con columnas: Facultad, Carrera, Total Matriculados.

### 1.2 Normalización de nombres de facultades y carreras

Un problema frecuente en los datos importados es la inconsistencia de nombres. Crea un archivo de configuración `src/config/universityStructure.ts`:

```typescript
export const FACULTADES = {
  'FADE': {
    nombre: 'Facultad de Derecho y Ciencias Políticas',
    abreviatura: 'FADE',
    carreras: ['Derecho']
  },
  'FAEDCOH': {
    nombre: 'Facultad de Educación, Ciencias de la Comunicación y Humanidades',
    abreviatura: 'FAEDCOH',
    carreras: [
      'Educación Inicial',
      'Educación Primaria',
      'Educación Física y Deportes',
      'Ciencias de la Comunicación',
      'Psicología'
    ]
  },
  'FAING': {
    nombre: 'Facultad de Ingeniería',
    abreviatura: 'FAING',
    carreras: [
      'Ingeniería Civil',
      'Ingeniería de Sistemas',
      'Ingeniería Electrónica',
      'Ingeniería Agroindustrial',
      'Ingeniería Ambiental',
      'Ingeniería Industrial'
    ]
  },
  'FACEM': {
    nombre: 'Facultad de Ciencias Empresariales',
    abreviatura: 'FACEM',
    carreras: [
      'Ingeniería Comercial',
      'Ciencias Contables y Financieras',
      'Economía',
      'Administración de Negocios Internacionales',
      'Administración Turístico-Hotelera',
      'Administración de Empresas'
    ]
  },
  'FAU': {
    nombre: 'Facultad de Arquitectura y Urbanismo',
    abreviatura: 'FAU',
    carreras: ['Arquitectura']
  },
  'FACSA': {
    nombre: 'Facultad de Ciencias de la Salud',
    abreviatura: 'FACSA',
    carreras: [
      'Medicina Humana',
      'Odontología',
      'Laboratorio Clínico y Anatomía Patológica',
      'Terapia Física y Rehabilitación'
    ]
  }
};

export const ESCALA_CALIFICACION = {
  DESTACADO:      { min: 18, max: 20, interpretacion: 'El docente tiene muy buen desempeño en el aula, se le felicita' },
  BUENO:          { min: 15, max: 17, interpretacion: 'El docente tiene un desempeño correcto, pero debe seguir mejorando para optimizar sus resultados' },
  ACEPTABLE:      { min: 12, max: 14, interpretacion: 'Si bien el desempeño de docente en aula es aceptable, debe replantear su desempeño en los aspectos que marcan falencias' },
  INSATISFACTORIO:{ min: 0,  max: 11, interpretacion: 'El docente debe reprogramar en gran medida su desempeño en aula' }
};

export const ASPECTOS_EVALUADOS = {
  'AE-01': 'Calidad de la presentación y contenido silábico de la asignatura',
  'AE-02': 'Ejecución del proceso enseñanza aprendizaje',
  'AE-03': 'Aplicación de la evaluación de la asignatura',
  'AE-04': 'Formación actitudinal y relaciones interpersonales con los estudiantes'
};
```

### 1.3 Servicio de cálculos: `src/services/reportCalculations.ts`

Centraliza todos los cálculos que el informe necesita:

```typescript
import { ESCALA_CALIFICACION, ASPECTOS_EVALUADOS } from '../config/universityStructure';

export interface DatosCarrera {
  facultad: string;
  carrera: string;
  totalMatriculados: number;
  totalEncuestados: number;
  porcentajeEncuestados: number;
  promedioAE01: number;
  promedioAE02: number;
  promedioAE03: number;
  promedioAE04: number;
  promedioGeneral: number;
  seccionesCalificadas: number;
  distribucion: {
    destacado: { cantidad: number; porcentaje: number };
    bueno: { cantidad: number; porcentaje: number };
    aceptable: { cantidad: number; porcentaje: number };
    insatisfactorio: { cantidad: number; porcentaje: number };
  };
}

export function calcularDatosPorCarrera(
  registros: EvaluacionData[],
  matriculados: MatriculadosData[]
): Map<string, Map<string, DatosCarrera>> {
  // Agrupa por facultad → carrera
  // Calcula promedios AE-01..04
  // Calcula distribución de calificaciones (por secciones/docentes, no por estudiantes)
  // Retorna Map<facultad, Map<carrera, DatosCarrera>>
}

export function generarInterpretacionTablaAE(datos: DatosCarrera): string {
  const mejorAE = /* encontrar el AE con mayor promedio */;
  const peorAE = /* encontrar el AE con menor promedio */;
  return `De los cuatro criterios evaluados por los estudiantes en la encuesta académica, ` +
    `se obtuvo una calificación promedio de ${datos.promedioGeneral.toFixed(2)}. ` +
    `El criterio ${mejorAE.codigo}: ${ASPECTOS_EVALUADOS[mejorAE.codigo]}, ` +
    `alcanzó la puntuación más alta con ${mejorAE.valor.toFixed(2)}, ` +
    `mientras que el criterio ${peorAE.codigo}: ${ASPECTOS_EVALUADOS[peorAE.codigo]} ` +
    `registró la calificación más baja con ${peorAE.valor.toFixed(2)}.`;
}

export function generarInterpretacionDistribucion(datos: DatosCarrera): string {
  const mayor = /* categoría con mayor % */;
  const menor = /* categoría con menor % (excluyendo 0%) */;
  return `De acuerdo con la escala de calificación aplicada, el ${mayor.porcentaje.toFixed(2)}% ` +
    `de los estudiantes considera que el docente demuestra un desempeño ${mayor.nombre} en el aula, ` +
    `mientras que el ${menor.porcentaje.toFixed(2)}% lo califica como ${menor.nombre} ` +
    `${ESCALA_CALIFICACION[menor.key].interpretacion.toLowerCase()}.`;
}
```

---

## Fase 2 — Motor de reportes que replica la estructura del informe (5 días)

### 2.1 Componente `InformeFinalView.tsx`

Este es el componente principal que replica exactamente las secciones del informe oficial. Crea `src/components/InformeFinalView.tsx` con pestañas o secciones colapsables que muestren:

**Sección 3.1** — Tabla institucional de participación:
```
| Facultad | N° estudiantes | N° encuestados | % encuestados |
```
Con interpretación automática: "Del total de X estudiantes matriculados... Y han aplicado la encuesta, lo que representa un Z%"

**Sección 3.2** — Por cada facultad, una tabla con sus carreras:
```
| FACULTAD DE INGENIERÍA |
| Carrera | N° estudiantes | N° encuestados | % encuestados |
| Civil   | 771            | 657            | 85.21         |
| ...     |                |                |               |
| TOTAL   |                | 1367           | 83.97         |
```

**Sección 3.3.1** — Tabla institucional de AE por facultad:
```
| Facultad | AE-01 | AE-02 | AE-03 | AE-04 | PROMEDIO |
```

**Sección 3.3.2** — Por cada facultad, tabla de AE por carrera + gráfico de torta + interpretación:
```
| FACULTAD DE INGENIERÍA |
| Código | Aspecto evaluado | Civil | Sistemas | Electrónica | ... |
| AE-01  | Calidad...       | 18.66 | 18.70    | 19.13       | ... |
| AE-02  | Ejecución...     | 17.75 | 17.63    | 18.25       | ... |
| ...    |                  |       |          |             |     |
| PROMEDIO                 | 17.79 | 17.73    | 17.96       | ... |
```

Luego por cada carrera: gráfico de torta (DESTACADO/BUENO/ACEPTABLE/INSATISFACTORIO) + N° de secciones calificadas + interpretación automática.

**Sección 4** — Indicador del plan estratégico:
```
| Facultad | % BUENO | % DESTACADO | TOTAL |
```

### 2.2 Gráficos de torta por carrera

El informe incluye un gráfico de torta por cada carrera mostrando la distribución de calificaciones. Crea un componente reutilizable:

```typescript
// src/components/PieChartCalificacion.tsx
interface Props {
  carrera: string;
  distribucion: DatosCarrera['distribucion'];
  seccionesCalificadas: number;
}

// Colores del informe original:
const COLORES = {
  destacado: '#4472C4',      // azul
  bueno: '#ED7D31',          // naranja
  aceptable: '#A5A5A5',      // gris
  insatisfactorio: '#FFC000'  // amarillo
};
```

Usa `chart.js` con `type: 'pie'` y muestra el porcentaje dentro de cada segmento.

### 2.3 Previsualización interactiva

Antes de exportar, el usuario puede ver el informe completo en la web con la misma estructura del Word. Esto permite verificar que los datos están correctos antes de generar el DOCX final.

---

## Fase 3 — IA para interpretaciones + Generación DOCX (4 días)

### 3.1 Mejora del servicio OpenAI: `src/services/reportAIService.ts`

En lugar de interpretaciones genéricas, envía los datos específicos como contexto:

```typescript
export async function generarInterpretacionIA(
  seccion: 'tabla_ae' | 'distribucion' | 'conclusion' | 'recomendacion',
  datos: any,
  contexto: string
): Promise<string> {
  const prompts = {
    tabla_ae: `Eres un analista de evaluación docente universitaria. Genera una interpretación 
    profesional y concisa (2-3 oraciones) para la siguiente tabla de criterios evaluados.
    
    Contexto: ${contexto}
    Datos: ${JSON.stringify(datos)}
    
    Formato requerido: Menciona el promedio general, el criterio mejor calificado con su nota, 
    y el criterio peor calificado con su nota. Usa lenguaje formal académico.
    No uses viñetas. Escribe en un solo párrafo.`,
    
    distribucion: `Genera una interpretación para la distribución de calificaciones docentes.
    
    Datos: ${JSON.stringify(datos)}
    
    Formato: "De acuerdo con la escala de calificación aplicada, el X% de los estudiantes 
    considera que el docente demuestra un desempeño [categoría mayor] en el aula, 
    mientras que el Y% lo califica como [categoría menor] [interpretación de la escala]."`,
    
    conclusion: `Con base en los siguientes resultados de la encuesta académica "Tu Opinión Cuenta",
    genera 2-3 conclusiones formales para el informe final.
    
    Datos generales: ${JSON.stringify(datos)}
    
    Debe mencionar: participación estudiantil, fortalezas encontradas, criterio evaluado más bajo.
    Lenguaje formal institucional. Sin viñetas, cada conclusión como párrafo separado.`,
    
    recomendacion: `Con base en los resultados, genera 2-3 recomendaciones para el informe.
    
    Datos: ${JSON.stringify(datos)}
    
    Enfoque: mejora del criterio más bajo (generalmente AE-04 Formación actitudinal), 
    incentivo de participación estudiantil, uso de resultados para mejora continua.`
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini', // económico y suficiente para interpretaciones
      messages: [{ role: 'user', content: prompts[seccion] }],
      temperature: 0.3, // bajo para consistencia
      max_tokens: 500
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}
```

**Estrategia de fallback**: Si no hay API key de OpenAI o falla la llamada, usa las funciones de `reportCalculations.ts` que generan interpretaciones con plantillas (como ya tienes parcialmente). El informe se genera igual, solo que con texto más formuláico.

### 3.2 Generación del DOCX oficial

Instala `docx` (docx-js) para generar el Word desde el navegador:

```bash
npm install docx file-saver
```

Crea `src/services/docxReportService.ts`. Esta es la pieza más importante del proyecto. El servicio debe generar un DOCX que replique la estructura exacta del informe:

```typescript
import { Document, Packer, Paragraph, Table, TableRow, TableCell, 
         WidthType, AlignmentType, TextRun, HeadingLevel,
         ImageRun, PageBreak, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';

export async function generarInformeFinal(
  ciclo: string,
  datosCalculados: Map<string, Map<string, DatosCarrera>>,
  graficosBase64: Map<string, string>, // carrera → imagen base64 del gráfico de torta
  usarIA: boolean
): Promise<void> {
  
  const doc = new Document({
    sections: [{
      properties: { /* márgenes, tamaño carta */ },
      children: [
        // Portada
        ...generarPortada(ciclo),
        
        // Índice (manual con tabs y números de página)
        ...generarIndice(),
        
        // 1. INTRODUCCIÓN (texto fijo + datos del ciclo)
        ...generarIntroduccion(ciclo),
        
        // 3.1 Tabla institucional de encuestados
        ...generarSeccion31(datosCalculados),
        
        // 3.2 Tablas por facultad
        ...generarSeccion32(datosCalculados),
        
        // 3.3.1 Tabla institucional de AE
        ...generarSeccion331(datosCalculados),
        
        // 3.3.2 Tablas de AE por facultad + gráficos de torta
        ...generarSeccion332(datosCalculados, graficosBase64),
        
        // 4. Indicador del plan estratégico
        ...generarSeccion4(datosCalculados),
        
        // 5. Conclusiones (IA o plantilla)
        ...await generarConclusiones(datosCalculados, usarIA),
        
        // 6. Recomendaciones (IA o plantilla)
        ...await generarRecomendaciones(datosCalculados, usarIA),
        
        // Firma
        ...generarFirma()
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `Informe_Tu_Opinion_Cuenta_${ciclo}.docx`);
}
```

Para las tablas, sigue el formato exacto del informe. Ejemplo de la tabla 3.1:

```typescript
function generarTabla31(datos): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      // Header row
      new TableRow({
        children: [
          celdaHeader('Facultad'),
          celdaHeader('N° de estudiantes'),
          celdaHeader('N° estudiantes encuestados'),
          celdaHeader('% de estudiantes encuestados'),
        ]
      }),
      // Data rows (iterar por cada facultad)
      ...Array.from(datos.entries()).map(([facultad, carreras]) => {
        const totalMatriculados = sumarCampo(carreras, 'totalMatriculados');
        const totalEncuestados = sumarCampo(carreras, 'totalEncuestados');
        const porcentaje = (totalEncuestados / totalMatriculados * 100).toFixed(2);
        return new TableRow({
          children: [
            celda(facultad),
            celdaNumero(totalMatriculados),
            celdaNumero(totalEncuestados),
            celdaNegrita(porcentaje),
          ]
        });
      }),
      // Fila PROMEDIO
      filaPromedio(datos)
    ]
  });
}
```

### 3.3 Exportar gráficos de torta como imágenes

Para insertar los gráficos en el DOCX, necesitas convertirlos a imagen. Usa `html2canvas` o el método nativo de Chart.js:

```typescript
// En el componente PieChartCalificacion, exporta una función:
export function obtenerGraficoBase64(chartRef: React.RefObject<Chart>): string {
  return chartRef.current?.toBase64Image() || '';
}
```

Luego en el servicio DOCX:

```typescript
// Insertar gráfico en el documento
new Paragraph({
  children: [
    new ImageRun({
      data: Buffer.from(graficoBase64.split(',')[1], 'base64'),
      transformation: { width: 400, height: 300 },
      type: 'png'
    })
  ],
  alignment: AlignmentType.CENTER
})
```

---

## Fase 4 — Conclusiones IA + Comparativa avanzada (3 días)

### 4.1 Conclusiones y recomendaciones inteligentes

La IA debe recibir un resumen completo de los datos para generar conclusiones que mencionen:

- El porcentaje de participación general
- Qué criterio (AE) fue el mejor y peor calificado a nivel institucional
- Qué facultad tuvo mejor/peor desempeño
- Recomendaciones basadas en los datos específicos del ciclo

### 4.2 Alertas automáticas

Agrega un componente que resalte automáticamente:

- Carreras con menos de 70% de participación
- Docentes/secciones con calificación INSATISFACTORIO (< 12)
- Criterios AE por debajo del promedio institucional
- Cambios significativos respecto al ciclo anterior (si hay datos históricos)

### 4.3 Comparativa histórica mejorada

Tu componente `ComparativaCiclos.tsx` ya tiene buena funcionalidad. Mejóralo con:

- Tendencia de AE-04 (siempre el más bajo) para ver si mejora entre ciclos
- Ranking de carreras que más mejoraron/empeoraron
- Indicador del plan estratégico histórico (% BUENO + DESTACADO por ciclo)

---

## Flujo de usuario final

1. **Importar Excel** → el usuario sube el archivo de evaluaciones (como ya funciona)
2. **Cargar matriculados** → nueva sección para ingresar el total de matriculados por carrera
3. **Revisar datos** → la web muestra automáticamente todas las secciones del informe con tablas, gráficos e interpretaciones
4. **Generar informe DOCX** → un botón "Generar Informe Final" ejecuta todo el proceso y descarga el Word con la estructura oficial
5. **Ajustar si necesario** → el usuario abre el DOCX en Word y hace ajustes menores (fechas de cronograma, nombres de responsables, etc.)

---

## Estructura de archivos nuevos

```
src/
├── config/
│   └── universityStructure.ts          # Facultades, carreras, escalas
├── services/
│   ├── reportCalculations.ts           # Cálculos centralizados
│   ├── reportAIService.ts              # Interpretaciones con IA
│   └── docxReportService.ts            # Generación del DOCX oficial
├── components/
│   ├── InformeFinalView.tsx            # Previsualización del informe
│   ├── MatriculadosImporter.tsx        # Importador de matriculados
│   ├── PieChartCalificacion.tsx        # Gráficos de torta reutilizables
│   └── AlertasAutomaticas.tsx          # Panel de alertas
```

---

## Dependencias nuevas a instalar

```bash
npm install docx file-saver
npm install --save-dev @types/file-saver
```

---

## Recomendaciones técnicas

**Sobre la API de OpenAI**: Usa `gpt-4o-mini` en lugar de `gpt-4o` para las interpretaciones. El costo es ~20x menor y la calidad es más que suficiente para texto formuláico. Con ~50 interpretaciones por informe, el costo sería de centavos por informe generado.

**Sobre el rendimiento**: Los cálculos de todas las secciones pueden tomar unos segundos con muchos datos. Usa `useMemo` en React para cachear los resultados y muestra un indicador de progreso durante la generación del DOCX.

**Sobre la plantilla DOCX**: El texto de la introducción (secciones 1 y 2) es mayormente fijo entre ciclos, solo cambian fechas y nombres. Guárdalo como constantes en un archivo separado `src/config/informeTextoFijo.ts` y parametriza solo lo que cambia.

**Sobre Vercel**: Tu deployment actual en Vercel funciona bien para una SPA. La generación DOCX ocurre 100% en el navegador (client-side), así que no necesitas backend adicional. Solo asegúrate de que la variable `VITE_OPENAI_API_KEY` esté configurada en Vercel si quieres usar IA.

---

## Prioridades si tienes tiempo limitado

Si solo puedes implementar una cosa, haz la **Fase 2 + la generación DOCX básica** (sin IA). Esto ya elimina el 80% del trabajo manual. Las interpretaciones se pueden generar con plantillas de texto que usan los datos calculados, y son sorprendentemente similares a las del informe original porque el informe manual también sigue patrones repetitivos.
