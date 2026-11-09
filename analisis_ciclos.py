import sys, os, re
from html.parser import HTMLParser
from pathlib import Path
from collections import defaultdict

# ─── ESCALAS ───────────────────────────────────────────────────────────────
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

CAL_SHORT = {
    'DESTACADO': 'DEST', 'BUENO': 'BUEN', 'ACEPTABLE': 'ACEP', 'INSATISFACTORIO': 'INSA',
    'EXCELENTE': 'EXCE', 'MUY_SATISFACTORIO': 'M.SAT', 'SATISFACTORIO': 'SAT.',
    'MUY_INSATISFACTORIO': 'M.IN',
}

# ─── MAPEO FACULTAD ─────────────────────────────────────────────────────────
FACULTAD_MAP = {
    'administracion de empresas': 'FACEM',
    'administracion de negocios internacionales': 'FACEM',
    'administracion turístico-hotelera': 'FACEM',
    'administracion turistico-hotelera': 'FACEM',
    'ingeniería comercial': 'FACEM',
    'ingenieria comercial': 'FACEM',
    'ciencias contables y financieras': 'FACEM',
    'economía': 'FACEM',
    'economia': 'FACEM',
    'negocios internacionales': 'FACEM',
    'ingeniería civil': 'FAING',
    'ingenieria civil': 'FAING',
    'ingeniería de sistemas': 'FAING',
    'ingenieria de sistemas': 'FAING',
    'ingeniería electrónica': 'FAING',
    'ingenieria electronica': 'FAING',
    'ingeniería agroindustrial': 'FAING',
    'ingenieria agroindustrial': 'FAING',
    'ingeniería ambiental': 'FAING',
    'ingenieria ambiental': 'FAING',
    'ingeniería industrial': 'FAING',
    'ingenieria industrial': 'FAING',
    'derecho': 'FADE',
    'educación inicial': 'FAEDCOH',
    'educacion inicial': 'FAEDCOH',
    'educación primaria': 'FAEDCOH',
    'educacion primaria': 'FAEDCOH',
    'educación física y deportes': 'FAEDCOH',
    'educacion fisica y deportes': 'FAEDCOH',
    'ciencias de la comunicación': 'FAEDCOH',
    'ciencias de la comunicacion': 'FAEDCOH',
    'psicología': 'FAEDCOH',
    'psicologia': 'FAEDCOH',
    'arquitectura': 'FAU',
    'medicina humana': 'FACSA',
    'odontología': 'FACSA',
    'odontologia': 'FACSA',
    'laboratorio clínico y anatomía patológica': 'FACSA',
    'laboratorio clinico y anatomia patologica': 'FACSA',
    'terapia física y rehabilitación': 'FACSA',
    'terapia fisica y rehabilitacion': 'FACSA',
}

FACULTAD_NOMBRES = {
    'FADE':    'Derecho y Ciencias Políticas',
    'FAEDCOH': 'Educación, C. Comunicación y Humanidades',
    'FAING':   'Ingeniería',
    'FACEM':   'Ciencias Empresariales',
    'FAU':     'Arquitectura y Urbanismo',
    'FACSA':   'Ciencias de la Salud',
}

class XLSParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.in_td = False
        self.current_row = []
        self.rows = []
        self.current_text = ''
        self.h1_texts = []
        self.in_h1 = False
        self.in_div = False
        self.div_texts = []

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
            self.h1_texts.append(self.current_text.strip())
            self.in_h1 = False
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

    carrera = ''
    for d in p.div_texts:
        for prefix in ['Escuela Profesional:', 'Carrera:', 'Programa:']:
            if prefix in d:
                carrera = d.split(prefix, 1)[1].strip()
                break
        if carrera:
            break

    # 2026-II usa escala 0-50 (10 items x 5pts), normalizar a vigesimal
    factor = 0.4 if ciclo >= '2026-II' else 1.0

    docentes = []
    header_found = False
    for row in p.rows:
        clean = [c.strip() for c in row]
        if len(clean) >= 11 and 'DOCENTE' in clean[0].upper():
            header_found = True
            continue
        if header_found and len(clean) >= 11 and clean[0] and clean[4]:
            try:
                nota_raw = float(clean[4])
                nota = nota_raw * factor
                enc = int(clean[10]) if clean[10].isdigit() else 0
                try:
                    no_enc = int(clean[11])
                except:
                    no_enc = 0
                # Excluir secciones sin encuestados (quorum 0)
                if enc == 0:
                    continue
                ae01 = (float(clean[6]) if clean[6] else 0) * factor
                ae02 = (float(clean[7]) if clean[7] else 0) * factor
                ae03 = (float(clean[8]) if clean[8] else 0) * factor
                ae04 = (float(clean[9]) if clean[9] else 0) * factor
                docentes.append({
                    'docente': clean[0],
                    'curso': clean[2],
                    'nota': nota,
                    'calificacion': calcular_calificacion(nota, ciclo),
                    'ae01': ae01, 'ae02': ae02, 'ae03': ae03, 'ae04': ae04,
                    'encuestados': enc,
                    'no_encuestados': no_enc,
                })
            except:
                pass

    return carrera, docentes

