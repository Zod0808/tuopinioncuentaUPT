"""
Genera archivos .xlsx listos para importar en la app Tu Opinion Cuenta.
Formato esperado por ExcelImporter: FACULTAD, CARRERA PROFESIONAL, DOCENTE,
CURSO, SECCION, NOTA, AE-01, AE-02, AE-03, AE-04, ENCUESTADOS, NO ENCUESTADOS, VALIDEZ
"""
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

# ─── ESCALAS ─────────────────────────────────────────────────────────────────
def calcular_calificacion(nota, ciclo):
    if ciclo >= '2026-II':
        if nota >= 18.0: return 'EXCELENTE'
        if nota >= 15.0: return 'MUY_SATISFACTORIO'
        if nota >= 12.0: return 'SATISFACTORIO'
        if nota >= 8.0:  return 'INSATISFACTORIO'
        return 'MUY_INSATISFACTORIO'
    else:
        if nota > 17.0: return 'DESTACADO'
        if nota > 15.0: return 'BUENO'
        if nota >= 11.0: return 'ACEPTABLE'
        return 'INSATISFACTORIO'

def norm(s):
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    ).lower().strip()

# ─── VALIDEZ ─────────────────────────────────────────────────────────────────
def calcular_validez(encuestados, no_encuestados, ciclo):
    total = encuestados + no_encuestados
    if encuestados < 3:
        return 'No válido'
    if total <= 0:
        return 'No válido'
    pct = encuestados / total
    if ciclo >= '2026-II':
        # Umbral variable Art. 23 Res. 245-2026
        if total <= 10:   umbral = 0.70
        elif total <= 30: umbral = 0.50
        else:             umbral = 0.40
    else:
        umbral = 0.50  # reglamento anterior
    return 'Válido' if pct >= umbral else 'No válido'

# ─── MAPEO CANÓNICO ──────────────────────────────────────────────────────────
# (clave normalizada sin acentos → (código facultad, nombre canónico carrera))
CANON_CARRERAS = {
    # FADE
    'derecho': ('FADE', 'Escuela Profesional de Derecho'),
    'escuela profesional de derecho': ('FADE', 'Escuela Profesional de Derecho'),
    # FAEDCOH
    'educacion inicial': ('FAEDCOH', 'Carrera de Educación Inicial'),
    'carrera de educacion inicial': ('FAEDCOH', 'Carrera de Educación Inicial'),
    'educacion primaria': ('FAEDCOH', 'Carrera de Educación Primaria'),
    'carrera de educacion primaria': ('FAEDCOH', 'Carrera de Educación Primaria'),
    'educacion fisica y deportes': ('FAEDCOH', 'Carrera de Educación Física y Deportes'),
    'carrera de educacion fisica y deportes': ('FAEDCOH', 'Carrera de Educación Física y Deportes'),
    'ciencias de la comunicacion': ('FAEDCOH', 'Escuela Profesional de Ciencias de la Comunicación'),
    'escuela profesional de ciencias de la comunicacion': ('FAEDCOH', 'Escuela Profesional de Ciencias de la Comunicación'),
    'psicologia': ('FAEDCOH', 'Carrera de Psicología'),
    'carrera de psicologia': ('FAEDCOH', 'Carrera de Psicología'),
    # FAING
    'ingenieria civil': ('FAING', 'Escuela Profesional de Ingeniería Civil'),
    'escuela profesional de ingenieria civil': ('FAING', 'Escuela Profesional de Ingeniería Civil'),
    'ingenieria de sistemas': ('FAING', 'Escuela Profesional de Ingeniería de Sistemas'),
    'escuela profesional de ingenieria de sistemas': ('FAING', 'Escuela Profesional de Ingeniería de Sistemas'),
    'ingenieria electronica': ('FAING', 'Escuela Profesional de Ingeniería Electrónica'),
    'escuela profesional de ingenieria electronica': ('FAING', 'Escuela Profesional de Ingeniería Electrónica'),
    'ingenieria agroindustrial': ('FAING', 'Escuela Profesional de Ingeniería Agroindustrial'),
    'escuela profesional de ingenieria agroindustrial': ('FAING', 'Escuela Profesional de Ingeniería Agroindustrial'),
    'ingenieria ambiental': ('FAING', 'Escuela Profesional de Ingeniería Ambiental'),
    'escuela profesional de ingenieria ambiental': ('FAING', 'Escuela Profesional de Ingeniería Ambiental'),
    'ingenieria industrial': ('FAING', 'Escuela Profesional de Ingeniería Industrial'),
    'escuela profesional de ingenieria industrial': ('FAING', 'Escuela Profesional de Ingeniería Industrial'),
    # FACEM
    'ingenieria comercial': ('FACEM', 'Escuela Profesional de Ingeniería Comercial'),
    'escuela profesional de ingenieria comercial': ('FACEM', 'Escuela Profesional de Ingeniería Comercial'),
    'ciencias contables y financieras': ('FACEM', 'Escuela Profesional de Ciencias Contables y Financieras'),
    'escuela profesional de ciencias contables y financieras': ('FACEM', 'Escuela Profesional de Ciencias Contables y Financieras'),
    'economia': ('FACEM', 'Escuela Profesional de Economía'),
    'escuela profesional de economia': ('FACEM', 'Escuela Profesional de Economía'),
    'administracion de negocios internacionales': ('FACEM', 'Administración de Negocios Internacionales'),
    'negocios internacionales': ('FACEM', 'Administración de Negocios Internacionales'),
    'administracion turistico-hotelera': ('FACEM', 'Administración Turístico-Hotelera'),
    'administracion turístico-hotelera': ('FACEM', 'Administración Turístico-Hotelera'),
    'administracion de empresas': ('FACEM', 'Administración de Empresas'),
    # FAU
    'arquitectura': ('FAU', 'Escuela Profesional de Arquitectura'),
    'escuela profesional de arquitectura': ('FAU', 'Escuela Profesional de Arquitectura'),
    # FACSA
    'medicina humana': ('FACSA', 'Escuela Profesional de Medicina Humana'),
    'escuela profesional de medicina humana': ('FACSA', 'Escuela Profesional de Medicina Humana'),
    'odontologia': ('FACSA', 'Escuela Profesional de Odontología'),
    'escuela profesional de odontologia': ('FACSA', 'Escuela Profesional de Odontología'),
    'laboratorio clinico y anatomia patologica': ('FACSA', 'Laboratorio Clínico y Anatomía Patológica'),
    'terapia fisica y rehabilitacion': ('FACSA', 'Terapia Física y Rehabilitación'),
}

