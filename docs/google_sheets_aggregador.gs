/**
 * ============================================================================
 * Tu Opinión Cuenta — Agregador de Respuestas Google Forms → Excel Web
 * Universidad Privada de Tacna — Periodo 2026-II
 * ============================================================================
 *
 * CÓMO USAR:
 * 1. Abre la hoja de Google Sheets que tiene las respuestas del formulario.
 * 2. En el menú: Extensiones → Apps Script → pega este archivo completo.
 * 3. Ejecuta la función `generarExcelParaWeb`.
 * 4. Se crea una nueva hoja llamada "PARA_WEB" con los datos agregados.
 * 5. Descarga esa hoja: Archivo → Descargar → Microsoft Excel (.xlsx).
 * 6. Sube ese .xlsx a la web en "Importar Datos desde Excel".
 *
 * ESTRUCTURA ESPERADA DE LAS RESPUESTAS DEL FORM:
 *   Col A : Marca temporal
 *   Col B : Correo institucional
 *   Col C : Escuela Profesional (Medicina Humana, Odontología, etc.)
 *   Col D+: Ciclo (puede ser varias columnas si el form usa branching)
 *   ...  : ¿Qué asignatura deseas evaluar?
 *   ...  : Selecciona el docente que deseas evaluar
 *   Q1-Q2: AE-01 (Responsabilidad y planificación)
 *   Q3-Q6: AE-02 (Dominio metodológico y de contenidos)
 *   Q7-Q8: AE-03 (Evaluación del aprendizaje)
 *   Q9-Q10: AE-04 (Relaciones humanas y clima de aula)
 * ============================================================================
 */

// Mapeo de preguntas Likert a áreas de evaluación
// Ajusta si cambiaron el orden de preguntas en el formulario.
const AE_CONFIG = {
  'AE-01': [1, 2],        // Q1, Q2 → Responsabilidad y planificación
  'AE-02': [3, 4, 5, 6],  // Q3-Q6 → Dominio metodológico
  'AE-03': [7, 8],        // Q7, Q8 → Evaluación del aprendizaje
  'AE-04': [9, 10],       // Q9, Q10 → Relaciones humanas
};

const CICLO_IMPORTACION = '2026-II';  // ← Cambia si necesitas otro ciclo
const QUORUM_MINIMO     = 3;          // Mínimo de encuestados para validez

