// Genera data/imports/MATRICULADOS_2026-II.xlsx con los datos ya conocidos
// Ejecutar UNA sola vez: node generar-matriculados-xlsx.mjs

import ExcelJS from 'exceljs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA = [
  ['FADE',    'Escuela Profesional de Derecho',                            1409, 1341],
  ['FAEDCOH', 'Carrera de Educación Inicial',                              159,  126 ],
  ['FAEDCOH', 'Carrera de Educación Primaria',                             58,   48  ],
  ['FAEDCOH', 'Carrera de Educación Física y Deportes',                    107,  86  ],
  ['FAEDCOH', 'Escuela Profesional de Ciencias de la Comunicación',        120,  105 ],
  ['FAEDCOH', 'Carrera de Psicología',                                     745,  674 ],
  ['FAING',   'Escuela Profesional de Ingeniería Civil',                   754,  688 ],
  ['FAING',   'Escuela Profesional de Ingeniería de Sistemas',             325,  255 ],
  ['FAING',   'Escuela Profesional de Ingeniería Electrónica',             73,   47  ],
  ['FAING',   'Escuela Profesional de Ingeniería Agroindustrial',          21,   11  ],
  ['FAING',   'Escuela Profesional de Ingeniería Ambiental',               137,  117 ],
  ['FAING',   'Escuela Profesional de Ingeniería Industrial',              227,  209 ],
  ['FACEM',   'Escuela Profesional de Ingeniería Comercial',               287,  241 ],
  ['FACEM',   'Escuela Profesional de Ciencias Contables y Financieras',   330,  292 ],
  ['FACEM',   'Escuela Profesional de Economía',                           94,   81  ],
  ['FACEM',   'Administración de Negocios Internacionales',                405,  350 ],
  ['FACEM',   'Administración Turístico-Hotelera',                         86,   72  ],
  ['FACEM',   'Administración de Empresas',                                46,   40  ],
  ['FAU',     'Escuela Profesional de Arquitectura',                       534,  395 ],
  ['FACSA',   'Escuela Profesional de Medicina Humana',                    347,  283 ],
  ['FACSA',   'Escuela Profesional de Odontología',                        215,  197 ],
  ['FACSA',   'Laboratorio Clínico y Anatomía Patológica',                 109,  98  ],
  ['FACSA',   'Terapia Física y Rehabilitación',                           159,  140 ],
];

const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Matriculados');

ws.columns = [
  { header: 'FACULTAD',     key: 'facultad',     width: 12 },
  { header: 'CARRERA',      key: 'carrera',      width: 55 },
  { header: 'MATRICULADOS', key: 'matriculados', width: 15 },
  { header: 'ENCUESTADOS',  key: 'encuestados',  width: 15 },
];

// Estilo de cabecera
ws.getRow(1).font = { bold: true };
ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF003087' } };
ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

DATA.forEach(([facultad, carrera, matriculados, encuestados]) => {
  ws.addRow({ facultad, carrera, matriculados, encuestados });
});

const outPath = path.join(__dirname, 'data', 'imports', 'MATRICULADOS_2026-II.xlsx');
await wb.xlsx.writeFile(outPath);
console.log(`✅ Creado: data/imports/MATRICULADOS_2026-II.xlsx (${DATA.length} carreras)`);
console.log('\n📄 Úsalo como plantilla para otros ciclos:');
console.log('   1. Copia el archivo y renómbralo a MATRICULADOS_2026-I.xlsx, etc.');
console.log('   2. Edita los valores de MATRICULADOS y ENCUESTADOS');
console.log('   3. Ejecuta: node import-matriculados-2026II.mjs');
