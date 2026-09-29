import * as XLSX from 'xlsx';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

const FILES = [
  'data/tu_opinion_cuenta_2025-II.xlsx',
  'data/tu_opinion_cuenta_2026-I.xlsx',
];

const NAME_COLUMNS = new Set(['Docente', 'DOCENTE', 'docente']);

function anonymize(path) {
  const abs = resolve(repoRoot, path);
  if (!existsSync(abs)) {
    console.warn(`skip (not found): ${path}`);
    return;
  }
  const buf = readFileSync(abs);
  const wb = XLSX.read(buf, { type: 'buffer' });

  const nameMap = new Map();
  let nextId = 1;
  const label = (real) => {
    if (nameMap.has(real)) return nameMap.get(real);
    const alias = `DOCENTE ${String(nextId++).padStart(3, '0')}`;
    nameMap.set(real, alias);
    return alias;
  };

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
    if (rows.length === 0) continue;

    const header = rows[0].map((c) => (typeof c === 'string' ? c.trim() : c));
    const docenteIdx = header.findIndex(
      (h) => typeof h === 'string' && NAME_COLUMNS.has(h)
    );

    if (docenteIdx === -1) {
      console.warn(`  sheet "${sheetName}": no Docente column — leaving untouched`);
      continue;
    }

    for (let r = 1; r < rows.length; r++) {
      const cell = rows[r][docenteIdx];
      if (typeof cell === 'string' && cell.trim().length > 0) {
        rows[r][docenteIdx] = label(cell.trim());
      }
    }

    const newWs = XLSX.utils.aoa_to_sheet(rows);
    wb.Sheets[sheetName] = newWs;
    console.log(`  sheet "${sheetName}": ${nameMap.size} unique docentes replaced`);
  }

  const out = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  writeFileSync(abs, out);
  console.log(`✔ ${path} anonymized (${nameMap.size} unique names)`);
}

console.log('Anonymizing xlsx files in data/...\n');
for (const f of FILES) anonymize(f);
console.log('\nDone. Verify contents, then commit the replacements.');
