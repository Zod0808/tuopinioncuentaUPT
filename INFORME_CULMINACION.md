# INFORME DE CULMINACIÓN DE SERVICIO
## Sistema "Tu Opinión Cuenta" — Universidad Privada de Tacna

---

**INFORME N°:** 001-2026-GPAD-UPT
**FECHA:** 22 de junio de 2026
**DIRIGIDO A:** Oficina de Gestión de Procesos Académicos y Docente (GPAD) — UPT
**ELABORADO POR:** Cesar Fabian Chavez Linares
**PERÍODO DE EJECUCIÓN:** 22 de mayo de 2026 al 22 de junio de 2026
**MONTO DEL SERVICIO:** S/ 1,200.00 (Un mil doscientos y 00/100 soles)

---

## 1. OBJETO DEL SERVICIO

Desarrollo, corrección y mejora del sistema web **"Tu Opinión Cuenta UPT"** — Sistema de Evaluación de la Calidad Educativa de la Universidad Privada de Tacna, correspondiente al ciclo académico **2026-I**, incluyendo la generación automatizada de reportes en formato DOCX y PDF para el informe final institucional y los reportes por facultad.

---

## 2. ACTIVIDADES REALIZADAS

### 2.1 Informe Final Institucional (DOCX)

| N° | Actividad |
|----|-----------|
| 1 | Corrección del nombre de la unidad responsable: "Oficina de Gestión de Procesos Académicos y Docente" en portada y encabezados |
| 2 | Corrección de gráficos de pastel — aspecto ratio ajustado para que aparezcan como círculos perfectos |
| 3 | Alineación de colores entre gráficos de pastel y tablas de distribución (paleta institucional: azul marino, celeste, oro, blanco) |
| 4 | Corrección de doble punto final en párrafos de interpretación automática por facultad |
| 5 | Reescritura completa de la **Sección 1 — INTRODUCCIÓN** con texto oficial: subsecciones 1.1 Base Legal, 1.2 Objetivos, 1.3 Responsables, 1.4 Cronograma, 1.5 Plataforma, 1.6 Difusión, 1.7 Publicidad (incluyendo subsecciones 1.7.1, 1.7.2, 1.7.3) |
| 6 | Agregado de campo configurable "Cronograma de ejecución" (sección 1.4) en la interfaz de exportación |
| 7 | Corrección de la **Sección 3**: reordenamiento gráfico → tabla → interpretación por carrera; corrección de nombres completos de facultades en gráfico de barras; cambio de color de barras a azul marino institucional |
| 8 | Agregado de **tabla del Indicador del Plan Estratégico** (Sección 4) con 5 filas: Indicador, Periodicidad, Fórmula, Frecuencia de reporte, Resultado a obtener |
| 9 | Reducción de tamaño de fuente en todas las tablas de 12pt a 9pt para evitar deformación |
| 10 | Implementación de lógica automática de color de texto (blanco/negro) según luminosidad del fondo de celda |

### 2.2 Reportes por Facultad (4 documentos DOCX)

| N° | Reporte | Mejoras aplicadas |
|----|---------|-------------------|
| 1 | **1. Reporte_Nro_Encuestados_por_Carrera_Profesional** | Corrección de título; gráfico de participación (encuestados vs no encuestados); fuente "INTRANET UPT" en pie de tabla; eliminación de bloque de firma |
| 2 | **2. Reporte_Porcentaje_Juicio_Valor** | Colores solo en BUENO y DESTACADO; nueva columna "% BUENO + DESTACADO"; fila de PROMEDIO ponderado; tabla de Escala de Calificación al final; eliminación de firma |
| 3 | **3. Reporte_Docentes_Insatisfactorios** | Filas en rojo claro (#FFB3B3); columnas completas: Docente, Curso/Asignatura, Sección, Nota, N° Encuestados, N° No Encuestados; tabla de Escala de Calificación; eliminación de firma |
| 4 | **4. Reporte_General_Evaluacion** | Título "REPORTE GENERAL DE EVALUACIÓN DOCENTE POR SECCION"; tablas de Aspectos Evaluados y Escala de Calificación en leyenda final; KPI con 3 columnas; eliminación de firma |

**Mejoras transversales a los 4 reportes:**
- Nomenclatura de archivos con numeración correlativa y sin espacios: `N. Nombre_ciclo_facultad.docx`
- Eliminación de fecha de generación del encabezado
- Marcador `*` (en lugar de `[!]`) para secciones con muestra insuficiente (<3 encuestados)
- Color de texto automático según fondo en tarjetas KPI

### 2.3 Módulo de Exportación PDF — Resumen Docente

| N° | Actividad |
|----|-----------|
| 1 | Corrección de bug crítico: columnas "Encuestados" en blanco para docentes con múltiples secciones (error de rowSpan en jsPDF-autotable) |
| 2 | Inclusión de tablas "Encuestas No Válidas" y "Docentes sin promedio calculable" en el PDF exportado |
| 3 | Sección "Observaciones" antes de las tablas de exclusión |
| 4 | Nombre de archivo dinámico según carrera o facultad seleccionada: `Reporte general de evaluacion por docente [Escuela/Facultad] [Ciclo].pdf` |
| 5 | Aplicación de los mismos cambios al módulo "Resumen Docente por Facultad" |
| 6 | Actualización del umbral de participación mínima de 30% a **50%** en toda la aplicación |

---

## 3. ENTREGABLES

1. Sistema web funcional accesible desde la plataforma institucional
2. Módulo de exportación DOCX — Informe Final (con configuración personalizable)
3. Módulo de exportación DOCX — 4 Reportes por Facultad (6 facultades = 24 documentos automáticos)
4. Módulo de exportación PDF — Resumen Docente por Carrera y por Facultad
5. Código fuente actualizado en el repositorio del proyecto
6. Evidencias fotográficas de las correcciones aplicadas (adjuntas en Drive)

---

## 4. CONFORMIDAD

El servicio fue ejecutado en el período acordado y los entregables fueron revisados y validados por la Oficina de Gestión de Procesos Académicos y Docente (GPAD) de la Universidad Privada de Tacna, quienes dieron conformidad a los resultados obtenidos.

---

## 5. LIQUIDACIÓN DEL SERVICIO

| Concepto | Monto |
|----------|-------|
| Desarrollo y corrección del sistema "Tu Opinión Cuenta UPT" — Ciclo 2026-I | S/ 1,200.00 |
| Retención 4ta categoría | No aplica (monto neto) |
| **TOTAL A PAGAR** | **S/ 1,200.00** |

---

## 6. DATOS PARA TRANSFERENCIA / PAGO

**Beneficiario:** Cesar Fabian Chavez Linares
**Concepto:** Servicio de desarrollo de software — Sistema Tu Opinión Cuenta UPT 2026-I

---

## 7. FIRMAS

&nbsp;

&nbsp;

_______________________________________________
**Cesar Fabian Chavez Linares**
Desarrollador de Software
DNI: _______________

&nbsp;

&nbsp;

_______________________________________________
**Responsable Oficina GPAD**
Oficina de Gestión de Procesos Académicos y Docente
Universidad Privada de Tacna

---

*Tacna, 22 de junio de 2026*