// Importador de datos históricos de evaluación docente
// Uso: node import-toc-historico.mjs
//
// Lee archivos:  data/imports/TOC_<CICLO>_import.xlsx
// Columnas: FACULTAD | CARRERA PROFESIONAL | DOCENTE | CURSO | SECCIÓN |
//           NOTA | CALIFICACIÓN | AE-01 | AE-02 | AE-03 | AE-04 |
//           ENCUESTADOS | NO ENCUESTADOS | VALIDEZ

import { createClient } from '@supabase/supabase-js';
import xlsx from 'xlsx';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://agswvyjifhrrwclfvwur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc3d2eWppZmhycndjbGZ2d3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTcyMzUsImV4cCI6MjA5NDk5MzIzNX0.4T3uLC7hiADUM91fvU8qHRIUYJaPKn7rROEHYwTv4mg';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (p) => new Promise(r => rl.question(p, r));

function calcularCalificacion(nota, ciclo) {
  const esNuevo = ciclo >= '2026-II';
  if (esNuevo) {
    if (nota >= 18.0) return 'EXCELENTE';
    if (nota >= 15.0) return 'MUY_SATISFACTORIO';
    if (nota >= 12.0) return 'SATISFACTORIO';
    if (nota >= 8.0)  return 'INSATISFACTORIO';
    return 'MUY_INSATISFACTORIO';
  } else {
    if (nota >= 17.1) return 'DESTACADO';
    if (nota >= 15.1) return 'BUENO';
    if (nota >= 11.0) return 'ACEPTABLE';
    return 'INSATISFACTORIO';
  }
}

function parseCiclo(archivo, ciclo) {
  const ws = xlsx.readFile(archivo).Sheets;
  const ws0 = ws[Object.keys(ws)[0]];
  const rows = xlsx.utils.sheet_to_json(ws0, { header: 1 });
  const headers = rows[0];
  const dataRows = rows.slice(1).filter(r => r.length > 0);

  const idx = (name) => headers.findIndex(h => String(h).trim().toUpperCase() === name.toUpperCase());
  const iFac  = idx('FACULTAD');
  const iCar  = idx('CARRERA PROFESIONAL');
  const iDoc  = idx('DOCENTE');
  const iCur  = idx('CURSO');
  const iSec  = idx('SECCIÓN');
  const iNota = idx('NOTA');
  const iAE01 = idx('AE-01');
  const iAE02 = idx('AE-02');
  const iAE03 = idx('AE-03');
  const iAE04 = idx('AE-04');
  const iEnc  = idx('ENCUESTADOS');
  const iNoEnc= idx('NO ENCUESTADOS');
  const iVal  = idx('VALIDEZ');

  return dataRows.map((row, i) => {
    const nota = parseFloat(row[iNota]) || 0;
    const validezRaw = String(row[iVal] || '').trim().toUpperCase();
    return {
      id: `${ciclo}-${i}`,
      ciclo,
      facultad: String(row[iFac] || '').trim(),
      carreraProfesional: String(row[iCar] || '').trim(),
      docente: String(row[iDoc] || '').trim(),
      curso: String(row[iCur] || '').trim(),
      seccion: String(row[iSec] || '').trim(),
      nota,
      calificacion: calcularCalificacion(nota, ciclo),
      ae01: parseFloat(row[iAE01]) || 0,
      ae02: parseFloat(row[iAE02]) || 0,
      ae03: parseFloat(row[iAE03]) || 0,
      ae04: parseFloat(row[iAE04]) || 0,
      encuestados: parseInt(row[iEnc]) || 0,
      noEncuestados: parseInt(row[iNoEnc]) || 0,
      validez: (validezRaw === 'VÁLIDO' || validezRaw === 'VALIDO') ? 'Válido' : 'No válido',
    };
  });
}

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Importador Histórico de Evaluación Docente — UPT');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const CICLOS = ['2025-II', '2026-I'];
  console.log('Ciclos disponibles:', CICLOS.join(', '));

  const cicloInput = (await question('📅 Ciclo a importar (o "todos"): ')).trim();
  const ciclosAImportar = cicloInput === 'todos' ? CICLOS : [cicloInput];

  // Pedir credenciales una sola vez
  const email = (await question('📧 Correo: ')).trim();
  const pass  = (await question('🔑 Contraseña: ')).trim();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: pass });
  if (authErr) { console.error('✗ Error de autenticación:', authErr.message); rl.close(); return; }

  const { data: { user } } = await supabase.auth.getUser();
  console.log(`✓ Sesión iniciada como ${user.email}\n`);

  for (const ciclo of ciclosAImportar) {
    if (!ciclo.match(/^\d{4}-(I|II)$/)) { console.error(`✗ Ciclo inválido: ${ciclo}`); continue; }

    const archivo = path.join(__dirname, 'data', 'imports', `TOC_${ciclo}_import.xlsx`);
    console.log(`📂 Leyendo ${archivo}...`);

    let datos;
    try {
      datos = parseCiclo(archivo, ciclo);
    } catch (e) {
      console.error(`✗ No se pudo leer el archivo para ${ciclo}:`, e.message);
      continue;
    }

    console.log(`   ${datos.length} registros parseados`);

    const { error: saveErr } = await supabase.from('evaluaciones_data').upsert(
      { user_id: user.id, ciclo, datos, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,ciclo' }
    );

    if (saveErr) {
      console.error(`✗ Error guardando ${ciclo}:`, saveErr.message);
    } else {
      console.log(`✅ Ciclo ${ciclo} importado exitosamente (${datos.length} registros)\n`);
    }
  }

  await supabase.auth.signOut();
  console.log('✅ Importación completa.\n');
  rl.close();
}

main().catch(err => { console.error(err); rl.close(); process.exit(1); });