def normalizar(s):
    """Remove accents for fuzzy matching."""
    import unicodedata
    return ''.join(
        c for c in unicodedata.normalize('NFD', s)
        if unicodedata.category(c) != 'Mn'
    ).lower().strip()

def get_facultad(carrera):
    key = normalizar(carrera)
    # Remove common prefixes
    for prefix in ['escuela profesional de ', 'carrera de ', 'programa de ']:
        if key.startswith(prefix):
            key_short = key[len(prefix):]
            if key_short in FACULTAD_MAP:
                return FACULTAD_MAP[key_short]
    # exact normalized match
    if key in FACULTAD_MAP:
        return FACULTAD_MAP[key]
    # substring match (normalized)
    for k, v in FACULTAD_MAP.items():
        if k in key:
            return v
    return 'OTRAS'

def prom(lst):
    return sum(lst) / len(lst) if lst else 0

# ─── LEER TODOS LOS ARCHIVOS ────────────────────────────────────────────────
BASE = Path(r'C:\Users\User\Desktop\construccionI\tuopinioncuentaUPT\data')
CICLOS = ['2025-II', '2026-I', '2026-II']

data = {}
for ciclo in CICLOS:
    data[ciclo] = {}
    folder = BASE / ciclo
    for f in sorted(folder.glob('*.xls')):
        carrera, docentes = parse_file(f, ciclo)
        if carrera and docentes:
            data[ciclo][carrera] = docentes

# ─── RESUMEN INSTITUCIONAL ───────────────────────────────────────────────────
print('=' * 72)
print('  ANÁLISIS COMPARATIVO "TU OPINIÓN CUENTA" — 3 CICLOS')
print('=' * 72)

inst = {}
for ciclo in CICLOS:
    notas, enc_t, no_enc_t, n_docs = [], 0, 0, 0
    ae1, ae2, ae3, ae4 = [], [], [], []
    for carrera, docs in data[ciclo].items():
        for d in docs:
            notas.append(d['nota'])
            enc_t += d['encuestados']
            no_enc_t += d['no_encuestados']
            n_docs += 1
            ae1.append(d['ae01']); ae2.append(d['ae02'])
            ae3.append(d['ae03']); ae4.append(d['ae04'])
    total = enc_t + no_enc_t
    inst[ciclo] = {
        'notas': notas, 'enc': enc_t, 'no_enc': no_enc_t,
        'n_docs': n_docs, 'n_carreras': len(data[ciclo]),
        'ae1': ae1, 'ae2': ae2, 'ae3': ae3, 'ae4': ae4,
    }

print('\n1. RESUMEN INSTITUCIONAL')
print(f"  {'Indicador':<35} {'2025-II':>12} {'2026-I':>12} {'2026-II':>12}")
print('  ' + '-'*72)
for label, key in [('Carreras evaluadas','n_carreras'),('Secciones docentes evaluadas','n_docs')]:
    vals = [str(inst[c][key]) for c in CICLOS]
    print(f"  {label:<35} {vals[0]:>12} {vals[1]:>12} {vals[2]:>12}")