def resolver_carrera(carrera_xls):
    key = norm(carrera_xls)
    if key in CANON_CARRERAS:
        return CANON_CARRERAS[key]
    # Partial match (buscar la clave que mas coincide)
    best, best_score = None, 0
    for k, v in CANON_CARRERAS.items():
        if k in key or key in k:
            score = len(set(k.split()) & set(key.split()))
            if score > best_score:
                best, best_score = v, score
    return best if best else ('OTRAS', carrera_xls)

# ─── PARSER HTML/XLS ─────────────────────────────────────────────────────────
class XLSParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = self.in_h1 = self.in_div = False
        self.current_row, self.rows = [], []
        self.current_text = ''
        self.h1_texts, self.div_texts = [], []

    def handle_starttag(self, tag, attrs):
        if tag == 'td': self.in_td = True; self.current_text = ''
        if tag == 'tr': self.current_row = []
        if tag == 'h1': self.in_h1 = True; self.current_text = ''
        if tag == 'div': self.in_div = True; self.current_text = ''

    def handle_endtag(self, tag):
        if tag == 'td':
            self.current_row.append(self.current_text.strip())
            self.in_td = False
        if tag == 'tr':
            if any(self.current_row): self.rows.append(self.current_row[:])
        if tag == 'h1':
            self.h1_texts.append(self.current_text.strip()); self.in_h1 = False
        if tag == 'div':
            if self.current_text.strip(): self.div_texts.append(self.current_text.strip())
            self.in_div = False

    def handle_data(self, data):
        if self.in_td or self.in_h1 or self.in_div:
            self.current_text += data