function generarExcelParaWeb() {
  const ss      = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRespuestas = ss.getSheets()[0]; // Primera hoja = respuestas del form
  const datos   = sheetRespuestas.getDataRange().getValues();

  if (datos.length < 2) {
    SpreadsheetApp.getUi().alert('No hay respuestas aún en la hoja.');
    return;
  }

  const headers = datos[0].map(h => String(h || '').trim());

  // ── Detectar columnas automáticamente ─────────────────────────────────────
  const col = {
    escuela  : encontrarColumna(headers, ['escuela', 'carrera', 'profesional']),
    curso    : encontrarColumna(headers, ['asignatura', 'curso', 'evaluar']),
    docente  : encontrarColumna(headers, ['docente', 'selecciona el docente']),
    // El ciclo puede aparecer en varias columnas (branching del form)
    ciclosCols: encontrarColumnasTodas(headers, ['ciclo', 'semestre']),
    // Preguntas Likert — busca "1.", "2.", etc. en el título
    likerts  : detectarColumnasLikert(headers),
  };

  // Validar que encontramos lo mínimo
  const faltantes = [];
  if (col.escuela   === -1) faltantes.push('Escuela/Carrera');
  if (col.curso     === -1) faltantes.push('Asignatura/Curso');
  if (col.docente   === -1) faltantes.push('Docente');
  if (col.likerts.length < 10) faltantes.push(`Preguntas Likert (encontradas: ${col.likerts.length}, esperadas: 10)`);

  if (faltantes.length > 0) {
    SpreadsheetApp.getUi().alert(
      '⚠️ No se pudieron detectar estas columnas:\n' + faltantes.join('\n') +
      '\n\nRevisa la hoja de respuestas y ajusta el script.'
    );
    Logger.log('Headers encontrados: ' + JSON.stringify(headers));
    return;
  }

  Logger.log('Columnas detectadas:');
  Logger.log('  Escuela   : ' + col.escuela + ' → ' + headers[col.escuela]);
  Logger.log('  Curso     : ' + col.curso   + ' → ' + headers[col.curso]);
  Logger.log('  Docente   : ' + col.docente + ' → ' + headers[col.docente]);
  Logger.log('  Ciclos    : ' + col.ciclosCols.join(', '));
  Logger.log('  Likerts   : ' + col.likerts.join(', '));

  // ── Agrupar respuestas por (Escuela, Ciclo, Curso, Docente) ──────────────
  const grupos = {};  // clave → { escuela, ciclo, curso, docente, respuestas[] }

  for (let i = 1; i < datos.length; i++) {
    const fila = datos[i];

    // Ignorar filas vacías
    if (fila.every(c => c === '' || c === null || c === undefined)) continue;

    const escuela = limpiar(fila[col.escuela]);
    const curso   = limpiar(fila[col.curso]);
    const docente = limpiar(fila[col.docente]);

    // Ciclo: tomar el primer campo no vacío entre las columnas de ciclo
    let ciclo = '';
    for (const ci of col.ciclosCols) {
      const v = limpiar(fila[ci]);
      if (v) { ciclo = v; break; }
    }
    if (!ciclo) ciclo = 'Sin ciclo';

    if (!escuela || !curso || !docente) continue;
    if (docente.includes('no aparece') || docente.startsWith('—')) continue;

    const clave = `${escuela}||${ciclo}||${curso}||${docente}`;

    if (!grupos[clave]) {
      grupos[clave] = { escuela, ciclo, curso, docente, respuestas: [] };
    }

    // Extraer las 10 notas Likert (1-5)
    const likerts = col.likerts.map(ci => {
      const v = parseFloat(String(fila[ci] || '0').replace(',', '.'));
      return isNaN(v) ? 0 : Math.max(1, Math.min(5, v));
    });

    grupos[clave].respuestas.push(likerts);
  }

  // ── Calcular promedios y construir filas ──────────────────────────────────
  const filasSalida = [];
  filasSalida.push([
    'Facultad', 'Carrera Profesional', 'Docente', 'Curso', 'Sección',
    'AE-01', 'AE-02', 'AE-03', 'AE-04', 'Nota',
    'Encuestados', 'No Encuestados', 'Validez'
  ]);

  for (const clave in grupos) {
    const g = grupos[clave];
    const n = g.respuestas.length;
    const valido = n >= QUORUM_MINIMO;

    // Promedio por pregunta
    const promediosPorPregunta = Array(10).fill(0);
    for (const resp of g.respuestas) {
      resp.forEach((v, idx) => { promediosPorPregunta[idx] += v; });
    }
    promediosPorPregunta.forEach((_, idx, arr) => { arr[idx] = arr[idx] / n; });

    // Calcular AE: promedio Likert de sus preguntas × 4 → escala 0-20
    const ae = {};
    for (const [aeKey, qs] of Object.entries(AE_CONFIG)) {
      const sumLikert = qs.reduce((s, q) => s + promediosPorPregunta[q - 1], 0);
      const promedioLikert = sumLikert / qs.length;
      ae[aeKey] = redondear(promedioLikert * 4, 2); // → 0-20
    }

    const nota  = redondear((ae['AE-01'] + ae['AE-02'] + ae['AE-03'] + ae['AE-04']) / 4, 2);
    const calificacion = calcularCalificacion(nota);

    filasSalida.push([
      'FACSA',                   // Facultad — ajusta si tienes múltiples facultades
      g.escuela,                 // Carrera Profesional
      g.docente,
      g.curso,
      g.ciclo,                   // Usamos el ciclo como "Sección" (ej: "Ciclo II")
      ae['AE-01'],
      ae['AE-02'],
      ae['AE-03'],
      ae['AE-04'],
      nota,
      n,                         // Encuestados
      0,                         // No Encuestados (el form no captura ausentes)
      valido ? 'Válido' : 'No válido',
    ]);
  }

  if (filasSalida.length <= 1) {
    SpreadsheetApp.getUi().alert('No se encontraron respuestas válidas para agregar.');
    return;
  }

  // ── Escribir hoja de salida ───────────────────────────────────────────────
  let hojaDestino = ss.getSheetByName('PARA_WEB');
  if (hojaDestino) ss.deleteSheet(hojaDestino);
  hojaDestino = ss.insertSheet('PARA_WEB');

  hojaDestino.getRange(1, 1, filasSalida.length, filasSalida[0].length)
    .setValues(filasSalida);

  // Formato del encabezado
  hojaDestino.getRange(1, 1, 1, filasSalida[0].length)
    .setBackground('#003087')
    .setFontColor('#ffffff')
    .setFontWeight('bold');

  hojaDestino.autoResizeColumns(1, filasSalida[0].length);

  const totalDocentes = filasSalida.length - 1;
  const validos       = filasSalida.slice(1).filter(r => r[12] === 'Válido').length;

  Logger.log(`✅ Agregación completa: ${totalDocentes} registros (${validos} válidos, ${totalDocentes - validos} no válidos)`);

  SpreadsheetApp.getUi().alert(
    `✅ Listo — Hoja "PARA_WEB" creada.\n\n` +
    `  • ${totalDocentes} registros de docentes\n` +
    `  • ${validos} válidos (n ≥ ${QUORUM_MINIMO})\n` +
    `  • ${totalDocentes - validos} no válidos (n < ${QUORUM_MINIMO})\n\n` +
    `Ahora descarga la hoja:\n` +
    `  Archivo → Descargar → Microsoft Excel (.xlsx)\n` +
    `y súbela a la web en "Importar Datos desde Excel".`
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function limpiar(v) {
  return String(v || '').trim().toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function redondear(n, decimales) {
  const factor = Math.pow(10, decimales);
  return Math.round(n * factor) / factor;
}

/** Calificación según escala Res. 245-2026 (escala 5 niveles, vigente 2026-II) */
function calcularCalificacion(nota) {
  if (nota >= 18)       return 'EXCELENTE';
  if (nota >= 15)       return 'MUY_SATISFACTORIO';
  if (nota >= 11)       return 'SATISFACTORIO';
  if (nota >= 6)        return 'EN_PROCESO';
  return 'INSATISFACTORIO';
}

/** Encuentra la primera columna cuyo header contiene alguna de las palabras clave */
function encontrarColumna(headers, palabrasClave) {
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (palabrasClave.some(p => h.includes(p.toLowerCase()))) return i;
  }
  return -1;
}

/** Encuentra TODAS las columnas que coinciden (para ciclo con branching) */
function encontrarColumnasTodas(headers, palabrasClave) {
  const cols = [];
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i].toLowerCase();
    if (palabrasClave.some(p => h.includes(p.toLowerCase()))) cols.push(i);
  }
  return cols;
}

/**
 * Detecta las 10 columnas de preguntas Likert.
 * Las preguntas empiezan con "1.", "2.", ..., "10." en el título.
 */
function detectarColumnasLikert(headers) {
  const cols = [];
  for (let q = 1; q <= 10; q++) {
    const prefijos = [`${q}.`, `${q} .`, `${q}-`, `pregunta ${q}`];
    let idx = -1;
    for (let i = 0; i < headers.length; i++) {
      const h = headers[i].toLowerCase().trim();
      if (prefijos.some(p => h.startsWith(p.toLowerCase()))) {
        idx = i;
        break;
      }
    }
    if (idx !== -1) cols.push(idx);
    else Logger.log(`⚠️ No se encontró la pregunta ${q}`);
  }
  return cols;
}