for ciclo in CICLOS:
    total = inst[ciclo]['enc'] + inst[ciclo]['no_enc']
    inst[ciclo]['total'] = total
    inst[ciclo]['part_pct'] = inst[ciclo]['enc']/total*100 if total > 0 else 0
    inst[ciclo]['prom'] = prom(inst[ciclo]['notas'])
    inst[ciclo]['cal'] = calcular_calificacion(inst[ciclo]['prom'], ciclo)

encs = [f"{inst[c]['enc']:,}" for c in CICLOS]
tots = [f"{inst[c]['total']:,}" for c in CICLOS]
parts = [f"{inst[c]['part_pct']:.1f}%" for c in CICLOS]
proms = [f"{inst[c]['prom']:.2f}" for c in CICLOS]
cals = [CAL_SHORT.get(inst[c]['cal'], inst[c]['cal'][:6]) for c in CICLOS]
print(f"  {'Encuestados':35} {encs[0]:>12} {encs[1]:>12} {encs[2]:>12}")
print(f"  {'Total matriculados':35} {tots[0]:>12} {tots[1]:>12} {tots[2]:>12}")
print(f"  {'Participación':35} {parts[0]:>12} {parts[1]:>12} {parts[2]:>12}")
print(f"  {'Nota promedio institucional':35} {proms[0]:>12} {proms[1]:>12} {proms[2]:>12}")
print(f"  {'Calificación':35} {cals[0]:>12} {cals[1]:>12} {cals[2]:>12}")

# AE
print()
for ae_key, label in [('ae1','AE-01 Contenido silábico'),('ae2','AE-02 Proceso E-A'),('ae3','AE-03 Evaluación'),('ae4','AE-04 Actitudinal')]:
    vals = [f"{prom(inst[c][ae_key]):.2f}" for c in CICLOS]
    print(f"  {label:<35} {vals[0]:>12} {vals[1]:>12} {vals[2]:>12}")

# ─── POR FACULTAD ────────────────────────────────────────────────────────────
print('\n\n2. PROMEDIO POR FACULTAD')
print(f"  {'Facultad':<40} {'2025-II':>12} {'2026-I':>12} {'2026-II':>12}")
print('  ' + '-'*72)

ORDEN_FAC = ['FADE', 'FAEDCOH', 'FAING', 'FACEM', 'FAU', 'FACSA']
for fac in ORDEN_FAC:
    row = f"  {fac+' '+FACULTAD_NOMBRES.get(fac,'')[:33]:<40}"
    for ciclo in CICLOS:
        notas = []
        for carrera, docs in data[ciclo].items():
            if get_facultad(carrera) == fac:
                notas.extend([d['nota'] for d in docs])
        if notas:
            p = prom(notas)
            c = CAL_SHORT.get(calcular_calificacion(p, ciclo), '')
            row += f" {p:6.2f} {c:>5}"
        else:
            row += f" {'-----':>12}"
    print(row)

# ─── POR CARRERA ─────────────────────────────────────────────────────────────
print('\n\n3. PROMEDIO POR CARRERA')
todas_carreras = set()
for ciclo in CICLOS:
    todas_carreras.update(data[ciclo].keys())

carreras_por_fac = defaultdict(list)
for c in sorted(todas_carreras):
    carreras_por_fac[get_facultad(c)].append(c)

for fac in ORDEN_FAC:
    if fac not in carreras_por_fac: continue
    print(f'\n  [{fac}] {FACULTAD_NOMBRES.get(fac,"")}')
    for carrera in sorted(carreras_por_fac[fac]):
        line = f"    {carrera[:40]:40s}"
        vals = []
        for ciclo in CICLOS:
            docs = data[ciclo].get(carrera, [])
            if docs:
                p = prom([d['nota'] for d in docs])
                cal = calcular_calificacion(p, ciclo)
                s = CAL_SHORT.get(cal, cal[:4])
                line += f" | {p:5.2f} {s:<5}"
                vals.append(p)
            else:
                line += f" | ----- -----"
                vals.append(None)
        # tendencia
        v_validos = [v for v in vals if v is not None]
        if len(v_validos) >= 2:
            diff = v_validos[-1] - v_validos[0]
            arrow = '(+)' if diff > 0.5 else '(-)' if diff < -0.5 else '(=)'
            line += f"  {arrow} {diff:+.2f}"
        print(line)