def parse_file(filepath, ciclo):
    with open(filepath, 'rb') as f:
        content = f.read().decode('utf-8', errors='replace')
    p = XLSParser()
    p.feed(content)

    carrera_xls = ''
    for d in p.div_texts:
        for prefix in ['Escuela Profesional:', 'Carrera:', 'Programa:']:
            if prefix in d:
                carrera_xls = d.split(prefix, 1)[1].strip()
                break
        if carrera_xls:
            break

    factor = 0.4 if ciclo >= '2026-II' else 1.0
    rows_out = []
    header_found = False
    for row in p.rows:
        clean = [c.strip() for c in row]
        if len(clean) >= 11 and 'DOCENTE' in clean[0].upper():
            header_found = True
            continue
        if header_found and len(clean) >= 11 and clean[0] and clean[4]:
            try:
                nota_raw = float(clean[4])
                nota = round(nota_raw * factor, 2)
                enc = int(clean[10]) if clean[10].isdigit() else 0
                try:
                    no_enc = int(clean[11])
                except:
                    no_enc = 0
                if enc == 0:
                    continue
                ae01 = round((float(clean[6]) if clean[6] else 0) * factor, 2)
                ae02 = round((float(clean[7]) if clean[7] else 0) * factor, 2)
                ae03 = round((float(clean[8]) if clean[8] else 0) * factor, 2)
                ae04 = round((float(clean[9]) if clean[9] else 0) * factor, 2)
                rows_out.append({
                    'docente': clean[0],
                    'curso':   clean[2],
                    'seccion': clean[3],
                    'nota': nota,
                    'calificacion': calcular_calificacion(nota, ciclo),
                    'ae01': ae01, 'ae02': ae02, 'ae03': ae03, 'ae04': ae04,
                    'encuestados': enc,
                    'no_encuestados': no_enc,
                    'validez': calcular_validez(enc, no_enc, ciclo),
                })
            except:
                pass
    return carrera_xls, rows_out

# ─── ESTILOS EXCEL ───────────────────────────────────────────────────────────
HDR_FILL   = PatternFill('solid', fgColor='1a365d')
HDR_FONT   = Font(bold=True, color='FFFFFF', size=10)
ROW_FILL1  = PatternFill('solid', fgColor='EBF0FA')
ROW_FILL2  = PatternFill('solid', fgColor='FFFFFF')
THIN       = Side(style='thin', color='CCCCCC')
THIN_BRD   = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)

HEADERS = [
    'FACULTAD', 'CARRERA PROFESIONAL', 'DOCENTE', 'CURSO', 'SECCIÓN',
    'NOTA', 'CALIFICACIÓN', 'AE-01', 'AE-02', 'AE-03', 'AE-04',
    'ENCUESTADOS', 'NO ENCUESTADOS', 'VALIDEZ',
]
COL_WIDTHS = [10, 38, 36, 38, 9, 7, 20, 7, 7, 7, 7, 13, 15, 12]

CAL_COLORS = {
    'DESTACADO':          'C6EFCE',
    'BUENO':              'FFEB9C',
    'ACEPTABLE':          'FFCC99',
    'INSATISFACTORIO':    'FFC7CE',
    'EXCELENTE':          'C6EFCE',
    'MUY_SATISFACTORIO':  'D9F5E0',
    'SATISFACTORIO':      'FFEB9C',
    'MUY_INSATISFACTORIO':'FFC7CE',
}

