/**
 * ============================================================================
 * Tu Opinión Cuenta — Facultad de Ciencias de la Salud (FACSA)
 * Generador automático del Google Form de evaluación docente
 * Universidad Privada de Tacna — Vicerrectorado Académico — Periodo 2026-II
 * Base: Res. N° 245-2026-UPT-CU, Anexo 05
 * ============================================================================
 *
 * CÓMO USAR:
 * 1. Entra a https://script.google.com y crea un proyecto nuevo (New project).
 * 2. Borra el contenido por defecto y pega este archivo completo.
 * 3. Haz clic en ▶ Run y selecciona la función `crearFormularioFACSA`.
 * 4. Autoriza los permisos (Forms + Drive) la primera vez.
 * 5. Revisa el panel Executions / Logs: se imprimen los enlaces de edición
 *    y de respuesta del formulario recién creado.
 *
 * FLUJO DEL ESTUDIANTE:
 *   Sección 0 → selecciona Escuela
 *     → Sección Ciclo (filtrada por escuela) → selecciona Ciclo
 *       → Sección Curso (filtrada por escuela+ciclo) → selecciona Curso
 *         → Sección Docente (filtrada por escuela+ciclo+curso) → selecciona Docente
 *           → Secciones de evaluación AE-01 a AE-04
 *             → Sección de comentarios
 *
 * CÓMO COMPLETAR LOS DATOS:
 *   La estructura es: DOCENTES[Escuela][Ciclo][Curso] = [Lista de docentes]
 *   Consulta la hoja CARGA_DOCENTE (columnas: ESCUELA, CICLO, ASIGNATURA, DOCENTE)
 *   y agrupa cada docente bajo su asignatura correspondiente.
 * ============================================================================
 */