# ─── DISTRIBUCIÓN POR CALIFICACIÓN ───────────────────────────────────────────
print('\n\n4. DISTRIBUCIÓN DE SECCIONES POR CALIFICACIÓN')
for ciclo in CICLOS:
    dist = defaultdict(int)
    total_secciones = 0
    for carrera, docs in data[ciclo].items():
        for d in docs:
            dist[d['calificacion']] += 1
            total_secciones += 1
    print(f'\n  {ciclo} (total secciones: {total_secciones})')
    if ciclo >= '2026-II':
        orden = ['EXCELENTE','MUY_SATISFACTORIO','SATISFACTORIO','INSATISFACTORIO','MUY_INSATISFACTORIO']
    else:
        orden = ['DESTACADO','BUENO','ACEPTABLE','INSATISFACTORIO']
    for cal in orden:
        n = dist.get(cal, 0)
        pct = n/total_secciones*100 if total_secciones > 0 else 0
        bar = '#' * int(pct/2)
        print(f"    {cal:<22} {n:>4} ({pct:5.1f}%) {bar}")

# ─── TOP/BOTTOM CARRERAS ──────────────────────────────────────────────────────
print('\n\n5. CARRERAS DESTACADAS Y REZAGADAS (por nota promedio en cada ciclo)')
for ciclo in CICLOS:
    items = []
    for carrera, docs in data[ciclo].items():
        p = prom([d['nota'] for d in docs])
        items.append((p, carrera))
    items.sort(reverse=True)
    print(f'\n  {ciclo}:')
    print('    TOP 3:')
    for p, c in items[:3]:
        cal = CAL_SHORT.get(calcular_calificacion(p, ciclo), '')
        print(f'      {p:.2f} {cal}  {c}')
    print('    BOTTOM 3:')
    for p, c in items[-3:]:
        cal = CAL_SHORT.get(calcular_calificacion(p, ciclo), '')
        print(f'      {p:.2f} {cal}  {c}')

# ─── PARTICIPACIÓN POR FACULTAD ───────────────────────────────────────────────
print('\n\n6. PARTICIPACIÓN (ENCUESTADOS) POR FACULTAD')
print(f"  {'Facultad':<40} {'2025-II':>14} {'2026-I':>14} {'2026-II':>14}")
print('  ' + '-'*82)
for fac in ORDEN_FAC:
    row = f"  {fac:<40}"
    for ciclo in CICLOS:
        enc_tot, total = 0, 0
        for carrera, docs in data[ciclo].items():
            if get_facultad(carrera) == fac:
                for d in docs:
                    enc_tot += d['encuestados']
                    total += d['encuestados'] + d['no_encuestados']
        if total > 0:
            pct = enc_tot/total*100
            row += f"  {enc_tot:>5}/{total:<5} {pct:4.1f}%"
        else:
            row += f"  {'-----':>14}"
    print(row)


# ─── INVESTIGACION FACSA CAIDA 2026-II ───────────────────────────────────────
print('\n\n7. DETALLE FACSA 2026-II (caida significativa)')
for carrera, docs in sorted(data['2026-II'].items()):
    if get_facultad(carrera) != 'FACSA':
        continue
    all_n = [d['nota'] for d in docs]
    print(f'\n  {carrera}: {len(docs)} secciones, prom={prom(all_n):.2f}')
    low = [d for d in docs if d['nota'] < 12.0]
    if low:
        print(f'    Secciones con nota < 12 ({len(low)}):')
        for d in sorted(low, key=lambda x: x['nota']):
            print(f'      {d["nota"]:.2f}  {d["docente"][:35]}  enc:{d["encuestados"]}')

# ─── CARRERAS SIN FACULTAD ASIGNADA ──────────────────────────────────────────
otras = set()
for ciclo in CICLOS:
    for carrera in data[ciclo]:
        if get_facultad(carrera) == 'OTRAS':
            otras.add(carrera)
if otras:
    print('\n\nAVISO: carreras sin facultad asignada (revisar mapeo):')
    for c in sorted(otras):
        print(f'  - {c}')

print('\n' + '=' * 72)
print('  FIN DEL ANALISIS')
print('=' * 72)
