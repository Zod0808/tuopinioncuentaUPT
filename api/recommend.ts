import OpenAI from 'openai';

interface ReqBody {
  contexto: {
    promedioGeneral: number;
    indicador: number;
    criterioMasDebil: string;
    criterioMasDebilDesc: string;
    valorCriterioMasDebil: number;
    porcInsatisfactorio: number;
    porcAceptable: number;
    ciclo: string;
  };
  docentesCriticos: Array<{
    docente: string;
    curso: string;
    nota: number;
    ae01: number;
    ae02: number;
    ae03: number;
    ae04: number;
  }>;
}

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método no permitido' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'IA no configurada. Agrega OPENAI_API_KEY en Vercel.' });
  }

  const { contexto, docentesCriticos } = req.body as ReqBody;

  if (!contexto) {
    return res.status(400).json({ error: 'Datos insuficientes' });
  }

  const openai = new OpenAI({ apiKey });

  const prompt = `Eres un consultor experto en calidad educativa universitaria con 15 años de experiencia en mejora continua docente.

Analiza los siguientes datos de evaluación docente de la Universidad Privada de Tacna (ciclo ${contexto.ciclo}) y genera un RESUMEN EJECUTIVO en 4 párrafos:

CONTEXTO INSTITUCIONAL:
- Promedio general institucional: ${contexto.promedioGeneral.toFixed(2)}/20
- Indicador Plan Estratégico (BUENO+DESTACADO): ${contexto.indicador.toFixed(1)}%
- Criterio más débil: ${contexto.criterioMasDebil} — ${contexto.criterioMasDebilDesc} (promedio: ${contexto.valorCriterioMasDebil.toFixed(2)}/20)
- Secciones INSATISFACTORIO: ${contexto.porcInsatisfactorio.toFixed(1)}%
- Secciones ACEPTABLE: ${contexto.porcAceptable.toFixed(1)}%

DOCENTES CON CALIFICACIÓN INSATISFACTORIO (muestra de los más críticos):
${JSON.stringify(docentesCriticos.slice(0, 6), null, 2)}

Redacta 4 párrafos en español formal:
1. Diagnóstico de la situación actual con datos concretos del ciclo
2. Análisis de causas probables de las bajas calificaciones en "${contexto.criterioMasDebilDesc}"
3. Las 3 estrategias institucionales más urgentes e impactantes (con plazos específicos)
4. Visión de mejora para los próximos 2 ciclos académicos con metas medibles

Usa lenguaje técnico-pedagógico apropiado para directivos universitarios. Sé directo, específico y propositivo.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'Eres un experto en calidad educativa universitaria.' },
      { role: 'user', content: prompt },
    ],
    max_tokens: 700,
    temperature: 0.4,
  });

  const resumenEjecutivo = completion.choices[0]?.message?.content ?? '';
  return res.json({ resumenEjecutivo });
}