function crearFormularioFACSA() {

  // ── DATOS: Docentes vigentes 2026-II por Escuela, Ciclo y Curso ──────────
  // Estructura: DOCENTES[Escuela][Ciclo][Asignatura] = [Docentes]
  // Fuente: CARGA_DOCENTE hoja DOCENTES_POR_CICLO_FACSA_2026, ESTADO=Vigente
  const DOCENTES = {
    'Medicina Humana': {
      'II': {
        'BIOQUÍMICA': [
          'LARA LINCE PATRICIA DEL ROSARIO',
          'MORALES DE ROCA LA BARRERA JESSICA TRUDY',
          'TORRES PILCO RENATO',
          'ZEA GAMBOA FRANCISCO EDUARDO'
        ],
        'COMUNICACIÓN II': [
          'SANTANA PILCO JUANA'
        ],
        'DESARROLLO DE COMPETENCIAS DIGITALES': [
          'CONDORI CHAVEZ VERONICA JACQUELINE',
          'QUISPE CACERES NATIVIDAD'
        ],
        'DESARROLLO PERSONAL Y LIDERAZGO': [
          'RIVAROLA HIDALGO MARCO CARLOS ALEJANDRO'
        ],
        'EMBRIOLOGÍA': [
          'ARANIBAR GUTIERREZ JENNY GIOVANNA',
          'BARREDA QUISPE GIOVANA ROSARIO'
        ],
        'FILOSOFÍA': [
          'CARDOZA RAMIREZ CARLO ANDRE'
        ],
        'HISTOLOGÍA I': [
          'GUEVARA GUISA SERGIO CARLOS',
          'RIVAROLA HIDALGO MARCO CARLOS ALEJANDRO',
          'TORRES PILCO RENATO'
        ],
        'TERRITORIO PERUANO, DEFENSA Y SEGURIDAD NACIONAL': [
          'RAMOS SANCHEZ HUMBERTO CARLOS'
        ],
      },
      'III': {
        'GESTIÓN DE LA INFORMACIÓN CIENTÍFICA': [
          'MENA ORDOÑEZ SISSY SOLEDAD'
        ],
      },
      'IV': {
        'ANATOMÍA II': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'CALIZAYA CALIZAYA RAUL',
          'CARDENAS RUEDA PEDRO RONALD'
        ],
        'BIOESTADÍSTICA Y DEMOGRAFÍA': [
          'ARIAS SANTANA VICTOR ALFONSO',
          'MENA ORDOÑEZ SISSY SOLEDAD'
        ],
        'FISIOLOGÍA II': [
          'CRUZ MENDEZ PATRICIO',
          'GORDILLO MAYDANA PAULO CESAR',
          'SANCHEZ ESQUICHE WALTER MAURICIO'
        ],
        'INGLÉS MÉDICO': [
          'LAURA DE LA CRUZ KEVIN MARIO'
        ],
        'NUTRICIÓN': [
          'MEDINA PINTO DANIEL ALCIDES'
        ],
        'PRIMEROS AUXILIOS': [
          'ZEA O\'PHELAN CAMPOS FREDY'
        ],
        'PROCEDIMIENTOS DE ENFERMERÍA': [
          'CONDORI FERNANDEZ MARIA SUSANA',
          'SILVA CHAU RENEE VIOLETA'
        ],
        'PSICOLOGÍA': [
          'AGUIRRE MONTESINOS LISSETT ZUNILDA'
        ],
        'SALUD INTEGRAL': [
          'ANCALLI CALIZAYA FELIX',
          'CANEPA YZAGA JUAN MANUEL',
          'FLORES CANO VICTOR ALFREDO',
          'GIRON DAPPINO JUAN ALBERTO',
          'MONTESINOS SANCHEZ SERGIO JESUS',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'OTAZU ZAVALETA JORGE LUIS',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'VALDEZ SEGALES KARINA ELIZABETH',
          'VASQUEZ SILVA MARGGORIETT UZIELA',
          'YAGUA BRICEÑO JHON HERBERT'
        ],
      },
      'VI': {
        'BIOSEGURIDAD': [
          'YAGUA BRICEÑO JHON HERBERT'
        ],
        'INTRODUCCIÓN A LA AYUDA DIAGNÓSTICA': [
          'ERAS MERCADO ROBERTO ALEJANDRO',
          'HUEDA ZAVALETA MIGUEL ANGEL'
        ],
        'METODOLOGÍA DE LA INVESTIGACIÓN': [
          'ARIAS SANTANA VICTOR ALFONSO',
          'MENA ORDOÑEZ SISSY SOLEDAD',
          'MIRANDA CHAVEZ BRAYAN RAUL'
        ],
        'PATOLOGÍA GENERAL': [
          'AMBIA MARTINEZ JANINA NELLY',
          'TORRES PILCO RENATO',
          'ZEA GAMBOA FRANCISCO EDUARDO'
        ],
        'REANIMACIÓN CARDIOPULMONAR BÁSICA Y AVANZADA': [
          'PAREDES RAMOS JAVIER ALONSO'
        ],
        'SEMIOLOGÍA': [
          'ALVITES MANRIQUE RICARDO ARTURO',
          'CAPELLINO GAMBETTA ALEX RODRIGO ALBERTO',
          'CHAVEZ NUÑEZ MARIA LUZ',
          'CHAVEZ ZEGARRA LARISSA SVETLANA',
          'CURASI VELASQUEZ UBALDO LUIS',
          'DAVILA YUFRA ELIANA MAGALI',
          'GOMEZ ORTIZ RAUL DARIO',
          'GORDILLO MAYDANA PAULO CESAR',
          'OTAZU ZAVALETA JORGE LUIS',
          'PARI MAQUERA RODRIGO ADERLY',
          'VARGAS ANAHUA ORLANDO JOSE',
          'VARGAS MOLINEROS ALDO HUGO'
        ],
      },
      'VIII': {
        'AYUDA DIAGNÓSTICA II': [
          'ERAS MERCADO ROBERTO ALEJANDRO',
          'HUEDA ZAVALETA MIGUEL ANGEL'
        ],
        'MEDICINA II': [
          'ANTEZANA ROMAN AUGUSTO',
          'CONDORI VARGAS EDWIN CECILIO',
          'GALLARDO RECAVARREN CESAR JUVENAL',
          'LAURA MACHACA ROXANA LEIDY',
          'MENDOZA LAREDO JUAN ARTURO',
          'MOSCOSO ARANA KARINA',
          'RIVERA DE VELA REGINA RUTH',
          'TEJADA MONTES DAMASO',
          'VELASQUEZ MEZA ELEANNE RUHAYED',
          'ZEA O\'PHELAN CAMPOS FREDY'
        ],
        'PEDIATRÍA I': [
          'ARANA NUÑEZ JUANA MARIA',
          'CABALLERO CACERES CESAR ELISEO',
          'COHAILA SILVA SANDRA GABRIELA',
          'GUTIERREZ FLORES MAYKEL FERNANDO',
          'OJEDA LEWIS EDUARDO IVAN',
          'PACORI ACHATA JHON',
          'SAENZ CORDOVA CARLOS ALBERTO',
          'VICENTE QUISPE LUIS ALBERTO',
          'VILDOSO ZEVALLOS CARLO MAURICIO'
        ],
      },
      'X': {
        'ATENCIÓN PRIMARIA III': [
          'ANCALLI CALIZAYA FELIX',
          'CANEPA YZAGA JUAN MANUEL',
          'CHAVEZ NUÑEZ MARIA LUZ',
          'FLORES CANO VICTOR ALFREDO',
          'GIRON DAPPINO JUAN ALBERTO',
          'MONTESINOS SANCHEZ SERGIO JESUS',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'VALDEZ SEGALES KARINA ELIZABETH',
          'VASQUEZ SILVA MARGGORIETT UZIELA',
          'YAGUA BRICEÑO JHON HERBERT'
        ],
        'CIRUGÍA I': [
          'AVALOS ROJO ROSA LUZ',
          'CALLIRI MAMANI HENRY EFRAIN',
          'CHURA PINTO FRANCISCO JESUS',
          'FRANCO PEROCHENA PAOLA FERNANDA',
          'LANCHIPA PICOAGA CESAR FERNANDO',
          'MIRELES CANCINO VICTOR ARTURO',
          'NINAJA CALIZAYA WILBER',
          'RONDON MOSCOSO DIANA',
          'SAKUMA MIYASHIRO ISABEL',
          'SANCHEZ BARLETTI JUAN',
          'VARGAS GALDOS RICARDO'
        ],
        'MEDICINA IV': [
          'ACEVEDO VELASQUEZ RAQUEL EDITH',
          'ALIAGA DIAZ ELIZABETH GARBY',
          'FLORES CHIRE MIGUEL ANGEL',
          'GOMEZ ZAPANA GERSON',
          'GUZMAN OLIVERA WILSON RAUL',
          'MANCHEGO LLERENA JORGE',
          'MINCHON VIZCONDE DIANA JULISSA',
          'NEYRA TARQUI HERALDY EVELIN',
          'RAMOS PAREDES JUNIOR EDGAR',
          'URQUIZO PEREZ GREGORIO RUFINO',
          'ÑACA BAILON YACKELINE YENNY'
        ],
        'TALLER DE TESIS I': [
          'ARIAS SANTANA VICTOR ALFONSO',
          'MENA ORDOÑEZ SISSY SOLEDAD',
          'MIRANDA CHAVEZ BRAYAN RAUL'
        ],
      },
      'XII': {
        'BIOÉTICA': [
          'CARDOZA RAMIREZ CARLO ANDRE',
          'RIVAROLA HIDALGO MARCO CARLOS ALEJANDRO'
        ],
        'CIRUGÍA III': [
          'AGUILAR ROMERO TELESFORO FERNANDO',
          'CAÑARI CHUMPITAZ ANGELA MODESTA',
          'LOZANO MORALES LUIS ARNALDO',
          'MACHACA VALENZUELA DANIZZA LAURA',
          'MEDINA CHACON PERCY ANIBAL',
          'MENDOZA FLORES NELLY ROSARIO',
          'NUÑEZ ESPINEL BENJAMIN HUMBERTO',
          'PAMPA CAYO PLANIMIR',
          'PAREDES RAMOS JAVIER ALONSO',
          'PARI YLLACUTIPA MARIA ANTONIETA',
          'RUBIN DE CELIS VIDAL MILTON ALADINO',
          'SANCHEZ ESQUICHE WALTER MAURICIO'
        ],
        'EMERGENCIAS Y DESASTRES': [
          'CACERES CACERES PAMELA DE LOS MILAGROS'
        ],
        'GERENCIA EN SALUD': [
          'ANCALLI CALIZAYA FELIX',
          'CANEPA YZAGA JUAN MANUEL',
          'CHAVEZ NUÑEZ MARIA LUZ',
          'FLORES CANO VICTOR ALFREDO',
          'GIRON DAPPINO JUAN ALBERTO',
          'MONTESINOS SANCHEZ SERGIO JESUS',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'OTAZU ZAVALETA JORGE LUIS',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'VALDEZ SEGALES KARINA ELIZABETH',
          'VASQUEZ SILVA MARGGORIETT UZIELA',
          'YAGUA BRICEÑO JHON HERBERT'
        ],
        'MEDICINA LEGAL': [
          'CACERES CACERES PAMELA DE LOS MILAGROS'
        ],
        'OBSTETRICIA': [
          'CALDERON CHATTA HEIDY YENSI',
          'CHACHAQUE ROSA JUANA',
          'CHAVEZ GIL JEAN ALFRED',
          'DEL CARPIO TORRES MIGUEL ANGEL',
          'FARFAN APAZA GALMA YANINA',
          'FLORES NINA JAQUELINE DAYANA',
          'FLORES QUISPE GUSTAVO DHAMPIER',
          'NEYRA URQUIZA MARCO ANTONIO',
          'QUISPE CALDERON FLORMIRA CLAUDIA',
          'RUEDA DELGADO RUTH TARCILA',
          'TINOCO SALAZAR AMILCAR LUIS',
          'TINOCO SALAZAR JESUSA AURELIA'
        ],
      },
      'XIII-XIV': {
        'INTERNADO ROTATORIO': [
          'ANCALLI CALIZAYA FELIX',
          'APAZA MEDINA ROLANDO',
          'ARIAS HUANACUNE PAOLA HEYDI',
          'ARIAS ROJAS VICTOR ALFONSO',
          'ARIAS SANTANA VICTOR ALFONSO',
          'BARRIENTOS MORALES LUIS',
          'CHURA PINTO FRANCISCO JESUS',
          'CRISPIN MERCADO JORGE MAXIMO',
          'ESPINOZA ROSADO RIGOBERTO ADOLFO',
          'GARCIA PEREZ ERIKA YESSENIA',
          'GOMEZ ZAPANA GERSON',
          'HUEDA ZAVALETA MIGUEL ANGEL',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'ORTIZ LARA MELVIN',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'RAMOS SAIRA ROSA MARIA',
          'ROMERO VARGAS ELIZABETH EUGENIA',
          'ROMERO YAÑEZ NINO JESUS',
          'RONDON CHAVEZ ELIANA LIBERTAD',
          'SAENZ CORDOVA CARLOS ALBERTO',
          'SANCHEZ VELEZ CARLOS ALFONSO',
          'SOSA SOTO VERONICA IRIS',
          'TOTORA CALIZAYA JHON FRAY',
          'VELASQUEZ MEZA ELEANNE RUHAYED',
          'VICENTE CHOQUE EDDY RICHARD',
          'VICENTE QUISPE LUIS ALBERTO'
        ],
        'TRABAJO DE INVESTIGACIÓN': [
          'ARIAS SANTANA VICTOR ALFONSO'
        ],
      },
    },
    'Odontología': {
      'II': {
        'ANATOMÍA HUMANA': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'CACERES CACERES PAMELA DE LOS MILAGROS',
          'CARDENAS RUEDA PEDRO RONALD',
          'PACHECO CALLIRGOS JULISSA'
        ],
        'BIOFÍSICA': [
          'CRUZ MENDEZ PATRICIO',
          'PAREDES RAMOS JAVIER ALONSO'
        ],
        'BIOQUÍMICA': [
          'LARA LINCE PATRICIA DEL ROSARIO',
          'MORALES DE ROCA LA BARRERA JESSICA TRUDY'
        ],
        'COMUNICACIÓN II': [
          'VALDIVIA TAPIA YANIRA MARIA'
        ],
        'EMBRIOLOGÍA': [
          'ARANIBAR GUTIERREZ JENNY GIOVANNA',
          'BARREDA QUISPE GIOVANA ROSARIO'
        ],
        'FILOSOFÍA': [
          'RAMOS SANCHEZ HUMBERTO CARLOS'
        ],
        'FISIOTERAPIA BUCAL': [
          'ESPADA SALGADO FERNANDO MAURICIO'
        ],
        'FOTOGRAFÍA': [
          'FERNANDEZ GARCIA LUIS HUMBERTO',
          'KUONG DE DELGADO NELLY ANTONIETA B.'
        ],
        'TERRITORIO PERUANO, DEFENSA Y SEGURIDAD NACIONAL': [
          'RAMOS SANCHEZ HUMBERTO CARLOS'
        ],
      },
      'IV': {
        'CARIOLOGÍA': [
          'LOAYZA ORTIZ SANDRA XIMENA'
        ],
        'FARMACOLOGÍA': [
          'CASTRO HUARACHI ROYER LUIS'
        ],
        'INGLÉS TÉCNICO': [
          'LAURA DE LA CRUZ KEVIN MARIO'
        ],
        'MATERIALES DENTALES': [
          'FERNANDEZ GARCIA LUIS HUMBERTO',
          'MELENDEZ CONDORI YTALA YASMIN'
        ],
        'MICROBIOLOGÍA': [
          'GOMEZ ORTIZ RAUL DARIO',
          'LOPEZ ROLDAN CARMEN LUISA',
          'ZEA GAMBOA FRANCISCO EDUARDO'
        ],
        'MORFOLOGÍA DEL APARATO MASTICATORIO': [
          'ALLASI TEJADA ELISEO GUSTAVO',
          'FERNANDEZ GARCIA LUIS HUMBERTO'
        ],
        'PROCEDIMIENTOS DE ENFERMERÍA': [
          'RIVERA CHIRINOS JANET MARTHA'
        ],
        'SEMIOLOGÍA': [
          'BOLUARTE SILVA ZULMA GLADYS',
          'RAMOS PAREDES JUNIOR EDGAR',
          'TEJADA MONTES DAMASO',
          'VELASQUEZ MEZA ELEANNE RUHAYED'
        ],
      },
      'VI': {
        'CIRUGÍA BUCAL II': [
          'ALLASI TEJADA ELISEO GUSTAVO',
          'ROMERO MAYTA RICHARD ALFONSO',
          'ZEBALLOS ADRIAZOLA MERCEDES'
        ],
        'ENDODONCIA I': [
          'CALJARO CHAMBI SUGEY MARJHORY',
          'PINTO TEJADA SANTOS FRANCISCO'
        ],
        'FARMACOTERAPIA ODONTOLÓGICA': [
          'CASTRO HUARACHI ROYER LUIS'
        ],
        'OCLUSIÓN II': [
          'MONTOYA PORTUGAL JORGE EFRAIN',
          'RAMOS GOMEZ FREDERICK'
        ],
        'OPERATORIA DENTAL II': [
          'CALJARO CHAMBI SUGEY MARJHORY',
          'CONDORI SALINAS YESICA EULALIA',
          'ESPADA SALGADO FERNANDO MAURICIO',
          'FERNANDEZ GARCIA LUIS HUMBERTO',
          'JUAREZ VIZCARRA CESAR',
          'KUONG DE DELGADO NELLY ANTONIETA B.',
          'LOAYZA ORTIZ SANDRA XIMENA',
          'MUÑOA ALVARADO JULIANA ESTHER',
          'PINTO TEJADA SANTOS FRANCISCO',
          'RAMOS GOMEZ FREDERICK',
          'SANCHEZ MACCHIAVELLO ALONSO',
          'TOZO BURGOS JOSE GIANCARLO'
        ],
        'PERIODONCIA I': [
          'AQUIZE DIAZ ANGELA MARIA',
          'PORTUGAL MOTOCANCHE GLADYS KARINA'
        ],
        'PRÓTESIS FIJA I': [
          'MELENDEZ CONDORI YTALA YASMIN',
          'MONTOYA PORTUGAL JORGE EFRAIN',
          'RAMOS GOMEZ FREDERICK'
        ],
        'PRÓTESIS REMOVIBLE II': [
          'MAQUE GUERRA JUAN WALTHER'
        ],
      },
      'VIII': {
        'ADMINISTRACIÓN Y GESTIÓN EN SALUD': [
          'ESPADA SALGADO FERNANDO MAURICIO'
        ],
        'BIOÉTICA': [
          'RIVAROLA HIDALGO MARCO CARLOS ALEJANDRO'
        ],
        'ESTOMATOLOGÍA INTEGRAL II': [
          'ANDIA MARTINEZ FIORELLA',
          'AQUIZE DIAZ ANGELA MARIA',
          'CALJARO CHAMBI SUGEY MARJHORY',
          'CONDORI SALINAS YESICA EULALIA',
          'ESPADA SALGADO FERNANDO MAURICIO',
          'LOAYZA ORTIZ SANDRA XIMENA',
          'MELENDEZ CONDORI YTALA YASMIN',
          'MONTOYA PORTUGAL JORGE EFRAIN',
          'MUÑOA ALVARADO JULIANA ESTHER',
          'PINTO TEJADA SANTOS FRANCISCO',
          'PORTUGAL MOTOCANCHE GLADYS KARINA',
          'RAMOS GOMEZ FREDERICK',
          'ROMERO MAYTA RICHARD ALFONSO',
          'SANCHEZ MACCHIAVELLO ALONSO',
          'ZEBALLOS ADRIAZOLA MERCEDES'
        ],
        'FLUJO DIGITAL EN ODONTOLOGÍA': [
          'MELENDEZ CONDORI YTALA YASMIN'
        ],
        'MEDICINA ESTOMATOLÓGICA': [
          'PORTUGAL MOTOCANCHE GLADYS KARINA'
        ],
        'METODOLOGÍA DE LA INVESTIGACIÓN': [
          'SANCHEZ TITO MARCO ANTONIO',
          'TOZO BURGOS JOSE GIANCARLO'
        ],
        'ODONTOLOGÍA ESPECIAL': [
          'ANDIA MARTINEZ FIORELLA'
        ],
        'ODONTOPEDIATRÍA II': [
          'ANDIA MARTINEZ FIORELLA',
          'CASTILLO GUILLEN CLAUDIA MARIA',
          'PANGO PALZA DANTE OSWALDO'
        ],
        'ORTODONCIA II': [
          'SANCHEZ TITO MARCO ANTONIO',
          'SIMAUCHI TEJADA MARIO ALEJANDRO'
        ],
        'PATOLOGÍA BUCAL': [
          'KUONG DE DELGADO NELLY ANTONIETA B.'
        ],
      },
      'X': {
        'PRÁCTICA PRE PROFESIONAL EN ESTOMATOLOGÍA': [
          'CONDORI SALINAS YESICA EULALIA',
          'ELGUERA VARGAS HENRY WILLIAMS',
          'FLORES TIPACTI ROBERTO',
          'JIRON RAFAEL CARLOS IVAN',
          'KUONG DE DELGADO NELLY ANTONIETA B.',
          'NALVARTE ESTRADA MARIA TERESA FRANCISCA'
        ],
        'SEMINARIOS EXPOSITIVOS': [
          'CASTILLO GUILLEN CLAUDIA MARIA',
          'KUONG DE DELGADO NELLY ANTONIETA B.',
          'PORTUGAL MOTOCANCHE GLADYS KARINA'
        ],
        'TRABAJO DE INVESTIGACIÓN': [
          'JUAREZ VIZCARRA CESAR',
          'SANCHEZ TITO MARCO ANTONIO',
          'TOZO BURGOS JOSE GIANCARLO'
        ],
      },
    },
    'T.M. Laboratorio Clínico y Anatomía Patológica': {
      'II': {
        'ANATOMÍA': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'CARDENAS RUEDA PEDRO RONALD',
          'PACHECO CALLIRGOS JULISSA'
        ],
        'BIOFÍSICA': [
          'OLVEA ZAPANA VANESSA GUIZELLY'
        ],
        'BIOLOGÍA': [
          'LARA LINCE PATRICIA DEL ROSARIO',
          'MORALES DE ROCA LA BARRERA JESSICA TRUDY'
        ],
        'COMUNICACIÓN II': [
          'ARVORCO AGUILAR SUSANA'
        ],
        'FILOSOFÍA': [
          'CARDOZA RAMIREZ CARLO ANDRE'
        ],
        'GESTIÓN DE LA INFORMACIÓN CIENTÍFICA': [
          'CONDORI CHAVEZ VERONICA JACQUELINE',
          'MENA ORDOÑEZ SISSY SOLEDAD'
        ],
        'QUÍMICA ORGÁNICA': [
          'CATARI CUTIPA MARITZA MARLENI'
        ],
        'TERRITORIO PERUANO, DEFENSA Y SEGURIDAD NACIONAL': [
          'CARDOZA RAMIREZ CARLO ANDRE'
        ],
      },
      'IV': {
        'BIOQUÍMICA CLÍNICA I': [
          'HUAMAN CARDENAS VICTOR RAUL',
          'PAREDES FERNANDEZ ORLANDO GABRIEL'
        ],
        'EPIDEMIOLOGÍA Y SALUD PÚBLICA': [
          'CURASI VELASQUEZ UBALDO LUIS'
        ],
        'GENÉTICA Y BIOLOGÍA MOLECULAR': [
          'NINAJA ZEGARRA FREDDY EDDINSON'
        ],
        'MATEMÁTICA APLICADA AL LABORATORIO': [
          'OLVEA ZAPANA VANESSA GUIZELLY'
        ],
        'PARASITOLOGÍA': [
          'RAMOS ROJAS MADY CANELU'
        ],
        'PROCEDIMIENTOS DE ENFERMERÍA': [
          'RIVERA CHIRINOS JANET MARTHA'
        ],
        'PSICOLOGÍA': [
          'AGUIRRE MONTESINOS LISSETT ZUNILDA'
        ],
      },
      'IX-X': {
        'INTERNADO': [
          'CERVANTES GOMEZ FOSTER GONZALO MIGUEL ENRIQUE',
          'GOMEZ CCORAHUA MARIA MAGDALENA',
          'JOVE ZERPA MIRIAM ZENAIDA',
          'MONTESINOS VALENCIA CECILIA CLAUDIA'
        ],
        'TRABAJO DE INVESTIGACIÓN': [
          'MONTESINOS VALENCIA CECILIA CLAUDIA'
        ],
      },
      'VI': {
        'CITOLOGÍA I': [
          'CARRILLO TICONA IRMA ANDREA',
          'MEREJILDO VERA MERCY CAROLINA'
        ],
        'HEMATOLOGÍA CLÍNICA': [
          'CARRILLO TICONA IRMA ANDREA',
          'HUAMAN CARDENAS VICTOR RAUL'
        ],
        'INMUNOLOGÍA CLÍNICA Y VACUNAS': [
          'HUAMAN CARDENAS VICTOR RAUL',
          'PAREDES FERNANDEZ ORLANDO GABRIEL'
        ],
        'METODOLOGÍA DE LA INVESTIGACIÓN': [
          'TOZO BURGOS JOSE GIANCARLO'
        ],
        'MICOLOGÍA': [
          'RAMOS ROJAS MADY CANELU'
        ],
        'UROANÁLISIS Y LÍQUIDOS BIOLÓGICOS': [
          'CARRILLO TICONA IRMA ANDREA',
          'MEREJILDO VERA MERCY CAROLINA'
        ],
      },
      'VIII': {
        'BIOÉTICA': [
          'RIVAROLA HIDALGO MARCO CARLOS ALEJANDRO'
        ],
        'CONTROL DE CALIDAD EN LABORATORIO': [
          'RAMOS ROJAS MADY CANELU'
        ],
        'GESTIÓN EMPRESARIAL EN SALUD': [
          'ESPINOZA VIDAURRE SAM MICHAEL'
        ],
        'LEGISLACIÓN EN SALUD': [
          'PARIHUANA TRAVEZAÑO EDGAR GONZALO'
        ],
        'SALUD COMUNITARIA': [
          'CARRILLO TICONA IRMA ANDREA',
          'HUAMAN CARDENAS VICTOR RAUL'
        ],
        'TALLER DE TESIS II': [
          'MEREJILDO VERA MERCY CAROLINA'
        ],
        'TOXICOLOGÍA Y BIOQUÍMICA LEGAL': [
          'CASTRO HUARACHI ROYER LUIS'
        ],
      },
    },
    'T.M. Terapia Física y Rehabilitación': {
      'II': {
        'ANATOMÍA': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'CARDENAS RUEDA PEDRO RONALD',
          'PACHECO CALLIRGOS JULISSA'
        ],
        'CIENCIAS SOCIALES APLICADAS A LA SALUD': [
          'CHUMPITAZ CHAVEZ FLOR DE MARIA'
        ],
        'COMUNICACIÓN II': [
          'ARVORCO AGUILAR SUSANA'
        ],
        'FILOSOFÍA': [
          'CARDOZA RAMIREZ CARLO ANDRE'
        ],
        'FISIOLOGÍA': [
          'CRUZ MENDEZ PATRICIO'
        ],
        'GESTIÓN DE LA INFORMACIÓN CIENTÍFICA': [
          'CONDORI CHAVEZ VERONICA JACQUELINE',
          'MENA ORDOÑEZ SISSY SOLEDAD'
        ],
        'INTRODUCCIÓN A LA TERAPIA FÍSICA Y REHABILITACIÓN': [
          'MONTESINOS VALENCIA CECILIA CLAUDIA'
        ],
        'PRIMEROS AUXILIOS': [
          'RIVERA CHIRINOS JANET MARTHA'
        ],
        'TERRITORIO PERUANO, DEFENSA Y SEGURIDAD NACIONAL': [
          'CARDOZA RAMIREZ CARLO ANDRE'
        ],
      },
      'IV': {
        'AGENTES FÍSICOS': [
          'EFFIO PAJUELO OSCAR EUGENIO',
          'FERNANDEZ DAVILA MOLINA ALEJANDRO ARCADIO'
        ],
        'BASES BIOMECÁNICAS Y KINESIOLÓGICAS DEL MOVIMIENTO HUMANO': [
          'BARRIGA PASTEN MARCELO ADRIAN'
        ],
        'EVALUACIÓN FISIOTERAPÉUTICA': [
          'CORRALES HUAMAN LUCERO'
        ],
        'FARMACOLOGÍA APLICADA A LA FISIOTERAPIA': [
          'CASTRO HUARACHI ROYER LUIS'
        ],
        'FISIOPATOLOGÍA GENERAL': [
          'GORDILLO MAYDANA PAULO CESAR'
        ],
        'NEURODESARROLLO Y AFECCIONES PEDIÁTRICAS': [
          'CHUMPITAZ CHAVEZ FLOR DE MARIA',
          'CUTIPA LARICO ARACELI YAJHAIRA',
          'PAREDES CALDERON SOLANGE SUSANA'
        ],
      },
      'IX-X': {
        'INTERNADO': [
          'CHUMO ESPINOZA MANUEL ENRIQUE',
          'EFFIO PAJUELO OSCAR EUGENIO',
          'IZQUIERDO LLERENA MAURA',
          'MONTESINOS VALENCIA CECILIA CLAUDIA',
          'SANTISTEBAN HUARINGA OSCAR'
        ],
        'TRABAJO DE INVESTIGACIÓN': [
          'MONTESINOS VALENCIA CECILIA CLAUDIA'
        ],
      },
      'VI': {
        'AYUDAS BIOMECÁNICAS': [
          'CHUMPITAZ CHAVEZ FLOR DE MARIA'
        ],
        'FISIOTERAPIA CARDIORESPIRATORIA II': [
          'BARRIGA PASTEN MARCELO ADRIAN'
        ],
        'FISIOTERAPIA EN REUMATOLOGÍA': [
          'MONTESINOS VALENCIA CECILIA CLAUDIA'
        ],
        'FISIOTERAPIA EN TRAUMATOLOGÍA Y ORTOPEDIA': [
          'FERNANDEZ DAVILA MOLINA ALEJANDRO ARCADIO'
        ],
        'METODOLOGÍA DE LA INVESTIGACIÓN': [
          'TOZO BURGOS JOSE GIANCARLO'
        ],
        'MÉTODOS DE REEDUCACIÓN NEUROLÓGICA EN ADULTOS I': [
          'ALFARO ACOSTA JHOAN MARCIE',
          'BLANCO ALAVE STEPHANIE',
          'CHUMPITAZ CHAVEZ FLOR DE MARIA'
        ],
        'RAZONAMIENTO CLÍNICO EN FISIOTERAPIA': [
          'DEL AGUILA ARTEAGA ANGELA DEL ROSARIO'
        ],
      },
      'VIII': {
        'BIOÉTICA': [
          'RIVAROLA HIDALGO MARCO CARLOS ALEJANDRO'
        ],
        'FISIOTERAPIA DEPORTIVA Y DEPORTES ADAPTADOS': [
          'BARRIGA PASTEN MARCELO ADRIAN'
        ],
        'FISIOTERAPIA EN COMUNIDAD': [
          'CONTRERAS MEDINA SHIANDY',
          'CORRALES HUAMAN LUCERO'
        ],
        'PROGRAMAS DE INTERVENCIÓN FISIOTERAPÉUTICA II': [
          'BLANCO ALAVE STEPHANIE',
          'MONTESINOS VALENCIA CECILIA CLAUDIA',
          'PAULLO QUIÑONES LUCAS LEONARDO'
        ],
        'PROGRAMAS ESTADÍSTICOS': [
          'ESPINOZA VIDAURRE SAM MICHAEL'
        ],
        'TALLER DE TESIS II': [
          'ESPINOZA VIDAURRE SAM MICHAEL',
          'MONTESINOS VALENCIA CECILIA CLAUDIA'
        ],
      },
    },
  };

  // ── CREAR FORMULARIO ──────────────────────────────────────────────────────
  const form = FormApp.create('Tu Opinión Cuenta - FACSA 2026-II')
    .setTitle('Encuesta de Evaluación Docente — Ciencias de la Salud (2026-II)')
    .setDescription(
      'Universidad Privada de Tacna — Vicerrectorado Académico\n' +
      'Encuesta de Evaluación del Desempeño Docente — Periodo 2026-II\n' +
      'Facultad de Ciencias de la Salud (FACSA)\n\n' +
      'Tu opinión es confidencial y será utilizada únicamente con fines de ' +
      'mejora continua del proceso de enseñanza-aprendizaje.\n' +
      'Base normativa: Resolución N° 245-2026-UPT-CU, Anexo 05.\n\n' +
      '📋 Completa este formulario UNA VEZ POR CADA DOCENTE que deseas evaluar. ' +
      'Si llevas asignaturas de más de un ciclo, selecciona el ciclo correspondiente ' +
      'a cada asignatura en cada envío.\n\n' +
      '⚠️ IMPORTANTE: Debes acceder con tu correo institucional (@virtual.upt.pe). ' +
      'Las respuestas enviadas desde cuentas no institucionales no serán consideradas válidas.'
    )
    .setCollectEmail(true)
    .setLimitOneResponsePerUser(false)
    .setAllowResponseEdits(false)
    .setShowLinkToRespondAgain(true);

  // Helper: ítem de escala Likert 1-5
  function addEscala(titulo, ayuda) {
    form.addScaleItem()
      .setTitle(titulo)
      .setHelpText(ayuda || '')
      .setBounds(1, 5)
      .setLabels('Totalmente en desacuerdo', 'Totalmente de acuerdo')
      .setRequired(true);
  }

  // ── SECCIÓN 0 (implícita): Datos de identificación ───────────────────────
  form.addSectionHeaderItem()
    .setTitle('1. Datos de identificación')
    .setHelpText(
      'Completa los campos a continuación. La información es estrictamente confidencial.\n' +
      '⚠️ Asegúrate de estar usando tu correo institucional @virtual.upt.pe para responder este formulario.'
    );

  const emailItem = form.addTextItem()
    .setTitle('Correo institucional')
    .setHelpText('Ingresa tu correo @virtual.upt.pe. Si no usas tu cuenta institucional no podrás continuar.')
    .setRequired(true);

  const emailValidation = FormApp.createTextValidation()
    .requireTextMatchesPattern('^[a-zA-Z0-9._%+\\-]+@virtual\\.upt\\.pe$')
    .setHelpText('⚠️ Debes ingresar un correo institucional válido que termine en @virtual.upt.pe')
    .build();
  emailItem.setValidation(emailValidation);

  const escuelaItem = form.addMultipleChoiceItem()
    .setTitle('Escuela Profesional a la que perteneces')
    .setRequired(true);

  // ── SECCIONES DE CICLO: una por escuela ──────────────────────────────────
  const escuelas = Object.keys(DOCENTES);
  const pbCiclo    = {}; // pbCiclo[esc]         = PageBreakItem
  const cicloItems = {}; // cicloItems[esc]       = MultipleChoiceItem

  for (const esc of escuelas) {
    pbCiclo[esc] = form.addPageBreakItem()
      .setTitle('Ciclo académico — ' + esc);

    cicloItems[esc] = form.addMultipleChoiceItem()
      .setTitle('¿En qué ciclo académico te encuentras actualmente?')
      .setRequired(true);
  }

  // ── SECCIONES DE CURSO: una por combinación escuela × ciclo ──────────────
  const pbCurso    = {}; // pbCurso[esc][ciclo]   = PageBreakItem
  const cursoItems = {}; // cursoItems[esc][ciclo] = MultipleChoiceItem

  for (const esc of escuelas) {
    pbCurso[esc]    = {};
    cursoItems[esc] = {};
    for (const ciclo of Object.keys(DOCENTES[esc])) {
      pbCurso[esc][ciclo] = form.addPageBreakItem()
        .setTitle('Asignatura — ' + esc + ' · Ciclo ' + ciclo)
        .setHelpText('Selecciona la asignatura cuyo docente deseas evaluar en esta encuesta.');

      cursoItems[esc][ciclo] = form.addMultipleChoiceItem()
        .setTitle('¿Qué asignatura deseas evaluar?')
        .setRequired(true);
    }
  }

  // ── SECCIONES DE DOCENTE: una por combinación escuela × ciclo × curso ────
  const pbDoc = {}; // pbDoc[esc][ciclo][curso] = PageBreakItem

  for (const esc of escuelas) {
    pbDoc[esc] = {};
    for (const ciclo of Object.keys(DOCENTES[esc])) {
      pbDoc[esc][ciclo] = {};
      for (const curso of Object.keys(DOCENTES[esc][ciclo])) {
        pbDoc[esc][ciclo][curso] = form.addPageBreakItem()
          .setTitle('Docente a evaluar — ' + curso)
          .setHelpText('Ciclo ' + ciclo + ' · ' + esc);

        form.addTextItem()
          .setTitle('Sección')
          .setHelpText('Ej.: A, B, 01. Déjalo en blanco si no aplica.')
          .setRequired(false);

        form.addListItem()
          .setTitle('Selecciona el docente que deseas evaluar')
          .setChoiceValues(
            DOCENTES[esc][ciclo][curso].concat(['— Mi docente no aparece en la lista —'])
          )
          .setRequired(true);
      }
    }
  }

  // ── SECCIÓN AE-01: Responsabilidad y planificación ───────────────────────
  const pbEval1 = form.addPageBreakItem()
    .setTitle('2. Responsabilidad y planificación (AE-01)')
    .setHelpText(
      'Califica cada afirmación de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo) ' +
      'según tu experiencia con el docente seleccionado.'
    );

  addEscala('1. El docente asiste puntualmente y cumple el horario establecido de clases.');
  addEscala('2. El docente presenta el sílabo al inicio del semestre y lo cumple durante el desarrollo del curso.');
  addEscala('3. El docente llega preparado con los materiales y recursos necesarios para la clase.');

  // ── SECCIÓN AE-02: Estrategias didácticas y uso de tecnología ────────────
  form.addPageBreakItem()
    .setTitle('3. Estrategias didácticas y uso de tecnología (AE-02)')
    .setHelpText('Califica cada afirmación de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo).');

  addEscala('4. El docente emplea estrategias didácticas variadas (ABP, casos clínicos, simulaciones, debates, etc.) que facilitan el aprendizaje.');
  addEscala('5. El docente integra adecuadamente las TICs y el entorno virtual (EVA-UPT) como apoyo al proceso de enseñanza-aprendizaje.');
  addEscala('6. El docente muestra dominio y manejo actualizado del contenido temático del curso.');

  // ── SECCIÓN AE-03: Evaluación del aprendizaje ────────────────────────────
  form.addPageBreakItem()
    .setTitle('4. Evaluación del aprendizaje (AE-03)')
    .setHelpText('Califica cada afirmación de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo).');

  addEscala('7. El docente comunica con claridad los criterios e instrumentos de evaluación que utiliza.');
  addEscala('8. El docente entrega resultados y retroalimentación oportuna y constructiva sobre las evaluaciones.');

  // ── SECCIÓN AE-04: Relaciones humanas y clima de aula ────────────────────
  form.addPageBreakItem()
    .setTitle('5. Relaciones humanas y clima de aula (AE-04)')
    .setHelpText('Califica cada afirmación de 1 (Totalmente en desacuerdo) a 5 (Totalmente de acuerdo).');

  addEscala('9. El docente fomenta la participación, el pensamiento crítico y el respeto entre estudiantes.');
  addEscala('10. El docente mantiene un trato respetuoso, empático y profesional, promoviendo un clima de aula adecuado.');

  // ── SECCIÓN: Comentarios adicionales ─────────────────────────────────────
  form.addPageBreakItem()
    .setTitle('6. Comentarios adicionales')
    .setHelpText('Esta sección es opcional pero muy valiosa para el proceso de mejora continua.');

  form.addParagraphTextItem()
    .setTitle('¿Qué fortalezas destacas del docente?')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('¿Qué aspectos sugieres mejorar?')
    .setRequired(false);

  // ── CONFIGURAR BRANCHING ──────────────────────────────────────────────────

  // 1. Escuela → salta a la sección de ciclo correspondiente
  escuelaItem.setChoices(
    escuelas.map(esc => escuelaItem.createChoice(esc, pbCiclo[esc]))
  );

  // 2. Ciclo → salta a la sección de curso correspondiente
  for (const esc of escuelas) {
    const ciclos = Object.keys(DOCENTES[esc]);
    cicloItems[esc].setChoices(
      ciclos.map(ciclo => cicloItems[esc].createChoice('Ciclo ' + ciclo, pbCurso[esc][ciclo]))
    );
  }

  // 3. Curso → salta a la sección de docente correspondiente
  for (const esc of escuelas) {
    for (const ciclo of Object.keys(DOCENTES[esc])) {
      const cursos = Object.keys(DOCENTES[esc][ciclo]);
      cursoItems[esc][ciclo].setChoices(
        cursos.map(curso => cursoItems[esc][ciclo].createChoice(curso, pbDoc[esc][ciclo][curso]))
      );
    }
  }

  // 4. Secciones de docente → saltan a AE-01 (omiten secciones de otros ciclos/cursos)
  for (const esc of escuelas) {
    for (const ciclo of Object.keys(DOCENTES[esc])) {
      for (const curso of Object.keys(DOCENTES[esc][ciclo])) {
        pbDoc[esc][ciclo][curso].setGoToPage(pbEval1);
      }
    }
  }

  // ── RESULTADO ─────────────────────────────────────────────────────────────
  const editUrl      = form.getEditUrl();
  const publishedUrl = form.getPublishedUrl();
  const shortUrl     = form.shortenFormUrl(publishedUrl);

  Logger.log('✅ Formulario creado con éxito.');
  Logger.log('🔧 Editor:         ' + editUrl);
  Logger.log('🌐 Para responder: ' + publishedUrl);
  Logger.log('🔗 URL corta:      ' + shortUrl);

  return { editUrl: editUrl, publishedUrl: publishedUrl, shortUrl: shortUrl };
}
