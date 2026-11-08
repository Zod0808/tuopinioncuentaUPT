// Importador genérico de matriculados por ciclo
// Uso: node import-matriculados-2026II.mjs
//
// Lee el archivo:  data/imports/MATRICULADOS_<CICLO>.xlsx
// Columnas requeridas: FACULTAD | CARRERA | MATRICULADOS | ENCUESTADOS
//
// Ejemplo de archivo: data/imports/MATRICULADOS_2026-II.xlsx

import { createClient } from '@supabase/supabase-js';
import readXlsxFile from 'read-excel-file/node';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://agswvyjifhrrwclfvwur.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnc3d2eWppZmhycndjbGZ2d3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0MTcyMzUsImV4cCI6MjA5NDk5MzIzNX0.4T3uLC7hiADUM91fvU8qHRIUYJaPKn7rROEHYwTv4mg';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const question = (prompt) => new Promise(resolve => rl.question(prompt, resolve));

async function main() {
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Importador de Matriculados — Tu Opinión Cuenta');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // 1. Pedir ciclo
  const ciclo = (await question('📅 Ciclo (ej. 2026-II): ')).trim();
  if (!ciclo.match(/^\d{4}-(I|II)$/)) {
    console.error('❌ Formato de ciclo inválido. Usa el formato YYYY-I o YYYY-II'); process.exit(1);
  }

  // 2. Verificar que existe el archivo Excel
  const xlsxPath = path.join(__dirname, 'data', 'imports', `MATRICULADOS_${ciclo}.xlsx`);
  let rows;
  try {
    rows = await readXlsxFile(xlsxPath);
  } catch {
    console.error(`❌ No se encontró el archivo: data/imports/MATRICULADOS_${ciclo}.xlsx`);
    console.error('\n📄 Crea un Excel con estas columnas:');
    console.error('   FACULTAD | CARRERA | MATRICULADOS | ENCUESTADOS');
    console.error('\nEjemplo de fila:');
    console.error('   FADE | Escuela Profesional de Derecho | 1409 | 1341');
    process.exit(1);
  }

  // 3. Parsear el Excel
  const headers = (rows[0]).map(h => String(h || '').trim().toUpperCase());
  const iF  = headers.findIndex(h => h.includes('FACULTAD'));
  const iC  = headers.findIndex(h => h.includes('CARRERA'));
  const iM  = headers.findIndex(h => h.includes('MATRICULADOS'));
  const iE  = headers.findIndex(h => h.includes('ENCUESTADOS'));

  if ([iF, iC, iM, iE].includes(-1)) {
    console.error('❌ Faltan columnas. El archivo debe tener: FACULTAD, CARRERA, MATRICULADOS, ENCUESTADOS');
    process.exit(1);
  }

  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(c => c === null || c === undefined || c === '')) continue;
    const facultad      = String(row[iF] || '').trim();
    const carrera       = String(row[iC] || '').trim();
    const matriculados  = parseInt(String(row[iM] || '0').replace(/\D/g, ''), 10) || 0;
    const encuestados   = parseInt(String(row[iE] || '0').replace(/\D/g, ''), 10) || 0;
    if (!facultad || !carrera || matriculados === 0) continue;
    data.push({ facultad, carrera, totalMatriculados: matriculados, totalEncuestados: encuestados });
  }

  if (data.length === 0) {
    console.error('❌ No se encontraron filas válidas en el Excel'); process.exit(1);
  }

  console.log(`\n✅ ${data.length} carreras leídas del Excel`);

  // 4. Autenticación
  const email    = await question('\n📧 Correo: ');
  const password = await question('🔑 Contraseña: ');
  rl.close();

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (authError) { console.error('❌ Error de autenticación:', authError.message); process.exit(1); }

  const { data: { user } } = await supabase.auth.getUser();
  console.log('✅ Autenticado como', user.email);

  // 5. Subir a Supabase
  const rows_db = data.map(e => ({
    user_id: user.id,
    ciclo,
    facultad: e.facultad,
    carrera: e.carrera,
    total_matriculados: e.totalMatriculados,
    total_encuestados: e.totalEncuestados,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('matriculados_por_ciclo')
    .upsert(rows_db, { onConflict: 'user_id,ciclo,facultad,carrera' });

  if (error) { console.error('❌ Error al guardar:', error.message); process.exit(1); }

  const totM = data.reduce((s, r) => s + r.totalMatriculados, 0);
  const totE = data.reduce((s, r) => s + r.totalEncuestados, 0);
  console.log(`\n✅ Matriculados del ciclo ${ciclo} guardados correctamente`);
  console.log(`   ${data.length} carreras | ${totM.toLocaleString()} matriculados | ${totE.toLocaleString()} encuestados`);
}

main().catch(e => { console.error(e); process.exit(1); });