def crear_excel(ciclo, all_rows):
    wb = Workbook()
    ws = wb.active
    ws.title = ciclo

    # Cabecera
    for col, (hdr, width) in enumerate(zip(HEADERS, COL_WIDTHS), start=1):
        cell = ws.cell(row=1, column=col, value=hdr)
        cell.font = HDR_FONT
        cell.fill = HDR_FILL
        cell.alignment = Alignment(horizontal='center', vertical='center', wrap_text=True)
        cell.border = THIN_BRD
        ws.column_dimensions[ws.cell(row=1, column=col).column_letter].width = width
    ws.row_dimensions[1].height = 30
    ws.freeze_panes = 'A2'

    # Datos
    for i, r in enumerate(all_rows, start=2):
        fill = ROW_FILL1 if i % 2 == 0 else ROW_FILL2
        cal_color = PatternFill('solid', fgColor=CAL_COLORS.get(r['calificacion'], 'FFFFFF'))

        values = [
            r['facultad_code'], r['carrera_canon'],
            r['docente'], r['curso'], r['seccion'],
            r['nota'], r['calificacion'],
            r['ae01'], r['ae02'], r['ae03'], r['ae04'],
            r['encuestados'], r['no_encuestados'], r['validez'],
        ]
        for col, val in enumerate(values, start=1):
            cell = ws.cell(row=i, column=col, value=val)
            cell.border = THIN_BRD
            cell.alignment = Alignment(vertical='center')
            if col == 7:  # CALIFICACIÓN
                cell.fill = cal_color
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif col in (1, 2, 5, 12, 13, 14):
                cell.alignment = Alignment(horizontal='center', vertical='center')
            elif col in (6, 8, 9, 10, 11):
                cell.number_format = '0.00'
                cell.alignment = Alignment(horizontal='center', vertical='center')
            else:
                cell.fill = fill

    # Hoja Info
    ws_info = wb.create_sheet('Info')
    ws_info['A1'] = 'Ciclo'
    ws_info['B1'] = ciclo
    ws_info['A2'] = 'Total secciones'
    ws_info['B2'] = len(all_rows)
    ws_info['A3'] = 'Secciones Válidas'
    ws_info['B3'] = sum(1 for r in all_rows if r['validez'] == 'Válido')
    ws_info['A4'] = 'Escala'
    ws_info['B4'] = 'Reglamento 2026 (5 niveles)' if ciclo >= '2026-II' else 'Legacy (4 niveles)'
    ws_info['A5'] = 'Nota mínima observada'
    ws_info['B5'] = round(min(r['nota'] for r in all_rows), 2) if all_rows else 0
    ws_info['A6'] = 'Nota máxima observada'
    ws_info['B6'] = round(max(r['nota'] for r in all_rows), 2) if all_rows else 0
    ws_info['A7'] = 'Nota promedio'
    ws_info['B7'] = round(sum(r['nota'] for r in all_rows) / len(all_rows), 2) if all_rows else 0
    ws_info['A8'] = 'AE descripciones'
    ws_info['B8'] = 'AE-01: Responsabilidad/planif | AE-02: Estrategias/TIC | AE-03: Evaluación/retroalim | AE-04: Clima aula' if ciclo >= '2026-II' else 'AE-01: Cont. silábico | AE-02: Proc. E-A | AE-03: Evaluación | AE-04: Actitudinal'

    return wb

# ─── MAIN ────────────────────────────────────────────────────────────────────
BASE   = Path(r'C:\Users\User\Desktop\construccionI\tuopinioncuentaUPT\data')
OUT    = Path(r'C:\Users\User\Desktop\construccionI\tuopinioncuentaUPT\data\imports')
OUT.mkdir(exist_ok=True)

CICLOS = ['2025-II', '2026-I', '2026-II']

for ciclo in CICLOS:
    all_rows = []
    unmatched = set()
    folder = BASE / ciclo

    for filepath in sorted(folder.glob('*.xls')):
        carrera_xls, docentes = parse_file(filepath, ciclo)
        if not carrera_xls or not docentes:
            print(f'  [SKIP] {filepath.name}: sin datos')
            continue

        fac_code, carrera_canon = resolver_carrera(carrera_xls)
        if fac_code == 'OTRAS':
            unmatched.add(carrera_xls)

        for d in docentes:
            all_rows.append({
                **d,
                'facultad_code':  fac_code,
                'carrera_canon':  carrera_canon,
            })

    # Ordenar: facultad, carrera, docente, curso
    all_rows.sort(key=lambda r: (r['facultad_code'], r['carrera_canon'], r['docente'], r['curso']))

    out_path = OUT / f'TOC_{ciclo}_import.xlsx'
    wb = crear_excel(ciclo, all_rows)
    wb.save(out_path)

    validas = sum(1 for r in all_rows if r['validez'] == 'Válido')
    notas = [r['nota'] for r in all_rows]
    prom = sum(notas)/len(notas) if notas else 0

    print(f'\n{ciclo}:')
    print(f'  Secciones:  {len(all_rows):>5}  ({validas} válidas, {len(all_rows)-validas} no válidas)')
    print(f'  Nota prom:  {prom:.2f}  ({calcular_calificacion(prom, ciclo)})')
    print(f'  Archivo:    {out_path.name}')
    if unmatched:
        print(f'  AVISO sin mapeo: {unmatched}')

print(f'\nArchivos generados en: {OUT}')
