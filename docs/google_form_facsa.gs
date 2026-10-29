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
 * CRITERIO DE INCLUSIÓN (fuente: CARGA_DOCENTE, ESTADO=Vigente):
 *   - Solo ciclos PARES vigentes + INTERNADO (último ciclo de cada escuela).
 *   - Toda asignatura con ≥ 1 sección distinta de A (coordinadores excluidos).
 *   - Los coordinadores (Sección A) son evaluados por intranet, no aparecen aquí.
 * ============================================================================
 */

function crearFormularioFACSA() {

  // ── DATOS: docentes secciones B en adelante, ESTADO=Vigente, 2026-II ─────
  // (Sección A = coordinador, evaluado por intranet — excluido de este form)
  const DOCENTES = {

    // ════════════════════════════════════════════════════════════════════════
    // MEDICINA HUMANA
    // ════════════════════════════════════════════════════════════════════════
    'Medicina Humana': {
      'II': {
        'BIOQUÍMICA': [
          'LARA LINCE PATRICIA DEL ROSARIO',
          'TORRES PILCO RENATO',
          'ZEA GAMBOA FRANCISCO EDUARDO',
        ],
        'DESARROLLO DE COMPETENCIAS DIGITALES': [
          'QUISPE CACERES NATIVIDAD',
        ],
        'EMBRIOLOGÍA': [
          'ARANIBAR GUTIERREZ JENNY GIOVANNA',
        ],
        'HISTOLOGÍA I': [
          'GUEVARA GUISA SERGIO CARLOS',
          'TORRES PILCO RENATO',
        ],
      },
      'IV': {
        'ANATOMÍA II': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'CALIZAYA CALIZAYA RAUL',
        ],
        'BIOESTADÍSTICA Y DEMOGRAFÍA': [
          'MENA ORDOÑEZ SISSY SOLEDAD',
        ],
        'FISIOLOGÍA II': [
          'CRUZ MENDEZ PATRICIO',
          'GORDILLO MAYDANA PAULO CESAR',
        ],
        'PROCEDIMIENTOS DE ENFERMERÍA': [
          'SILVA CHAU RENEE VIOLETA',
        ],
        'SALUD INTEGRAL': [
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'FLORES CANO VICTOR ALFREDO',
          'GIRON DAPPINO JUAN ALBERTO',
          'YAGUA BRICEÑO JHON HERBERT',
          'MONTESINOS SANCHEZ SERGIO JESUS',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'CANEPA YZAGA JUAN MANUEL',
          'ANCALLI CALIZAYA FELIX',
          'OTAZU ZAVALETA JORGE LUIS',
          'VALDEZ SEGALES KARINA ELIZABETH',
        ],
      },
      'VI': {
        'INTRODUCCIÓN A LA AYUDA DIAGNÓSTICA': [
          'ERAS MERCADO ROBERTO ALEJANDRO',
        ],
        'METODOLOGÍA DE LA INVESTIGACIÓN': [
          'MENA ORDOÑEZ SISSY SOLEDAD',
          'MIRANDA CHAVEZ BRAYAN RAUL',
        ],
        'PATOLOGÍA GENERAL': [
          'ZEA GAMBOA FRANCISCO EDUARDO',
          'TORRES PILCO RENATO',
        ],
        'SEMIOLOGÍA': [
          'VARGAS MOLINEROS ALDO HUGO',
          'CAPELLINO GAMBETTA ALEX RODRIGO ALBERTO',
          'GORDILLO MAYDANA PAULO CESAR',
          'GOMEZ ORTIZ RAUL DARIO',
          'ALVITES MANRIQUE RICARDO ARTURO',
          'CHAVEZ ZEGARRA LARISSA SVETLANA',
          'PARI MAQUERA RODRIGO ADERLY',
          'CURASI VELASQUEZ UBALDO LUIS',
          'CHAVEZ NUÑEZ MARIA LUZ',
          'OTAZU ZAVALETA JORGE LUIS',
          'DAVILA YUFRA ELIANA MAGALI',
        ],
      },
      'VIII': {
        'AYUDA DIAGNÓSTICA II': [
          'ERAS MERCADO ROBERTO ALEJANDRO',
        ],
        'MEDICINA II': [
          'MENDOZA LAREDO JUAN ARTURO',
          'GALLARDO RECAVARREN CESAR JUVENAL',
          'CONDORI VARGAS EDWIN CECILIO',
          'ANTEZANA ROMAN AUGUSTO',
          'TEJADA MONTES DAMASO',
          'MOSCOSO ARANA KARINA',
          'VELASQUEZ MEZA ELEANNE RUHAYED',
          'ZEA O\'PHELAN CAMPOS FREDY',
          'LAURA MACHACA ROXANA LEIDY',
        ],
        'PEDIATRÍA I': [
          'CABALLERO CACERES CESAR ELISEO',
          'ARANA NUÑEZ JUANA MARIA',
          'GUTIERREZ FLORES MAYKEL FERNANDO',
          'SAENZ CORDOVA CARLOS ALBERTO',
          'COHAILA SILVA SANDRA GABRIELA',
          'VILDOSO ZEVALLOS CARLO MAURICIO',
          'VICENTE QUISPE LUIS ALBERTO',
          'PACORI ACHATA JHON',
        ],
      },
      'X': {
        'ATENCIÓN PRIMARIA III': [
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'YAGUA BRICEÑO JHON HERBERT',
          'CANEPA YZAGA JUAN MANUEL',
          'MONTESINOS SANCHEZ SERGIO JESUS',
          'FLORES CANO VICTOR ALFREDO',
          'VALDEZ SEGALES KARINA ELIZABETH',
          'GIRON DAPPINO JUAN ALBERTO',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'ANCALLI CALIZAYA FELIX',
          'CHAVEZ NUÑEZ MARIA LUZ',
        ],
        'CIRUGÍA I': [
          'SAKUMA MIYASHIRO ISABEL',
          'CHURA PINTO FRANCISCO JESUS',
          'AVALOS ROJO ROSA LUZ',
          'LANCHIPA PICOAGA CESAR FERNANDO',
          'SANCHEZ BARLETTI JUAN',
          'RONDON MOSCOSO DIANA',
          'VARGAS GALDOS RICARDO',
          'NINAJA CALIZAYA WILBER',
          'CALLIRI MAMANI HENRY EFRAIN',
          'FRANCO PEROCHENA PAOLA FERNANDA',
        ],
        'MEDICINA IV': [
          'ALIAGA DIAZ ELIZABETH GARBY',
          'URQUIZO PEREZ GREGORIO RUFINO',
          'ACEVEDO VELASQUEZ RAQUEL EDITH',
          'GUZMAN OLIVERA WILSON RAUL',
          'FLORES CHIRE MIGUEL ANGEL',
          'MINCHON VIZCONDE DIANA JULISSA',
          'ÑACA BAILON YACKELINE YENNY',
          'RAMOS PAREDES JUNIOR EDGAR',
          'NEYRA TARQUI HERALDY EVELIN',
          'MANCHEGO LLERENA JORGE',
        ],
        'TALLER DE TESIS I': [
          'MENA ORDOÑEZ SISSY SOLEDAD',
          'MIRANDA CHAVEZ BRAYAN RAUL',
        ],
      },
      'XII': {
        'BIOÉTICA': [
          'CARDOZA RAMIREZ CARLO ANDRE',
        ],
        'CIRUGÍA III': [
          'MACHACA VALENZUELA DANIZZA LAURA',
          'PARI YLLACUTIPA MARIA ANTONIETA',
          'LOZANO MORALES LUIS ARNALDO',
          'CAÑARI CHUMPITAZ ANGELA MODESTA',
          'SANCHEZ ESQUICHE WALTER MAURICIO',
          'AGUILAR ROMERO TELESFORO FERNANDO',
          'RUBIN DE CELIS VIDAL MILTON ALADINO',
          'NUÑEZ ESPINEL BENJAMIN HUMBERTO',
          'MEDINA CHACON PERCY ANIBAL',
          'MENDOZA FLORES NELLY ROSARIO',
          'PAMPA CAYO PLANIMIR',
        ],
        'GERENCIA EN SALUD': [
          'VALDEZ SEGALES KARINA ELIZABETH',
          'YAGUA BRICEÑO JHON HERBERT',
          'MONTESINOS SANCHEZ SERGIO JESUS',
          'FLORES CANO VICTOR ALFREDO',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'GIRON DAPPINO JUAN ALBERTO',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'CHAVEZ NUÑEZ MARIA LUZ',
          'ANCALLI CALIZAYA FELIX',
          'OTAZU ZAVALETA JORGE LUIS',
          'CANEPA YZAGA JUAN MANUEL',
        ],
        'OBSTETRICIA': [
          'QUISPE CALDERON FLORMIRA CLAUDIA',
          'FARFAN APAZA GALMA YANINA',
          'FLORES QUISPE GUSTAVO DHAMPIER',
          'NEYRA URQUIZA MARCO ANTONIO',
          'DEL CARPIO TORRES MIGUEL ANGEL',
          'CHACHAQUE ROSA JUANA',
          'TINOCO SALAZAR AMILCAR LUIS',
          'TINOCO SALAZAR JESUSA AURELIA',
          'FLORES NINA JAQUELINE DAYANA',
          'RUEDA DELGADO RUTH TARCILA',
          'CHAVEZ GIL JEAN ALFRED',
        ],
      },
      'INTERNADO': {
        'INTERNADO ROTATORIO': [
          'GOMEZ ZAPANA GERSON',
          'CHURA PINTO FRANCISCO JESUS',
          'SAENZ CORDOVA CARLOS ALBERTO',
          'ARIAS HUANACUNE PAOLA HEYDI',
          'ARIAS ROJAS VICTOR ALFONSO',
          'VELASQUEZ MEZA ELEANNE RUHAYED',
          'VICENTE CHOQUE EDDY RICHARD',
          'NEIRA ZEGARRA RENAN ALEJANDRO',
          'VICENTE QUISPE LUIS ALBERTO',
          'ANCALLI CALIZAYA FELIX',
          'QUIROZ CARRASCO JESSICA MARIANELLA',
          'ESPINOZA ROSADO RIGOBERTO ADOLFO',
          'BARRIENTOS MORALES LUIS',
          'HUEDA ZAVALETA MIGUEL ANGEL',
          'SOSA SOTO VERONICA IRIS',
          'ROMERO VARGAS ELIZABETH EUGENIA',
          'RONDON CHAVEZ ELIANA LIBERTAD',
          'SANCHEZ VELEZ CARLOS ALFONSO',
          'CRISPIN MERCADO JORGE MAXIMO',
          'GARCIA PEREZ ERIKA YESSENIA',
          'RAMOS SAIRA ROSA MARIA',
          'ROMERO YAÑEZ NINO JESUS',
          'TOTORA CALIZAYA JHON FRAY',
          'ORTIZ LARA MELVIN',
          'APAZA MEDINA ROLANDO',
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // ODONTOLOGÍA
    // ════════════════════════════════════════════════════════════════════════
    'Odontología': {
      'II': {
        'ANATOMÍA HUMANA': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'PACHECO CALLIRGOS JULISSA',
          'CACERES CACERES PAMELA DE LOS MILAGROS',
        ],
        'BIOFÍSICA': [
          'PAREDES RAMOS JAVIER ALONSO',
        ],
        'BIOQUÍMICA': [
          'LARA LINCE PATRICIA DEL ROSARIO',
        ],
        'EMBRIOLOGÍA': [
          'ARANIBAR GUTIERREZ JENNY GIOVANNA',
        ],
        'FOTOGRAFÍA': [
          'FERNANDEZ GARCIA LUIS HUMBERTO',
        ],
      },
      'IV': {
        'MATERIALES DENTALES': [
          'FERNANDEZ GARCIA LUIS HUMBERTO',
        ],
        'MICROBIOLOGÍA': [
          'ZEA GAMBOA FRANCISCO EDUARDO',
          'LOPEZ ROLDAN CARMEN LUISA',
        ],
        'MORFOLOGÍA DEL APARATO MASTICATORIO': [
          'FERNANDEZ GARCIA LUIS HUMBERTO',
        ],
        'SEMIOLOGÍA': [
          'RAMOS PAREDES JUNIOR EDGAR',
          'VELASQUEZ MEZA ELEANNE RUHAYED',
          'TEJADA MONTES DAMASO',
        ],
      },
      'VI': {
        'CIRUGÍA BUCAL II': [
          'ROMERO MAYTA RICHARD ALFONSO',
          'ZEBALLOS ADRIAZOLA MERCEDES',
        ],
        'ENDODONCIA I': [
          'CALJARO CHAMBI SUGEY MARJHORY',
        ],
        'OCLUSIÓN II': [
          'MONTOYA PORTUGAL JORGE EFRAIN',
        ],
        'OPERATORIA DENTAL II': [
          'CALJARO CHAMBI SUGEY MARJHORY',
          'CONDORI SALINAS YESICA EULALIA',
          'ESPADA SALGADO FERNANDO MAURICIO',
          'JUAREZ VIZCARRA CESAR',
          'LOAYZA ORTIZ SANDRA XIMENA',
          'MUÑOA ALVARADO JULIANA ESTHER',
          'PINTO TEJADA SANTOS FRANCISCO',
          'RAMOS GOMEZ FREDERICK',
          'SANCHEZ MACCHIAVELLO ALONSO',
          'TOZO BURGOS JOSE GIANCARLO',
          'FERNANDEZ GARCIA LUIS HUMBERTO',
        ],
        'PERIODONCIA I': [
          'PORTUGAL MOTOCANCHE GLADYS KARINA',
        ],
        'PRÓTESIS FIJA I': [
          'MONTOYA PORTUGAL JORGE EFRAIN',
          'RAMOS GOMEZ FREDERICK',
        ],
      },
      'VIII': {
        'ESTOMATOLOGÍA INTEGRAL II': [
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
        ],
        'ESTOMATOLOGÍA INTEGRAL II - RADIOLOGÍA': [
          'ROMERO MAYTA RICHARD ALFONSO',
        ],
        'ESTOMATOLOGÍA INTEGRAL II - ENDODONCIA': [
          'SANCHEZ MACCHIAVELLO ALONSO',
        ],
        'ESTOMATOLOGÍA INTEGRAL II - DIAGNÓSTICO': [
          'ZEBALLOS ADRIAZOLA MERCEDES',
        ],
        'METODOLOGÍA DE LA INVESTIGACIÓN': [
          'TOZO BURGOS JOSE GIANCARLO',
        ],
        'ODONTOPEDIATRÍA II': [
          'CASTILLO GUILLEN CLAUDIA MARIA',
          'ANDIA MARTINEZ FIORELLA',
        ],
        'ORTODONCIA II': [
          'SANCHEZ TITO MARCO ANTONIO',
        ],
      },
      'INTERNADO': {
        'PRÁCTICA PRE PROFESIONAL EN ESTOMATOLOGÍA': [
          'CONDORI SALINAS YESICA EULALIA',
          'FLORES TIPACTI ROBERTO',
          'ELGUERA VARGAS HENRY WILLIAMS',
          'JIRON RAFAEL CARLOS IVAN',
          'NALVARTE ESTRADA MARIA TERESA FRANCISCA',
        ],
        'SEMINARIOS EXPOSITIVOS': [
          'KUONG DE DELGADO NELLY ANTONIETA B.',
          'CASTILLO GUILLEN CLAUDIA MARIA',
        ],
        'TRABAJO DE INVESTIGACIÓN': [
          'SANCHEZ TITO MARCO ANTONIO',
          'TOZO BURGOS JOSE GIANCARLO',
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // T.M. LABORATORIO CLÍNICO Y ANATOMÍA PATOLÓGICA
    // ════════════════════════════════════════════════════════════════════════
    'T.M. Laboratorio Clínico y Anatomía Patológica': {
      'II': {
        'ANATOMÍA': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'PACHECO CALLIRGOS JULISSA',
        ],
        'BIOLOGÍA': [
          'LARA LINCE PATRICIA DEL ROSARIO',
        ],
        'GESTIÓN DE LA INFORMACIÓN CIENTÍFICA': [
          'MENA ORDOÑEZ SISSY SOLEDAD',
        ],
      },
      'IV': {
        'BIOQUÍMICA CLÍNICA I': [
          'PAREDES FERNANDEZ ORLANDO GABRIEL',
        ],
      },
      'VI': {
        'CITOLOGÍA I': [
          'CARRILLO TICONA IRMA ANDREA',
        ],
        'HEMATOLOGÍA CLÍNICA': [
          'CARRILLO TICONA IRMA ANDREA',
        ],
        'INMUNOLOGÍA CLÍNICA Y VACUNAS': [
          'PAREDES FERNANDEZ ORLANDO GABRIEL',
        ],
        'UROANÁLISIS Y LÍQUIDOS BIOLÓGICOS': [
          'CARRILLO TICONA IRMA ANDREA',
        ],
      },
      'VIII': {
        'SALUD COMUNITARIA': [
          'CARRILLO TICONA IRMA ANDREA',
        ],
      },
      'INTERNADO': {
        'INTERNADO': [
          'CERVANTES GOMEZ FOSTER GONZALO MIGUEL ENRIQUE',
          'JOVE ZERPA MIRIAM ZENAIDA',
          'GOMEZ CCORAHUA MARIA MAGDALENA',
        ],
      },
    },

    // ════════════════════════════════════════════════════════════════════════
    // T.M. TERAPIA FÍSICA Y REHABILITACIÓN
    // ════════════════════════════════════════════════════════════════════════
    'T.M. Terapia Física y Rehabilitación': {
      'II': {
        'ANATOMÍA': [
          'BARREDA QUISPE GIOVANA ROSARIO',
          'PACHECO CALLIRGOS JULISSA',
        ],
        'GESTIÓN DE LA INFORMACIÓN CIENTÍFICA': [
          'MENA ORDOÑEZ SISSY SOLEDAD',
        ],
      },
      'IV': {
        'AGENTES FÍSICOS': [
          'FERNANDEZ DAVILA MOLINA ALEJANDRO ARCADIO',
        ],
        'NEURODESARROLLO Y AFECCIONES PEDIÁTRICAS': [
          'PAREDES CALDERON SOLANGE SUSANA',
          'CUTIPA LARICO ARACELI YAJHAIRA',
        ],
      },
      'VI': {
        'MÉTODOS DE REEDUCACIÓN NEUROLÓGICA EN ADULTOS I': [
          'BLANCO ALAVE STEPHANIE',
          'ALFARO ACOSTA JHOAN MARCIE',
        ],
      },
      'VIII': {
        'FISIOTERAPIA EN COMUNIDAD': [
          'CONTRERAS MEDINA SHIANDY',
        ],
        'PROGRAMAS DE INTERVENCIÓN FISIOTERAPÉUTICA II': [
          'BLANCO ALAVE STEPHANIE',
          'PAULLO QUIÑONES LUCAS LEONARDO',
        ],
        'TALLER DE TESIS II': [
          'ESPINOZA VIDAURRE SAM MICHAEL',
        ],
      },
      'INTERNADO': {
        'INTERNADO': [
          'EFFIO PAJUELO OSCAR EUGENIO',
          'CHUMO ESPINOZA MANUEL ENRIQUE',
          'SANTISTEBAN HUARINGA OSCAR',
          'IZQUIERDO LLERENA MAURA',
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

  // Helper: etiqueta legible para el ciclo (INTERNADO no lleva el prefijo "Ciclo")
  function cicloLabel(ciclo) {
    return ciclo === 'INTERNADO' ? 'INTERNADO' : 'Ciclo ' + ciclo;
  }

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
  const pbCiclo    = {};
  const cicloItems = {};

  for (const esc of escuelas) {
    pbCiclo[esc] = form.addPageBreakItem()
      .setTitle('Ciclo académico — ' + esc);

    cicloItems[esc] = form.addMultipleChoiceItem()
      .setTitle('¿En qué ciclo académico te encuentras actualmente?')
      .setRequired(true);
  }

  // ── SECCIONES DE CURSO: una por combinación escuela × ciclo ──────────────
  const pbCurso    = {};
  const cursoItems = {};

  for (const esc of escuelas) {
    pbCurso[esc]    = {};
    cursoItems[esc] = {};
    for (const ciclo of Object.keys(DOCENTES[esc])) {
      pbCurso[esc][ciclo] = form.addPageBreakItem()
        .setTitle('Asignatura — ' + esc + ' · ' + cicloLabel(ciclo))
        .setHelpText('Selecciona la asignatura cuyo docente deseas evaluar en esta encuesta.');

      cursoItems[esc][ciclo] = form.addMultipleChoiceItem()
        .setTitle('¿Qué asignatura deseas evaluar?')
        .setRequired(true);
    }
  }

  // ── SECCIONES DE DOCENTE: una por combinación escuela × ciclo × curso ────
  const pbDoc = {};

  for (const esc of escuelas) {
    pbDoc[esc] = {};
    for (const ciclo of Object.keys(DOCENTES[esc])) {
      pbDoc[esc][ciclo] = {};
      for (const curso of Object.keys(DOCENTES[esc][ciclo])) {
        pbDoc[esc][ciclo][curso] = form.addPageBreakItem()
          .setTitle('Docente a evaluar — ' + curso)
          .setHelpText(cicloLabel(ciclo) + ' · ' + esc);

        form.addTextItem()
          .setTitle('Sección')
          .setHelpText('Ej.: B, C, D. La sección A es evaluada por intranet.')
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
      ciclos.map(ciclo => cicloItems[esc].createChoice(cicloLabel(ciclo), pbCurso[esc][ciclo]))
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
